# Audio + Watch Shot Correlation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement post-session correlation between phone audio detections and Garmin watch accelerometer data to classify shots as user's or distant.

**Architecture:** Phone audio module collects all shot timestamps during session. When Garmin sends `splitTimes` at session end, correlation service matches timestamps within 200ms window. Matched = user shot, unmatched audio = distant shot.

**Tech Stack:** TypeScript, Zustand, Jest

---

## Task 1: Create Audio Types

**Files:**
- Create: `types/audio.ts`

**Step 1: Create the types file**

```typescript
/**
 * Audio Detection Types
 *
 * Types for audio-based shot detection and correlation with watch data.
 */

/** A single audio detection during a session */
export interface AudioDetection {
  /** Unix timestamp in milliseconds (Date.now()) */
  timestamp: number;
  /** Detection confidence 0-1 from native module */
  confidence: number;
  /** Peak amplitude of the impulse */
  peakEnergy: number;
}

/** Classification of a shot after correlation */
export type ShotSource = 'user' | 'distant' | 'watch_only';

/** A shot after correlation with watch data */
export interface CorrelatedShot {
  /** Canonical timestamp (watch if available, else audio) */
  timestamp: number;
  /** Classification based on correlation */
  source: ShotSource;

  /** Watch timestamp if detected by watch */
  watchTimestamp?: number;
  /** Audio timestamp if detected by audio */
  audioTimestamp?: number;
  /** Time difference between watch and audio detection (ms) */
  correlationDeltaMs?: number;

  /** Audio detection confidence (if audio detected it) */
  confidence?: number;
  /** Audio peak energy (if audio detected it) */
  peakEnergy?: number;
}

/** Result of correlating watch and audio data */
export interface CorrelationResult {
  /** Shots detected by both watch and audio (user's shots) */
  userShots: CorrelatedShot[];
  /** Shots detected by audio only (other shooters) */
  distantShots: CorrelatedShot[];
  /** Shots detected by watch only (suppressor, audio missed) */
  watchOnlyShots: CorrelatedShot[];

  /** Summary statistics */
  summary: {
    /** Total user shots (userShots + watchOnlyShots) */
    totalUserShots: number;
    /** Total distant shots */
    totalDistantShots: number;
    /** Percentage of watch shots that had audio match (0-1) */
    correlationRate: number;
  };
}

/** Configuration for correlation algorithm */
export interface CorrelationConfig {
  /** Maximum time difference to consider a match (default 200ms) */
  windowMs: number;
}
```

**Step 2: Commit**

```bash
git add types/audio.ts
git commit -m "feat(audio): add types for audio detection and correlation"
```

---

## Task 2: Create Correlation Service - Test First

**Files:**
- Create: `services/session/__tests__/shotCorrelation.test.ts`

**Step 1: Write the test file**

```typescript
/**
 * Shot Correlation Tests
 *
 * Tests for correlating audio detections with watch timestamps.
 */

import { correlateShots } from '../shotCorrelation';
import type { AudioDetection, CorrelationResult } from '@/types/audio';

describe('correlateShots', () => {
  describe('Empty inputs', () => {
    it('should return empty results when no watch timestamps', () => {
      const audioDetections: AudioDetection[] = [
        { timestamp: 1000, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 2000, confidence: 0.8, peakEnergy: 0.4 },
      ];

      const result = correlateShots([], audioDetections);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(0);
      expect(result.distantShots).toHaveLength(2);
      expect(result.summary.totalUserShots).toBe(0);
      expect(result.summary.totalDistantShots).toBe(2);
      expect(result.summary.correlationRate).toBe(1); // No watch shots = 100% correlation
    });

    it('should return empty results when no audio detections', () => {
      const watchTimestamps = [1000, 2000, 3000];

      const result = correlateShots(watchTimestamps, []);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.totalUserShots).toBe(3);
      expect(result.summary.correlationRate).toBe(0);
    });

    it('should return empty results when both inputs are empty', () => {
      const result = correlateShots([], []);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(0);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.totalUserShots).toBe(0);
      expect(result.summary.totalDistantShots).toBe(0);
      expect(result.summary.correlationRate).toBe(1);
    });
  });

  describe('Perfect correlation', () => {
    it('should match all shots when timestamps are identical', () => {
      const watchTimestamps = [1000, 2000, 3000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1000, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 2000, confidence: 0.8, peakEnergy: 0.4 },
        { timestamp: 3000, confidence: 0.85, peakEnergy: 0.45 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(3);
      expect(result.watchOnlyShots).toHaveLength(0);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.correlationRate).toBe(1);

      // Verify correlation deltas are 0
      result.userShots.forEach((shot) => {
        expect(shot.correlationDeltaMs).toBe(0);
        expect(shot.source).toBe('user');
      });
    });

    it('should match shots within 200ms window', () => {
      const watchTimestamps = [1000, 2000, 3000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1150, confidence: 0.9, peakEnergy: 0.5 }, // 150ms after watch
        { timestamp: 1850, confidence: 0.8, peakEnergy: 0.4 }, // 150ms before watch
        { timestamp: 3100, confidence: 0.85, peakEnergy: 0.45 }, // 100ms after watch
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(0);
      expect(result.summary.correlationRate).toBe(1);
    });
  });

  describe('No correlation', () => {
    it('should not match shots outside 200ms window', () => {
      const watchTimestamps = [1000, 5000, 9000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 2500, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 3500, confidence: 0.8, peakEnergy: 0.4 },
        { timestamp: 7000, confidence: 0.85, peakEnergy: 0.45 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(3);
      expect(result.summary.totalUserShots).toBe(3); // Watch-only counts as user
      expect(result.summary.totalDistantShots).toBe(3);
      expect(result.summary.correlationRate).toBe(0);
    });
  });

  describe('Partial correlation', () => {
    it('should correctly classify mixed scenario', () => {
      // Watch detects: 1000, 3000, 5000 (user's 3 shots)
      // Audio detects: 1050 (user), 2000 (distant), 3100 (user), 4000 (distant)
      const watchTimestamps = [1000, 3000, 5000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1050, confidence: 0.9, peakEnergy: 0.5 }, // Matches 1000
        { timestamp: 2000, confidence: 0.7, peakEnergy: 0.3 }, // Distant
        { timestamp: 3100, confidence: 0.85, peakEnergy: 0.45 }, // Matches 3000
        { timestamp: 4000, confidence: 0.6, peakEnergy: 0.25 }, // Distant
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(2); // 1000+1050, 3000+3100
      expect(result.watchOnlyShots).toHaveLength(1); // 5000 (no audio match)
      expect(result.distantShots).toHaveLength(2); // 2000, 4000
      expect(result.summary.totalUserShots).toBe(3);
      expect(result.summary.totalDistantShots).toBe(2);
      expect(result.summary.correlationRate).toBeCloseTo(0.667, 2); // 2/3
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid fire (shots close together)', () => {
      // User fires 3 rapid shots, 100ms apart
      const watchTimestamps = [1000, 1100, 1200];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1020, confidence: 0.9, peakEnergy: 0.5 },
        { timestamp: 1110, confidence: 0.85, peakEnergy: 0.48 },
        { timestamp: 1190, confidence: 0.88, peakEnergy: 0.49 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      // Should match each watch to its closest audio
      expect(result.userShots).toHaveLength(3);
      expect(result.distantShots).toHaveLength(0);
    });

    it('should not double-match an audio detection', () => {
      // Two watch detections, one audio detection between them
      const watchTimestamps = [1000, 1100];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1050, confidence: 0.9, peakEnergy: 0.5 }, // Could match either
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      // Only one match should occur
      expect(result.userShots).toHaveLength(1);
      expect(result.watchOnlyShots).toHaveLength(1);
      expect(result.distantShots).toHaveLength(0);
    });

    it('should use custom window size', () => {
      const watchTimestamps = [1000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1300, confidence: 0.9, peakEnergy: 0.5 }, // 300ms away
      ];

      // Default 200ms window - no match
      const result1 = correlateShots(watchTimestamps, audioDetections);
      expect(result1.userShots).toHaveLength(0);

      // Custom 500ms window - should match
      const result2 = correlateShots(watchTimestamps, audioDetections, { windowMs: 500 });
      expect(result2.userShots).toHaveLength(1);
    });

    it('should preserve audio metadata in correlated shots', () => {
      const watchTimestamps = [1000];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1050, confidence: 0.92, peakEnergy: 0.67 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots[0].confidence).toBe(0.92);
      expect(result.userShots[0].peakEnergy).toBe(0.67);
      expect(result.userShots[0].watchTimestamp).toBe(1000);
      expect(result.userShots[0].audioTimestamp).toBe(1050);
      expect(result.userShots[0].correlationDeltaMs).toBe(50);
    });

    it('should handle unsorted input arrays', () => {
      const watchTimestamps = [3000, 1000, 2000]; // Unsorted
      const audioDetections: AudioDetection[] = [
        { timestamp: 2050, confidence: 0.8, peakEnergy: 0.4 },
        { timestamp: 3020, confidence: 0.85, peakEnergy: 0.45 },
        { timestamp: 1010, confidence: 0.9, peakEnergy: 0.5 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(3);
      expect(result.summary.correlationRate).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- services/session/__tests__/shotCorrelation.test.ts`
Expected: FAIL with "Cannot find module '../shotCorrelation'"

**Step 3: Commit test**

```bash
git add services/session/__tests__/shotCorrelation.test.ts
git commit -m "test(audio): add correlation service tests"
```

---

## Task 3: Implement Correlation Service

**Files:**
- Create: `services/session/shotCorrelation.ts`

**Step 1: Implement the service**

```typescript
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
```

**Step 2: Run tests to verify they pass**

Run: `npm test -- services/session/__tests__/shotCorrelation.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add services/session/shotCorrelation.ts
git commit -m "feat(audio): implement shot correlation service"
```

---

## Task 4: Update Audio Store - Add Session Tracking

**Files:**
- Modify: `stores/audioStore.tsx`

**Step 1: Import new types**

Add at top of file after existing imports:

```typescript
import type { AudioDetection } from '@/types/audio';
```

**Step 2: Update interface**

Replace the `AudioState` interface with:

```typescript
interface AudioState {
  // State
  isListening: boolean;
  isAvailable: boolean;
  isModuleLoaded: boolean;
  lastDetection: ShotDetectionEvent | null;
  detectionCount: number;

  // Session tracking
  sessionDetections: AudioDetection[];
  sessionStartTime: number | null;

  // Callback for external handling (e.g., session integration)
  onShotDetectedCallback: ((event: ShotDetectionEvent) => void) | null;

  // Actions
  start: () => void;
  stop: () => void;
  setConfig: (config: AudioDetectionConfig) => void;
  setShotDetectedCallback: (cb: ((e: ShotDetectionEvent) => void) | null) => void;
  checkAvailability: () => boolean;
  reset: () => void;

  // Session actions
  startSession: () => void;
  endSession: () => AudioDetection[];
  getSessionDetections: () => AudioDetection[];
}
```

**Step 3: Add initial state for session tracking**

In the `create<AudioState>` call, add after `onShotDetectedCallback: null,`:

```typescript
  sessionDetections: [],
  sessionStartTime: null,
```

**Step 4: Update the start() function to accumulate detections**

Replace the subscription callback in `start:` with:

```typescript
  start: () => {
    if (get().isListening) return;

    const moduleLoaded = isModuleAvailable();
    console.log('[AudioStore] Module loaded:', moduleLoaded);
    if (!moduleLoaded) {
      console.warn('[AudioStore] Native module not available - run `npx expo run:ios` to rebuild');
      return;
    }

    // Subscribe to native events
    subscription = onShotDetected((event) => {
      // Update last detection and count
      set((state) => ({
        lastDetection: event,
        detectionCount: state.detectionCount + 1,
      }));

      // Accumulate for session correlation
      const detection: AudioDetection = {
        timestamp: event.timestamp,
        confidence: event.confidence,
        peakEnergy: event.peakEnergy,
      };

      set((state) => ({
        sessionDetections: [...state.sessionDetections, detection],
      }));

      // Call registered callback (for session integration)
      const callback = get().onShotDetectedCallback;
      if (callback) {
        callback(event);
      }
    });

    startShotAudio();
    set({ isListening: true });
    console.log('[AudioStore] Started listening - waiting for native module events');
  },
```

**Step 5: Add session action implementations**

Add before the closing `}))`:

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

**Step 6: Update reset() to clear session data**

Update the `reset:` function:

```typescript
  reset: () => {
    get().stop();
    set({
      lastDetection: null,
      detectionCount: 0,
      onShotDetectedCallback: null,
      sessionDetections: [],
      sessionStartTime: null,
    });
    console.log('[AudioStore] Reset');
  },
```

**Step 7: Add selector hooks at bottom of file**

Add after existing selector hooks:

```typescript
export const useSessionDetections = () => useAudioStore((s) => s.sessionDetections);
export const useSessionStartTime = () => useAudioStore((s) => s.sessionStartTime);
```

**Step 8: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Commit**

```bash
git add stores/audioStore.tsx
git commit -m "feat(audio): add session tracking to audio store"
```

---

## Task 5: Export Correlation Service

**Files:**
- Create: `services/session/index.ts` (if doesn't exist) OR modify existing

**Step 1: Check if index exists and add export**

If `services/session/index.ts` exists, add:

```typescript
export { correlateShots } from './shotCorrelation';
export type { CorrelationResult, CorrelatedShot, AudioDetection, CorrelationConfig } from '@/types/audio';
```

If it doesn't exist, create it with:

```typescript
/**
 * Session Services
 *
 * Re-exports for session-related services.
 */

export { correlateShots } from './shotCorrelation';
```

**Step 2: Commit**

```bash
git add services/session/index.ts
git commit -m "feat(audio): export correlation service from session index"
```

---

## Task 6: Integration Test - Full Flow

**Files:**
- Create: `services/session/__tests__/shotCorrelation.integration.test.ts`

**Step 1: Write integration test**

```typescript
/**
 * Shot Correlation Integration Tests
 *
 * Tests realistic scenarios matching real-world shooting range conditions.
 */

import { correlateShots } from '../shotCorrelation';
import type { AudioDetection } from '@/types/audio';

describe('Shot Correlation - Real World Scenarios', () => {
  describe('Solo shooter at quiet range', () => {
    it('should achieve 100% correlation when alone', () => {
      // User fires 10 shots, audio only picks up their shots
      const watchTimestamps = [
        1000, 3500, 6200, 8800, 11500,
        14200, 17000, 19500, 22100, 25000,
      ];

      // Audio detections are slightly delayed (10-50ms typical)
      const audioDetections: AudioDetection[] = watchTimestamps.map((ts) => ({
        timestamp: ts + Math.floor(Math.random() * 40) + 10,
        confidence: 0.85 + Math.random() * 0.1,
        peakEnergy: 0.6 + Math.random() * 0.2,
      }));

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.summary.totalUserShots).toBe(10);
      expect(result.summary.totalDistantShots).toBe(0);
      expect(result.summary.correlationRate).toBe(1);
    });
  });

  describe('Busy range with multiple shooters', () => {
    it('should correctly identify user shots among distant shots', () => {
      // User fires 5 shots
      const watchTimestamps = [2000, 8000, 15000, 22000, 30000];

      // Audio picks up user shots + 8 distant shots
      const audioDetections: AudioDetection[] = [
        // Distant shot
        { timestamp: 500, confidence: 0.5, peakEnergy: 0.2 },
        // User shot (matches 2000)
        { timestamp: 2030, confidence: 0.9, peakEnergy: 0.7 },
        // Distant shots
        { timestamp: 4500, confidence: 0.4, peakEnergy: 0.15 },
        { timestamp: 6000, confidence: 0.45, peakEnergy: 0.18 },
        // User shot (matches 8000)
        { timestamp: 7980, confidence: 0.88, peakEnergy: 0.68 },
        // Distant shot
        { timestamp: 10000, confidence: 0.5, peakEnergy: 0.2 },
        // User shot (matches 15000)
        { timestamp: 15050, confidence: 0.92, peakEnergy: 0.75 },
        // Distant shots
        { timestamp: 18000, confidence: 0.48, peakEnergy: 0.19 },
        { timestamp: 20000, confidence: 0.52, peakEnergy: 0.21 },
        // User shot (matches 22000)
        { timestamp: 22020, confidence: 0.87, peakEnergy: 0.65 },
        // Distant shots
        { timestamp: 25000, confidence: 0.47, peakEnergy: 0.17 },
        { timestamp: 28000, confidence: 0.51, peakEnergy: 0.2 },
        // User shot (matches 30000)
        { timestamp: 29990, confidence: 0.91, peakEnergy: 0.72 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.summary.totalUserShots).toBe(5);
      expect(result.summary.totalDistantShots).toBe(8);
      expect(result.summary.correlationRate).toBe(1);

      // Verify user shots have high confidence/energy
      result.userShots.forEach((shot) => {
        expect(shot.confidence).toBeGreaterThan(0.85);
        expect(shot.peakEnergy).toBeGreaterThan(0.6);
      });

      // Verify distant shots have lower confidence/energy
      result.distantShots.forEach((shot) => {
        expect(shot.confidence).toBeLessThan(0.6);
        expect(shot.peakEnergy).toBeLessThan(0.3);
      });
    });
  });

  describe('Suppressed firearm scenario', () => {
    it('should count watch-only as user shots', () => {
      // User fires 5 suppressed shots - watch detects all, audio detects none
      const watchTimestamps = [1000, 3000, 5000, 7000, 9000];
      const audioDetections: AudioDetection[] = [];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(0);
      expect(result.watchOnlyShots).toHaveLength(5);
      expect(result.summary.totalUserShots).toBe(5); // Watch-only counts as user
      expect(result.summary.correlationRate).toBe(0);
    });
  });

  describe('Rapid fire drill', () => {
    it('should handle shots 200ms apart', () => {
      // 5 shots, 200ms apart (fast but not crazy)
      const watchTimestamps = [1000, 1200, 1400, 1600, 1800];
      const audioDetections: AudioDetection[] = [
        { timestamp: 1020, confidence: 0.9, peakEnergy: 0.7 },
        { timestamp: 1220, confidence: 0.88, peakEnergy: 0.68 },
        { timestamp: 1380, confidence: 0.91, peakEnergy: 0.72 },
        { timestamp: 1610, confidence: 0.87, peakEnergy: 0.66 },
        { timestamp: 1790, confidence: 0.89, peakEnergy: 0.69 },
      ];

      const result = correlateShots(watchTimestamps, audioDetections);

      expect(result.userShots).toHaveLength(5);
      expect(result.summary.correlationRate).toBe(1);
    });
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- services/session/__tests__/shotCorrelation.integration.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add services/session/__tests__/shotCorrelation.integration.test.ts
git commit -m "test(audio): add real-world scenario integration tests"
```

---

## Task 7: Final Verification

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(audio): complete audio-watch shot correlation

Implements post-session correlation between phone audio detections
and Garmin watch accelerometer data to classify shots as user's or distant.

- Add AudioDetection, CorrelatedShot, CorrelationResult types
- Implement correlateShots() with 200ms matching window
- Add session tracking to audioStore (startSession, endSession)
- Full test coverage including real-world scenarios

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary of Files

| File | Action | Purpose |
|------|--------|---------|
| `types/audio.ts` | Create | Type definitions |
| `services/session/shotCorrelation.ts` | Create | Correlation algorithm |
| `services/session/__tests__/shotCorrelation.test.ts` | Create | Unit tests |
| `services/session/__tests__/shotCorrelation.integration.test.ts` | Create | Integration tests |
| `services/session/index.ts` | Create/Modify | Re-export |
| `stores/audioStore.tsx` | Modify | Session tracking |

## Next Steps (Not in this plan)

1. **Wire into Garmin handler** - Call `correlateShots()` when session ends
2. **UI** - Display user vs distant shot counts
3. **Persistence** - Store correlation data in Supabase
