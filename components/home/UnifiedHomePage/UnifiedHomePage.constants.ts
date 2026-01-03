/**
 * UnifiedHomePage Constants
 * 
 * Static values and configuration for the unified home page.
 */

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

/** Recent sessions limit */
export const RECENT_SESSIONS_LIMIT = 5;

/** Days to fetch sessions */
export const SESSION_FETCH_DAYS = 7;
export const SESSION_FETCH_LIMIT = 20;

/** Streak threshold for display */
export const STREAK_DISPLAY_THRESHOLD = 2;

/** Color codes used in cards */
export const COLORS = {
  live: '#22C55E',
  liveBackground: 'rgba(249, 115, 22, 0.15)',
  orange: '#F97316',
  red: '#EF4444',
} as const;

