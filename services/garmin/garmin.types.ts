/**
 * Garmin Connect IQ Types
 *
 * All type definitions for Garmin watch communication.
 * Extracted from garminService.ts for better organization.
 */

import type { Device } from 'react-native-garmin-connect';

// ============================================================================
// DEVICE & CONNECTION TYPES
// ============================================================================

export type GarminDevice = Device & {
  /** True if device info exists but needs re-pairing via Garmin Connect Mobile */
  needsRepairing?: boolean;
};

export type GarminConnectionStatus =
  | 'UNKNOWN'
  | 'CONNECTED'
  | 'ONLINE'
  | 'OFFLINE'
  | 'ACK'
  | 'PONG';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/** Message types sent TO the watch */
export type GarminOutboundMessageType =
  | 'SESSION_START'  // Start session on watch (watch expects this exact string)
  | 'SESSION_END'    // End session on watch (watch expects this exact string)
  | 'SYNC_DRILL'
  | 'PING'
  | 'HEARTBEAT'      // Connection health check (watch responds with HEARTBEAT_ACK)
  | 'WEATHER'        // Send weather data to watch
  | 'ACK';           // Acknowledge receipt of SESSION_RESULT/SUMMARY/TIMELINE

/** Message types received FROM the watch */
export type GarminInboundMessageType =
  | 'SESSION_DATA'
  | 'SESSION_RESULT'  // Watch sends this when session ends (auto or manual) - LEGACY
  | 'SESSION_SUMMARY' // Phase 1: Thin summary for instant display (~300 bytes)
  | 'SESSION_DETAILS' // Phase 2: Full data sent in background (timelines, per-shot)
  | 'TIMELINE_CHUNK'  // Phase 3: Time-series biometric data (sent in chunks)
  | 'SHOT_RECORDED'
  | 'SESSION_ENDED'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'   // Response to HEARTBEAT with connection health
  | 'PONG';

// ============================================================================
// PERFORMANCE & BIOMETRICS TYPES
// ============================================================================

/** Performance analytics from watch */
export interface GarminPerformance {
  firstShotTime?: number;      // Time from START to first shot (ms)
  bestSplit?: number;          // Fastest split time (ms)
  worstSplit?: number;         // Slowest split time (ms)
  splitStdDev?: number;        // Standard deviation of splits (ms)
  shotsPerMinute?: number;     // Rate of fire x10 (divide by 10)
  parDelta?: number;           // Difference from par time (ms)
  warmupAvg?: number;          // First 3 shots avg steadiness
  restAvg?: number;            // Remaining shots avg steadiness
  lastThreeAvg?: number;       // Last 3 shots avg (fatigue indicator)
}

/** Biometrics summary from watch */
export interface BiometricsSummary {
  minHR?: number;
  maxHR?: number;
  avgHR?: number;
  avgBreathRate?: number;
  hrSamples?: number;
  breathSamples?: number;
  shotCount?: number;
  // Stress data (HRV-based)
  stressAvg?: number;          // 0-100, lower = more relaxed
  stressMin?: number;
  stressMax?: number;
  stressTrend?: 'increasing' | 'decreasing' | 'stable' | string;
  // Optimal shots (good conditions)
  optimalShots?: number;       // Shots with pause + stable HR + low stress
  optimalPct?: number;         // Percentage of optimal shots
}

/** Per-shot biometrics data */
export interface ShotBiometrics {
  shot: number;
  hr?: number;                 // HR at exact shot moment
  hrAvg?: number;              // 5-second avg HR before shot
  br?: number;                 // Breath rate (breaths/min)
  breathPhase?: 'inhale' | 'exhale' | 'pause' | string;
  hrTrend?: 'rising' | 'falling' | 'stable' | string;
  stress?: number;             // HRV stress score 0-100
  rmssd?: number;              // Raw HRV metric (deci-ms, divide by 10)
}

/** Full biometrics payload from watch */
export interface GarminBiometrics {
  enabled: boolean;
  summary?: BiometricsSummary;
  /** HR timeline: [timestamp_ms, heartRate, shotNumber] */
  hrTimeline?: [number, number, number][];
  /** Breath timeline: [timestamp_ms, breathRate, shotNumber] */
  breathTimeline?: [number, number, number][];
  /** Per-shot biometrics */
  shotBiometrics?: ShotBiometrics[];
}

// ============================================================================
// STEADINESS TYPES
// ============================================================================

/** Per-shot steadiness data */
export interface ShotSteadiness {
  shotNumber: number;
  score: number;
  grade: string;
  tremor?: number;             // High-freq micro-movements (0-100)
  sway?: number;               // Low-freq body sway (0-100)
  drift?: number;              // Gradual position change (0-100)
  samples?: number;
  anomaly?: boolean;
  // Flinch detection
  flinch?: boolean;            // Anticipation detected
  flinchMag?: number;          // Flinch magnitude (centi-G)
  // Recoil analysis
  recoilMag?: number;          // Peak recoil (centi-G)
  recoilDev?: number;          // Deviation from avg (%)
}

/** Full steadiness payload from watch */
export interface GarminSteadiness {
  enabled?: boolean;
  shotCount?: number;
  avgScore?: number;
  trend?: string;
  gradeDistribution?: Record<string, number>;
  // Flinch summary
  flinchCount?: number;        // Total shots with flinch
  flinchRate?: number;         // Percentage with flinch
  // Recoil consistency
  recoilConsistency?: number;  // 0-100, higher = more consistent
  // Best/worst shots
  bestShot?: number;
  bestScore?: number;
  worstShot?: number;
  worstScore?: number;
  // Per-shot data
  shots?: ShotSteadiness[];
  // Legacy format
  shotScores?: number[];
  timeline?: [number, number, number][];
}

// ============================================================================
// SESSION DATA TYPES
// ============================================================================

export interface GarminSessionData {
  /** Session ID (matches our DB session) */
  sessionId?: string;
  /** Total shots recorded by the watch (watch sends as shotsFired) */
  shotsRecorded: number;
  /** Hits recorded (if tracking enabled) */
  hitsRecorded?: number;
  /** Shot timestamps (ms since session start) */
  shotTimestamps?: number[];
  /** Split times between shots (ms) */
  splitTimes?: number[];
  /** Average time between shots (ms) */
  avgSplitMs?: number;
  /** Session duration (ms) - watch sends elapsedTime in seconds */
  durationMs?: number;
  /** Distance in meters (from watch) */
  distance?: number;
  /** Whether session was completed (max bullets reached) */
  completed?: boolean;
  /** Auto-detection enabled */
  autoDetected?: boolean;
  /** Detection sensitivity used */
  detectionSensitivity?: number;
  /** Manual override count */
  manualOverrides?: number;
  /** Heart rate data if available (legacy simple format) */
  heartRate?: {
    avg: number;
    max: number;
    min: number;
  };
  /** Performance analytics from watch */
  performance?: GarminPerformance;
  /** Full biometrics data from watch */
  biometrics?: GarminBiometrics;
  /** Steadiness data from watch */
  steadiness?: GarminSteadiness;
  /** True if this is summary-only data (details coming in Phase 2) */
  isSummaryOnly?: boolean;
}

export interface GarminInboundMessage {
  type: GarminInboundMessageType | string;
  payload?: unknown;
  sessionData?: GarminSessionData;
  timestamp?: number;
}

/** Timeline data from Phase 3 sync */
export interface GarminTimelineData {
  sessionId: string;
  points: Array<{
    timestamp: number;
    heartRate: number;
    breathRate: number;
    stress: number;
    eventType: 'sample' | 'shot' | 'hit';
  }>;
  shotDetails: Array<{
    shotNumber: number;
    timestamp: number;
    heartRate: number;
    breathRate: number;
    breathPhase: 'inhale' | 'exhale' | 'pause';
    stress: number;
    steadiness: number;
    flinch: boolean;
  }>;
  summary: {
    totalPoints: number;
    totalShots: number;
    durationSeconds: number;
    hrMin: number;
    hrMax: number;
    hrAvg: number;
    stressMin: number;
    stressMax: number;
    stressAvg: number;
  };
}

// ============================================================================
// SERVICE EVENT TYPES
// ============================================================================

/** Event types emitted by this service */
export type GarminServiceEvent =
  | { event: 'sdk_ready' }
  | { event: 'status_changed'; status: GarminConnectionStatus; reason?: string }
  | { event: 'devices_updated'; devices: GarminDevice[] }
  | { event: 'message_received'; message: GarminInboundMessage }
  | { event: 'session_data'; data: GarminSessionData }
  | { event: 'session_summary'; data: GarminSessionData }    // Phase 1: Thin summary for instant display
  | { event: 'session_details'; data: Partial<GarminSessionData> & { sessionId: string } }  // Phase 2: Full data to merge
  | { event: 'timeline_chunk'; sessionId: string; chunk: number; total: number }  // Phase 3: Progress update
  | { event: 'timeline_complete'; data: GarminTimelineData }  // Phase 3: All chunks received
  | { event: 'error'; error: Error };

export type GarminServiceListener = (event: GarminServiceEvent) => void;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface GarminConfig {
  /** Your app's URL scheme (e.g., 'retic', 'myapp') */
  urlScheme: string;
  /** Your ConnectIQ watch app UUID */
  appId: string;
}

// ============================================================================
// WATCH SESSION PAYLOAD TYPES
// ============================================================================

/** Detection configuration for shot auto-detection on watch */
export interface WatchDetectionConfig {
  /** Sensitivity value (0.0-1.0) */
  sensitivity: number;
  /** Minimum acceleration threshold (G-force) */
  minThreshold: number;
  /** Maximum acceleration threshold (G-force) */
  maxThreshold: number;
  /** Cooldown between shots (ms) */
  cooldownMs: number;
  /** Detection profile: 'handgun' | 'rifle' | 'shotgun' | 'custom' */
  profile: string;
}

/**
 * Configuration for starting a watch session.
 * Import WatchSessionConfig from @/utils/garminHelpers for building this.
 */
export interface StartWatchSessionPayload {
  sessionId: string;
  drillName: string;
  /** Brief description of drill goal (e.g., "6 shots under 2 seconds") */
  drillGoal?: string;
  /** Drill type: 'timed' | 'untimed' | 'par' | 'grouping' | 'custom' */
  drillType: string;
  /** Input method: 'manual' | 'auto' | 'watch' */
  inputMethod: string;
  /** Distance in meters */
  distance: number;
  /** Number of rounds/shots expected */
  rounds: number;
  /** Number of strings in drill */
  strings: number;
  /** Time limit in seconds (0 = no limit) */
  timeLimit: number;
  /** Par time in seconds (0 = no par) */
  parTime: number;
  /** Watch role: 'primary' = watch controls session, 'supplementary' = phone controls */
  watchMode: 'primary' | 'supplementary';
  /** Enable automatic shot detection */
  autoDetect?: boolean;
  /** Detection configuration (required if autoDetect is true) */
  detection?: WatchDetectionConfig;
  /** Legacy sensitivity value for backwards compatibility */
  sensitivity?: number;
  /** Enable EMKV (Extended Metric Key-Value) data */
  emkv?: boolean;
  /** Enable VRCV (Voice Recognition Command Verification) */
  vrcv?: boolean;
}

