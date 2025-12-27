/**
 * Constants for Active Session Screen
 */

// ============================================================================
// TIMING
// ============================================================================
export const TIMER_INTERVAL_MS = 1000;
export const SESSION_TIMEOUT_HOURS = 2;

// ============================================================================
// WATCH RETRY
// ============================================================================
export const WATCH_RETRY_COUNT = 3;
export const WATCH_RETRY_DELAY_MS = 2000;

// ============================================================================
// AUTO SHOT DETECTION (sent to watch)
// ============================================================================
export const AUTO_DETECT_ENABLED = true;
export const SHOT_SENSITIVITY_DEFAULT = 0.5; // G-force threshold

// ============================================================================
// COLORS
// ============================================================================
export const COLORS = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  accent: '#93C5FD',
  successBg: 'rgba(16,185,129,0.15)',
  warningBg: 'rgba(245,158,11,0.15)',
  errorBg: 'rgba(239,68,68,0.15)',
  accentBg: 'rgba(147,197,253,0.15)',
} as const;

// ============================================================================
// UI SIZES
// ============================================================================
export const SIZES = {
  closeButtonSize: 36,
  liveDotSize: 8,
  drillTypeIconSize: 32,
  watchIconBgSize: 112,
  statusIconSize: 88,
  emptyIconSize: 72,
} as const;

// ============================================================================
// ANIMATION DELAYS (ms)
// ============================================================================
export const ANIMATION = {
  fadeInDuration: 300,
  fadeInDownDelay: 50,
  fadeInDownDuration: 400,
  targetItemDelay: 50,
  targetItemDuration: 300,
} as const;

// ============================================================================
// ACCURACY THRESHOLDS
// ============================================================================
export const ACCURACY_THRESHOLDS = {
  high: 70,
  medium: 50,
} as const;

