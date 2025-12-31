// ============================================================================
// WATCH DATA TRANSFORMER
// ============================================================================
//
// Transforms watch payloads to internal format and builds DB-ready data.
//
// Flow:
// 1. Watch sends SESSION_SUMMARY → transformSummaryPayload() → TransformedWatchData
// 2. Watch sends SESSION_DETAILS → mergeDetailsPayload() → TransformedWatchData (updated)
// 3. Save to DB → buildTargetData() → Record<string, unknown>
// ============================================================================

import type {
  TransformedWatchData,
  WatchDetailsPayload,
  WatchShotData,
  WatchSummaryPayload,
} from './watchTypes';

/**
 * Transform watch SUMMARY payload to internal format.
 * Called when Phase 1 (SESSION_SUMMARY) is received.
 */
export function transformSummaryPayload(payload: WatchSummaryPayload): TransformedWatchData {
  const hasBiometrics = payload.bio.hrAvg > 0;
  const hasSteadiness = payload.steady.avg > 0;

  return {
    sessionId: payload.sid,
    shotsRecorded: payload.shots,
    hitsRecorded: payload.hits,
    durationMs: payload.dur,
    distance: payload.dist,
    completed: payload.done,

    // Splits
    splitTimes: payload.splits,
    avgSplitMs: payload.perf.avg,

    // Performance
    performance: {
      firstShotTime: payload.perf.first,
      bestSplit: payload.perf.best,
      worstSplit: payload.perf.worst,
      avgSplit: payload.perf.avg,
    },

    // Biometrics
    biometrics: {
      enabled: hasBiometrics,
      summary: {
        avgHR: payload.bio.hrAvg,
        minHR: payload.bio.hrMin,
        maxHR: payload.bio.hrMax,
        avgBreathRate: payload.bio.brAvg,
      },
    },

    // Steadiness
    steadiness: {
      enabled: hasSteadiness,
      avgScore: payload.steady.avg,
      trend: payload.steady.trend,
      flinchCount: payload.steady.flinch,
    },

    // Sync status
    isSummaryOnly: true,
    detailsMerged: false,
  };
}

/**
 * Merge watch DETAILS payload into existing transformed data.
 * Called when Phase 2 (SESSION_DETAILS) is received.
 */
export function mergeDetailsPayload(
  existing: TransformedWatchData,
  details: WatchDetailsPayload
): TransformedWatchData {
  return {
    ...existing,

    // Add per-shot data
    shotBiometrics: details.shotData.map((shot: WatchShotData) => ({
      shot: shot.n,
      timestamp: shot.t,
      hr: shot.hr,
      steadiness: shot.st,
      flinch: shot.fl === 1,
    })),

    // Add detection metadata
    autoDetected: details.meta.auto,
    detectionSensitivity: details.meta.sens,
    manualOverrides: details.meta.overrides,

    // Update sync status
    isSummaryOnly: false,
    detailsMerged: true,
  };
}

/**
 * Build partial details for merging when only details payload is available.
 * Used when summary was already saved to DB before details arrived.
 */
export function buildDetailsPartial(
  details: WatchDetailsPayload
): Partial<TransformedWatchData> {
  return {
    shotBiometrics: details.shotData.map((shot: WatchShotData) => ({
      shot: shot.n,
      timestamp: shot.t,
      hr: shot.hr,
      steadiness: shot.st,
      flinch: shot.fl === 1,
    })),
    autoDetected: details.meta.auto,
    detectionSensitivity: details.meta.sens,
    manualOverrides: details.meta.overrides,
    detailsMerged: true,
  };
}

/**
 * Build target_data for database storage.
 * Converts TransformedWatchData to the format stored in session_targets.target_data.
 */
export function buildTargetData(data: TransformedWatchData): Record<string, unknown> {
  const result: Record<string, unknown> = {
    source: 'garmin_watch',

    // Core data
    shots_recorded: data.shotsRecorded,
    hits_recorded: data.hitsRecorded,
    duration_ms: data.durationMs,
    distance: data.distance,
    completed: data.completed,

    // Splits
    splits: data.splitTimes,
    avg_split_ms: data.avgSplitMs,
    fastest_split_ms: data.splitTimes.length > 0 ? Math.min(...data.splitTimes) : null,
    slowest_split_ms: data.splitTimes.length > 0 ? Math.max(...data.splitTimes) : null,

    // Performance
    performance: {
      first_shot_time: data.performance.firstShotTime,
      best_split: data.performance.bestSplit,
      worst_split: data.performance.worstSplit,
      avg_split: data.performance.avgSplit,
    },
  };

  // Biometrics (only if enabled)
  if (data.biometrics.enabled) {
    result.heart_rate = {
      avg: data.biometrics.summary.avgHR,
      min: data.biometrics.summary.minHR,
      max: data.biometrics.summary.maxHR,
    };
    result.avg_breath_rate = data.biometrics.summary.avgBreathRate;
  }

  // Steadiness (only if enabled)
  if (data.steadiness.enabled) {
    result.steadiness = {
      avg_score: data.steadiness.avgScore,
      trend: data.steadiness.trend,
      flinch_count: data.steadiness.flinchCount,
    };
  }

  // Per-shot data (if available from details)
  if (data.shotBiometrics && data.shotBiometrics.length > 0) {
    result.shot_biometrics = data.shotBiometrics;
  }

  // Detection metadata (if available from details)
  if (data.autoDetected !== undefined) {
    result.auto_detected = data.autoDetected;
  }
  if (data.detectionSensitivity !== undefined) {
    result.detection_sensitivity = data.detectionSensitivity;
  }
  if (data.manualOverrides !== undefined) {
    result.manual_overrides = data.manualOverrides;
  }

  // Sync status markers
  result.is_summary_only = data.isSummaryOnly;
  result.details_merged = data.detailsMerged;
  if (data.detailsMerged) {
    result.details_merged_at = new Date().toISOString();
  }

  return result;
}

/**
 * Build details merge payload for updating existing target_data.
 * Used when merging Phase 2 details into already-saved Phase 1 data.
 */
export function buildDetailsMergePayload(
  details: WatchDetailsPayload
): Record<string, unknown> {
  return {
    // Per-shot biometrics
    shot_biometrics: details.shotData.map((shot: WatchShotData) => ({
      shot: shot.n,
      timestamp: shot.t,
      hr: shot.hr,
      steadiness: shot.st,
      flinch: shot.fl === 1,
    })),

    // Detection metadata
    auto_detected: details.meta.auto,
    detection_sensitivity: details.meta.sens,
    manual_overrides: details.meta.overrides,

    // Update sync status
    is_summary_only: false,
    details_merged: true,
    details_merged_at: new Date().toISOString(),
  };
}

// ============================================================================
// LEGACY FORMAT CONVERSION
// ============================================================================

/**
 * Convert legacy watch payload (SESSION_RESULT) to new format.
 * Maintains backwards compatibility with older watch app versions.
 */
export function convertLegacyPayload(legacy: {
  sessionId?: string;
  shotsFired?: number;
  elapsedTime?: number; // seconds
  distance?: number;
  completed?: boolean;
  splitTimes?: number[];
  avgSplit?: number;
  hr?: { avg?: number; min?: number; max?: number };
  steadiness?: { avg?: number; trend?: string };
}): WatchSummaryPayload {
  const durationMs = (legacy.elapsedTime ?? 0) * 1000;
  const splits = legacy.splitTimes ?? [];

  // Calculate perf from splits
  const first = splits.length > 0 ? splits[0] : 0;
  const best = splits.length > 0 ? Math.min(...splits) : 0;
  const worst = splits.length > 0 ? Math.max(...splits) : 0;
  const avg = splits.length > 0
    ? Math.round(splits.reduce((a, b) => a + b, 0) / splits.length)
    : 0;

  return {
    sid: legacy.sessionId ?? '',
    ts: Math.floor(Date.now() / 1000),
    shots: legacy.shotsFired ?? 0,
    hits: legacy.shotsFired ?? 0, // Legacy doesn't track hits separately
    dur: durationMs,
    dist: legacy.distance ?? 0,
    done: legacy.completed ?? true,
    splits,
    perf: { first, best, worst, avg },
    bio: {
      hrAvg: legacy.hr?.avg ?? 0,
      hrMin: legacy.hr?.min ?? 0,
      hrMax: legacy.hr?.max ?? 0,
      brAvg: 0,
    },
    steady: {
      avg: legacy.steadiness?.avg ?? 0,
      trend: (legacy.steadiness?.trend as 'improving' | 'declining' | 'stable') ?? 'unknown',
      flinch: 0,
    },
  };
}

