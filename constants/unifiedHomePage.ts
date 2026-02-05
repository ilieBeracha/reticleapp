/**
 * UnifiedHomePage Constants
 *
 * Static values and configuration for the unified home page.
 * Optimized for both personal and team modes.
 */

// ═══════════════════════════════════════════════════════════════════════════
// UI CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Card border radius */
export const CARD_RADIUS = 14;

/** Small element border radius */
export const SMALL_RADIUS = 12;

/** Icon sizes */
export const ICON_SIZES = {
  small: 12,
  medium: 14,
  large: 18,
  xlarge: 22,
} as const;

/** Avatar dimensions */
export const AVATAR_SIZE = 44;

/** Badge dimensions */
export const WATCH_BADGE_SIZE = 32;

/** Color codes used in cards */
export const COLORS = {
  live: '#22C55E',
  liveBackground: 'rgba(249, 115, 22, 0.15)',
  orange: '#F97316',
  red: '#EF4444',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAL MODE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/** Personal mode: Days of session history to fetch */
export const PERSONAL_SESSION_FETCH_DAYS = 14;

/** Personal mode: Max sessions to fetch */
export const PERSONAL_SESSION_FETCH_LIMIT = 50;

/** Personal mode: Recent sessions to show in activity list */
export const PERSONAL_RECENT_SESSIONS_LIMIT = 5;

// ═══════════════════════════════════════════════════════════════════════════
// TEAM MODE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/** Team mode: Days of session history (longer for team analytics) */
export const TEAM_SESSION_FETCH_DAYS = 60;

/** Team mode: Max sessions to fetch (all team members combined) */
export const TEAM_SESSION_FETCH_LIMIT = 500;

/** Team mode: Recent sessions to show in activity list */
export const TEAM_RECENT_SESSIONS_LIMIT = 10;

/** Team mode: Max upcoming trainings to display */
export const TEAM_UPCOMING_TRAININGS_LIMIT = 5;

/** Team mode: Max members to show in quick view */
export const TEAM_MEMBERS_PREVIEW_LIMIT = 6;

/** Team mode: Days for "this week" stats calculation */
export const TEAM_STATS_DAYS = 7;

/** Team mode: Days for trend comparison (this week vs last week) */
export const TEAM_TREND_COMPARISON_DAYS = 14;

// ═══════════════════════════════════════════════════════════════════════════
// SHARED CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/** Recent sessions limit (use mode-specific constants instead) */
export const RECENT_SESSIONS_LIMIT = 5;

/** Legacy: Default session fetch days */
export const SESSION_FETCH_DAYS = 30;

/** Legacy: Default session fetch limit */
export const SESSION_FETCH_LIMIT = 100;

/** Streak threshold for display (show streak badge after N days) */
export const STREAK_DISPLAY_THRESHOLD = 2;

/** Loading debounce for context switches (prevents flash) */
export const CONTEXT_SWITCH_LOADING_DELAY_MS = 150;

/** Minimum accuracy % to show improvement suggestions */
export const MIN_ACCURACY_THRESHOLD = 70;

/** Sessions needed before showing stats */
export const MIN_SESSIONS_FOR_STATS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get fetch configuration based on mode
 */
export function getFetchConfig(isTeamMode: boolean) {
  return {
    days: isTeamMode ? TEAM_SESSION_FETCH_DAYS : PERSONAL_SESSION_FETCH_DAYS,
    limit: isTeamMode ? TEAM_SESSION_FETCH_LIMIT : PERSONAL_SESSION_FETCH_LIMIT,
    recentLimit: isTeamMode ? TEAM_RECENT_SESSIONS_LIMIT : PERSONAL_RECENT_SESSIONS_LIMIT,
  };
}
