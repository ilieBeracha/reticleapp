/**
 * Change Detection Rules
 * 
 * Defines what constitutes a "meaningful change" for insights.
 * These thresholds determine when to show change indicators and "Explain" buttons.
 * 
 * Philosophy:
 * - Changes below threshold = "stable" (no noise)
 * - Changes at/above threshold = worth highlighting
 * - "Explain" only appears when change is meaningful
 */

// ============================================================================
// COMPARISON WINDOWS
// ============================================================================

/**
 * How many recent sessions to compare against baseline
 */
export const RECENT_SESSION_COUNT = 5;

/**
 * Minimum baseline sessions required for valid comparison
 * Below this, we don't have enough historical data
 */
export const MIN_BASELINE_SESSIONS = 3;

/**
 * Minimum shots in a category to consider it valid
 * Prevents noise from 5 shots at a distance
 */
export const MIN_SHOTS_FOR_CATEGORY = 20;

// ============================================================================
// CHANGE THRESHOLDS
// ============================================================================

/**
 * Accuracy change threshold (percentage points)
 * ±5% is meaningful, anything less is noise
 */
export const ACCURACY_CHANGE_THRESHOLD = 5;

/**
 * Session count change threshold
 * ±2 sessions per period is meaningful
 */
export const SESSION_COUNT_CHANGE_THRESHOLD = 2;

/**
 * Shot count change threshold (percentage)
 * ±20% volume change is meaningful
 */
export const SHOT_VOLUME_CHANGE_THRESHOLD = 20;

/**
 * Grouping (dispersion) change threshold (cm)
 * ±0.5cm change in average grouping is meaningful
 */
export const GROUPING_CHANGE_THRESHOLD = 0.5;

/**
 * Time change threshold (percentage)
 * ±15% change in average session time is meaningful
 */
export const TIME_CHANGE_THRESHOLD = 15;

// ============================================================================
// CONFIDENCE LEVELS
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Determines confidence based on data volume
 */
export function getConfidence(shots: number, sessions: number): ConfidenceLevel {
  if (shots >= 100 && sessions >= 5) return 'high';
  if (shots >= 50 && sessions >= 3) return 'medium';
  return 'low';
}

// ============================================================================
// CHANGE DETECTION HELPERS
// ============================================================================

export interface ChangeResult {
  delta: number;
  isSignificant: boolean;
  direction: 'up' | 'down' | 'stable';
}

/**
 * Detect if accuracy change is meaningful
 */
export function detectAccuracyChange(current: number, baseline: number): ChangeResult {
  const delta = current - baseline;
  const isSignificant = Math.abs(delta) >= ACCURACY_CHANGE_THRESHOLD;
  
  return {
    delta,
    isSignificant,
    direction: isSignificant ? (delta > 0 ? 'up' : 'down') : 'stable',
  };
}

/**
 * Detect if volume (shot count) change is meaningful
 */
export function detectVolumeChange(current: number, baseline: number): ChangeResult {
  if (baseline === 0) {
    return { delta: 0, isSignificant: false, direction: 'stable' };
  }
  
  const deltaPercent = ((current - baseline) / baseline) * 100;
  const isSignificant = Math.abs(deltaPercent) >= SHOT_VOLUME_CHANGE_THRESHOLD;
  
  return {
    delta: Math.round(deltaPercent),
    isSignificant,
    direction: isSignificant ? (deltaPercent > 0 ? 'up' : 'down') : 'stable',
  };
}

/**
 * Detect if grouping change is meaningful
 */
export function detectGroupingChange(current: number, baseline: number): ChangeResult {
  const delta = current - baseline;
  const isSignificant = Math.abs(delta) >= GROUPING_CHANGE_THRESHOLD;
  
  // For grouping, smaller is better, so direction is inverted
  return {
    delta: Math.round(delta * 10) / 10,
    isSignificant,
    direction: isSignificant ? (delta < 0 ? 'up' : 'down') : 'stable', // Inverted!
  };
}

// ============================================================================
// DISPLAY RULES
// ============================================================================

/**
 * Should we show the "Explain" button?
 * Only when there's at least one meaningful change
 */
export function shouldShowExplain(changes: ChangeResult[]): boolean {
  return changes.some((c) => c.isSignificant);
}

/**
 * Format delta for display
 */
export function formatDelta(delta: number, suffix: string = '%'): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${suffix}`;
}

/**
 * Get color for delta based on direction
 * Note: For some metrics like grouping, "down" is good
 */
export function getDeltaColor(
  direction: 'up' | 'down' | 'stable',
  colors: { green: string; red: string; textMuted: string },
  invertedGood: boolean = false
): string {
  if (direction === 'stable') return colors.textMuted;
  
  const isGood = invertedGood ? direction === 'down' : direction === 'up';
  return isGood ? colors.green : colors.red;
}
