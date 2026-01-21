/**
 * Insights Types
 *
 * Type definitions for the redesigned Insights page.
 * Supports the five-section hierarchy: Totals, Strengths, Weaknesses, Trends, Recommendations.
 *
 * IMPORTANT: This module defines the type system for deterministic insights computation.
 * All types support evidence tracking (evidenceIds) and confidence scoring.
 */

import type { SessionWithDetails } from '@/services/session/types';

// ============================================================================
// FILTER TYPES
// ============================================================================

export type TimeFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

export type PositionFilter = 'all' | 'prone' | 'standing' | 'kneeling' | 'sitting';

export type DistanceFilter = 'all' | 'close' | 'medium' | 'long' | 'precision';

export type DrillTypeFilter = 'all' | 'grouping' | 'engagement' | 'stress';

// ============================================================================
// ENVIRONMENTAL FILTERS (Phase 1)
// ============================================================================

/** Wind speed buckets */
export type WindFilter = 'all' | 'calm' | 'light' | 'moderate' | 'strong';

/** Time of day buckets */
export type TimeOfDayFilter = 'all' | 'morning' | 'midday' | 'afternoon' | 'evening';

/** Environment type */
export type EnvironmentFilter = 'all' | 'indoor' | 'outdoor';

/** Lighting conditions */
export type LightingFilter = 'all' | 'day' | 'night' | 'mixed';

// Wind speed definitions (m/s)
export const WIND_BUCKETS = {
  calm: { min: 0, max: 2, label: 'Calm (<2 m/s)' },
  light: { min: 2, max: 5, label: 'Light (2-5 m/s)' },
  moderate: { min: 5, max: 10, label: 'Moderate (5-10 m/s)' },
  strong: { min: 10, max: Infinity, label: 'Strong (>10 m/s)' },
} as const;

// Time of day definitions (hours, 24h format)
export const TIME_OF_DAY_BUCKETS = {
  morning: { min: 5, max: 11, label: 'Morning (5-11)' },
  midday: { min: 11, max: 14, label: 'Midday (11-14)' },
  afternoon: { min: 14, max: 18, label: 'Afternoon (14-18)' },
  evening: { min: 18, max: 22, label: 'Evening (18-22)' },
} as const;

export interface InsightsFilters {
  time: TimeFilter;
  weaponId: string | null;
  weaponCategory: string | null;
  teamId: string | null;
  position: PositionFilter;
  distance: DistanceFilter;
  drillType: DrillTypeFilter;
  stressOnly: boolean; // HR threshold exceeded
  timedOnly: boolean; // Timed drills only
  // Environmental filters (Phase 1)
  wind: WindFilter;
  timeOfDay: TimeOfDayFilter;
  environment: EnvironmentFilter;
  lighting: LightingFilter;
}

export interface FilterPreset {
  id: string;
  name: string;
  icon?: string;
  filters: Partial<InsightsFilters>;
}

export const DEFAULT_FILTERS: InsightsFilters = {
  time: 'all',
  weaponId: null,
  weaponCategory: null,
  teamId: null,
  position: 'all',
  distance: 'all',
  drillType: 'all',
  stressOnly: false,
  timedOnly: false,
  // Environmental defaults
  wind: 'all',
  timeOfDay: 'all',
  environment: 'all',
  lighting: 'all',
};

// Distance bucket definitions (in meters)
export const DISTANCE_BUCKETS = {
  close: { min: 0, max: 25, label: '≤25m' },
  medium: { min: 25, max: 100, label: '25-100m' },
  long: { min: 100, max: 300, label: '100-300m' },
  precision: { min: 300, max: Infinity, label: '300m+' },
} as const;

// ============================================================================
// BASELINE TYPES
// ============================================================================

/**
 * Baseline values for comparison.
 *
 * WHY: Baselines must be explicit to enable fair comparisons.
 * - Global baseline: used for Totals and high-level framing
 * - Context baseline: used for strengths, weaknesses, and context comparisons
 */
export interface BaselineValues {
  /** Weighted accuracy: total hits / total shots */
  accuracy: number | null;
  /** Number of sessions contributing to accuracy */
  accuracySessions: number;
  /** Total shots contributing to accuracy */
  accuracyShots: number;
  /**
   * Median of best dispersion values across sessions.
   * NOTE: This is "median of best groups", NOT "median grouping".
   * Each session contributes its best_dispersion_cm value.
   */
  medianBestGroup: number | null;
  /** Number of sessions with grouping data */
  groupingSessions: number;
  /** Confidence level based on data volume */
  confidence: ConfidenceLevel;
}

/**
 * Baseline strategy container.
 *
 * WHY: Separating global and context baselines prevents
 * unfair comparisons when filters change drill difficulty.
 */
export interface BaselineStrategy {
  /** Global baseline: all completed sessions (optionally time-filtered) */
  global: BaselineValues;

  /**
   * Context baselines: sessions matching specific context keys.
   * Key format: "position|distanceBucket|weaponCategory|drillType|isTimed"
   */
  context: Map<string, BaselineValues>;
}

// ============================================================================
// CONTEXT PROFILE TYPES (Grouping ↔ Engagement Connection)
// ============================================================================

/**
 * Context key defines a specific training condition.
 *
 * WHY: Comparing performance across different contexts (e.g., prone@100m vs standing@25m)
 * is not meaningful. Context keys enable apples-to-apples comparisons.
 */
export interface ContextKey {
  position: string | null;
  distanceBucket: string | null;
  /** Weapon category (e.g., rifle, pistol), NOT weapon_id */
  weaponCategory: string | null;
  drillType: 'grouping' | 'engagement' | null;
  /** Stress indicator: true if drill is timed */
  isTimed: boolean;
}

/**
 * Engagement metrics within a context.
 */
export interface ContextEngagementMetrics {
  /** Current accuracy in this context */
  accuracy: number;
  /** Baseline accuracy for this context (or global fallback) */
  baselineAccuracy: number;
  /** Raw delta: current - baseline */
  delta: number;
  /**
   * Normalized delta: delta / threshold.
   * Positive = above baseline (strength)
   * Negative = below baseline (weakness)
   */
  normalizedDelta: number;
  /** Total shots in this context */
  shots: number;
  /** Session count in this context */
  sessions: number;
  /** Session IDs for evidence */
  evidenceIds: string[];
}

/**
 * Grouping metrics within a context.
 *
 * NOTE: Uses best_dispersion_cm, which represents the best group per session.
 * "medianBestGroup" = median of best dispersions across sessions.
 */
export interface ContextGroupingMetrics {
  /** Median of best dispersions (cm) in this context */
  medianBestGroup: number;
  /** Baseline median best group for this context (or global fallback) */
  baselineMedianBestGroup: number;
  /**
   * Raw delta: baseline - current (INVERTED: positive = tighter = better)
   */
  delta: number;
  /** Normalized delta: delta / threshold */
  normalizedDelta: number;
  /** Session count in this context */
  sessions: number;
  /** Session IDs for evidence */
  evidenceIds: string[];
}

/**
 * Quadrant classification for context profiles.
 *
 * WHY: This 2x2 matrix bridges engagement and grouping metrics
 * without mixing units, enabling narratives like:
 * "You're hitting targets in prone, but your groups are loose."
 */
export type ContextQuadrant =
  | 'strong_both'        // Good engagement + good grouping
  | 'hits_loose'         // Good engagement + weak grouping
  | 'tight_misses'       // Weak engagement + good grouping
  | 'struggling'         // Weak engagement + weak grouping
  | 'engagement_only'    // Only engagement data available
  | 'grouping_only'      // Only grouping data available
  | 'insufficient_data'; // Not enough data for classification

/**
 * Complete profile for a specific training context.
 *
 * WHY: This structure enables deterministic classification of
 * performance across different training conditions without AI.
 */
export interface ContextProfile {
  /** The context key */
  key: ContextKey;
  /** Serialized key for lookup */
  keyString: string;

  /** Engagement metrics (null if no engagement data) */
  engagement: ContextEngagementMetrics | null;

  /** Grouping metrics (null if no grouping data) */
  grouping: ContextGroupingMetrics | null;

  /** 2x2 quadrant classification */
  quadrant: ContextQuadrant;

  /** Confidence level based on data volume */
  confidence: ConfidenceLevel;

  /**
   * True if context baseline was sparse and global was used.
   * Insights marked preliminary should be treated with caution.
   */
  isPreliminary: boolean;

  /** Human-readable label for this context */
  label: string;
}

// ============================================================================
// METRIC TYPES
// ============================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type MetricDirection = 'up' | 'down' | 'stable';

export interface InsightMetric {
  /** Current value */
  value: number;
  /** Baseline value for comparison */
  baseline: number;
  /** Difference from baseline */
  delta: number;
  /** Direction of change */
  direction: MetricDirection;
  /** Is the change statistically meaningful? */
  isSignificant: boolean;
  /** Confidence based on data volume */
  confidence: ConfidenceLevel;
  /** Number of data points (sessions or shots) */
  dataPoints: number;
  /** Unit for display (%, cm, s, etc.) */
  unit?: string;
}

export interface TotalsMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  subtitle?: string;
  trend?: MetricDirection;
  trendDelta?: number;
  /** Session IDs that contributed to this metric */
  evidenceIds: string[];
}

// ============================================================================
// STRENGTH & WEAKNESS TYPES
// ============================================================================

export type StrengthCategory =
  | 'position'
  | 'distance'
  | 'weapon'
  | 'stress'
  | 'consistency'
  | 'first_shot';

export type WeaknessCategory =
  | 'mechanical'
  | 'decision'
  | 'stress'
  | 'position'
  | 'weapon'
  | 'variance';

export interface StrengthCard {
  id: string;
  category: StrengthCategory;
  /** Display label (e.g., "Prone @ 300-500m") */
  label: string;
  /** Primary metric value (e.g., "4.2 cm") */
  primaryValue: string;
  /** Context text (e.g., "Top 20%") */
  context?: string;
  /** The underlying metric data */
  metric: InsightMetric;
  /** Session IDs backing this strength */
  evidenceIds: string[];
}

export interface WeaknessCard {
  id: string;
  category: WeaknessCategory;
  /** Display label (e.g., "Standing + Tripod") */
  label: string;
  /** Primary metric value (e.g., "38%") */
  primaryValue: string;
  /** Context text (e.g., "High variance between sessions") */
  context?: string;
  /** The underlying metric data */
  metric: InsightMetric;
  /** Variance coefficient (if applicable) */
  variance: number | null;
  /** Session IDs backing this weakness */
  evidenceIds: string[];
}

// ============================================================================
// TREND TYPES
// ============================================================================

export type TrendDirection = 'improving' | 'declining' | 'stable';

export type TrendMetricType =
  | 'accuracy'
  | 'grouping'
  | 'consistency'
  | 'stress_resilience'
  | 'first_shot'
  | 'engagement_time';

export interface TrendDataPoint {
  date: string;
  value: number;
  sessionCount: number;
}

export interface TrendData {
  id: string;
  /** Which metric this trend tracks */
  metricType: TrendMetricType;
  /** Human-readable label */
  label: string;
  /** Overall direction */
  direction: TrendDirection;
  /** Magnitude of change (e.g., "-22%") */
  magnitude: number;
  /** Time window description (e.g., "over 6 weeks") */
  timeWindow: string;
  /** What triggered this change? */
  trigger?: string;
  /** Confidence based on data volume */
  confidence?: ConfidenceLevel;
  /** Data points for the trend line */
  dataPoints: TrendDataPoint[];
  /** Session IDs in this trend */
  evidenceIds: string[];
}

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

export type RecommendationType =
  | 'drill'
  | 'loadout'
  | 'mental'
  | 'position'
  | 'structure';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface DrillPrescription {
  name: string;
  position?: string;
  distance?: number;
  rounds?: number;
  goal: string;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  /** Short title (e.g., "Focus Drill") */
  title: string;
  /** Action description (e.g., "Standing + Tripod, 5x5 @ 200m, timed") */
  description: string;
  /** Goal text (e.g., "reduce variance") */
  goal?: string;
  /** Optional drill prescription */
  drill?: DrillPrescription;
  /** What weakness/trend triggered this */
  reason: string;
  /** Session IDs that justify this recommendation */
  evidenceIds: string[];
}

// ============================================================================
// COMPUTED INSIGHTS STATE
// ============================================================================

export interface ComputedInsights {
  /** Current filter applied */
  filters: InsightsFilters;
  /** Totals/snapshot metrics */
  totals: TotalsMetric[];
  /** Identified strengths */
  strengths: StrengthCard[];
  /** Identified weaknesses */
  weaknesses: WeaknessCard[];
  /** Detected trends */
  trends: TrendData[];
  /** Generated recommendations */
  recommendations: Recommendation[];
  /** Sessions included in this analysis */
  sessionCount: number;
  /** Total shots analyzed */
  shotCount: number;
  /** Time range of data */
  dateRange: {
    start: string;
    end: string;
  };
  /** Is there enough data for meaningful insights? */
  hasEnoughData: boolean;
  /** Minimum sessions needed */
  minSessionsRequired: number;
}

// ============================================================================
// EVIDENCE VIEW TYPES
// ============================================================================

export interface EvidenceContext {
  /** Type of insight being evidenced */
  insightType: 'totals' | 'strength' | 'weakness' | 'trend' | 'recommendation';
  /** ID of the insight */
  insightId: string;
  /** Human-readable title */
  title: string;
  /** Session IDs to show */
  sessionIds: string[];
}

export interface EvidenceSession {
  session: SessionWithDetails;
  /** Why this session is relevant */
  relevance?: string;
  /** Highlighted metric value */
  highlightedValue?: {
    label: string;
    value: string;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface CategoryStats {
  category: string;
  label: string;
  sessions: SessionWithDetails[];
  shots: number;
  hits: number;
  accuracy: number;
  /**
   * Array of best_dispersion_cm values from sessions.
   * Each value represents the BEST group from that session.
   */
  bestDispersions: number[];
  avgBestDispersion: number | null;
  /**
   * Median of best dispersions.
   * NOTE: This is "median of best groups", NOT "median grouping".
   */
  medianBestDispersion: number | null;
  /** @deprecated Use bestDispersions instead */
  dispersions: number[];
  /** @deprecated Use medianBestDispersion instead */
  medianDispersion: number | null;
  /** @deprecated Use avgBestDispersion instead */
  avgDispersion: number | null;
}

export interface BaselineComparison {
  current: CategoryStats;
  baseline: CategoryStats;
  change: InsightMetric;
}

// ============================================================================
// THRESHOLD TYPES
// ============================================================================

/**
 * Context-aware threshold configuration.
 *
 * WHY: Flat thresholds (5%, 0.5cm) don't scale across contexts.
 * - 5% at 95% accuracy is trivial; 5% at 35% is huge
 * - 0.5cm at 100m is meaningful; at 300m+ it's noise
 */
export interface ThresholdConfig {
  /**
   * Accuracy threshold: max(absolute_floor, relative_factor * baseline)
   */
  accuracy: {
    absoluteFloor: number;    // Minimum pp change (default: 5)
    relativeFactor: number;   // Multiplier on baseline (default: 0.15)
  };

  /**
   * Grouping thresholds by distance bucket.
   * Values in cm.
   */
  grouping: {
    close: number;      // ≤25m (default: 0.3)
    medium: number;     // 25-100m (default: 0.5)
    long: number;       // 100-300m (default: 1.0)
    precision: number;  // 300m+ (default: 1.5)
    default: number;    // Unknown distance (default: 0.5)
  };

  /**
   * Variance threshold (coefficient of variation).
   * Applied only within matching context keys.
   */
  variance: number;     // Default: 0.3 (30%)
}

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  accuracy: {
    absoluteFloor: 5,
    relativeFactor: 0.15,
  },
  grouping: {
    close: 0.3,
    medium: 0.5,
    long: 1.0,
    precision: 1.5,
    default: 0.5,
  },
  variance: 0.3,
};

// ============================================================================
// COMPUTED CONTEXT PROFILES
// ============================================================================

/**
 * Result of context profile computation.
 */
export interface ComputedContextProfiles {
  /** All computed profiles */
  profiles: ContextProfile[];

  /** Global baseline used for fallbacks */
  globalBaseline: BaselineValues;

  /** Context baselines by key string */
  contextBaselines: Map<string, BaselineValues>;

  /** Summary statistics */
  summary: {
    totalContexts: number;
    strongBothCount: number;
    hitsLooseCount: number;
    tightMissesCount: number;
    strugglingCount: number;
    insufficientDataCount: number;
  };
}

// ============================================================================
// OVERVIEW TYPES (for Training Overview card)
// ============================================================================

/**
 * Summary of a metric's trend for the overview card.
 *
 * WHY: The overview card needs to communicate direction + magnitude + confidence
 * in a single glance. This distills trend data into displayable form.
 */
export interface TrendSummary {
  /** Current value (e.g., 78 for accuracy, 4.2 for grouping) */
  currentValue: number;
  /** Change from baseline (e.g., +8 for accuracy, -1.2 for grouping) */
  delta: number;
  /** Human-readable direction */
  direction: 'improving' | 'stable' | 'declining';
  /** Confidence based on data volume */
  confidence: ConfidenceLevel;
  /** Unit for display (%, cm) */
  unit: '%' | 'cm';
  /** Sessions that inform this trend */
  evidenceIds: string[];
}

/**
 * The "Focus" item derived from top weakness or recommendation.
 *
 * WHY: Answers "Where should I focus?" with a single actionable insight.
 */
export interface FocusItem {
  /** Display label (e.g., "Standing position") */
  label: string;
  /** Brief reason (e.g., "accuracy drops 15%") */
  reason: string;
  /** Where this came from */
  sourceType: 'weakness' | 'recommendation';
  /** ID of the source item */
  sourceId: string;
  /** Sessions backing this focus area */
  evidenceIds: string[];
}

/**
 * The "Trust" item derived from top strength.
 *
 * WHY: Answers "What can I rely on?" with the highest-confidence strength.
 */
export interface TrustItem {
  /** Display label (e.g., "Prone @ Medium Distance") */
  label: string;
  /** Primary value (e.g., "87%", "3.2cm") */
  primaryValue: string;
  /** Confidence level (only high-confidence strengths qualify) */
  confidence: ConfidenceLevel;
  /** Source strength ID */
  sourceId: string;
  /** Sessions backing this strength */
  evidenceIds: string[];
}

/**
 * Complete overview status for the Training Overview card.
 *
 * WHY: This is the computed state for the top-level overview card.
 * Answers "Am I improving?" without scrolling.
 */
export interface OverviewStatus {
  /** Accuracy trend summary (null if no engagement data) */
  accuracy: TrendSummary | null;
  /** Grouping trend summary (null if no grouping data) */
  grouping: TrendSummary | null;
  /** Top focus item from weaknesses/recommendations (null if none) */
  focusItem: FocusItem | null;
  /** Top trust item from strengths (null if none) */
  trustItem: TrustItem | null;
  /** Total sessions analyzed */
  sessionCount: number;
  /** Total shots analyzed */
  shotCount: number;
  /** Whether there's enough data for meaningful insights */
  hasEnoughData: boolean;
  /** Sessions needed for full insights */
  sessionsNeeded: number;
}
