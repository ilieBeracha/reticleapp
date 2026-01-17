/**
 * Insights Engine
 *
 * Core computation logic for the Insights page.
 * Computes totals, strengths, weaknesses, trends, and recommendations
 * from session data with applied filters.
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
  CategoryStats,
  ComputedInsights,
  ConfidenceLevel,
  DEFAULT_FILTERS,
  DISTANCE_BUCKETS,
  InsightsFilters,
  MetricDirection,
  Recommendation,
  StrengthCard,
  TotalsMetric,
  TrendData,
  TrendDataPoint,
  WeaknessCard
} from './insights.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_SESSIONS_FOR_INSIGHTS = 5;
const MIN_SHOTS_FOR_VARIANCE = 30;
const VARIANCE_THRESHOLD = 0.3; // 30% coefficient of variation = high variance
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
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return 0;
  return standardDeviation(values) / avg;
}

/**
 * Get distance bucket for a given distance
 */
function getDistanceBucket(distance: number | null): string | null {
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

  // Aggregate grouping stats (dispersion)
  const dispersions: number[] = [];
  const groupingSessionIds: string[] = [];

  groupingSessions.forEach((s) => {
    groupingSessionIds.push(s.id);
    if (s.stats?.best_dispersion_cm != null) {
      dispersions.push(s.stats.best_dispersion_cm);
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

  // Hit percentage (median) - ONLY from engagement sessions
  const medianAccuracy = median(engagementAccuracies);
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

  // Overall accuracy - ONLY from engagement sessions
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

  // Median grouping - ONLY from grouping sessions
  const medianDispersion = median(dispersions);
  if (medianDispersion !== null) {
    totals.push({
      id: 'median_group',
      label: 'Median Group',
      value: Math.round(medianDispersion * 10) / 10,
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
 * Group sessions by category and compute stats
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
        stats.dispersions.push(session.stats.best_dispersion_cm);
      }
    }
  });

  // Calculate derived stats
  groups.forEach((stats) => {
    stats.accuracy = stats.shots > 0 ? (stats.hits / stats.shots) * 100 : 0;
    stats.avgDispersion =
      stats.dispersions.length > 0
        ? stats.dispersions.reduce((a, b) => a + b, 0) / stats.dispersions.length
        : null;
    stats.medianDispersion = median(stats.dispersions);
  });

  return groups;
}

/**
 * Compute strengths from sessions
 * 
 * IMPORTANT: Accuracy strengths come from engagement sessions only.
 * Grouping strengths come from grouping sessions only.
 */
export function computeStrengths(
  sessions: SessionWithDetails[],
  filters: InsightsFilters
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

  // Calculate grouping baseline (dispersion)
  const baselineDispersions: number[] = [];
  groupingSessions.forEach((s) => {
    if (s.stats?.best_dispersion_cm != null) {
      baselineDispersions.push(s.stats.best_dispersion_cm);
    }
  });

  const baselineMedianDispersion = median(baselineDispersions);

  // Group ENGAGEMENT sessions by position (for accuracy strengths)
  const engagementByPosition = groupByCategory(engagementSessions, (s) =>
    s.drill_config?.position?.toLowerCase() || null
  );

  engagementByPosition.forEach((stats, position) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    // Check if accuracy is above baseline
    const accuracyDelta = stats.accuracy - baselineAccuracy;
    if (accuracyDelta >= ACCURACY_CHANGE_THRESHOLD) {
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
    if (stats.medianDispersion !== null && baselineMedianDispersion !== null) {
      const dispersionDelta = baselineMedianDispersion - stats.medianDispersion;
      if (dispersionDelta >= GROUPING_CHANGE_THRESHOLD && stats.dispersions.length >= 3) {
        const confidence = determineConfidence(stats.shots, stats.sessions.length);
        strengths.push({
          id: `strength-position-grouping-${position}`,
          category: 'position',
          label: `${position.charAt(0).toUpperCase() + position.slice(1)} (Grouping)`,
          primaryValue: `${Math.round(stats.medianDispersion * 10) / 10} cm`,
          context: `${Math.round(dispersionDelta * 10) / 10} cm tighter than baseline`,
          metric: {
            value: stats.medianDispersion,
            baseline: baselineMedianDispersion,
            delta: -dispersionDelta,
            direction: 'up', // Smaller is better
            isSignificant: true,
            confidence,
            dataPoints: stats.dispersions.length,
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
    if (accuracyDelta >= ACCURACY_CHANGE_THRESHOLD) {
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
    return `${DISTANCE_BUCKETS[bucket as keyof typeof DISTANCE_BUCKETS].label}`;
  });

  groupingByDistance.forEach((stats, distanceLabel) => {
    if (stats.medianDispersion !== null && baselineMedianDispersion !== null) {
      const dispersionDelta = baselineMedianDispersion - stats.medianDispersion;
      if (dispersionDelta >= GROUPING_CHANGE_THRESHOLD && stats.dispersions.length >= 3) {
        const confidence = determineConfidence(stats.shots, stats.sessions.length);
        strengths.push({
          id: `strength-distance-grouping-${distanceLabel}`,
          category: 'distance',
          label: `${distanceLabel} (Grouping)`,
          primaryValue: `${Math.round(stats.medianDispersion * 10) / 10} cm`,
          context: `${Math.round(dispersionDelta * 10) / 10} cm tighter than baseline`,
          metric: {
            value: stats.medianDispersion,
            baseline: baselineMedianDispersion,
            delta: -dispersionDelta,
            direction: 'up',
            isSignificant: true,
            confidence,
            dataPoints: stats.dispersions.length,
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
    if (accuracyDelta >= ACCURACY_CHANGE_THRESHOLD) {
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
 * Compute weaknesses from sessions
 */
/**
 * Compute weaknesses from sessions
 * 
 * IMPORTANT: Accuracy weaknesses come from engagement sessions only.
 * Grouping weaknesses come from grouping sessions only.
 */
export function computeWeaknesses(
  sessions: SessionWithDetails[],
  filters: InsightsFilters
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

  // Calculate grouping baseline (dispersion)
  const baselineDispersions: number[] = [];
  groupingSessions.forEach((s) => {
    if (s.stats?.best_dispersion_cm != null) {
      baselineDispersions.push(s.stats.best_dispersion_cm);
    }
  });

  const baselineMedianDispersion = median(baselineDispersions);

  // Group ENGAGEMENT sessions by position (for accuracy weaknesses)
  const engagementByPosition = groupByCategory(engagementSessions, (s) =>
    s.drill_config?.position?.toLowerCase() || null
  );

  engagementByPosition.forEach((stats, position) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    // Check if accuracy is below baseline
    const accuracyDelta = stats.accuracy - baselineAccuracy;
    if (accuracyDelta <= -ACCURACY_CHANGE_THRESHOLD) {
      const confidence = determineConfidence(stats.shots, stats.sessions.length);

      // Calculate variance
      const sessionAccuracies = stats.sessions
        .filter((s) => s.stats && s.stats.shots_fired > 0)
        .map((s) => (s.stats!.hits_total / s.stats!.shots_fired) * 100);
      const variance = coefficientOfVariation(sessionAccuracies);
      const hasHighVariance = variance >= VARIANCE_THRESHOLD;

      weaknesses.push({
        id: `weakness-position-${position}`,
        category: 'position',
        label: position.charAt(0).toUpperCase() + position.slice(1),
        primaryValue: `${Math.round(stats.accuracy)}%`,
        context: hasHighVariance
          ? 'High variance between sessions'
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
    if (stats.sessions.length >= 3) {
      const sessionAccuracies = stats.sessions
        .filter((s) => s.stats && s.stats.shots_fired > 0)
        .map((s) => (s.stats!.hits_total / s.stats!.shots_fired) * 100);
      const variance = coefficientOfVariation(sessionAccuracies);

      if (
        variance >= VARIANCE_THRESHOLD &&
        !weaknesses.find((w) => w.id === `weakness-position-${position}`)
      ) {
        const confidence = determineConfidence(stats.shots, stats.sessions.length);
        weaknesses.push({
          id: `weakness-variance-${position}`,
          category: 'variance',
          label: `${position.charAt(0).toUpperCase() + position.slice(1)} Consistency`,
          primaryValue: `${Math.round(variance * 100)}%`,
          context: 'Coefficient of variation',
          metric: {
            value: variance * 100,
            baseline: 15, // Expected CV
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

  // Group by distance bucket
  const byDistance = groupByCategory(completed, (s) => {
    const distance = s.drill_config?.distance_m ?? s.stats?.avg_distance_m;
    const bucket = getDistanceBucket(distance ?? null);
    if (!bucket) return null;
    return `${DISTANCE_BUCKETS[bucket as keyof typeof DISTANCE_BUCKETS].label}`;
  });

  byDistance.forEach((stats, distanceLabel) => {
    if (stats.shots < MIN_SHOTS_FOR_CATEGORY) return;

    const accuracyDelta = stats.accuracy - baselineAccuracy;
    if (accuracyDelta <= -ACCURACY_CHANGE_THRESHOLD) {
      const confidence = determineConfidence(stats.shots, stats.sessions.length);

      const sessionAccuracies = stats.sessions
        .filter((s) => s.stats && s.stats.shots_fired > 0)
        .map((s) => (s.stats!.hits_total / s.stats!.shots_fired) * 100);
      const variance = coefficientOfVariation(sessionAccuracies);

      weaknesses.push({
        id: `weakness-distance-${distanceLabel}`,
        category: 'position', // Distance is a form of position weakness
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
        variance: variance >= VARIANCE_THRESHOLD ? Math.round(variance * 100) : null,
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
// MAIN COMPUTATION FUNCTION
// ============================================================================

/**
 * Compute all insights from sessions
 */
export function computeInsights(
  allSessions: SessionWithDetails[],
  filters: InsightsFilters = DEFAULT_FILTERS
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

  // Compute all sections
  const totals = computeTotals(sessions);
  const strengths = hasEnoughData ? computeStrengths(sessions, filters) : [];
  const weaknesses = hasEnoughData ? computeWeaknesses(sessions, filters) : [];
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
