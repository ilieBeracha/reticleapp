/**
 * Shot Detection Event
 * Fired when an audio impulse matching shot characteristics is detected
 */
export interface ShotDetectionEvent {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Detection confidence 0-1 */
  confidence: number;
  /** Peak energy level of the impulse */
  peakEnergy: number;
  /** Detection source identifier */
  source: 'audio';
}

/**
 * Configuration for audio-based shot detection
 */
export interface AudioDetectionConfig {
  /** 
   * Energy threshold for detection (RMS power)
   * Higher = less sensitive, fewer false positives
   * @default 0.02
   */
  energyThreshold?: number;
  
  /**
   * Rise threshold for impulse detection (peak amplitude)
   * Higher = requires sharper transients
   * @default 0.015
   */
  riseThreshold?: number;
  
  /**
   * Cooldown period between detections in milliseconds
   * Prevents double-counting rapid shots
   * @default 200
   */
  cooldownMs?: number;
}

/**
 * Callback type for shot detection events
 */
export type ShotDetectionListener = (event: ShotDetectionEvent) => void;
