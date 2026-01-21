/**
 * Insights Engine
 *
 * Core computation logic for the Insights page.
 * Computes totals, strengths, weaknesses, trends, and recommendations
 * from session data with applied filters.
 *
 * ARCHITECTURE:
 * - This engine is AUTHORITATIVE for all insight decisions
 * - All decisions are DETERMINISTIC and TESTABLE
 * - AI explains only; it never computes or decides
 *
 * KEY IMPROVEMENTS (v2.0):
 * 1. Explicit baseline strategy (global vs context baselines)
 * 2. Context-aware thresholds (scale by distance, baseline)
 * 3. Semantic clarity for grouping metrics (best group vs typical)
 * 4. Variance detection scoped to matching contexts
 * 5. Context profiles bridging engagement and grouping
 */

import { DRILL_GOAL } from '@/constants';
import type { SessionWithDetails } from '@/services/session/types';
import {
  ACCURACY_CHANGE_THRESHOLD,
  GROUPING_CHANGE_THRESHOLD,
  MIN_BASELINE_SESSIONS,
  MIN_SHOTS_FOR_CATEGORY,
  RECENT_SESSION_COUNT,
  getConfidence,
} from './changeRules';
import {
  BaselineStrategy,
  BaselineValues,
  CategoryStats,
  ComputedContextProfiles,
  ComputedInsights,
  ConfidenceLevel,
  ContextEngagementMetrics,
  ContextGroupingMetrics,
  ContextKey,
  ContextProfile,
  ContextQuadrant,
  DEFAULT_FILTERS,
  DEFAULT_THRESHOLD_CONFIG,
  DISTANCE_BUCKETS,
  FocusItem,
  InsightsFilters,
  MetricDirection,
  OverviewStatus,
  Recommendation,
  StrengthCard,
  ThresholdConfig,
  TIME_OF_DAY_BUCKETS,
  TotalsMetric,
  TrendData,
  TrendDataPoint,
  TrendSummary,
  TrustItem,
  WeaknessCard,
  WIND_BUCKETS,
} from './insights.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SESSIONS_FOR_INSIGHTS = 5;
const MIN_SHOTS_FOR_VARIANCE = 30;
const MIN_SESSIONS_FOR_CONTEXT_BASELINE = 3;
const TREND_WINDOW_WEEKS = 6;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate median of an array
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate coefficient of variation (CV)
 *
 * WHY: CV measures relative variability (std dev / mean).
 * High CV (>30%) indicates inconsistent performance.
 *
 * LIMITATION: CV on bounded [0-100] values can be problematic near bounds.
 * For accuracy near 0% or 100%, consider using IQR instead.
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return 0;
  return standardDeviation(values) / avg;
}

/**
 * Calculate Interquartile Range (IQR)
 *
 * WHY: IQR is robust to outliers and works better than CV
 * for bounded metrics like accuracy percentage.
 */
export function interquartileRange(values: number[]): number {
  if (values.length < 4) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  return q3 - q1;
}

/**
 * Get distance bucket for a given distance
 */
export function getDistanceBucket(distance: number | null): string | null {
  if (distance === null) return null;
  for (const [key, bucket] of Object.entries(DISTANCE_BUCKETS)) {
    if (distance >= bucket.min && distance < bucket.max) {
      return key;
    }
  }
  return null;
}

/**
 * Determine confidence level based on data
 */
function determineConfidence(shots: number, sessions: number): ConfidenceLevel {
  return getConfidence(shots, sessions);
}

/**
 * Determine if change is significant
 */
function isSignificantChange(
  current: number,
  baseline: number,
  threshold: number,
  invertedGood: boolean = false
): { isSignificant: boolean; direction: MetricDirection; delta: number } {
  const delta = current - baseline;
  const isSignificant = Math.abs(delta) >= threshold;

  let direction: MetricDirection = 'stable';
  if (isSignificant) {
    direction = invertedGood ? (delta < 0 ? 'up' : 'down') : delta > 0 ? 'up' : 'down';
  }

  return { isSignificant, direction, delta };
}

// ============================================================================
// CONTEXT-AWARE THRESHOLDS
// ============================================================================

/**
 * Calculate context-aware accuracy threshold.
 *
 * WHY: A flat 5% threshold doesn't scale:
 * - At 95% accuracy, a 5% change is trivial
 * - At 35% accuracy, a 5% change is huge
 *
 * FORMULA: max(absoluteFloor, relativeFactor * baselineAccuracy)
 */
export function getAccuracyThreshold(
  baselineAccuracy: number,
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): number {
  const relativeThreshold = baselineAccuracy * config.accuracy.relativeFactor;
  return Math.max(config.accuracy.absoluteFloor, relativeThreshold);
}

/**
 * Calculate context-aware grouping threshold.
 *
 * WHY: A flat 0.5cm threshold doesn't scale:
 * - At 25m, 0.5cm change is meaningful
 * - At 300m+, 0.5cm is noise
 *
 * Thresholds are scaled by distance bucket.
 */
export function getGroupingThreshold(
  distanceBucket: string | null,
  config: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): number {
  if (!distanceBucket) return config.grouping.default;
  return config.grouping[distanceBucket as keyof typeof config.grouping] ?? config.grouping.default;
}

// ============================================================================
// BASELINE COMPUTATION
// ============================================================================

/**
 * Create context key from session.
 *
 * WHY: Context keys enable apples-to-apples comparisons.
 * Comparing prone@300m to standing@25m is not meaningful.
 */
export function createContextKey(session: SessionWithDetails): ContextKey {
  const distance = session.drill_config?.distance_m ?? session.stats?.avg_distance_m;
  return {
    position: session.drill_config?.position?.toLowerCase() || null,
    distanceBucket: getDistanceBucket(distance ?? null),
    weaponCategory: session.weapon_category || null,
    drillType: session.drill_config?.drill_goal === DRILL_GOAL.GROUPING
      ? 'grouping'
      : session.drill_config?.drill_goal === DRILL_GOAL.ENGAGEMENT
        ? 'engagement'
        : null,
    isTimed: session.drill_config?.time_limit_seconds != null,
  };
}

/**
 * Serialize context key to string for map lookup.
 */
export function serializeContextKey(key: ContextKey): string {
  return `${key.position || 'any'}|${key.distanceBucket || 'any'}|${key.weaponCategory || 'any'}|${key.drillType || 'any'}|${key.isTimed}`;
}

/**
 * Create human-readable label for context key.
 */
export function labelContextKey(key: ContextKey): string {
  const parts: string[] = [];
  if (key.position) parts.push(key.position.charAt(0).toUpperCase() + key.position.slice(1));
  if (key.distanceBucket) {
    const bucket = DISTANCE_BUCKETS[key.distanceBucket as keyof typeof DISTANCE_BUCKETS];
    if (bucket) parts.push(bucket.label);
  }
  if (key.weaponCategory) parts.push(key.weaponCategory);
  if (key.isTimed) parts.push('timed');
  return parts.length > 0 ? parts.join(' @ ') : 'All conditions';
}

/**
 * Compute baseline values from sessions.
 *
 * WHY: Explicit baseline computation ensures fair comparisons.
 */
function computeBaselineValues(
  engagementSessions: SessionWithDetails[],
  groupingSessions: SessionWithDetails[]
): BaselineValues {
  // Engagement: weighted accuracy
  let totalShots = 0;
  let totalHits = 0;
  engagementSessions.forEach((s) => {
    if (s.stats) {
      totalShots += s.stats.shots_fired;
      totalHits += s.stats.hits_total;
    }
  });
  const accuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : null;

  // Grouping: median of best dispersions
  const bestDispersions: number[] = [];
  groupingSessions.forEach((s) => {
    if (s.stats?.best_dispersion_cm != null) {
      bestDispersions.push(s.stats.best_dispersion_cm);
    }
  });
  const medianBestGroup = median(bestDispersions);

  // Confidence
  const totalSessions = engagementSessions.length + groupingSessions.length;
  const confidence = determineConfidence(totalShots, totalSessions);

  return {
    accuracy,
    accuracySessions: engagementSessions.length,
    accuracyShots: totalShots,
    medianBestGroup,
    groupingSessions: groupingSessions.length,
    confidence,
  };
}

/**
 * Compute baseline strategy (global + context baselines).
 *
 * WHY: Two-tier baseline strategy:
 * - Global baseline for Totals and high-level framing
 * - Context baselines for strengths/weaknesses within specific conditions
 *
 * FALLBACK: When context baseline is sparse (<3 sessions),
 * use global baseline but mark insight as preliminary.
 */
export function computeBaselines(sessions: SessionWithDetails[]): BaselineStrategy {
  const completed = sessions.filter((s) => s.status === 'completed');

  // Separate by type
  const engagementSessions = completed.filter(isEngagementSession);
  const groupingSessions = completed.filter(isGroupingSession);

  // Global baseline
  const global = computeBaselineValues(engagementSessions, groupingSessions);

  // Context baselines
  const contextMap = new Map<string, { engagement: SessionWithDetails[]; grouping: SessionWithDetails[] }>();

  completed.forEach((session) => {
    const key = serializeContextKey(createContextKey(session));
    if (!contextMap.has(key)) {
      contextMap.set(key, { engagement: [], grouping: [] });
    }
    const bucket = contextMap.get(key)!;
    if (isGroupingSession(session)) {
      bucket.grouping.push(session);
    } else if (isEngagementSession(session)) {
      bucket.engagement.push(session);
    }
  });

  const context = new Map<string, BaselineValues>();
  contextMap.forEach((bucket, key) => {
    context.set(key, computeBaselineValues(bucket.engagement, bucket.grouping));
  });

  return { global, context };
}

// ============================================================================
// FILTER APPLICATION
// ============================================================================

/**
 * Apply filters to sessions
 */
export function applyFilters(
  sessions: SessionWithDetails[],
  filters: InsightsFilters
): SessionWithDetails[] {
  return sessions.filter((session) => {
    // Time filter
    if (filters.time !== 'all') {
      const now = new Date();
      const sessionDate = new Date(session.started_at);
      const days = {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365,
      }[filters.time];
      if (days) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        if (sessionDate < cutoff) return false;
      }
    }

    // Weapon filter
    if (filters.weaponId && session.weapon_id !== filters.weaponId) {
      return false;
    }

    // Weapon category filter
    if (filters.weaponCategory && session.weapon_category !== filters.weaponCategory) {
      return false;
    }

    // Team filter
    if (filters.teamId && session.team_id !== filters.teamId) {
      return false;
    }

    // Position filter
    if (filters.position !== 'all') {
      const sessionPosition = session.drill_config?.position?.toLowerCase();
      if (sessionPosition !== filters.position) return false;
    }

    // Distance filter
    if (filters.distance !== 'all') {
      const distance = session.drill_config?.distance_m ?? session.stats?.avg_distance_m;
      const bucket = getDistanceBucket(distance ?? null);
      if (bucket !== filters.distance) return false;
    }

    // Drill type filter
    if (filters.drillType !== 'all') {
      const drillGoal = session.drill_config?.drill_goal;
      if (filters.drillType === DRILL_GOAL.GROUPING && drillGoal !== DRILL_GOAL.GROUPING) return false;
      if (filters.drillType === DRILL_GOAL.ENGAGEMENT && drillGoal !== DRILL_GOAL.ENGAGEMENT) return false;
      if (filters.drillType === 'stress') {
        // Stress drills have time limits or are marked as stress
        const hasTimeLimit = session.drill_config?.time_limit_seconds != null;
        if (!hasTimeLimit) return false;
      }
    }

    // Timed only filter
    if (filters.timedOnly && !session.drill_config?.time_limit_seconds) {
      return false;
    }

    // ====== ENVIRONMENTAL FILTERS ======
    
    // Wind filter - check weather data
    if (filters.wind !== 'all' && session.weather) {
      const windSpeed = session.weather.wind_speed_mps;
      if (windSpeed != null) {
        const bucket = WIND_BUCKETS[filters.wind];
        if (windSpeed < bucket.min || windSpeed >= bucket.max) {
          return false;
        }
      } else {
        // No wind data, exclude if filtering for specific wind
        return false;
      }
    }
    
    // Time of day filter - based on session start time
    if (filters.timeOfDay !== 'all') {
      const sessionDate = new Date(session.started_at);
      const hour = sessionDate.getHours();
      const bucket = TIME_OF_DAY_BUCKETS[filters.timeOfDay];
      if (hour < bucket.min || hour >= bucket.max) {
        return false;
      }
    }
    
    // Environment filter (indoor/outdoor)
    // Note: This requires an 'environment' field on the session
    // For now, check drill_config or weather presence as proxy
    if (filters.environment !== 'all') {
      const isOutdoor = session.weather != null; // Weather data suggests outdoor
      if (filters.environment === 'indoor' && isOutdoor) return false;
      if (filters.environment === 'outdoor' && !isOutdoor) return false;
    }
    
    // Lighting filter
    // Infer from time of day - day (6-18), night (18-6), mixed (transition hours)
    if (filters.lighting !== 'all') {
      const sessionDate = new Date(session.started_at);
      const hour = sessionDate.getHours();
      const isDay = hour >= 6 && hour < 18;
      const isTransition = (hour >= 5 && hour < 7) || (hour >= 17 && hour < 20);
      
      if (filters.lighting === 'day' && !isDay) return false;
      if (filters.lighting === 'night' && isDay) return false;
      if (filters.lighting === 'mixed' && !isTransition) return false;
    }

    return true;
  });
}

// ============================================================================
// TOTALS COMPUTATION
// ============================================================================

/**
 * Check if session is a grouping session (measured by dispersion in cm)
 */
function isGroupingSession(session: SessionWithDetails): boolean {
  return session.drill_config?.drill_goal === DRILL_GOAL.GROUPING;
}

/**
 * Check if session is an engagement session (measured by hits/shots)
 */
function isEngagementSession(session: SessionWithDetails): boolean {
  const goal = session.drill_config?.drill_goal;
  // Engagement if explicitly set, or if not grouping and has hits data
  return goal === DRILL_GOAL.ENGAGEMENT || (goal !== DRILL_GOAL.GROUPING && session.stats?.hits_total != null);
}

/**
 * Compute totals/snapshot metrics
 *
 * IMPORTANT: Grouping and Engagement are different metrics:
 * - Grouping sessions: measured by dispersion (cm) - smaller is better
 * - Engagement sessions: measured by accuracy (hits/shots) - higher is better
 *
 * SEMANTIC CLARITY (v2.0):
 * - "Overall Accuracy" = total hits / total shots (weighted)
 * - "Typical Session" = median(session accuracy)
 * - "Best Group (Median)" = median of best dispersions per session
 *   NOTE: This is NOT "median grouping" — each session contributes its BEST group.
 */
export function computeTotals(sessions: SessionWithDetails[]): TotalsMetric[] {
  const completed = sessions.filter((s) => s.status === 'completed');
  const totals: TotalsMetric[] = [];

  // Separate sessions by type
  const groupingSessions = completed.filter(isGroupingSession);
  const engagementSessions = completed.filter(isEngagementSession);

  // Aggregate engagement stats (hits/shots)
  let engagementShots = 0;
  let engagementHits = 0;
  const engagementAccuracies: number[] = [];
  const engagementSessionIds: string[] = [];

  engagementSessions.forEach((s) => {
    engagementSessionIds.push(s.id);
    if (s.stats) {
      engagementShots += s.stats.shots_fired;
      engagementHits += s.stats.hits_total;
      if (s.stats.shots_fired > 0) {
        engagementAccuracies.push((s.stats.hits_total / s.stats.shots_fired) * 100);
      }
    }
  });

  // Aggregate grouping stats (best dispersion per session)
  const bestDispersions: number[] = [];
  const groupingSessionIds: string[] = [];

  groupingSessions.forEach((s) => {
    groupingSessionIds.push(s.id);
    if (s.stats?.best_dispersion_cm != null) {
      bestDispersions.push(s.stats.best_dispersion_cm);
    }
  });

  const allSessionIds = completed.map((s) => s.id);

  // Sessions count
  totals.push({
    id: 'sessions',
    label: 'Sessions',
    value: completed.length,
    unit: '',
    evidenceIds: allSessionIds,
  });

  // Total shots (from engagement sessions only - grouping shots are all hits by definition)
  if (engagementShots > 0) {
    totals.push({
      id: 'shots',
      label: 'Shots Fired',
      value: engagementShots,
      unit: '',
      subtitle: 'engagement',
      evidenceIds: engagementSessionIds,
    });
  }

  // Overall accuracy (weighted) - ONLY from engagement sessions
  // WHY: This is the "true" accuracy across all shots
  if (engagementShots > 0) {
    const overallAccuracy = Math.round((engagementHits / engagementShots) * 100);
    totals.push({
      id: 'overall_accuracy',
      label: 'Overall Accuracy',
      value: overallAccuracy,
      unit: '%',
      subtitle: 'weighted',
      evidenceIds: engagementSessionIds,
    });
  }

  // Typical session accuracy (median) - ONLY from engagement sessions
  // WHY: Median gives equal weight to each session, resistant to outliers
  const medianAccuracy = median(engagementAccuracies);
  if (medianAccuracy !== null) {
    totals.push({
      id: 'typical_accuracy',
      label: 'Typical Session',
      value: Math.round(medianAccuracy),
      unit: '%',
      subtitle: 'median',
      evidenceIds: engagementSessionIds,
    });
  }

  // DEPRECATED: Keep old 'accuracy' ID for backward compatibility
  if (engagementShots > 0) {
    const overallAccuracy = Math.round((engagementHits / engagementShots) * 100);
    totals.push({
      id: 'accuracy',
      label: 'Accuracy',
      value: overallAccuracy,
      unit: '%',
      subtitle: DRILL_GOAL.ENGAGEMENT,
      evidenceIds: engagementSessionIds,
    });
  }

  // DEPRECATED: Keep old 'hit_pct' ID for backward compatibility
  if (medianAccuracy !== null) {
    totals.push({
      id: 'hit_pct',
      label: 'Hit %',
      value: Math.round(medianAccuracy),
      unit: '%',
      subtitle: 'median',
      evidenceIds: engagementSessionIds,
    });
  }

  // Best Group (Median) - ONLY from grouping sessions
  // WHY: "best_dispersion_cm" represents the BEST group from each session.
  // We take the MEDIAN of these best groups across sessions.
  // This is NOT "median grouping" — each session contributes only its best.
  const medianBestDispersion = median(bestDispersions);
  if (medianBestDispersion !== null) {
    totals.push({
      id: 'best_group_median',
      label: 'Best Group (Median)',
      value: Math.round(medianBestDispersion * 10) / 10,
      unit: 'cm',
      subtitle: 'of best groups',
      evidenceIds: groupingSessionIds,
    });
  }

  // DEPRECATED: Keep old 'median_group' ID for backward compatibility
  if (medianBestDispersion !== null) {
    totals.push({
      id: 'median_group',
      label: 'Median Group',
      value: Math.round(medianBestDispersion * 10) / 10,
      unit: 'cm',
      subtitle: DRILL_GOAL.GROUPING,
      evidenceIds: groupingSessionIds,
    });
  }

  return totals;
}

// ============================================================================
// STRENGTHS COMPUTATION
// ============================================================================

/**
 * Group sessions by category and compute stats.
 *
 * NOTE: For grouping metrics, we use best_dispersion_cm.
 * The naming reflects this: "bestDispersions", "medianBestDispersion".
 */
function groupByCategory(
  sessions: SessionWithDetails[],
  categoryFn: (s: SessionWithDetails) => string | null
): Map<string, CategoryStats> {
  const groups = new Map<string, CategoryStats>();

  sessions.forEach((session) => {
    const category = categoryFn(session);
    if (!category) return;

    if (!groups.has(category)) {
      groups.set(category, {
        category,
        label: category,
        sessions: [],
        shots: 0,
        hits: 0,
        accuracy: 0,
        // New naming (v2.0)
        bestDispersions: [],
        avgBestDispersion: null,
        medianBestDispersion: null,
        // DEPRECATED: Keep for backward compatibility
        dispersions: [],
        avgDispersion: null,
        medianDispersion: null,
      });
    }

    const stats = groups.get(category)!;
    stats.sessions.push(session);

    if (session.stats) {
      stats.shots += session.stats.shots_fired;
      stats.hits += session.stats.hits_total;
      if (session.stats.best_dispersion_cm != null) {
        stats.bestDispersions.push(session.stats.best_dispersion_cm);
        // DEPRECATED: Keep for backward compatibility
        stats.dispersions.push(session.stats.best_dispersion_cm);
      }
    }
  });

  // Calculate derived stats
  groups.forEach((stats) => {
    stats.accuracy = stats.shots > 0 ? (stats.hits / stats.shots) * 100 : 0;

    // New naming (v2.0)
    stats.avgBestDispersion =
      stats.bestDispersions.length > 0
        ? stats.bestDispersions.reduce((a, b) => a + b, 0) / stats.bestDispersions.length
        : null;
    stats.medianBestDispersion = median(stats.bestDispersions);

    // DEPRECATED: Keep for backward compatibility
    stats.avgDispersion = stats.avgBestDispersion;
    stats.medianDispersion = stats.medianBestDispersion;
  });

  return groups;
}

/**
 * Compute strengths from sessions.
 *
 * IMPORTANT: Accuracy strengths come from engagement sessions only.
 * Grouping strengths come from grouping sessions only.
 *
 * IMPROVEMENTS (v2.0):
 * - Context-aware thresholds (scale by baseline accuracy, distance)
 * - Explicit baseline values in output
 * - Improved naming for grouping metrics (best group, not median grouping)
 */
export function computeStrengths(
  sessions: SessionWithDetails[],
  filters: InsightsFilters,
  thresholdConfig: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): StrengthCard[] {
  const strengths: StrengthCard[] = [];
  const completed = sessions.filter((s) => s.status === 'completed');

  if (completed.length < MIN_SESSIONS_FOR_INSIGHTS) {
    return strengths;
  }

  // Separate sessions by type
  const engagementSessions = completed.filter(isEngagementSession);
  const groupingSessions = completed.filter(isGroupingSession);

  // Calculate engagement baseline (accuracy)
  let baselineShots = 0;
  let baselineHits = 0;

  engagementSessions.forEach((s) => {
    if (s.stats) {
      baselineShots += s.stats.shots_fired;
      baselineHits += s.stats.hits_total;
    }
  });

  const baselineAccuracy = baselineShots > 0 ? (baselineHits / baselineShots) * 100 : 0;

  // Context-aware accuracy threshold
  // WHY: A flat 5% threshold doesn't scale. At 95% accuracy, 5% is trivial.
  const accuracyThreshold = getAccuracyThreshold(baselineAccuracy, thresholdConfig);

  // Calculate grouping baseline (best dispersion per session)
  const baselineBestDispersions: number[] = [];
  groupingSessions.forEach((s) => {
    if (s.stats?.best_dispersion_cm != null) {
      baselineBestDispersions.push(s.stats.best_dispersion_cm);
    }
  });

  const baselineMedianBestDispersion = median(baselineBestDispersions);

  // Group ENGAGEMENT sessions by position (for accuracy strengths)
  const engagementByPosition = groupByCategory(engagementSessions, (s) =>
    s.drill_config?.position?.toLowerCase() || null
  );

  engagementByPosition.forEach((stats, position) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    // Check if accuracy is above baseline
    const accuracyDelta = stats.accuracy - baselineAccuracy;
    if (accuracyDelta >= accuracyThreshold) {
      const confidence = determineConfidence(stats.shots, stats.sessions.length);
      strengths.push({
        id: `strength-position-${position}`,
        category: 'position',
        label: position.charAt(0).toUpperCase() + position.slice(1),
        primaryValue: `${Math.round(stats.accuracy)}%`,
        context: `+${Math.round(accuracyDelta)}% vs baseline`,
        metric: {
          value: stats.accuracy,
          baseline: baselineAccuracy,
          delta: accuracyDelta,
          direction: 'up',
          isSignificant: true,
          confidence,
          dataPoints: stats.shots,
          unit: '%',
        },
        evidenceIds: stats.sessions.map((s) => s.id),
      });
    }
  });

  // Group GROUPING sessions by position (for dispersion strengths)
  const groupingByPosition = groupByCategory(groupingSessions, (s) =>
    s.drill_config?.position?.toLowerCase() || null
  );

  groupingByPosition.forEach((stats, position) => {
    // Check if grouping is better than baseline
    if (stats.medianBestDispersion !== null && baselineMedianBestDispersion !== null) {
      // Determine distance bucket for this position's sessions
      const firstSession = stats.sessions[0];
      const distance = firstSession?.drill_config?.distance_m ?? firstSession?.stats?.avg_distance_m;
      const distanceBucket = getDistanceBucket(distance ?? null);
      const groupingThreshold = getGroupingThreshold(distanceBucket, thresholdConfig);

      const dispersionDelta = baselineMedianBestDispersion - stats.medianBestDispersion;
      if (dispersionDelta >= groupingThreshold && stats.bestDispersions.length >= 3) {
        const confidence = determineConfidence(stats.shots, stats.sessions.length);
        strengths.push({
          id: `strength-position-grouping-${position}`,
          category: 'position',
          label: `${position.charAt(0).toUpperCase() + position.slice(1)} (Best Group)`,
          primaryValue: `${Math.round(stats.medianBestDispersion * 10) / 10} cm`,
          context: `${Math.round(dispersionDelta * 10) / 10} cm tighter than baseline`,
          metric: {
            value: stats.medianBestDispersion,
            baseline: baselineMedianBestDispersion,
            delta: -dispersionDelta,
            direction: 'up', // Smaller is better
            isSignificant: true,
            confidence,
            dataPoints: stats.bestDispersions.length,
            unit: 'cm',
          },
          evidenceIds: stats.sessions.map((s) => s.id),
        });
      }
    }
  });

  // Group ENGAGEMENT sessions by distance bucket (for accuracy strengths)
  const engagementByDistance = groupByCategory(engagementSessions, (s) => {
    const distance = s.drill_config?.distance_m ?? s.stats?.avg_distance_m;
    const bucket = getDistanceBucket(distance ?? null);
    if (!bucket) return null;
    return `${DISTANCE_BUCKETS[bucket as keyof typeof DISTANCE_BUCKETS].label}`;
  });

  engagementByDistance.forEach((stats, distanceLabel) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    const accuracyDelta = stats.accuracy - baselineAccuracy;
    if (accuracyDelta >= accuracyThreshold) {
      const confidence = determineConfidence(stats.shots, stats.sessions.length);
      strengths.push({
        id: `strength-distance-${distanceLabel}`,
        category: 'distance',
        label: distanceLabel,
        primaryValue: `${Math.round(stats.accuracy)}%`,
        context: `+${Math.round(accuracyDelta)}% vs baseline`,
        metric: {
          value: stats.accuracy,
          baseline: baselineAccuracy,
          delta: accuracyDelta,
          direction: 'up',
          isSignificant: true,
          confidence,
          dataPoints: stats.shots,
          unit: '%',
        },
        evidenceIds: stats.sessions.map((s) => s.id),
      });
    }
  });

  // Group GROUPING sessions by distance bucket (for dispersion strengths)
  const groupingByDistance = groupByCategory(groupingSessions, (s) => {
    const distance = s.drill_config?.distance_m ?? s.stats?.avg_distance_m;
    const bucket = getDistanceBucket(distance ?? null);
    if (!bucket) return null;
    return bucket; // Return bucket key, not label
  });

  groupingByDistance.forEach((stats, distanceBucket) => {
    if (stats.medianBestDispersion !== null && baselineMedianBestDispersion !== null) {
      // Context-aware grouping threshold
      const groupingThreshold = getGroupingThreshold(distanceBucket, thresholdConfig);
      const distanceLabel = DISTANCE_BUCKETS[distanceBucket as keyof typeof DISTANCE_BUCKETS]?.label || distanceBucket;

      const dispersionDelta = baselineMedianBestDispersion - stats.medianBestDispersion;
      if (dispersionDelta >= groupingThreshold && stats.bestDispersions.length >= 3) {
        const confidence = determineConfidence(stats.shots, stats.sessions.length);
        strengths.push({
          id: `strength-distance-grouping-${distanceBucket}`,
          category: 'distance',
          label: `${distanceLabel} (Best Group)`,
          primaryValue: `${Math.round(stats.medianBestDispersion * 10) / 10} cm`,
          context: `${Math.round(dispersionDelta * 10) / 10} cm tighter than baseline`,
          metric: {
            value: stats.medianBestDispersion,
            baseline: baselineMedianBestDispersion,
            delta: -dispersionDelta,
            direction: 'up',
            isSignificant: true,
            confidence,
            dataPoints: stats.bestDispersions.length,
            unit: 'cm',
          },
          evidenceIds: stats.sessions.map((s) => s.id),
        });
      }
    }
  });

  // Group ENGAGEMENT sessions by weapon (for accuracy strengths)
  const engagementByWeapon = groupByCategory(engagementSessions, (s) => s.weapon_name || null);

  engagementByWeapon.forEach((stats, weaponName) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    const accuracyDelta = stats.accuracy - baselineAccuracy;
    if (accuracyDelta >= accuracyThreshold) {
      const confidence = determineConfidence(stats.shots, stats.sessions.length);
      strengths.push({
        id: `strength-weapon-${weaponName}`,
        category: 'weapon',
        label: weaponName,
        primaryValue: `${Math.round(stats.accuracy)}%`,
        context: `+${Math.round(accuracyDelta)}% vs baseline`,
        metric: {
          value: stats.accuracy,
          baseline: baselineAccuracy,
          delta: accuracyDelta,
          direction: 'up',
          isSignificant: true,
          confidence,
          dataPoints: stats.shots,
          unit: '%',
        },
        evidenceIds: stats.sessions.map((s) => s.id),
      });
    }
  });

  // Sort by delta (strongest first)
  return strengths.sort((a, b) => Math.abs(b.metric.delta) - Math.abs(a.metric.delta));
}

// ============================================================================
// WEAKNESSES COMPUTATION
// ============================================================================

/**
 * Compute weaknesses from sessions.
 *
 * IMPORTANT: Accuracy weaknesses come from engagement sessions only.
 * Grouping weaknesses come from grouping sessions only.
 *
 * IMPROVEMENTS (v2.0):
 * - Context-aware thresholds (scale by baseline accuracy, distance)
 * - Variance calculated ONLY within matching context keys
 * - IQR available as robust alternative to CV
 */
export function computeWeaknesses(
  sessions: SessionWithDetails[],
  filters: InsightsFilters,
  thresholdConfig: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): WeaknessCard[] {
  const weaknesses: WeaknessCard[] = [];
  const completed = sessions.filter((s) => s.status === 'completed');

  if (completed.length < MIN_SESSIONS_FOR_INSIGHTS) {
    return weaknesses;
  }

  // Separate sessions by type
  const engagementSessions = completed.filter(isEngagementSession);
  const groupingSessions = completed.filter(isGroupingSession);

  // Calculate engagement baseline (accuracy)
  let baselineShots = 0;
  let baselineHits = 0;

  engagementSessions.forEach((s) => {
    if (s.stats) {
      baselineShots += s.stats.shots_fired;
      baselineHits += s.stats.hits_total;
    }
  });

  const baselineAccuracy = baselineShots > 0 ? (baselineHits / baselineShots) * 100 : 0;

  // Context-aware accuracy threshold
  const accuracyThreshold = getAccuracyThreshold(baselineAccuracy, thresholdConfig);

  // Calculate grouping baseline (best dispersion per session)
  const baselineBestDispersions: number[] = [];
  groupingSessions.forEach((s) => {
    if (s.stats?.best_dispersion_cm != null) {
      baselineBestDispersions.push(s.stats.best_dispersion_cm);
    }
  });

  const baselineMedianBestDispersion = median(baselineBestDispersions);

  // Group ENGAGEMENT sessions by position (for accuracy weaknesses)
  const engagementByPosition = groupByCategory(engagementSessions, (s) =>
    s.drill_config?.position?.toLowerCase() || null
  );

  engagementByPosition.forEach((stats, position) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    // Check if accuracy is below baseline
    const accuracyDelta = stats.accuracy - baselineAccuracy;
    if (accuracyDelta <= -accuracyThreshold) {
      const confidence = determineConfidence(stats.shots, stats.sessions.length);

      // Calculate variance WITHIN this context only
      // WHY: Variance across mixed contexts (different distances) produces false positives
      const sessionAccuracies = stats.sessions
        .filter((s) => s.stats && s.stats.shots_fired > 0)
        .map((s) => (s.stats!.hits_total / s.stats!.shots_fired) * 100);
      const variance = coefficientOfVariation(sessionAccuracies);
      const iqr = interquartileRange(sessionAccuracies);
      const hasHighVariance = variance >= thresholdConfig.variance;

      weaknesses.push({
        id: `weakness-position-${position}`,
        category: 'position',
        label: position.charAt(0).toUpperCase() + position.slice(1),
        primaryValue: `${Math.round(stats.accuracy)}%`,
        context: hasHighVariance
          ? 'High variance within this position'
          : `${Math.round(Math.abs(accuracyDelta))}% below baseline`,
        metric: {
          value: stats.accuracy,
          baseline: baselineAccuracy,
          delta: accuracyDelta,
          direction: 'down',
          isSignificant: true,
          confidence,
          dataPoints: stats.shots,
          unit: '%',
        },
        variance: hasHighVariance ? Math.round(variance * 100) : null,
        evidenceIds: stats.sessions.map((s) => s.id),
      });
    }

    // Check for high variance even if accuracy is okay
    // WHY: Inconsistency is a weakness even if average performance is good
    if (stats.sessions.length >= 3) {
      const sessionAccuracies = stats.sessions
        .filter((s) => s.stats && s.stats.shots_fired > 0)
        .map((s) => (s.stats!.hits_total / s.stats!.shots_fired) * 100);
      const variance = coefficientOfVariation(sessionAccuracies);

      if (
        variance >= thresholdConfig.variance &&
        !weaknesses.find((w) => w.id === `weakness-position-${position}`)
      ) {
        const confidence = determineConfidence(stats.shots, stats.sessions.length);
        weaknesses.push({
          id: `weakness-variance-${position}`,
          category: 'variance',
          label: `${position.charAt(0).toUpperCase() + position.slice(1)} Consistency`,
          primaryValue: `${Math.round(variance * 100)}%`,
          context: 'Coefficient of variation (within position)',
          metric: {
            value: variance * 100,
            baseline: 15, // Expected CV for consistent shooter
            delta: (variance * 100) - 15,
            direction: 'down',
            isSignificant: true,
            confidence,
            dataPoints: stats.sessions.length,
            unit: '%',
          },
          variance: Math.round(variance * 100),
          evidenceIds: stats.sessions.map((s) => s.id),
        });
      }
    }
  });

  // Group ENGAGEMENT sessions by distance bucket (for accuracy weaknesses)
  // WHY: Separate from position analysis to avoid double-counting
  const engagementByDistance = groupByCategory(engagementSessions, (s) => {
    const distance = s.drill_config?.distance_m ?? s.stats?.avg_distance_m;
    const bucket = getDistanceBucket(distance ?? null);
    if (!bucket) return null;
    return bucket; // Use bucket key for threshold lookup
  });

  engagementByDistance.forEach((stats, distanceBucket) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    const distanceLabel = DISTANCE_BUCKETS[distanceBucket as keyof typeof DISTANCE_BUCKETS]?.label || distanceBucket;
    const accuracyDelta = stats.accuracy - baselineAccuracy;

    if (accuracyDelta <= -accuracyThreshold) {
      const confidence = determineConfidence(stats.shots, stats.sessions.length);

      // Variance within this distance context only
      const sessionAccuracies = stats.sessions
        .filter((s) => s.stats && s.stats.shots_fired > 0)
        .map((s) => (s.stats!.hits_total / s.stats!.shots_fired) * 100);
      const variance = coefficientOfVariation(sessionAccuracies);

      weaknesses.push({
        id: `weakness-distance-${distanceBucket}`,
        category: 'position', // Distance is a form of context weakness
        label: distanceLabel,
        primaryValue: `${Math.round(stats.accuracy)}%`,
        context: `${Math.round(Math.abs(accuracyDelta))}% below baseline`,
        metric: {
          value: stats.accuracy,
          baseline: baselineAccuracy,
          delta: accuracyDelta,
          direction: 'down',
          isSignificant: true,
          confidence,
          dataPoints: stats.shots,
          unit: '%',
        },
        variance: variance >= thresholdConfig.variance ? Math.round(variance * 100) : null,
        evidenceIds: stats.sessions.map((s) => s.id),
      });
    }
  });

  // Sort by delta (worst first)
  return weaknesses.sort((a, b) => a.metric.delta - b.metric.delta);
}

// ============================================================================
// TRENDS COMPUTATION
// ============================================================================

/**
 * Compute trends over time
 */
export function computeTrends(
  sessions: SessionWithDetails[],
  filters: InsightsFilters
): TrendData[] {
  const trends: TrendData[] = [];
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  if (completed.length < MIN_BASELINE_SESSIONS + RECENT_SESSION_COUNT) {
    return trends;
  }

  // Group sessions by week
  const weeklyData = new Map<string, SessionWithDetails[]>();

  completed.forEach((session) => {
    const date = new Date(session.started_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, []);
    }
    weeklyData.get(weekKey)!.push(session);
  });

  // Sort weeks
  const sortedWeeks = Array.from(weeklyData.entries()).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );

  if (sortedWeeks.length < 3) {
    return trends;
  }

  // Compute weekly accuracy trend
  const accuracyDataPoints: TrendDataPoint[] = [];

  sortedWeeks.forEach(([weekDate, weekSessions]) => {
    let shots = 0;
    let hits = 0;
    weekSessions.forEach((s) => {
      if (s.stats) {
        shots += s.stats.shots_fired;
        hits += s.stats.hits_total;
      }
    });

    if (shots > 0) {
      accuracyDataPoints.push({
        date: weekDate,
        value: Math.round((hits / shots) * 100),
        sessionCount: weekSessions.length,
      });
    }
  });

  if (accuracyDataPoints.length >= 3) {
    // Compare first half to second half
    const midpoint = Math.floor(accuracyDataPoints.length / 2);
    const firstHalf = accuracyDataPoints.slice(0, midpoint);
    const secondHalf = accuracyDataPoints.slice(midpoint);

    const firstAvg =
      firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

    const delta = secondAvg - firstAvg;
    const isSignificant = Math.abs(delta) >= ACCURACY_CHANGE_THRESHOLD;

    if (isSignificant) {
      const allSessionIds = completed.map((s) => s.id);
      trends.push({
        id: 'trend-accuracy',
        metricType: 'accuracy',
        label: 'Overall Accuracy',
        direction: delta > 0 ? 'improving' : 'declining',
        magnitude: Math.round(delta),
        timeWindow: `over ${accuracyDataPoints.length} weeks`,
        dataPoints: accuracyDataPoints,
        evidenceIds: allSessionIds,
      });
    }
  }

  // Compute weekly grouping trend
  const groupingDataPoints: TrendDataPoint[] = [];

  sortedWeeks.forEach(([weekDate, weekSessions]) => {
    const dispersions: number[] = [];
    weekSessions.forEach((s) => {
      if (s.stats?.best_dispersion_cm != null) {
        dispersions.push(s.stats.best_dispersion_cm);
      }
    });

    if (dispersions.length > 0) {
      const medianDisp = median(dispersions);
      if (medianDisp !== null) {
        groupingDataPoints.push({
          date: weekDate,
          value: Math.round(medianDisp * 10) / 10,
          sessionCount: weekSessions.length,
        });
      }
    }
  });

  if (groupingDataPoints.length >= 3) {
    const midpoint = Math.floor(groupingDataPoints.length / 2);
    const firstHalf = groupingDataPoints.slice(0, midpoint);
    const secondHalf = groupingDataPoints.slice(midpoint);

    const firstAvg =
      firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

    const delta = firstAvg - secondAvg; // Inverted: smaller is better
    const isSignificant = Math.abs(delta) >= GROUPING_CHANGE_THRESHOLD;

    if (isSignificant) {
      const allSessionIds = completed
        .filter((s) => s.stats?.best_dispersion_cm != null)
        .map((s) => s.id);
      trends.push({
        id: 'trend-grouping',
        metricType: DRILL_GOAL.GROUPING,
        label: 'Grouping Consistency',
        direction: delta > 0 ? 'improving' : 'declining',
        magnitude: Math.round(Math.abs(secondAvg - firstAvg) * 10) / 10,
        timeWindow: `over ${groupingDataPoints.length} weeks`,
        trigger: delta > 0 ? 'Tighter groups over time' : 'Groups expanding',
        dataPoints: groupingDataPoints,
        evidenceIds: allSessionIds,
      });
    }
  }

  return trends;
}

// ============================================================================
// RECOMMENDATIONS GENERATION
// ============================================================================

/**
 * Generate recommendations based on analysis
 */
export function generateRecommendations(
  strengths: StrengthCard[],
  weaknesses: WeaknessCard[],
  trends: TrendData[],
  sessions: SessionWithDetails[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Generate recommendations from weaknesses
  weaknesses.forEach((weakness, index) => {
    if (index >= 3) return; // Max 3 from weaknesses

    if (weakness.category === 'position') {
      recommendations.push({
        id: `rec-${weakness.id}`,
        type: 'drill',
        priority: weakness.variance ? 'high' : 'medium',
        title: 'Focus Drill',
        description: `${weakness.label} position training`,
        goal: weakness.variance ? 'reduce variance' : 'improve baseline',
        drill: {
          name: `${weakness.label} Practice`,
          position: weakness.label.toLowerCase(),
          rounds: 20,
          goal: 'Improve consistency',
        },
        reason: weakness.context || 'Below baseline performance',
        evidenceIds: weakness.evidenceIds.slice(0, 5),
      });
    }

    if (weakness.category === 'variance') {
      recommendations.push({
        id: `rec-${weakness.id}`,
        type: 'structure',
        priority: 'high',
        title: 'Consistency Focus',
        description: `Work on ${weakness.label.toLowerCase()} consistency`,
        goal: 'reduce session-to-session variance',
        reason: `${weakness.variance}% coefficient of variation`,
        evidenceIds: weakness.evidenceIds.slice(0, 5),
      });
    }
  });

  // Generate recommendations from declining trends
  trends
    .filter((t) => t.direction === 'declining')
    .forEach((trend) => {
      recommendations.push({
        id: `rec-trend-${trend.id}`,
        type: 'structure',
        priority: 'medium',
        title: 'Address Decline',
        description: `${trend.label} has declined ${Math.abs(trend.magnitude)}${trend.metricType === 'accuracy' ? '%' : 'cm'} ${trend.timeWindow}`,
        goal: 'reverse negative trend',
        reason: trend.trigger || 'Performance declining over time',
        evidenceIds: trend.evidenceIds.slice(0, 5),
      });
    });

  // If no weaknesses, suggest building on strengths
  if (weaknesses.length === 0 && strengths.length > 0) {
    const topStrength = strengths[0];
    recommendations.push({
      id: 'rec-build-strength',
      type: 'drill',
      priority: 'low',
      title: 'Build on Strength',
      description: `Continue ${topStrength.label} practice`,
      goal: 'maintain excellence',
      reason: 'No significant weaknesses detected',
      evidenceIds: topStrength.evidenceIds.slice(0, 5),
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

// ============================================================================
// CONTEXT PROFILES (NEW MODULE)
// ============================================================================

/**
 * Compute context profiles for bridging engagement and grouping metrics.
 *
 * WHY: Users want to understand how their engagement (hit rate) relates to
 * their grouping (precision). This module computes per-context metrics
 * WITHOUT mixing units, enabling narratives like:
 * "In prone at 100-300m, you hit targets well but your groups are loose."
 *
 * ARCHITECTURE:
 * - Each unique context (position + distance + weapon category + timed) gets a profile
 * - Engagement metrics: accuracy delta vs baseline (positive = better)
 * - Grouping metrics: dispersion delta vs baseline (inverted: positive = tighter = better)
 * - Quadrant classification: strong_both, hits_loose, tight_misses, struggling
 *
 * FALLBACK STRATEGY:
 * - If context baseline has < MIN_SESSIONS_FOR_CONTEXT_BASELINE sessions,
 *   use global baseline but mark insight as "preliminary"
 */
export function computeContextProfiles(
  sessions: SessionWithDetails[],
  thresholdConfig: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): ComputedContextProfiles {
  const completed = sessions.filter((s) => s.status === 'completed');

  // Compute baseline strategy
  const baselines = computeBaselines(completed);

  // Group sessions by context key
  const contextGroups = new Map<string, {
    key: ContextKey;
    engagement: SessionWithDetails[];
    grouping: SessionWithDetails[];
  }>();

  completed.forEach((session) => {
    const key = createContextKey(session);
    const keyString = serializeContextKey(key);

    if (!contextGroups.has(keyString)) {
      contextGroups.set(keyString, {
        key,
        engagement: [],
        grouping: [],
      });
    }

    const group = contextGroups.get(keyString)!;
    if (isGroupingSession(session)) {
      group.grouping.push(session);
    } else if (isEngagementSession(session)) {
      group.engagement.push(session);
    }
  });

  // Compute profiles
  const profiles: ContextProfile[] = [];
  let strongBothCount = 0;
  let hitsLooseCount = 0;
  let tightMissesCount = 0;
  let strugglingCount = 0;
  let insufficientDataCount = 0;

  contextGroups.forEach((group, keyString) => {
    const { key, engagement, grouping } = group;

    // Determine which baseline to use (context or global fallback)
    const contextBaseline = baselines.context.get(keyString);
    const useContextBaseline = contextBaseline &&
      (contextBaseline.accuracySessions >= MIN_SESSIONS_FOR_CONTEXT_BASELINE ||
       contextBaseline.groupingSessions >= MIN_SESSIONS_FOR_CONTEXT_BASELINE);
    const isPreliminary = !useContextBaseline;

    // Compute engagement metrics
    let engagementMetrics: ContextEngagementMetrics | null = null;
    if (engagement.length > 0) {
      let shots = 0;
      let hits = 0;
      engagement.forEach((s) => {
        if (s.stats) {
          shots += s.stats.shots_fired;
          hits += s.stats.hits_total;
        }
      });

      if (shots > 0) {
        const accuracy = (hits / shots) * 100;
        const baselineAccuracy = useContextBaseline && contextBaseline?.accuracy != null
          ? contextBaseline.accuracy
          : baselines.global.accuracy ?? 0;
        const delta = accuracy - baselineAccuracy;
        const threshold = getAccuracyThreshold(baselineAccuracy, thresholdConfig);
        const normalizedDelta = threshold > 0 ? delta / threshold : 0;

        engagementMetrics = {
          accuracy,
          baselineAccuracy,
          delta,
          normalizedDelta,
          shots,
          sessions: engagement.length,
          evidenceIds: engagement.map((s) => s.id),
        };
      }
    }

    // Compute grouping metrics
    let groupingMetrics: ContextGroupingMetrics | null = null;
    if (grouping.length > 0) {
      const bestDispersions: number[] = [];
      grouping.forEach((s) => {
        if (s.stats?.best_dispersion_cm != null) {
          bestDispersions.push(s.stats.best_dispersion_cm);
        }
      });

      const medianBestGroup = median(bestDispersions);
      if (medianBestGroup !== null) {
        const baselineMedianBestGroup = useContextBaseline && contextBaseline?.medianBestGroup != null
          ? contextBaseline.medianBestGroup
          : baselines.global.medianBestGroup ?? medianBestGroup;

        // Inverted: positive delta = tighter = better
        const delta = baselineMedianBestGroup - medianBestGroup;
        const threshold = getGroupingThreshold(key.distanceBucket, thresholdConfig);
        const normalizedDelta = threshold > 0 ? delta / threshold : 0;

        groupingMetrics = {
          medianBestGroup,
          baselineMedianBestGroup,
          delta,
          normalizedDelta,
          sessions: grouping.length,
          evidenceIds: grouping.map((s) => s.id),
        };
      }
    }

    // Classify quadrant
    let quadrant: ContextQuadrant;
    if (engagementMetrics === null && groupingMetrics === null) {
      quadrant = 'insufficient_data';
      insufficientDataCount++;
    } else if (engagementMetrics === null) {
      quadrant = 'grouping_only';
    } else if (groupingMetrics === null) {
      quadrant = 'engagement_only';
    } else {
      // Both metrics available - classify into 2x2
      const engagementGood = engagementMetrics.normalizedDelta >= 0;
      const groupingGood = groupingMetrics.normalizedDelta >= 0;

      if (engagementGood && groupingGood) {
        quadrant = 'strong_both';
        strongBothCount++;
      } else if (engagementGood && !groupingGood) {
        quadrant = 'hits_loose';
        hitsLooseCount++;
      } else if (!engagementGood && groupingGood) {
        quadrant = 'tight_misses';
        tightMissesCount++;
      } else {
        quadrant = 'struggling';
        strugglingCount++;
      }
    }

    // Determine confidence
    const totalSessions = engagement.length + grouping.length;
    const totalShots = engagementMetrics?.shots ?? 0;
    const confidence = determineConfidence(totalShots, totalSessions);

    profiles.push({
      key,
      keyString,
      engagement: engagementMetrics,
      grouping: groupingMetrics,
      quadrant,
      confidence,
      isPreliminary,
      label: labelContextKey(key),
    });
  });

  return {
    profiles,
    globalBaseline: baselines.global,
    contextBaselines: baselines.context,
    summary: {
      totalContexts: profiles.length,
      strongBothCount,
      hitsLooseCount,
      tightMissesCount,
      strugglingCount,
      insufficientDataCount,
    },
  };
}

/**
 * Get conversion insights from context profiles.
 *
 * WHY: Surfaces actionable narratives from the 2x2 matrix:
 * - "hits_loose": "You're converting hits but your mechanics are loose"
 * - "tight_misses": "Your groups are tight but you're missing targets"
 *
 * This is a deterministic derivation, NOT AI-generated.
 */
export function getConversionInsights(
  profiles: ContextProfile[]
): Array<{
  profile: ContextProfile;
  insight: string;
  severity: 'low' | 'medium' | 'high';
}> {
  const insights: Array<{
    profile: ContextProfile;
    insight: string;
    severity: 'low' | 'medium' | 'high';
  }> = [];

  profiles.forEach((profile) => {
    if (profile.quadrant === 'insufficient_data') return;

    switch (profile.quadrant) {
      case 'strong_both':
        // Positive reinforcement
        insights.push({
          profile,
          insight: `Strong performance in ${profile.label}: good hits and tight groups`,
          severity: 'low',
        });
        break;

      case 'hits_loose':
        // WARNING: Converting but mechanics need work
        insights.push({
          profile,
          insight: `${profile.label}: hitting targets but groups are ${Math.abs(profile.grouping?.delta ?? 0).toFixed(1)}cm looser than baseline. Mechanics may degrade under stress.`,
          severity: 'medium',
        });
        break;

      case 'tight_misses':
        // WARNING: Precise but not converting
        insights.push({
          profile,
          insight: `${profile.label}: groups are tight but accuracy is ${Math.abs(profile.engagement?.delta ?? 0).toFixed(0)}% below baseline. Check zero or shot placement.`,
          severity: 'medium',
        });
        break;

      case 'struggling':
        // CRITICAL: Both metrics below baseline
        insights.push({
          profile,
          insight: `${profile.label}: both accuracy and grouping are below baseline. Fundamental review recommended.`,
          severity: 'high',
        });
        break;

      case 'engagement_only':
        if (profile.engagement && profile.engagement.normalizedDelta < -1) {
          insights.push({
            profile,
            insight: `${profile.label}: accuracy ${Math.abs(profile.engagement.delta).toFixed(0)}% below baseline (no grouping data)`,
            severity: 'medium',
          });
        }
        break;

      case 'grouping_only':
        if (profile.grouping && profile.grouping.normalizedDelta < -1) {
          insights.push({
            profile,
            insight: `${profile.label}: best groups ${Math.abs(profile.grouping.delta).toFixed(1)}cm looser than baseline (no engagement data)`,
            severity: 'medium',
          });
        }
        break;
    }
  });

  // Sort by severity (high first)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

// ============================================================================
// OVERVIEW STATUS COMPUTATION
// ============================================================================

/**
 * Get the top focus item from weaknesses or recommendations.
 *
 * WHY: The overview card needs a single "Focus" item to answer
 * "Where should I work on?" immediately.
 *
 * PRIORITY:
 * 1. High-priority recommendations (if any)
 * 2. Worst weakness (highest severity)
 * 3. Medium-priority recommendations
 */
export function getTopFocusItem(
  weaknesses: WeaknessCard[],
  recommendations: Recommendation[]
): FocusItem | null {
  // Check for high-priority recommendation first
  const highPriorityRec = recommendations.find((r) => r.priority === 'high');
  if (highPriorityRec) {
    return {
      label: highPriorityRec.title,
      reason: highPriorityRec.description,
      sourceType: 'recommendation',
      sourceId: highPriorityRec.id,
      evidenceIds: highPriorityRec.evidenceIds,
    };
  }

  // Check for worst weakness (first in list is highest severity)
  if (weaknesses.length > 0) {
    const worst = weaknesses[0];
    const deltaDesc =
      worst.metric.unit === 'cm'
        ? `groups ${Math.abs(worst.metric.delta).toFixed(1)}cm looser`
        : `accuracy ${Math.abs(worst.metric.delta).toFixed(0)}% lower`;
    return {
      label: worst.label,
      reason: deltaDesc,
      sourceType: 'weakness',
      sourceId: worst.id,
      evidenceIds: worst.evidenceIds,
    };
  }

  // Fallback to medium-priority recommendation
  const mediumRec = recommendations.find((r) => r.priority === 'medium');
  if (mediumRec) {
    return {
      label: mediumRec.title,
      reason: mediumRec.description,
      sourceType: 'recommendation',
      sourceId: mediumRec.id,
      evidenceIds: mediumRec.evidenceIds,
    };
  }

  return null;
}

/**
 * Get the top trust item from strengths.
 *
 * WHY: The overview card needs a single "Trust" item to answer
 * "What can I rely on?" immediately.
 *
 * PRIORITY: Highest confidence strength, then highest delta.
 */
export function getTopTrustItem(strengths: StrengthCard[]): TrustItem | null {
  if (strengths.length === 0) return null;

  // Sort by confidence (high > medium > low), then by delta magnitude
  const sorted = [...strengths].sort((a, b) => {
    const confOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confOrder[a.metric.confidence] - confOrder[b.metric.confidence];
    if (confDiff !== 0) return confDiff;
    return Math.abs(b.metric.delta) - Math.abs(a.metric.delta);
  });

  const top = sorted[0];
  return {
    label: top.label,
    primaryValue: top.primaryValue,
    confidence: top.metric.confidence,
    sourceId: top.id,
    evidenceIds: top.evidenceIds,
  };
}

/**
 * Derive trend summary from computed trends.
 *
 * WHY: Trends array may have multiple trends per metric type.
 * We need to distill into a single summary for each axis.
 */
function deriveTrendSummary(
  trends: TrendData[],
  metricType: 'accuracy' | 'grouping',
  baselines: BaselineStrategy
): TrendSummary | null {
  // Find the trend for this metric type
  const relevantTrends = trends.filter((t) => t.metricType === metricType);
  if (relevantTrends.length === 0) {
    // No trend data, but we might have baseline data
    if (metricType === 'accuracy' && baselines.global.accuracy !== null) {
      return {
        currentValue: Math.round(baselines.global.accuracy),
        delta: 0,
        direction: 'stable',
        confidence: baselines.global.confidence,
        unit: '%',
        evidenceIds: [],
      };
    }
    if (metricType === 'grouping' && baselines.global.medianBestGroup !== null) {
      return {
        currentValue: Math.round(baselines.global.medianBestGroup * 10) / 10,
        delta: 0,
        direction: 'stable',
        confidence: baselines.global.confidence,
        unit: 'cm',
        evidenceIds: [],
      };
    }
    return null;
  }

  // Use the most recent/primary trend
  const trend = relevantTrends[0];
  const lastPoint = trend.dataPoints[trend.dataPoints.length - 1];
  const currentValue = lastPoint?.value ?? 0;

  // Map trend direction to our display direction
  const direction: 'improving' | 'stable' | 'declining' = trend.direction;

  return {
    currentValue: metricType === 'grouping' 
      ? Math.round(currentValue * 10) / 10 
      : Math.round(currentValue),
    delta: metricType === 'grouping'
      ? Math.round(trend.magnitude * 10) / 10
      : Math.round(trend.magnitude),
    direction,
    confidence: trend.confidence ?? 'medium',
    unit: metricType === 'grouping' ? 'cm' : '%',
    evidenceIds: trend.evidenceIds,
  };
}

/**
 * Compute overview status from insights and context profiles.
 *
 * WHY: The overview card needs a single computed state that:
 * 1. Shows accuracy + grouping status at a glance
 * 2. Highlights top focus area
 * 3. Highlights top trust area
 * 4. Communicates data sufficiency
 */
export function computeOverviewStatus(
  insights: ComputedInsights,
  contextProfiles: ComputedContextProfiles
): OverviewStatus {
  // Get baselines for trend computation
  const baselines: BaselineStrategy = {
    global: contextProfiles.globalBaseline,
    context: contextProfiles.contextBaselines,
  };

  // Derive trend summaries
  const accuracy = deriveTrendSummary(insights.trends, 'accuracy', baselines);
  const grouping = deriveTrendSummary(insights.trends, 'grouping', baselines);

  // Get focus and trust items
  const focusItem = insights.hasEnoughData
    ? getTopFocusItem(insights.weaknesses, insights.recommendations)
    : null;
  const trustItem = insights.hasEnoughData
    ? getTopTrustItem(insights.strengths)
    : null;

  return {
    accuracy,
    grouping,
    focusItem,
    trustItem,
    sessionCount: insights.sessionCount,
    shotCount: insights.shotCount,
    hasEnoughData: insights.hasEnoughData,
    sessionsNeeded: Math.max(0, insights.minSessionsRequired - insights.sessionCount),
  };
}

// ============================================================================
// MAIN COMPUTATION FUNCTION
// ============================================================================

/**
 * Compute all insights from sessions.
 *
 * IMPROVEMENTS (v2.0):
 * - Context-aware thresholds
 * - Explicit baseline strategy
 * - Improved semantic clarity for grouping metrics
 */
export function computeInsights(
  allSessions: SessionWithDetails[],
  filters: InsightsFilters = DEFAULT_FILTERS,
  thresholdConfig: ThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): ComputedInsights {
  // Apply filters
  const sessions = applyFilters(allSessions, filters);
  const completed = sessions.filter((s) => s.status === 'completed');

  // Calculate basic stats
  let totalShots = 0;
  completed.forEach((s) => {
    if (s.stats) {
      totalShots += s.stats.shots_fired;
    }
  });

  // Determine date range
  const dates = completed.map((s) => new Date(s.started_at).getTime());
  const dateRange = {
    start: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : '',
    end: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : '',
  };

  const hasEnoughData = completed.length >= MIN_SESSIONS_FOR_INSIGHTS;

  // Compute all sections with context-aware thresholds
  const totals = computeTotals(sessions);
  const strengths = hasEnoughData ? computeStrengths(sessions, filters, thresholdConfig) : [];
  const weaknesses = hasEnoughData ? computeWeaknesses(sessions, filters, thresholdConfig) : [];
  const trends = hasEnoughData ? computeTrends(sessions, filters) : [];
  const recommendations = hasEnoughData
    ? generateRecommendations(strengths, weaknesses, trends, sessions)
    : [];

  return {
    filters,
    totals,
    strengths,
    weaknesses,
    trends,
    recommendations,
    sessionCount: completed.length,
    shotCount: totalShots,
    dateRange,
    hasEnoughData,
    minSessionsRequired: MIN_SESSIONS_FOR_INSIGHTS,
  };
}
