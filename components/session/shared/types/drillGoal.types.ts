/**
 * Drill Goal Types
 *
 * WHAT you're measuring in a session.
 *
 * CANONICAL RULE:
 * - grouping = shot dispersion/consistency → ALWAYS solo
 * - engagement = hit accuracy/speed → can be solo OR squad
 */

export type DrillGoal = 'grouping' | 'engagement';

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
