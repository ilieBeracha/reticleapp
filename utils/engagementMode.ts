/**
 * Engagement Mode Utilities
 *
 * Runtime functions for engagement mode enforcement.
 */

import type { DrillGoal } from '@/types/drillGoal';
import type { EngagementMode } from '@/types/engagementMode';

// ============================================================================
// ENGAGEMENT MODE GUARD (MANDATORY)
// ============================================================================

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
