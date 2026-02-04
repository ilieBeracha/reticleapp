/**
 * Shot Correlation Service
 *
 * Correlates audio detections with watch timestamps to classify shots.
 * Watch = ground truth for user's shots (requires physical recoil on wrist)
 * Audio = detects all shots (user + distant shooters)
 *
 * Algorithm:
 * 1. Sort both arrays by timestamp
 * 2. For each watch timestamp, find closest audio detection within window
 * 3. Mark matched pairs as "user shots"
 * 4. Remaining audio detections = "distant shots"
 * 5. Remaining watch timestamps = "watch only" (suppressor, missed)
 */

import type {
  AudioDetection,
  CorrelatedShot,
  CorrelationConfig,
  CorrelationResult,
} from '@/types/audio';

const DEFAULT_CONFIG: CorrelationConfig = {
  windowMs: 200,
};

/**
 * Convert split times (intervals) to cumulative shot timestamps.
 *
 * @param splitTimes - Array of intervals between shots [ms between shot 1-2, ms between shot 2-3, ...]
 * @param shotCount - Total number of shots (splitTimes.length + 1, or use directly)
 * @returns Array of cumulative timestamps starting at 0
 *
 * @example
 * splitTimesToTimestamps([500, 600, 400]) => [0, 500, 1100, 1500]
 */
export function splitTimesToTimestamps(splitTimes: number[], shotCount?: number): number[] {
  // If no splits, return single shot at 0 or empty
  if (!splitTimes || splitTimes.length === 0) {
    return shotCount && shotCount > 0 ? [0] : [];
  }

  const timestamps: number[] = [0]; // First shot at t=0
  let cumulative = 0;

  for (const split of splitTimes) {
    cumulative += split;
    timestamps.push(cumulative);
  }

  return timestamps;
}

/**
 * Convert absolute audio timestamps to relative (ms since session start).
 *
 * @param detections - Audio detections with absolute timestamps
 * @param sessionStartTime - Session start timestamp (Date.now() when session started)
 * @returns Audio detections with relative timestamps
 */
export function toRelativeTimestamps(
  detections: AudioDetection[],
  sessionStartTime: number
): AudioDetection[] {
  return detections.map((d) => ({
    ...d,
    timestamp: d.timestamp - sessionStartTime,
  }));
}

/**
 * Correlate watch timestamps with audio detections to classify shots.
 *
 * @param watchTimestamps - Timestamps from Garmin watch (ms since session start or absolute)
 * @param audioDetections - Audio detections from phone microphone
 * @param config - Correlation configuration (optional)
 * @returns Classification of all detected shots
 */
export function correlateShots(
  watchTimestamps: number[],
  audioDetections: AudioDetection[],
  config: CorrelationConfig = DEFAULT_CONFIG
): CorrelationResult {
  const { windowMs } = config;

  // Sort inputs by timestamp
  const sortedWatch = [...watchTimestamps].sort((a, b) => a - b);
  const sortedAudio = [...audioDetections].sort((a, b) => a.timestamp - b.timestamp);

  // Track which audio detections have been matched
  const matchedAudioIndices = new Set<number>();

  const userShots: CorrelatedShot[] = [];
  const watchOnlyShots: CorrelatedShot[] = [];

  // For each watch timestamp, find best matching audio detection
  for (const watchTs of sortedWatch) {
    let bestMatch: { index: number; detection: AudioDetection; delta: number } | null = null;

    for (let i = 0; i < sortedAudio.length; i++) {
      // Skip already matched
      if (matchedAudioIndices.has(i)) continue;

      const audio = sortedAudio[i];
      const delta = Math.abs(audio.timestamp - watchTs);

      // Check if within window
      if (delta <= windowMs) {
        // Keep best (closest) match
        if (!bestMatch || delta < bestMatch.delta) {
          bestMatch = { index: i, detection: audio, delta };
        }
      }

      // Early exit optimization: if audio is past window, no point checking further
      // (since array is sorted)
      if (audio.timestamp > watchTs + windowMs) break;
    }

    if (bestMatch) {
      // Found a match - mark as user shot
      matchedAudioIndices.add(bestMatch.index);
      userShots.push({
        timestamp: watchTs,
        source: 'user',
        watchTimestamp: watchTs,
        audioTimestamp: bestMatch.detection.timestamp,
        correlationDeltaMs: bestMatch.delta,
        confidence: bestMatch.detection.confidence,
        peakEnergy: bestMatch.detection.peakEnergy,
      });
    } else {
      // No match - watch only (suppressor or audio missed)
      watchOnlyShots.push({
        timestamp: watchTs,
        source: 'watch_only',
        watchTimestamp: watchTs,
      });
    }
  }

  // Remaining audio detections are distant shots
  const distantShots: CorrelatedShot[] = sortedAudio
    .filter((_, i) => !matchedAudioIndices.has(i))
    .map((audio) => ({
      timestamp: audio.timestamp,
      source: 'distant' as const,
      audioTimestamp: audio.timestamp,
      confidence: audio.confidence,
      peakEnergy: audio.peakEnergy,
    }));

  // Calculate summary
  const totalUserShots = userShots.length + watchOnlyShots.length;
  const correlationRate =
    sortedWatch.length > 0 ? userShots.length / sortedWatch.length : 1;

  return {
    userShots,
    distantShots,
    watchOnlyShots,
    summary: {
      totalUserShots,
      totalDistantShots: distantShots.length,
      correlationRate,
    },
  };
}
