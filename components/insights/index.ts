/**
 * Insights Components
 *
 * Main exports for the Insights page.
 */

// Main Dashboard
export { default, InsightsDashboard } from './InsightsDashboard';

// Filter Bar
export { InsightsFilterBar } from './InsightsFilterBar';

// Evidence Sheet
export { EvidenceSheet } from './EvidenceSheet';

// Sections
export {
  RecommendationsSection,
  StrengthsSection,
  TotalsSection,
  TrendsSection,
  WeaknessesSection
} from './sections';

// Engine
export { applyFilters, computeInsights } from './insights.engine';

// Types
export type {
  ComputedInsights,
  ConfidenceLevel,
  EvidenceContext,
  FilterPreset,
  InsightMetric,
  InsightsFilters,
  Recommendation,
  StrengthCard,
  TotalsMetric,
  TrendData,
  WeaknessCard
} from './insights.types';

export { DEFAULT_FILTERS, DISTANCE_BUCKETS } from './insights.types';

// Change Rules
export {
  ACCURACY_CHANGE_THRESHOLD, detectAccuracyChange,
  detectGroupingChange,
  detectVolumeChange,
  formatDelta,
  getConfidence,
  getDeltaColor, GROUPING_CHANGE_THRESHOLD,
  MIN_BASELINE_SESSIONS,
  MIN_SHOTS_FOR_CATEGORY,
  RECENT_SESSION_COUNT, shouldShowExplain
} from './changeRules';

// Legacy Components (for backwards compatibility)
export { CompletionCard } from './CompletionCard';
export { HeroStatsRow } from './HeroStatsRow';
export { InsightsHeader } from './InsightsHeader';
export { MiniStatsRow } from './MiniStatsRow';
export { EmptyState, RecentSessionsSection } from './RecentSessionsSection';
export { StreakCard } from './StreakCard';
export { WeeklyActivityChart } from './WeeklyActivityChart';

// Hooks
export { useInsightsData } from './hooks';

// Legacy Types
export type {
  DailyCount,
  SessionStats,
  StreakDay,
  ThemeColors,
  TotalTime
} from './types';

