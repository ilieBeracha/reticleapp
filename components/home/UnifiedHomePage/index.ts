/**
 * UnifiedHomePage Barrel Export
 * 
 * Clean imports for the unified home page module.
 */

export { UnifiedHomePage, default } from './UnifiedHomePage';
export { useUnifiedHomePage } from './useUnifiedHomePage';

// Types
export type {
  WeeklyStats,
  CoachMessageContext,
  Colors,
  WeeklyStatsCardProps,
  ActiveSessionCardProps,
  StartPracticeCardProps,
  TeamTrainingCardProps,
  RecentSessionRowProps,
  HomeHeaderProps,
  CoachMessageProps,
  TeamSectionProps,
  RecentActivitySectionProps,
} from './UnifiedHomePage.types';

// Helpers (for external use if needed)
export {
  getCoachMessage,
  formatTimeAgo,
  formatDuration,
  getGreeting,
  getStartPracticeSubtitle,
  calculateWeeklyStats,
  calculateStreak,
  calculateLastSessionDaysAgo,
} from './UnifiedHomePage.helpers';

// Constants
export {
  CARD_RADIUS,
  SMALL_RADIUS,
  ICON_SIZES,
  AVATAR_SIZE,
  WATCH_BADGE_SIZE,
  RECENT_SESSIONS_LIMIT,
  SESSION_FETCH_DAYS,
  SESSION_FETCH_LIMIT,
  STREAK_DISPLAY_THRESHOLD,
  COLORS,
} from './UnifiedHomePage.constants';

// Sub-components (for advanced use cases)
export {
  HomeHeader,
  CoachMessage,
  WeeklyStatsCard,
  ActiveSessionCard,
  StartPracticeCard,
  TeamTrainingCard,
  RecentSessionRow,
  TeamSection,
  RecentActivitySection,
  PersonalSection,
} from './components';

