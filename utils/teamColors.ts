/**
 * Team Colors Utility
 *
 * Generates professional, distinguishable colors for teams based on their ID.
 * Uses a palette of military/tactical-inspired colors that are:
 * - Professional and not childish
 * - Distinguishable from each other
 * - Work well in both light and dark modes
 */

// Professional color palette - military/tactical inspired
// Masculine, professional colors only - no pink, yellow, or bright pastels
const TEAM_COLOR_PALETTE = [
  '#3B82F6', // Blue - tactical
  '#10B981', // Emerald - tactical green
  '#8B5CF6', // Violet - command
  '#EF4444', // Red - priority
  '#06B6D4', // Cyan - tech
  '#F97316', // Orange - warm
  '#6366F1', // Indigo - deep
  '#14B8A6', // Teal - balanced
  '#A855F7', // Purple - royal
  '#64748B', // Slate - steel
  '#0EA5E9', // Sky blue - air force
  '#DC2626', // Crimson - tactical red
];

/**
 * Simple hash function for strings
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a team based on its ID
 * The same team ID will always return the same color
 */
export function getTeamColor(teamId: string): string {
  const hash = hashString(teamId);
  const index = hash % TEAM_COLOR_PALETTE.length;
  return TEAM_COLOR_PALETTE[index];
}

/**
 * Get team color with alpha transparency
 */
export function getTeamColorWithAlpha(teamId: string, alpha: number): string {
  const color = getTeamColor(teamId);
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${color}${alphaHex}`;
}

/**
 * Get a lighter version of the team color (for backgrounds)
 * Returns the color with 15% opacity
 */
export function getTeamColorLight(teamId: string): string {
  return getTeamColorWithAlpha(teamId, 0.15);
}

/**
 * Get a medium version of the team color (for borders)
 * Returns the color with 30% opacity
 */
export function getTeamColorMedium(teamId: string): string {
  return getTeamColorWithAlpha(teamId, 0.30);
}

/**
 * Default color for personal mode (when no team is active)
 */
export const PERSONAL_MODE_COLOR = '#6B7280'; // Gray - neutral
