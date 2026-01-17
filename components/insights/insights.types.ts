/**
 * Insights Types
 *
 * Type definitions for the redesigned Insights page.
 * Supports the five-section hierarchy: Totals, Strengths, Weaknesses, Trends, Recommendations.
 */

import type { SessionWithDetails } from '@/services/session/types';

// ============================================================================
// FILTER TYPES
// ============================================================================

export type TimeFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';

export type PositionFilter = 'all' | 'prone' | 'standing' | 'kneeling' | 'sitting';

export type DistanceFilter = 'all' | 'close' | 'medium' | 'long' | 'precision';

export type DrillTypeFilter = 'all' | 'grouping' | 'engagement' | 'stress';

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
};

// Distance bucket definitions (in meters)
export const DISTANCE_BUCKETS = {
  close: { min: 0, max: 25, label: '≤25m' },
  medium: { min: 25, max: 100, label: '25-100m' },
  long: { min: 100, max: 300, label: '100-300m' },
  precision: { min: 300, max: Infinity, label: '300m+' },
} as const;

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
  dispersions: number[];
  avgDispersion: number | null;
  medianDispersion: number | null;
}

export interface BaselineComparison {
  current: CategoryStats;
  baseline: CategoryStats;
  change: InsightMetric;
}
