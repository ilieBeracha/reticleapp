/**
 * UnifiedHomePage Barrel Export
 *
 * Clean imports for the unified home page module.
 */

export { default, UnifiedHomePage } from './UnifiedHomePage';
export { useUnifiedHomePage } from './useUnifiedHomePage';

// Types
export type {
  ActiveSessionCardProps, CoachMessageContext, CoachMessageProps, Colors, HomeHeaderProps, RecentActivitySectionProps, RecentSessionRowProps, StartPracticeCardProps, TeamSectionProps, TeamTrainingCardProps, WeeklyStats, WeeklyStatsCardProps
} from './UnifiedHomePage.types';

// Helpers (for external use if needed)
export {
  calculateLastSessionDaysAgo, calculateStreak, calculateWeeklyStats, formatDuration, formatTimeAgo, getCoachMessage, getGreeting,
  getStartPracticeSubtitle
} from './UnifiedHomePage.helpers';

// Constants
export {
  AVATAR_SIZE, CARD_RADIUS, COLORS, ICON_SIZES, RECENT_SESSIONS_LIMIT,
  SESSION_FETCH_DAYS,
  SESSION_FETCH_LIMIT, SMALL_RADIUS, STREAK_DISPLAY_THRESHOLD, WATCH_BADGE_SIZE
} from './UnifiedHomePage.constants';

// Sub-components (for advanced use cases)
export {
  ActiveSessionCard, CoachMessage, HomeHeader, PersonalSection, RecentActivitySection, RecentSessionRow, StartPracticeCard, TeamSection, TeamTrainingCard, WeeklyStatsCard
} from './components';

