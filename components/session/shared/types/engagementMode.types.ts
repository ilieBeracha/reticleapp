/**
 * Engagement Mode Types
 *
 * HOW the session is executed.
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * CANONICAL RULES:
 * - Grouping drills are ALWAYS solo (non-negotiable)
 * - Engagement drills can be solo, squad, or group
 * - Squad mode is async-only (no live presence required)
 * - Group mode is simple totals (participants enter shots/hits manually)
 * - Participants acknowledge/consent, shooter executes alone
 */

import type { DrillGoal } from './drillGoal.types';

/**
 * Engagement mode:
 * - solo: individual execution
 * - squad: async team with detailed target tracking
 * - group: async team with simple shot/hit entry per person
 */
export type EngagementMode = 'solo' | 'squad' | 'group';

/**
 * Enforce engagement mode based on drill goal.
 *
 * CANONICAL RULE: Grouping is ALWAYS solo.
 *
 * @param drillGoal - The drill goal (grouping or engagement)
 * @param requested - The requested engagement mode (optional)
 * @returns The enforced engagement mode
 */
export function enforceEngagementMode(
  drillGoal: DrillGoal | null | undefined,
  requested?: EngagementMode
): EngagementMode {
  // Grouping is ALWAYS solo - this is non-negotiable
  if (drillGoal === 'grouping') {
    return 'solo';
  }
  // For engagement drills, use requested mode or default to solo
  return requested ?? 'solo';
}

/**
 * Check if squad mode is allowed for a drill goal
 */
export function isSquadAllowed(drillGoal: DrillGoal | null | undefined): boolean {
  // Squad only allowed for engagement drills
  return drillGoal === 'engagement';
}

/**
 * Check if group mode is allowed for a drill goal
 */
export function isGroupAllowed(drillGoal: DrillGoal | null | undefined): boolean {
  // Group only allowed for engagement drills
  return drillGoal === 'engagement';
}

/**
 * Check if team modes (squad or group) are allowed for a drill goal
 */
export function isTeamModeAllowed(drillGoal: DrillGoal | null | undefined): boolean {
  // Team modes (squad/group) only allowed for engagement drills
  return drillGoal === 'engagement';
}

/**
 * Check if a session should show the engagement mode toggle
 */
export function shouldShowEngagementModeToggle(drillGoal: DrillGoal | null | undefined): boolean {
  // Only show toggle for engagement drills (grouping is always solo)
  return isTeamModeAllowed(drillGoal);
}
