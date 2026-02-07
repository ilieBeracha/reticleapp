/**
 * Drill Goal Utilities
 * 
 * Single source of truth for drill/session goal classification.
 * Use these utilities instead of spreading string comparisons everywhere.
 */

import type { DrillGoal } from '@/types/drillGoal';

// Import and re-export constants from centralized location
import { DRILL_GOAL } from '@/constants/drill';
export { DRILL_GOAL };

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a drill goal is "grouping" type.
 * 
 * Grouping drills focus on:
 * - Dispersion / group size (cm)
 * - Precision / consistency
 * - Shots detected from paper scan
 * - No accuracy percentage (all detected holes are "hits")
 */
export function isGroupingGoal(goal: DrillGoal | string | null | undefined): boolean {
  return goal === DRILL_GOAL.GROUPING;
}

/**
 * Check if a drill goal is "engagement" type.
 * 
 * Engagement drills focus on:
 * - Hits / accuracy percentage
 * - Target elimination
 * - Speed / time
 * - Shots typically from watch or manual entry
 */
export function isEngagementGoal(goal: DrillGoal | string | null | undefined): boolean {
  return goal === DRILL_GOAL.ENGAGEMENT;
}

// ============================================================================
// SIMPLE TYPE GUARDS (from shared/types/drillGoal.types.ts)
// ============================================================================

/**
 * Check if a drill goal is grouping
 */
export function isGrouping(goal: DrillGoal | null | undefined): boolean {
  return goal === 'grouping';
}

/**
 * Check if a drill goal is engagement
 */
export function isEngagement(goal: DrillGoal | null | undefined): boolean {
  return goal === 'engagement';
}

// ============================================================================
// EXTRACTORS - Get drill goal from various data structures
// ============================================================================

interface DrillConfig {
  drill_goal?: DrillGoal | string | null;
}

interface SessionLike {
  drill_config?: DrillConfig | null;
}

interface DrillLike {
  drill_goal?: DrillGoal | string | null;
}

/**
 * Extract drill goal from a session object.
 * Handles nested drill_config.drill_goal structure.
 */
export function getSessionDrillGoal(session: SessionLike | null | undefined): DrillGoal | null {
  const goal = session?.drill_config?.drill_goal;
  if (goal === 'grouping' || goal === 'engagement') {
    return goal;
  }
  return null;
}

/**
 * Extract drill goal from a drill/template object.
 */
export function getDrillGoal(drill: DrillLike | null | undefined): DrillGoal | null {
  const goal = drill?.drill_goal;
  if (goal === 'grouping' || goal === 'engagement') {
    return goal;
  }
  return null;
}

/**
 * Check if a session is a grouping session.
 * Convenience function combining extraction + check.
 */
export function isGroupingSession(session: SessionLike | null | undefined): boolean {
  return isGroupingGoal(getSessionDrillGoal(session));
}

/**
 * Check if a session is an engagement session.
 * Convenience function combining extraction + check.
 */
export function isEngagementSession(session: SessionLike | null | undefined): boolean {
  return isEngagementGoal(getSessionDrillGoal(session));
}

/**
 * Check if a drill is a grouping drill.
 */
export function isGroupingDrill(drill: DrillLike | null | undefined): boolean {
  return isGroupingGoal(getDrillGoal(drill));
}

/**
 * Check if a drill is an engagement drill.
 */
export function isEngagementDrill(drill: DrillLike | null | undefined): boolean {
  return isEngagementGoal(getDrillGoal(drill));
}

// ============================================================================
// SESSION ANALYSIS - Determine goal from session data (with legacy fallback)
// ============================================================================

/**
 * Stats shape for session analysis.
 */
interface SessionStats {
  best_dispersion_cm?: number | null;
}

/**
 * Session shape for grouping analysis.
 */
interface SessionForGroupingCheck {
  drill_config?: {
    drill_goal?: DrillGoal | string | null;
    target_type?: 'paper' | 'tactical' | string | null;
  } | null;
  stats?: SessionStats | null;
}

/**
 * Determine if a session is a grouping session.
 *
 * This handles both:
 * - Explicit drill_goal === 'grouping'
 * - Legacy fallback: paper target with dispersion data
 *
 * Use this for analytics/calculations where grouping sessions should be
 * excluded from accuracy calculations (they measure dispersion, not hits).
 */
export function isGroupingSessionWithFallback(session: SessionForGroupingCheck | null | undefined): boolean {
  if (!session) return false;

  // Explicit grouping goal
  if (session.drill_config?.drill_goal === 'grouping') {
    return true;
  }

  // Legacy fallback: paper target with dispersion data indicates grouping
  const isPaperTarget = session.drill_config?.target_type === 'paper';
  const hasDispersion = session.stats?.best_dispersion_cm != null;

  return isPaperTarget && hasDispersion;
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get display label for a drill goal.
 */
export function getDrillGoalLabel(goal: DrillGoal | string | null | undefined): string {
  if (isGroupingGoal(goal)) return 'Grouping';
  if (isEngagementGoal(goal)) return 'Engagement';
  return 'Unknown';
}

/**
 * Get short description for a drill goal.
 */
export function getDrillGoalDescription(goal: DrillGoal | string | null | undefined): string {
  if (isGroupingGoal(goal)) return 'Focus on precision and group size';
  if (isEngagementGoal(goal)) return 'Focus on accuracy and target hits';
  return '';
}

// ============================================================================
// METRICS HELPERS - What to show based on goal
// ============================================================================

interface MetricsConfig {
  /** Show accuracy percentage */
  showAccuracy: boolean;
  /** Show hits count */
  showHits: boolean;
  /** Show dispersion/group size */
  showDispersion: boolean;
  /** Show shots (always true, but source differs) */
  showShots: boolean;
  /** Shots come from scan for grouping, watch/manual for engagement */
  shotsSource: 'scan' | 'watch' | 'manual';
  /** Primary metric to highlight */
  primaryMetric: 'dispersion' | 'accuracy';
}

/**
 * Get metrics configuration based on drill goal.
 * Use this to determine what stats to display.
 */
export function getMetricsConfig(goal: DrillGoal | string | null | undefined): MetricsConfig {
  if (isGroupingGoal(goal)) {
    return {
      showAccuracy: false,
      showHits: false,
      showDispersion: true,
      showShots: true,
      shotsSource: 'scan',
      primaryMetric: 'dispersion',
    };
  }
  
  // Default to engagement metrics
  return {
    showAccuracy: true,
    showHits: true,
    showDispersion: false,
    showShots: true,
    shotsSource: 'watch',
    primaryMetric: 'accuracy',
  };
}

