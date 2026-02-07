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
