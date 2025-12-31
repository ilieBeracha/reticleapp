// ============================================================================
// WATCH PAYLOAD TYPES - Two-Phase Sync Protocol
// ============================================================================
//
// Phase 1: SESSION_SUMMARY (~800 bytes) - Instant display
// Phase 2: SESSION_DETAILS (~500 bytes) - Background merge
//
// These types match the Monkey C PayloadBuilder output from the watch.
// ============================================================================

/**
 * Phase 1: Watch SUMMARY payload - sent immediately after session ends.
 * Optimized for instant display (~800 bytes for 50 shots).
 */
export interface WatchSummaryPayload {
  /** Session ID */
  sid: string;
  /** Unix timestamp (seconds) */
  ts: number;
  /** Total shots recorded */
  shots: number;
  /** Hits recorded (user-entered or auto) */
  hits: number;
  /** Duration in milliseconds */
  dur: number;
  /** Distance in meters */
  dist: number;
  /** Session completed flag */
  done: boolean;
  /** Raw split times in milliseconds */
  splits: number[];
  /** Performance summary */
  perf: {
    /** First shot time (ms from session start) */
    first: number;
    /** Best (fastest) split (ms) */
    best: number;
    /** Worst (slowest) split (ms) */
    worst: number;
    /** Average split (ms) */
    avg: number;
  };
  /** Biometrics summary */
  bio: {
    /** Average heart rate */
    hrAvg: number;
    /** Minimum heart rate */
    hrMin: number;
    /** Maximum heart rate */
    hrMax: number;
    /** Average breath rate */
    brAvg: number;
  };
  /** Steadiness summary */
  steady: {
    /** Average steadiness score (0-100) */
    avg: number;
    /** Trend direction */
    trend: 'improving' | 'declining' | 'stable' | 'unknown';
    /** Flinch count */
    flinch: number;
  };
}

/**
 * Per-shot data in details payload.
 * Compact format: ~10 bytes per shot.
 */
export interface WatchShotData {
  /** Shot number (1-indexed) */
  n: number;
  /** Timestamp in ms from session start */
  t: number;
  /** Heart rate at shot moment */
  hr: number;
  /** Steadiness score (0-100) */
  st: number;
  /** Flinch flag (0 or 1) */
  fl: 0 | 1;
}

/**
 * Phase 2: Watch DETAILS payload - sent after summary ACK.
 * Contains per-shot data and detection metadata (~500 bytes for 50 shots).
 */
export interface WatchDetailsPayload {
  /** Session ID (must match summary) */
  sid: string;
  /** Per-shot biometrics/steadiness data */
  shotData: WatchShotData[];
  /** Detection metadata */
  meta: {
    /** Auto-detection was enabled */
    auto: boolean;
    /** Detection sensitivity used */
    sens: number;
    /** Manual override count */
    overrides: number;
  };
}

// ============================================================================
// INTERNAL TRANSFORMED FORMAT - What gets stored in DB
// ============================================================================

/**
 * Transformed watch session data - internal format for storage.
 * This is the unified structure used by saveWatchSessionData.
 */
export interface TransformedWatchData {
  sessionId: string;
  shotsRecorded: number;
  hitsRecorded: number;
  durationMs: number;
  distance: number;
  completed: boolean;

  // Split times (raw from watch)
  splitTimes: number[];
  avgSplitMs: number;

  // Performance
  performance: {
    firstShotTime: number;
    bestSplit: number;
    worstSplit: number;
    avgSplit: number;
  };

  // Biometrics summary
  biometrics: {
    enabled: boolean;
    summary: {
      avgHR: number;
      minHR: number;
      maxHR: number;
      avgBreathRate: number;
    };
  };

  // Steadiness summary
  steadiness: {
    enabled: boolean;
    avgScore: number;
    trend: string;
    flinchCount: number;
  };

  // Per-shot data (from details phase)
  shotBiometrics?: Array<{
    shot: number;
    timestamp: number;
    hr: number;
    steadiness: number;
    flinch: boolean;
  }>;

  // Detection metadata (from details phase)
  autoDetected?: boolean;
  detectionSensitivity?: number;
  manualOverrides?: number;

  // Sync status
  isSummaryOnly: boolean;
  detailsMerged: boolean;
}

// ============================================================================
// ACK PAYLOADS - Sent back to watch
// ============================================================================

/**
 * ACK payload for summary phase.
 */
export interface SummaryAckPayload {
  sessionId: string;
  type: 'summary';
  status: 'received' | 'error';
  error?: string;
}

/**
 * ACK payload for details phase.
 */
export interface DetailsAckPayload {
  sessionId: string;
  type: 'details';
  status: 'received' | 'error';
  error?: string;
}

