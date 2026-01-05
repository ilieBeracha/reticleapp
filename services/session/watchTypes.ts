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
  /** Biometrics summary (v2 nested format) */
  bio: {
    /** Heart rate metrics */
    hr: {
      avg: number;
      min: number;
      max: number;
      start: number;
      end: number;
    };
    /** Stress metrics */
    stress: {
      avg: number;
      min: number;
      max: number;
    };
    /** Breath metrics */
    breath: {
      avg: number;
      /** Source: "native" = device sensor, "estimated" = HRV-derived, "none" = unavailable */
      source?: 'native' | 'estimated' | 'none';
    };
  } | {
    // Legacy flat format (backward compat)
    hrAvg: number;
    hrMin: number;
    hrMax: number;
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
    /** Steadiness at shot moments (average) */
    shots?: number;
  };
  /** Detection metadata (v2 - moved from SESSION_DETAILS) */
  detection?: {
    /** Was auto-detection enabled? */
    auto: boolean;
    /** Detection sensitivity (1-5) */
    sens: number;
    /** Manual shot count overrides by user */
    overrides: number;
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
      startHR?: number;
      endHR?: number;
      avgBreathRate: number;
      /** Source: "native" = device sensor, "estimated" = HRV-derived, "none" = unavailable */
      breathingSource?: 'native' | 'estimated' | 'none';
      avgStress?: number;
      minStress?: number;
      maxStress?: number;
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
// PHASE 3: TIMELINE CHUNK PAYLOAD
// ============================================================================

/**
 * Event types in timeline points.
 * 0 = regular biometric sample (every 3 seconds)
 * 1 = shot fired
 * 2 = hit confirmed
 */
export type TimelineEventType = 0 | 1 | 2;

/**
 * Timeline point format: [timestamp_sec, hr, breathRate, stress, eventType]
 * Compact array format from watch (~5 bytes per point).
 */
export type TimelinePoint = [number, number, number, number, TimelineEventType];

/**
 * Shot detail from timeline - only in last chunk.
 * Contains detailed biometrics at exact shot moment.
 */
export interface TimelineShotDetail {
  /** Shot number (1-indexed) */
  n: number;
  /** Timestamp in seconds from session start */
  t: number;
  /** Heart rate at shot moment */
  hr: number;
  /** Breath rate at shot moment */
  br: number;
  /** Breath phase: 0=inhale, 1=exhale, 2=pause */
  bp: 0 | 1 | 2;
  /** Stress score (0-100) */
  st: number;
  /** Steadiness score (0-100, higher = better) */
  sd: number;
  /** Flinch detected: 0=no, 1=yes */
  fl: 0 | 1;
}

/**
 * Phase 3: Watch TIMELINE_CHUNK payload - sent in chunks after details ACK.
 * Contains time-series biometric data (~25 points per chunk).
 */
export interface WatchTimelineChunkPayload {
  /** Session ID (must match summary/details) */
  sid: string;
  /** Chunk index (0-indexed) */
  chunk: number;
  /** Total number of chunks */
  total: number;
  /** Timeline points for this chunk */
  pts: TimelinePoint[];
  /** Shot details - ONLY present in the last chunk (chunk === total - 1) */
  shots?: TimelineShotDetail[];
}

/**
 * Assembled timeline data after all chunks received.
 * This is the internal format for storage and visualization.
 */
export interface AssembledTimelineData {
  sessionId: string;
  /** All timeline points merged from chunks */
  points: TimelinePoint[];
  /** Shot details from last chunk */
  shotDetails: TimelineShotDetail[];
  /** Metadata */
  totalChunks: number;
  receivedAt: string;
}

/**
 * Timeline point in expanded/readable format for storage/display.
 */
export interface TimelinePointExpanded {
  /** Seconds from session start */
  timestamp: number;
  /** Heart rate BPM */
  heartRate: number;
  /** Breath rate (breaths/min) */
  breathRate: number;
  /** Stress score (0-100, higher = more stressed) */
  stress: number;
  /** Event type: 'sample' | 'shot' | 'hit' */
  eventType: 'sample' | 'shot' | 'hit';
}

/**
 * Shot detail in expanded/readable format for storage/display.
 */
export interface ShotDetailExpanded {
  /** Shot number (1-indexed) */
  shotNumber: number;
  /** Seconds from session start */
  timestamp: number;
  /** Heart rate at shot */
  heartRate: number;
  /** Breath rate at shot */
  breathRate: number;
  /** Breath phase at shot */
  breathPhase: 'inhale' | 'exhale' | 'pause';
  /** Stress score (0-100) */
  stress: number;
  /** Steadiness score (0-100) */
  steadiness: number;
  /** Flinch detected */
  flinch: boolean;
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

/**
 * ACK payload for timeline chunk.
 */
export interface TimelineAckPayload {
  sessionId: string;
  type: 'timeline';
  status: 'received' | 'error';
  chunk?: number;
  error?: string;
}

