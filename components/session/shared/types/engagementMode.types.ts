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
 * - Engagement drills can be solo or squad
 * - Squad mode is async-only (no live presence required)
 * - Participants acknowledge/consent, shooter executes alone
 */

import type { DrillGoal } from './drillGoal.types';

/**
 * Engagement mode: solo (individual) or squad (async team participation)
 */
export type EngagementMode = 'solo' | 'squad';

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
 * Check if a session should show the engagement mode toggle
 */
export function shouldShowEngagementModeToggle(drillGoal: DrillGoal | null | undefined): boolean {
  // Only show toggle for engagement drills (grouping is always solo)
  return isSquadAllowed(drillGoal);
}
