# Audio + Watch Shot Correlation

**Date:** 2026-02-04
**Status:** Ready for implementation
**Branch:** `audio-detection`

---

## Problem

The phone's audio module detects ALL gunshots at the range (user's shots + other shooters). We need to distinguish between:
- **User's shots** - should be counted for their session
- **Distant shots** - other shooters at the range, should not be counted

## Solution

Leverage the existing Garmin watch integration. The watch detects shots via accelerometer (3.5G threshold) and only triggers on the user's own shots (requires physical recoil on wrist).

**Correlation approach:**
- Watch = ground truth for user's shots
- Audio = detects all shots
- Match timestamps post-session to classify each audio detection

## Architecture

```
DURING SESSION:
┌─────────────┐          ┌─────────────┐
│ Watch       │          │ Phone Audio │
│ (on wrist)  │          │ (in pocket) │
├─────────────┤          ├─────────────┤
│ Detects     │          │ Detects     │
│ recoil →    │          │ ALL shots → │
│ stores      │          │ stores      │
│ timestamps  │          │ timestamps  │
│ locally     │          │ in store    │
└─────────────┘          └─────────────┘

AT SESSION END:
┌─────────────┐   splitTimes[]   ┌─────────────┐
│ Watch       │ ───────────────► │ Phone       │
└─────────────┘                  └──────┬──────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │         CORRELATION ENGINE            │
                    │                                       │
                    │  Watch: [1200, 4500, 7800]           │
                    │  Audio: [1180, 2300, 4520, 7750]     │
                    │                                       │
                    │  Match within 200ms window:          │
                    │  • 1200 ↔ 1180 → USER SHOT           │
                    │  • 2300 (no match) → DISTANT         │
                    │  • 4500 ↔ 4520 → USER SHOT           │
                    │  • 7800 ↔ 7750 → USER SHOT           │
                    └───────────────────────────────────────┘
```

## Classification Rules

| Watch | Audio | Result |
|-------|-------|--------|
| Yes | Yes (within 200ms) | **User shot** - confirmed |
| No | Yes | **Distant shot** - other shooter |
| Yes | No | **User shot** - audio missed (suppressor, quiet) |

---

## Types

### `types/audio.ts`

```typescript
/** A single audio detection during a session */
export interface AudioDetection {
  timestamp: number;    // Unix ms (Date.now())
  confidence: number;   // 0-1 from native module
  peakEnergy: number;   // Peak amplitude
}

/** A shot after correlation with watch data */
export interface CorrelatedShot {
  timestamp: number;    // Canonical timestamp (watch if available, else audio)
  source: 'user' | 'distant' | 'watch_only';

  // Correlation metadata (if matched)
  watchTimestamp?: number;
  audioTimestamp?: number;
  correlationDeltaMs?: number;

  // Audio metadata (if audio detected it)
  confidence?: number;
  peakEnergy?: number;
}

/** Result of correlating watch and audio data */
export interface CorrelationResult {
  userShots: CorrelatedShot[];      // Watch + Audio matched
  distantShots: CorrelatedShot[];   // Audio only (no watch match)
  watchOnlyShots: CorrelatedShot[]; // Watch only (rare)

  summary: {
    totalUserShots: number;
    totalDistantShots: number;
    correlationRate: number;  // % of watch shots with audio match
  };
}

/** Configuration for correlation */
export interface CorrelationConfig {
  windowMs: number;  // Max time difference to consider a match (default 200)
}
```

---

## Correlation Service

### `services/session/shotCorrelation.ts`

```typescript
import type { AudioDetection, CorrelatedShot, CorrelationResult, CorrelationConfig } from '@/types/audio';

const DEFAULT_CONFIG: CorrelationConfig = {
  windowMs: 200,
};

/**
 * Correlate watch timestamps with audio detections to classify shots.
 *
 * Algorithm:
 * 1. Sort both arrays by timestamp
 * 2. For each watch timestamp, find closest audio detection within window
 * 3. Mark matched pairs as "user shots"
 * 4. Remaining audio detections = "distant shots"
 * 5. Remaining watch timestamps = "watch only"
 */
export function correlateShots(
  watchTimestamps: number[],
  audioDetections: AudioDetection[],
  config: CorrelationConfig = DEFAULT_CONFIG
): CorrelationResult {
  const { windowMs } = config;

  // Sort inputs
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
      if (matchedAudioIndices.has(i)) continue;

      const audio = sortedAudio[i];
      const delta = Math.abs(audio.timestamp - watchTs);

      if (delta <= windowMs) {
        if (!bestMatch || delta < bestMatch.delta) {
          bestMatch = { index: i, detection: audio, delta };
        }
      }

      // Early exit: if audio is past window, no point checking further
      if (audio.timestamp > watchTs + windowMs) break;
    }

    if (bestMatch) {
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
      // Watch detected but audio didn't (suppressor, missed)
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
    .map(audio => ({
      timestamp: audio.timestamp,
      source: 'distant' as const,
      audioTimestamp: audio.timestamp,
      confidence: audio.confidence,
      peakEnergy: audio.peakEnergy,
    }));

  // Calculate summary
  const totalUserShots = userShots.length + watchOnlyShots.length;
  const correlationRate = sortedWatch.length > 0
    ? userShots.length / sortedWatch.length
    : 1;

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
```

---

## Audio Store Updates

### `stores/audioStore.tsx`

Add session detection accumulation:

```typescript
interface AudioState {
  // Existing fields
  isListening: boolean;
  isAvailable: boolean;
  isModuleLoaded: boolean;
  lastDetection: ShotDetectionEvent | null;
  detectionCount: number;
  onShotDetectedCallback: ((event: ShotDetectionEvent) => void) | null;

  // NEW: Session detection tracking
  sessionDetections: AudioDetection[];
  sessionStartTime: number | null;

  // Existing actions
  start: () => void;
  stop: () => void;
  setConfig: (config: AudioDetectionConfig) => void;
  setShotDetectedCallback: (cb: ((e: ShotDetectionEvent) => void) | null) => void;
  checkAvailability: () => boolean;
  reset: () => void;

  // NEW: Session actions
  startSession: () => void;      // Clear detections, start listening
  endSession: () => AudioDetection[];  // Stop listening, return detections
  getSessionDetections: () => AudioDetection[];
}
```

**Key changes to `start()` handler:**

```typescript
subscription = onShotDetected((event) => {
  // Existing: update lastDetection, detectionCount
  set((state) => ({
    lastDetection: event,
    detectionCount: state.detectionCount + 1,
  }));

  // NEW: Accumulate for session correlation
  const detection: AudioDetection = {
    timestamp: event.timestamp,
    confidence: event.confidence,
    peakEnergy: event.peakEnergy,
  };

  set((state) => ({
    sessionDetections: [...state.sessionDetections, detection],
  }));

  // Existing: call registered callback
  const callback = get().onShotDetectedCallback;
  if (callback) callback(event);
});
```

**New session methods:**

```typescript
startSession: () => {
  set({
    sessionDetections: [],
    sessionStartTime: Date.now(),
    detectionCount: 0,
  });
  get().start();
  console.log('[AudioStore] Session started');
},

endSession: () => {
  get().stop();
  const detections = get().sessionDetections;
  console.log(`[AudioStore] Session ended with ${detections.length} detections`);
  return detections;
},

getSessionDetections: () => {
  return get().sessionDetections;
},
```

---

## Integration Point

### In Garmin session handler

When `session_data` or `session_summary` is received:

```typescript
// services/garmin/garmin.handlers.ts or session store

import { correlateShots } from '@/services/session/shotCorrelation';
import { useAudioStore } from '@/stores/audioStore';

function handleSessionComplete(garminData: GarminSessionData) {
  // Get watch timestamps (in ms relative to session start)
  const watchTimestamps = garminData.splitTimes ?? [];

  // Get audio detections from store
  const audioDetections = useAudioStore.getState().getSessionDetections();

  // Correlate
  const correlation = correlateShots(watchTimestamps, audioDetections);

  console.log('[Correlation] Results:', {
    userShots: correlation.summary.totalUserShots,
    distantShots: correlation.summary.totalDistantShots,
    correlationRate: `${(correlation.summary.correlationRate * 100).toFixed(0)}%`,
  });

  // Attach to session data for display/storage
  return {
    ...garminData,
    correlation,
  };
}
```

**Note on timestamps:**
Watch `splitTimes` may be relative to session start (ms since first shot). Audio timestamps are absolute (`Date.now()`). Normalization may be needed - either:
- Convert audio to relative (subtract `sessionStartTime`)
- Convert watch to absolute (add session start timestamp)

---

## Session Lifecycle

```
User taps "Start Session"
         │
         ├──► audioStore.startSession()
         │    • Clears sessionDetections[]
         │    • Records sessionStartTime
         │    • Starts native audio listener
         │
         └──► Garmin watch starts (existing)

During session:
         │
         ├──► Audio detects shot → adds to sessionDetections[]
         └──► Watch detects shot → stores locally

User taps "End Session" OR watch auto-ends
         │
         ├──► audioStore.endSession()
         │    • Stops native listener
         │    • Returns sessionDetections[]
         │
         ├──► Watch sends SESSION_SUMMARY with splitTimes
         │
         └──► correlateShots(watchTimestamps, audioDetections)
              • Returns CorrelationResult
              • Display to user
```

---

## UI Display

Session summary card:

```
┌─────────────────────────────┐
│ Session Complete            │
├─────────────────────────────┤
│ Your Shots:        12       │  ← correlation.summary.totalUserShots
│ Range Activity:     8       │  ← correlation.summary.totalDistantShots
├─────────────────────────────┤
│ Watch Detected:    12       │  ← garminData.shotsRecorded
│ Audio Detected:    20       │  ← audioDetections.length
│ Match Rate:       100%      │  ← correlationRate
└─────────────────────────────┘
```

---

## Files to Create/Modify

### Create

| File | Purpose |
|------|---------|
| `types/audio.ts` | AudioDetection, CorrelatedShot, CorrelationResult types |
| `services/session/shotCorrelation.ts` | Correlation algorithm |

### Modify

| File | Changes |
|------|---------|
| `stores/audioStore.tsx` | Add sessionDetections[], startSession(), endSession() |
| `services/garmin/garmin.handlers.ts` | Call correlation after session_data received |

---

## Implementation Order

1. **Types** - Create `types/audio.ts` with all interfaces
2. **Correlation service** - Create `shotCorrelation.ts`, write unit tests
3. **Audio store** - Add session tracking to `audioStore.tsx`
4. **Integration** - Wire correlation into Garmin handler
5. **UI** - Display correlation results in session summary

---

## Future Enhancements (Phase 2)

Not in current scope, but planned for later:

- **Watch-less mode**: Add rise time / proximity heuristics for users without Garmin
- **Calibration**: Learn user's shot signature for better audio-only detection
- **Persistence**: Store correlation data in Supabase for analytics
- **Real-time correlation**: If watch ever supports real-time shot events

---

## Testing

**Unit tests for correlation:**
- Empty inputs (no shots)
- Perfect correlation (all match)
- No correlation (watch and audio completely different)
- Partial correlation (some match, some don't)
- Edge cases: rapid fire (shots within 100ms of each other)

**Integration tests:**
- Mock Garmin session with known splitTimes
- Mock audio detections with known timestamps
- Verify correlation result matches expected

**Manual testing:**
- Test at range with watch connected
- Verify user shots counted correctly
- Verify distant shots not counted
- Test with different phone positions (pocket, belt, table)
