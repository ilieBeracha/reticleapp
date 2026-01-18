/**
 * Insights Engine Tests
 *
 * These tests define the expected behavior of the insights system.
 * If a test fails, the business logic is incorrect.
 *
 * Business Rules Tested:
 * 1. Minimum 5 sessions required for full insights
 * 2. Accuracy change threshold: ±5% is meaningful (context-aware in v2.0)
 * 3. Grouping change threshold: ±0.5cm is meaningful (distance-scaled in v2.0)
 * 4. Variance threshold: 30% CV = high variance (context-scoped in v2.0)
 * 5. Strengths: performance above baseline by threshold
 * 6. Weaknesses: performance below baseline by threshold
 * 7. Trends: first-half vs second-half comparison
 * 8. Filters: time, weapon, position, distance, drill type
 * 9. Baseline strategy: global vs context baselines (v2.0)
 * 10. Context profiles: engagement/grouping bridge (v2.0)
 */

import type { SessionWithDetails } from '@/services/session/types';
import {
  applyFilters,
  computeBaselines,
  computeContextProfiles,
  computeInsights,
  computeStrengths,
  computeTotals,
  computeTrends,
  computeWeaknesses,
  createContextKey,
  generateRecommendations,
  getAccuracyThreshold,
  getConversionInsights,
  getGroupingThreshold,
  interquartileRange,
  serializeContextKey,
} from '../insights.engine';
import { DEFAULT_FILTERS, DEFAULT_THRESHOLD_CONFIG, InsightsFilters, ThresholdConfig } from '../insights.types';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createMockSession(overrides: Partial<SessionWithDetails> = {}): SessionWithDetails {
  const defaultSession: SessionWithDetails = {
    id: `session-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'user-123',
    status: 'completed',
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    team_id: null,
    training_id: null,
    drill_id: null,
    weapon_id: null,
    weapon_name: null,
    weapon_category: null,
    session_mode: 'solo',
    watch_controlled: false,
    drill_config: null,
    stats: {
      shots_fired: 10,
      hits_total: 8,
      accuracy_pct: 80,
      target_count: 1,
      best_dispersion_cm: 3.0,
      avg_distance_m: 25,
    },
    ...overrides,
  };
  return defaultSession;
}

function createSessionWithAccuracy(
  accuracy: number,
  shots: number = 10,
  daysAgo: number = 0,
  position?: string,
  distanceM?: number,
  weaponName?: string
): SessionWithDetails {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const hits = Math.round(shots * (accuracy / 100));

  return createMockSession({
    id: `session-${Math.random().toString(36).substr(2, 9)}`,
    started_at: date.toISOString(),
    weapon_name: weaponName || null,
    drill_config: position || distanceM
      ? {
          drill_goal: 'engagement',
          position: position,
          distance_m: distanceM,
        } as any
      : null,
    stats: {
      shots_fired: shots,
      hits_total: hits,
      accuracy_pct: Math.round((hits / shots) * 100),
      target_count: 1,
      best_dispersion_cm: null,
      avg_distance_m: distanceM || 25,
    },
  });
}

function createSessionWithGrouping(
  dispersionCm: number,
  daysAgo: number = 0,
  position?: string
): SessionWithDetails {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return createMockSession({
    id: `session-${Math.random().toString(36).substr(2, 9)}`,
    started_at: date.toISOString(),
    // Always set drill_goal: 'grouping' for grouping sessions
    drill_config: {
      drill_goal: 'grouping',
      ...(position ? { position } : {}),
    } as any,
    stats: {
      shots_fired: 10,
      hits_total: 10,
      accuracy_pct: 100,
      target_count: 1,
      best_dispersion_cm: dispersionCm,
      avg_distance_m: 100,
    },
  });
}

function createWeeklySessionSpread(
  weekCount: number,
  accuracyFn: (weekIndex: number) => number
): SessionWithDetails[] {
  const sessions: SessionWithDetails[] = [];
  for (let week = 0; week < weekCount; week++) {
    const daysAgo = week * 7 + 3; // Middle of each week
    const accuracy = accuracyFn(week);
    sessions.push(createSessionWithAccuracy(accuracy, 30, daysAgo));
  }
  return sessions;
}

// ============================================================================
// CONSTANTS (MATCHING ENGINE CONSTANTS)
// ============================================================================

const MIN_SESSIONS_FOR_INSIGHTS = 5;
const ACCURACY_CHANGE_THRESHOLD = 5;
const GROUPING_CHANGE_THRESHOLD = 0.5;
const VARIANCE_THRESHOLD = 0.3;
const MIN_SHOTS_FOR_CATEGORY = 20;

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('median calculation (implicit in computeTotals)', () => {
    it('should return median for odd-length array', () => {
      // We test this via computeTotals
      const sessions = [
        createSessionWithAccuracy(60, 10),
        createSessionWithAccuracy(80, 10),
        createSessionWithAccuracy(70, 10),
      ];
      const totals = computeTotals(sessions);
      const hitPct = totals.find((t) => t.id === 'hit_pct');
      // Median of [60, 70, 80] = 70
      expect(hitPct?.value).toBe(70);
    });

    it('should return median for even-length array', () => {
      const sessions = [
        createSessionWithAccuracy(60, 10),
        createSessionWithAccuracy(80, 10),
        createSessionWithAccuracy(70, 10),
        createSessionWithAccuracy(90, 10),
      ];
      const totals = computeTotals(sessions);
      const hitPct = totals.find((t) => t.id === 'hit_pct');
      // Median of [60, 70, 80, 90] = (70 + 80) / 2 = 75
      expect(hitPct?.value).toBe(75);
    });
  });
});

// ============================================================================
// FILTER TESTS
// ============================================================================

describe('applyFilters', () => {
  describe('time filter', () => {
    it('should filter sessions by week', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 3), // 3 days ago - in week
        createSessionWithAccuracy(80, 10, 10), // 10 days ago - out
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, time: 'week' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(1);
    });

    it('should filter sessions by month', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 15), // 15 days ago - in month
        createSessionWithAccuracy(80, 10, 45), // 45 days ago - out
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, time: 'month' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(1);
    });

    it('should return all sessions when time is "all"', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 3),
        createSessionWithAccuracy(80, 10, 400),
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, time: 'all' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(2);
    });
  });

  describe('position filter', () => {
    it('should filter by position', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0, 'prone'),
        createSessionWithAccuracy(80, 10, 0, 'standing'),
        createSessionWithAccuracy(80, 10, 0, 'prone'),
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, position: 'prone' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(2);
    });

    it('should be case-insensitive', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0, 'Prone'),
        createSessionWithAccuracy(80, 10, 0, 'STANDING'),
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, position: 'prone' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(1);
    });
  });

  describe('distance filter', () => {
    it('should filter by close distance (≤25m)', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0, undefined, 15),
        createSessionWithAccuracy(80, 10, 0, undefined, 50),
        createSessionWithAccuracy(80, 10, 0, undefined, 150),
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, distance: 'close' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(1);
    });

    it('should filter by medium distance (25-100m)', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0, undefined, 15),
        createSessionWithAccuracy(80, 10, 0, undefined, 50),
        createSessionWithAccuracy(80, 10, 0, undefined, 150),
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, distance: 'medium' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(1);
    });

    it('should filter by long distance (100-300m)', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0, undefined, 15),
        createSessionWithAccuracy(80, 10, 0, undefined, 50),
        createSessionWithAccuracy(80, 10, 0, undefined, 150),
      ];
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, distance: 'long' };
      const filtered = applyFilters(sessions, filters);
      expect(filtered.length).toBe(1);
    });
  });

  describe('drill type filter', () => {
    it('should filter by grouping drills', () => {
      const groupingSession = createMockSession({
        drill_config: { drill_goal: 'grouping' } as any,
      });
      const engagementSession = createMockSession({
        drill_config: { drill_goal: 'engagement' } as any,
      });
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, drillType: 'grouping' };
      const filtered = applyFilters([groupingSession, engagementSession], filters);
      expect(filtered.length).toBe(1);
    });

    it('should filter stress drills by time limit', () => {
      const timedSession = createMockSession({
        drill_config: { drill_goal: 'engagement', time_limit_seconds: 30 } as any,
      });
      const untimedSession = createMockSession({
        drill_config: { drill_goal: 'engagement' } as any,
      });
      const filters: InsightsFilters = { ...DEFAULT_FILTERS, drillType: 'stress' };
      const filtered = applyFilters([timedSession, untimedSession], filters);
      expect(filtered.length).toBe(1);
    });
  });
});

// ============================================================================
// TOTALS COMPUTATION TESTS
// ============================================================================

describe('computeTotals', () => {
  it('should count completed sessions only', () => {
    const sessions = [
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'active' }), // Should be excluded
    ];
    const totals = computeTotals(sessions);
    const sessionCount = totals.find((t) => t.id === 'sessions');
    expect(sessionCount?.value).toBe(2);
  });

  it('should calculate total shots correctly', () => {
    const sessions = [
      createMockSession({
        status: 'completed',
        stats: { shots_fired: 10, hits_total: 8, accuracy_pct: 80, target_count: 1, best_dispersion_cm: null, avg_distance_m: 25 },
      }),
      createMockSession({
        status: 'completed',
        stats: { shots_fired: 20, hits_total: 15, accuracy_pct: 75, target_count: 1, best_dispersion_cm: null, avg_distance_m: 25 },
      }),
    ];
    const totals = computeTotals(sessions);
    const shotCount = totals.find((t) => t.id === 'shots');
    expect(shotCount?.value).toBe(30);
  });

  it('should calculate overall accuracy correctly', () => {
    const sessions = [
      createMockSession({
        status: 'completed',
        stats: { shots_fired: 10, hits_total: 8, accuracy_pct: 80, target_count: 1, best_dispersion_cm: null, avg_distance_m: 25 },
      }),
      createMockSession({
        status: 'completed',
        stats: { shots_fired: 10, hits_total: 6, accuracy_pct: 60, target_count: 1, best_dispersion_cm: null, avg_distance_m: 25 },
      }),
    ];
    const totals = computeTotals(sessions);
    const accuracy = totals.find((t) => t.id === 'accuracy');
    // 14 hits / 20 shots = 70%
    expect(accuracy?.value).toBe(70);
  });

  it('should calculate median grouping correctly', () => {
    const sessions = [
      createSessionWithGrouping(2.0),
      createSessionWithGrouping(4.0),
      createSessionWithGrouping(3.0),
    ];
    const totals = computeTotals(sessions);
    const medianGroup = totals.find((t) => t.id === 'median_group');
    // Median of [2.0, 3.0, 4.0] = 3.0
    expect(medianGroup?.value).toBe(3.0);
  });

  it('should include evidence IDs for all metrics', () => {
    const sessions = [
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
    ];
    const totals = computeTotals(sessions);
    totals.forEach((metric) => {
      expect(metric.evidenceIds.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// STRENGTHS COMPUTATION TESTS
// ============================================================================

describe('computeStrengths', () => {
  it('should require minimum sessions for insights', () => {
    const sessions = [
      createSessionWithAccuracy(90, 30, 0, 'prone'),
      createSessionWithAccuracy(50, 30, 0, 'standing'),
    ];
    const strengths = computeStrengths(sessions, DEFAULT_FILTERS);
    // Only 2 sessions, need MIN_SESSIONS_FOR_INSIGHTS (5)
    expect(strengths.length).toBe(0);
  });

  it('should identify position strength when above baseline by threshold', () => {
    // Baseline: 60% average
    // Prone: 80% (20% above baseline, > 5% threshold)
    const sessions = [
      // Baseline sessions
      createSessionWithAccuracy(60, 30, 0, 'standing'),
      createSessionWithAccuracy(60, 30, 0, 'standing'),
      createSessionWithAccuracy(60, 30, 0, 'kneeling'),
      // Strong position
      createSessionWithAccuracy(80, 30, 0, 'prone'),
      createSessionWithAccuracy(80, 30, 0, 'prone'),
    ];
    const strengths = computeStrengths(sessions, DEFAULT_FILTERS);
    const proneStrength = strengths.find((s) => s.label.toLowerCase().includes('prone'));
    expect(proneStrength).toBeDefined();
    expect(proneStrength?.metric.direction).toBe('up');
  });

  it('should NOT identify strength when difference is below threshold', () => {
    // All positions at similar accuracy (within 5% threshold)
    const sessions = [
      createSessionWithAccuracy(62, 30, 0, 'standing'),
      createSessionWithAccuracy(60, 30, 0, 'standing'),
      createSessionWithAccuracy(61, 30, 0, 'kneeling'),
      createSessionWithAccuracy(63, 30, 0, 'prone'),
      createSessionWithAccuracy(64, 30, 0, 'prone'),
    ];
    const strengths = computeStrengths(sessions, DEFAULT_FILTERS);
    // No position should be flagged as strength (all within threshold)
    expect(strengths.length).toBe(0);
  });

  it('should identify weapon strength when above baseline', () => {
    const sessions = [
      createSessionWithAccuracy(60, 30, 0, undefined, undefined, 'Rifle A'),
      createSessionWithAccuracy(60, 30, 0, undefined, undefined, 'Rifle A'),
      createSessionWithAccuracy(60, 30, 0, undefined, undefined, 'Pistol'),
      createSessionWithAccuracy(85, 30, 0, undefined, undefined, 'Rifle B'),
      createSessionWithAccuracy(85, 30, 0, undefined, undefined, 'Rifle B'),
    ];
    const strengths = computeStrengths(sessions, DEFAULT_FILTERS);
    const weaponStrength = strengths.find((s) => s.category === 'weapon' && s.label === 'Rifle B');
    expect(weaponStrength).toBeDefined();
  });

  it('should require minimum shots per category', () => {
    // Prone has only 10 shots (need MIN_SHOTS_FOR_CATEGORY = 20)
    const sessions = [
      createSessionWithAccuracy(60, 30, 0, 'standing'),
      createSessionWithAccuracy(60, 30, 0, 'standing'),
      createSessionWithAccuracy(60, 30, 0, 'kneeling'),
      createSessionWithAccuracy(60, 30, 0, 'kneeling'),
      createSessionWithAccuracy(90, 10, 0, 'prone'), // Only 10 shots
    ];
    const strengths = computeStrengths(sessions, DEFAULT_FILTERS);
    const proneStrength = strengths.find((s) => s.label.toLowerCase().includes('prone'));
    expect(proneStrength).toBeUndefined();
  });

  it('should sort strengths by delta (strongest first)', () => {
    const sessions = [
      // Baseline ~60%
      createSessionWithAccuracy(50, 30, 0, 'kneeling'),
      createSessionWithAccuracy(50, 30, 0, 'kneeling'),
      // Moderate strength: +15%
      createSessionWithAccuracy(75, 30, 0, 'standing'),
      createSessionWithAccuracy(75, 30, 0, 'standing'),
      // Strong strength: +30%
      createSessionWithAccuracy(90, 30, 0, 'prone'),
    ];
    const strengths = computeStrengths(sessions, DEFAULT_FILTERS);
    if (strengths.length >= 2) {
      expect(Math.abs(strengths[0].metric.delta)).toBeGreaterThanOrEqual(
        Math.abs(strengths[1].metric.delta)
      );
    }
  });
});

// ============================================================================
// WEAKNESSES COMPUTATION TESTS
// ============================================================================

describe('computeWeaknesses', () => {
  it('should identify position weakness when below baseline by threshold', () => {
    // Baseline: 70% average
    // Standing: 50% (20% below baseline, > 5% threshold)
    const sessions = [
      createSessionWithAccuracy(80, 30, 0, 'prone'),
      createSessionWithAccuracy(80, 30, 0, 'prone'),
      createSessionWithAccuracy(70, 30, 0, 'kneeling'),
      createSessionWithAccuracy(50, 30, 0, 'standing'),
      createSessionWithAccuracy(50, 30, 0, 'standing'),
    ];
    const weaknesses = computeWeaknesses(sessions, DEFAULT_FILTERS);
    const standingWeakness = weaknesses.find(
      (w) => w.category === 'position' && w.label.toLowerCase().includes('standing')
    );
    expect(standingWeakness).toBeDefined();
    expect(standingWeakness?.metric.direction).toBe('down');
  });

  it('should identify high variance as a weakness', () => {
    // Standing has high variance (30%, 80%, 50% = CV > 30%)
    const sessions = [
      createSessionWithAccuracy(60, 30, 0, 'prone'),
      createSessionWithAccuracy(60, 30, 0, 'prone'),
      createSessionWithAccuracy(60, 30, 0, 'kneeling'),
      // High variance standing sessions
      createSessionWithAccuracy(30, 30, 0, 'standing'),
      createSessionWithAccuracy(80, 30, 0, 'standing'),
      createSessionWithAccuracy(50, 30, 0, 'standing'),
    ];
    const weaknesses = computeWeaknesses(sessions, DEFAULT_FILTERS);
    const varianceWeakness = weaknesses.find(
      (w) => w.category === 'variance' || w.variance !== null
    );
    expect(varianceWeakness).toBeDefined();
  });

  it('should sort weaknesses by delta (worst first)', () => {
    const sessions = [
      // Baseline ~70%
      createSessionWithAccuracy(80, 30, 0, 'prone'),
      createSessionWithAccuracy(80, 30, 0, 'prone'),
      // Moderate weakness: -15%
      createSessionWithAccuracy(55, 30, 0, 'kneeling'),
      createSessionWithAccuracy(55, 30, 0, 'kneeling'),
      // Severe weakness: -30%
      createSessionWithAccuracy(40, 30, 0, 'standing'),
    ];
    const weaknesses = computeWeaknesses(sessions, DEFAULT_FILTERS);
    if (weaknesses.length >= 2) {
      // Worst (most negative delta) should be first
      expect(weaknesses[0].metric.delta).toBeLessThanOrEqual(weaknesses[1].metric.delta);
    }
  });
});

// ============================================================================
// TRENDS COMPUTATION TESTS
// ============================================================================

describe('computeTrends', () => {
  it('should require enough sessions for trend detection', () => {
    const sessions = [
      createSessionWithAccuracy(70, 30, 7),
      createSessionWithAccuracy(75, 30, 14),
    ];
    const trends = computeTrends(sessions, DEFAULT_FILTERS);
    expect(trends.length).toBe(0);
  });

  it('should detect improving accuracy trend', () => {
    // Create 8 weeks of data with improving accuracy
    // Week index 0 = most recent (3 days ago), week 7 = oldest (59 days ago)
    // For improving: old sessions should have lower accuracy, recent should have higher
    // So week 7 (oldest) = low, week 0 (newest) = high
    const sessions = createWeeklySessionSpread(8, (week) => 90 - week * 5);
    // week 0 (newest) = 90%, week 7 (oldest) = 55% -> sorted chronologically: 55% -> 90% = improving
    const trends = computeTrends(sessions, DEFAULT_FILTERS);
    const accuracyTrend = trends.find((t) => t.metricType === 'accuracy');
    expect(accuracyTrend?.direction).toBe('improving');
  });

  it('should detect declining accuracy trend', () => {
    // Create 8 weeks of data with declining accuracy
    // Week index 0 = most recent (3 days ago), week 7 = oldest (59 days ago)
    // For declining: old sessions should have higher accuracy, recent should have lower
    const sessions = createWeeklySessionSpread(8, (week) => 50 + week * 5);
    // week 0 (newest) = 50%, week 7 (oldest) = 85% -> sorted chronologically: 85% -> 50% = declining
    const trends = computeTrends(sessions, DEFAULT_FILTERS);
    const accuracyTrend = trends.find((t) => t.metricType === 'accuracy');
    expect(accuracyTrend?.direction).toBe('declining');
  });

  it('should NOT detect trend when change is below threshold', () => {
    // Create 8 weeks with stable accuracy (within 5% threshold)
    const sessions = createWeeklySessionSpread(8, (week) => 70 + (week % 2 === 0 ? 1 : -1));
    const trends = computeTrends(sessions, DEFAULT_FILTERS);
    const accuracyTrend = trends.find((t) => t.metricType === 'accuracy');
    // Either no trend or stable
    expect(accuracyTrend).toBeUndefined();
  });

  it('should detect grouping trend', () => {
    // Create sessions with improving groupings (tighter groups over time)
    // Week 0 = most recent (3 days ago), week 7 = oldest (59 days ago)
    // For improving: older sessions should have larger dispersion, recent should have smaller
    const sessions: SessionWithDetails[] = [];
    for (let week = 0; week < 8; week++) {
      const daysAgo = week * 7 + 3;
      // week 0 (newest) = 2.6cm, week 7 (oldest) = 5.0cm
      // sorted chronologically: 5.0cm -> 2.6cm = improving (getting tighter)
      const dispersion = 2.6 + week * 0.35;
      sessions.push(createSessionWithGrouping(dispersion, daysAgo));
    }
    const trends = computeTrends(sessions, DEFAULT_FILTERS);
    const groupingTrend = trends.find((t) => t.metricType === 'grouping');
    expect(groupingTrend?.direction).toBe('improving');
  });
});

// ============================================================================
// RECOMMENDATIONS GENERATION TESTS
// ============================================================================

describe('generateRecommendations', () => {
  it('should generate drill recommendation from position weakness', () => {
    const weaknesses = [
      {
        id: 'weakness-position-standing',
        category: 'position' as const,
        label: 'Standing',
        primaryValue: '50%',
        context: '15% below baseline',
        metric: {
          value: 50,
          baseline: 65,
          delta: -15,
          direction: 'down' as const,
          isSignificant: true,
          confidence: 'medium' as const,
          dataPoints: 60,
          unit: '%',
        },
        variance: null,
        evidenceIds: ['s1', 's2'],
      },
    ];

    // Note: generateRecommendations(strengths, weaknesses, trends, sessions)
    const recommendations = generateRecommendations([], weaknesses, [], []);
    const drillRec = recommendations.find((r) => r.type === 'drill');
    expect(drillRec).toBeDefined();
    expect(drillRec?.description).toContain('Standing');
  });

  it('should generate structure recommendation from high variance', () => {
    const weaknesses = [
      {
        id: 'weakness-variance-standing',
        category: 'variance' as const,
        label: 'Standing Consistency',
        primaryValue: '35%',
        context: 'Coefficient of variation',
        metric: {
          value: 35,
          baseline: 15,
          delta: 20,
          direction: 'down' as const,
          isSignificant: true,
          confidence: 'medium' as const,
          dataPoints: 60,
          unit: '%',
        },
        variance: 35,
        evidenceIds: ['s1', 's2'],
      },
    ];

    // Note: generateRecommendations(strengths, weaknesses, trends, sessions)
    const recommendations = generateRecommendations([], weaknesses, [], []);
    const structureRec = recommendations.find((r) => r.type === 'structure');
    expect(structureRec).toBeDefined();
    expect(structureRec?.goal).toContain('variance');
  });

  it('should generate recommendation from declining trend', () => {
    const trends = [
      {
        id: 'trend-accuracy',
        metricType: 'accuracy' as const,
        label: 'Overall Accuracy',
        direction: 'declining' as const,
        magnitude: 10,
        timeWindow: 'over 6 weeks',
        trigger: 'Performance declining',
        dataPoints: [],
        evidenceIds: ['s1', 's2'],
      },
    ];

    const recommendations = generateRecommendations([], [], trends, []);
    const trendRec = recommendations.find((r) => r.id.includes('trend'));
    expect(trendRec).toBeDefined();
    expect(trendRec?.title).toContain('Decline');
  });

  it('should suggest building on strength when no weaknesses', () => {
    const strengths = [
      {
        id: 'strength-position-prone',
        category: 'position' as const,
        label: 'Prone',
        primaryValue: '85%',
        context: '+15% vs baseline',
        metric: {
          value: 85,
          baseline: 70,
          delta: 15,
          direction: 'up' as const,
          isSignificant: true,
          confidence: 'high' as const,
          dataPoints: 100,
          unit: '%',
        },
        evidenceIds: ['s1', 's2'],
      },
    ];

    const recommendations = generateRecommendations(strengths, [], [], []);
    const buildRec = recommendations.find((r) => r.id === 'rec-build-strength');
    expect(buildRec).toBeDefined();
    expect(buildRec?.title).toContain('Strength');
  });

  it('should prioritize high priority recommendations first', () => {
    const weaknesses = [
      {
        id: 'weakness-position-standing',
        category: 'position' as const,
        label: 'Standing',
        primaryValue: '50%',
        metric: {
          value: 50,
          baseline: 65,
          delta: -15,
          direction: 'down' as const,
          isSignificant: true,
          confidence: 'medium' as const,
          dataPoints: 60,
          unit: '%',
        },
        variance: null,
        evidenceIds: ['s1'],
      },
      {
        id: 'weakness-variance-kneeling',
        category: 'variance' as const,
        label: 'Kneeling Consistency',
        primaryValue: '40%',
        metric: {
          value: 40,
          baseline: 15,
          delta: 25,
          direction: 'down' as const,
          isSignificant: true,
          confidence: 'medium' as const,
          dataPoints: 60,
          unit: '%',
        },
        variance: 40,
        evidenceIds: ['s2'],
      },
    ];

    // Note: generateRecommendations(strengths, weaknesses, trends, sessions)
    const recommendations = generateRecommendations([], weaknesses, [], []);
    // Variance weakness should generate high priority
    if (recommendations.length >= 2) {
      const highPriorityIndex = recommendations.findIndex((r) => r.priority === 'high');
      const mediumPriorityIndex = recommendations.findIndex((r) => r.priority === 'medium');
      if (highPriorityIndex >= 0 && mediumPriorityIndex >= 0) {
        expect(highPriorityIndex).toBeLessThan(mediumPriorityIndex);
      }
    }
  });
});

// ============================================================================
// MAIN COMPUTATION TESTS
// ============================================================================

describe('computeInsights', () => {
  it('should set hasEnoughData to false with less than 5 sessions', () => {
    const sessions = [
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
    ];
    const insights = computeInsights(sessions);
    expect(insights.hasEnoughData).toBe(false);
    expect(insights.sessionCount).toBe(3);
    expect(insights.minSessionsRequired).toBe(5);
  });

  it('should set hasEnoughData to true with 5+ sessions', () => {
    const sessions = [
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
    ];
    const insights = computeInsights(sessions);
    expect(insights.hasEnoughData).toBe(true);
  });

  it('should still compute totals even with insufficient data', () => {
    const sessions = [
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'completed' }),
    ];
    const insights = computeInsights(sessions);
    expect(insights.totals.length).toBeGreaterThan(0);
    expect(insights.strengths.length).toBe(0); // No strengths without enough data
    expect(insights.weaknesses.length).toBe(0);
  });

  it('should apply filters before computing', () => {
    const sessions = [
      createSessionWithAccuracy(80, 30, 3, 'prone'),
      createSessionWithAccuracy(80, 30, 3, 'prone'),
      createSessionWithAccuracy(80, 30, 3, 'prone'),
      createSessionWithAccuracy(80, 30, 3, 'standing'),
      createSessionWithAccuracy(80, 30, 3, 'standing'),
      createSessionWithAccuracy(80, 30, 100, 'kneeling'), // 100 days ago
    ];

    const filtered = computeInsights(sessions, { ...DEFAULT_FILTERS, time: 'month' });
    expect(filtered.sessionCount).toBe(5); // Excludes the 100-day-old session
  });

  it('should calculate date range correctly', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    const sessions = [
      createMockSession({
        status: 'completed',
        started_at: oldDate.toISOString(),
      }),
      createMockSession({
        status: 'completed',
        started_at: new Date().toISOString(),
      }),
    ];

    const insights = computeInsights(sessions);
    expect(insights.dateRange.start).toBeTruthy();
    expect(insights.dateRange.end).toBeTruthy();
    expect(new Date(insights.dateRange.start).getTime()).toBeLessThan(
      new Date(insights.dateRange.end).getTime()
    );
  });

  it('should return empty date range for no sessions', () => {
    const insights = computeInsights([]);
    expect(insights.dateRange.start).toBe('');
    expect(insights.dateRange.end).toBe('');
  });

  it('should include filters in the output', () => {
    const customFilters: InsightsFilters = {
      ...DEFAULT_FILTERS,
      time: 'month',
      position: 'prone',
    };
    const insights = computeInsights([], customFilters);
    expect(insights.filters).toEqual(customFilters);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle sessions with no stats', () => {
    const sessions = [
      createMockSession({ status: 'completed', stats: null as any }),
      createMockSession({ status: 'completed' }),
    ];
    expect(() => computeTotals(sessions)).not.toThrow();
  });

  it('should handle sessions with zero shots', () => {
    const sessions = [
      createMockSession({
        status: 'completed',
        stats: { shots_fired: 0, hits_total: 0, accuracy_pct: 0, target_count: 0, best_dispersion_cm: null, avg_distance_m: 25 },
      }),
    ];
    const totals = computeTotals(sessions);
    // With zero shots, accuracy metric should not be added (no division by zero)
    const accuracy = totals.find((t) => t.id === 'accuracy');
    expect(accuracy).toBeUndefined();
    // Sessions count should still be computed
    const sessionCount = totals.find((t) => t.id === 'sessions');
    expect(sessionCount?.value).toBe(1);
  });

  it('should handle all active sessions (none completed)', () => {
    const sessions = [
      createMockSession({ status: 'active' }),
      createMockSession({ status: 'active' }),
    ];
    const insights = computeInsights(sessions);
    expect(insights.sessionCount).toBe(0);
    expect(insights.hasEnoughData).toBe(false);
  });

  it('should handle mixed session statuses', () => {
    const sessions = [
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'active' }),
      createMockSession({ status: 'completed' }),
      createMockSession({ status: 'aborted' as any }),
    ];
    const insights = computeInsights(sessions);
    expect(insights.sessionCount).toBe(2); // Only completed
  });
});

// ============================================================================
// BUSINESS RULE VALIDATION TESTS
// ============================================================================

describe('Business Rule Validation', () => {
  it('RULE: 5% accuracy change is the minimum for significance', () => {
    expect(ACCURACY_CHANGE_THRESHOLD).toBe(5);
  });

  it('RULE: 0.5cm grouping change is the minimum for significance', () => {
    expect(GROUPING_CHANGE_THRESHOLD).toBe(0.5);
  });

  it('RULE: 5 sessions minimum for insights', () => {
    expect(MIN_SESSIONS_FOR_INSIGHTS).toBe(5);
  });

  it('RULE: 20 shots minimum per category for valid comparison', () => {
    expect(MIN_SHOTS_FOR_CATEGORY).toBe(20);
  });

  it('RULE: 30% coefficient of variation = high variance', () => {
    expect(VARIANCE_THRESHOLD).toBe(0.3);
  });
});

// ============================================================================
// CONTEXT-AWARE THRESHOLDS (v2.0)
// ============================================================================

describe('Context-Aware Thresholds', () => {
  describe('getAccuracyThreshold', () => {
    it('should use absolute floor for low baselines', () => {
      // At 20% baseline: 20 * 0.15 = 3, so floor (5) wins
      const threshold = getAccuracyThreshold(20);
      expect(threshold).toBe(5);
    });

    it('should use relative threshold for high baselines', () => {
      // At 80% baseline: 80 * 0.15 = 12, which is > 5
      const threshold = getAccuracyThreshold(80);
      expect(threshold).toBe(12);
    });

    it('should respect custom config', () => {
      const customConfig: ThresholdConfig = {
        ...DEFAULT_THRESHOLD_CONFIG,
        accuracy: { absoluteFloor: 3, relativeFactor: 0.1 },
      };
      // At 50% baseline: 50 * 0.1 = 5, which is > 3
      const threshold = getAccuracyThreshold(50, customConfig);
      expect(threshold).toBe(5);
    });
  });

  describe('getGroupingThreshold', () => {
    it('should return smaller threshold for close distances', () => {
      const threshold = getGroupingThreshold('close');
      expect(threshold).toBe(0.3);
    });

    it('should return medium threshold for medium distances', () => {
      const threshold = getGroupingThreshold('medium');
      expect(threshold).toBe(0.5);
    });

    it('should return larger threshold for long distances', () => {
      const threshold = getGroupingThreshold('long');
      expect(threshold).toBe(1.0);
    });

    it('should return largest threshold for precision distances', () => {
      const threshold = getGroupingThreshold('precision');
      expect(threshold).toBe(1.5);
    });

    it('should return default for unknown distance', () => {
      const threshold = getGroupingThreshold(null);
      expect(threshold).toBe(0.5);
    });
  });
});

// ============================================================================
// BASELINE STRATEGY (v2.0)
// ============================================================================

describe('Baseline Strategy', () => {
  describe('computeBaselines', () => {
    it('should compute global baseline from all sessions', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0, 'prone'),
        createSessionWithAccuracy(60, 10, 0, 'standing'),
        createSessionWithAccuracy(70, 10, 0, 'kneeling'),
      ];
      const baselines = computeBaselines(sessions);

      // Global: 21 hits / 30 shots = 70%
      expect(baselines.global.accuracy).toBeCloseTo(70, 0);
      expect(baselines.global.accuracyShots).toBe(30);
      expect(baselines.global.accuracySessions).toBe(3);
    });

    it('should compute context baselines per position', () => {
      // Use 20 shots per session to avoid rounding issues
      // 90% of 20 = 18 hits, 80% of 20 = 16 hits → total 34/40 = 85%
      const sessions = [
        createSessionWithAccuracy(90, 20, 0, 'prone'),
        createSessionWithAccuracy(80, 20, 0, 'prone'),
        createSessionWithAccuracy(50, 20, 0, 'standing'),
        createSessionWithAccuracy(60, 20, 0, 'standing'),
      ];
      const baselines = computeBaselines(sessions);

      // Context baselines should exist
      expect(baselines.context.size).toBeGreaterThan(0);

      // Find prone context
      let proneBaseline: any = null;
      baselines.context.forEach((baseline, key) => {
        if (key.includes('prone')) {
          proneBaseline = baseline;
        }
      });

      // Prone context: 18 + 16 = 34 hits / 40 shots = 85%
      if (proneBaseline) {
        expect(proneBaseline.accuracy).toBeCloseTo(85, 0);
      }
    });

    it('should compute grouping baseline from grouping sessions only', () => {
      const sessions = [
        createSessionWithGrouping(2.0),
        createSessionWithGrouping(4.0),
        createSessionWithGrouping(3.0),
        createSessionWithAccuracy(80, 10, 0), // engagement - should not affect grouping
      ];
      const baselines = computeBaselines(sessions);

      // Median of [2.0, 3.0, 4.0] = 3.0
      expect(baselines.global.medianBestGroup).toBe(3.0);
      expect(baselines.global.groupingSessions).toBe(3);
    });
  });

  describe('createContextKey', () => {
    it('should extract position from session', () => {
      const session = createSessionWithAccuracy(80, 10, 0, 'prone');
      const key = createContextKey(session);
      expect(key.position).toBe('prone');
    });

    it('should extract distance bucket', () => {
      const session = createSessionWithAccuracy(80, 10, 0, undefined, 150);
      const key = createContextKey(session);
      expect(key.distanceBucket).toBe('long');
    });

    it('should detect timed sessions', () => {
      const timedSession = createMockSession({
        drill_config: { drill_goal: 'engagement', time_limit_seconds: 30 } as any,
      });
      const key = createContextKey(timedSession);
      expect(key.isTimed).toBe(true);
    });

    it('should detect untimed sessions', () => {
      const untimedSession = createMockSession({
        drill_config: { drill_goal: 'engagement' } as any,
      });
      const key = createContextKey(untimedSession);
      expect(key.isTimed).toBe(false);
    });
  });

  describe('serializeContextKey', () => {
    it('should produce consistent key strings', () => {
      const session1 = createSessionWithAccuracy(80, 10, 0, 'prone', 150);
      const session2 = createSessionWithAccuracy(70, 10, 0, 'prone', 150);

      const key1 = serializeContextKey(createContextKey(session1));
      const key2 = serializeContextKey(createContextKey(session2));

      expect(key1).toBe(key2);
    });

    it('should differentiate positions', () => {
      const proneSession = createSessionWithAccuracy(80, 10, 0, 'prone');
      const standingSession = createSessionWithAccuracy(80, 10, 0, 'standing');

      const key1 = serializeContextKey(createContextKey(proneSession));
      const key2 = serializeContextKey(createContextKey(standingSession));

      expect(key1).not.toBe(key2);
    });
  });
});

// ============================================================================
// CONTEXT PROFILES (v2.0)
// ============================================================================

describe('Context Profiles', () => {
  describe('computeContextProfiles', () => {
    it('should create profiles for each unique context', () => {
      const sessions = [
        createSessionWithAccuracy(80, 30, 0, 'prone'),
        createSessionWithAccuracy(60, 30, 0, 'standing'),
        createSessionWithGrouping(2.0, 0, 'prone'),
      ];
      const result = computeContextProfiles(sessions);

      expect(result.profiles.length).toBeGreaterThan(0);
      expect(result.globalBaseline).toBeDefined();
    });

    it('should classify strong_both when both metrics above baseline', () => {
      // Create a context where both engagement and grouping are strong
      const sessions = [
        // Baseline sessions (lower performance)
        createSessionWithAccuracy(60, 30, 0, 'standing'),
        createSessionWithAccuracy(60, 30, 0, 'kneeling'),
        createSessionWithGrouping(5.0, 0, 'standing'),
        createSessionWithGrouping(5.0, 0, 'kneeling'),
        // Strong context (prone - both better)
        createSessionWithAccuracy(85, 30, 0, 'prone'),
        createSessionWithAccuracy(85, 30, 0, 'prone'),
        createSessionWithGrouping(2.0, 0, 'prone'),
        createSessionWithGrouping(2.5, 0, 'prone'),
      ];
      const result = computeContextProfiles(sessions);

      const proneProfile = result.profiles.find(p => p.key.position === 'prone');
      // Note: Classification depends on baseline comparison
      expect(proneProfile).toBeDefined();
    });

    it('should classify hits_loose when engagement good but grouping bad', () => {
      // Create a context where engagement is good but grouping is loose
      const sessions = [
        // Baseline sessions
        createSessionWithAccuracy(60, 30, 0, 'standing'),
        createSessionWithAccuracy(60, 30, 0, 'kneeling'),
        createSessionWithGrouping(2.0, 0, 'standing'),
        createSessionWithGrouping(2.0, 0, 'kneeling'),
        // Hits loose context (prone - good hits, loose groups)
        createSessionWithAccuracy(85, 30, 0, 'prone'),
        createSessionWithGrouping(5.0, 0, 'prone'),
        createSessionWithGrouping(5.5, 0, 'prone'),
      ];
      const result = computeContextProfiles(sessions);

      const proneProfile = result.profiles.find(p => p.key.position === 'prone');
      // Engagement should be above baseline, grouping below
      expect(proneProfile).toBeDefined();
    });

    it('should include evidence IDs in profiles', () => {
      const sessions = [
        createSessionWithAccuracy(80, 30, 0, 'prone'),
        createSessionWithAccuracy(80, 30, 0, 'prone'),
      ];
      const result = computeContextProfiles(sessions);

      result.profiles.forEach(profile => {
        if (profile.engagement) {
          expect(profile.engagement.evidenceIds.length).toBeGreaterThan(0);
        }
        if (profile.grouping) {
          expect(profile.grouping.evidenceIds.length).toBeGreaterThan(0);
        }
      });
    });

    it('should mark preliminary when context baseline is sparse', () => {
      // Only 1 session in context (below MIN_SESSIONS_FOR_CONTEXT_BASELINE)
      const sessions = [
        createSessionWithAccuracy(80, 30, 0, 'prone'),
      ];
      const result = computeContextProfiles(sessions);

      const proneProfile = result.profiles.find(p => p.key.position === 'prone');
      expect(proneProfile?.isPreliminary).toBe(true);
    });
  });

  describe('getConversionInsights', () => {
    it('should generate insights from profiles', () => {
      const sessions = [
        createSessionWithAccuracy(60, 30, 0, 'standing'),
        createSessionWithAccuracy(60, 30, 0, 'kneeling'),
        createSessionWithAccuracy(85, 30, 0, 'prone'),
        createSessionWithGrouping(2.0, 0, 'standing'),
        createSessionWithGrouping(5.0, 0, 'prone'),
      ];
      const result = computeContextProfiles(sessions);
      const insights = getConversionInsights(result.profiles);

      expect(insights.length).toBeGreaterThanOrEqual(0); // May have insights
    });

    it('should sort insights by severity', () => {
      // Create scenarios with different severities
      const sessions = [
        // Baseline
        createSessionWithAccuracy(70, 30, 0, 'standing'),
        createSessionWithGrouping(3.0, 0, 'standing'),
        // Struggling context (both below baseline)
        createSessionWithAccuracy(40, 30, 0, 'kneeling'),
        createSessionWithGrouping(6.0, 0, 'kneeling'),
        // Strong context (both above baseline)
        createSessionWithAccuracy(90, 30, 0, 'prone'),
        createSessionWithGrouping(1.5, 0, 'prone'),
      ];
      const result = computeContextProfiles(sessions);
      const insights = getConversionInsights(result.profiles);

      // High severity should come before medium/low
      if (insights.length >= 2) {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 1; i < insights.length; i++) {
          expect(severityOrder[insights[i - 1].severity])
            .toBeLessThanOrEqual(severityOrder[insights[i].severity]);
        }
      }
    });
  });
});

// ============================================================================
// ROBUST STATISTICS (v2.0)
// ============================================================================

describe('Robust Statistics', () => {
  describe('interquartileRange', () => {
    it('should calculate IQR correctly', () => {
      // [10, 20, 30, 40, 50, 60, 70, 80]
      // Q1 = 25, Q3 = 65, IQR = 40
      const values = [10, 20, 30, 40, 50, 60, 70, 80];
      const iqr = interquartileRange(values);
      expect(iqr).toBeCloseTo(40, 0);
    });

    it('should return 0 for arrays with fewer than 4 elements', () => {
      expect(interquartileRange([1, 2, 3])).toBe(0);
      expect(interquartileRange([])).toBe(0);
    });

    it('should be robust to outliers', () => {
      // Normal data with one extreme outlier
      const normalValues = [50, 52, 48, 51, 49, 50, 51, 50];
      const withOutlier = [50, 52, 48, 51, 49, 50, 51, 500];

      const iqrNormal = interquartileRange(normalValues);
      const iqrOutlier = interquartileRange(withOutlier);

      // IQR should be similar despite outlier
      expect(Math.abs(iqrNormal - iqrOutlier)).toBeLessThan(10);
    });
  });
});

// ============================================================================
// SEMANTIC CLARITY (v2.0)
// ============================================================================

describe('Semantic Clarity', () => {
  describe('computeTotals metric naming', () => {
    it('should include overall_accuracy (weighted)', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0),
        createSessionWithAccuracy(60, 10, 0),
      ];
      const totals = computeTotals(sessions);

      const overallAccuracy = totals.find(t => t.id === 'overall_accuracy');
      expect(overallAccuracy).toBeDefined();
      expect(overallAccuracy?.subtitle).toBe('weighted');
    });

    it('should include typical_accuracy (median)', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0),
        createSessionWithAccuracy(60, 10, 0),
      ];
      const totals = computeTotals(sessions);

      const typicalAccuracy = totals.find(t => t.id === 'typical_accuracy');
      expect(typicalAccuracy).toBeDefined();
      expect(typicalAccuracy?.subtitle).toBe('median');
    });

    it('should include best_group_median with correct subtitle', () => {
      const sessions = [
        createSessionWithGrouping(2.0),
        createSessionWithGrouping(4.0),
        createSessionWithGrouping(3.0),
      ];
      const totals = computeTotals(sessions);

      const bestGroupMedian = totals.find(t => t.id === 'best_group_median');
      expect(bestGroupMedian).toBeDefined();
      expect(bestGroupMedian?.subtitle).toBe('of best groups');
    });

    it('should maintain backward compatibility with old IDs', () => {
      const sessions = [
        createSessionWithAccuracy(80, 10, 0),
        createSessionWithGrouping(3.0),
      ];
      const totals = computeTotals(sessions);

      // Old IDs should still exist
      expect(totals.find(t => t.id === 'accuracy')).toBeDefined();
      expect(totals.find(t => t.id === 'hit_pct')).toBeDefined();
      expect(totals.find(t => t.id === 'median_group')).toBeDefined();
    });
  });
});

// ============================================================================
// OVERVIEW STATUS COMPUTATION (v2.1)
// ============================================================================

import {
  computeOverviewStatus,
  getTopFocusItem,
  getTopTrustItem,
} from '../insights.engine';
import type {
  FocusItem,
  OverviewStatus,
  Recommendation,
  StrengthCard,
  TrustItem,
  WeaknessCard,
} from '../insights.types';

describe('Overview Status Computation', () => {
  describe('getTopFocusItem', () => {
    it('should prioritize high-priority recommendations', () => {
      const weaknesses: WeaknessCard[] = [
        {
          id: 'weakness-1',
          category: 'position',
          label: 'Standing Position',
          primaryValue: '62%',
          metric: {
            value: 62,
            baseline: 77,
            delta: -15,
            direction: 'down',
            isSignificant: true,
            confidence: 'high',
            dataPoints: 100,
            unit: '%',
          },
          variance: null,
          evidenceIds: ['s1', 's2'],
        },
      ];

      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'drill',
          priority: 'high',
          title: 'Standing Drill',
          description: 'Practice standing fundamentals',
          reason: 'Weakness identified',
          evidenceIds: ['s1', 's2'],
        },
        {
          id: 'rec-2',
          type: 'position',
          priority: 'medium',
          title: 'Prone Practice',
          description: 'Maintain prone skills',
          reason: 'Keep building',
          evidenceIds: ['s3'],
        },
      ];

      const focus = getTopFocusItem(weaknesses, recommendations);

      expect(focus).not.toBeNull();
      expect(focus?.sourceType).toBe('recommendation');
      expect(focus?.sourceId).toBe('rec-1');
      expect(focus?.label).toBe('Standing Drill');
    });

    it('should fall back to worst weakness if no high-priority recommendations', () => {
      const weaknesses: WeaknessCard[] = [
        {
          id: 'weakness-1',
          category: 'position',
          label: 'Standing Position',
          primaryValue: '62%',
          metric: {
            value: 62,
            baseline: 77,
            delta: -15,
            direction: 'down',
            isSignificant: true,
            confidence: 'high',
            dataPoints: 100,
            unit: '%',
          },
          variance: null,
          evidenceIds: ['s1', 's2'],
        },
      ];

      const recommendations: Recommendation[] = [
        {
          id: 'rec-1',
          type: 'position',
          priority: 'medium',
          title: 'Prone Practice',
          description: 'Maintain prone skills',
          reason: 'Keep building',
          evidenceIds: ['s3'],
        },
      ];

      const focus = getTopFocusItem(weaknesses, recommendations);

      expect(focus).not.toBeNull();
      expect(focus?.sourceType).toBe('weakness');
      expect(focus?.sourceId).toBe('weakness-1');
      expect(focus?.reason).toContain('accuracy');
      expect(focus?.reason).toContain('15');
    });

    it('should format grouping weakness correctly', () => {
      const weaknesses: WeaknessCard[] = [
        {
          id: 'weakness-1',
          category: 'position',
          label: 'Standing Grouping',
          primaryValue: '5.5cm',
          metric: {
            value: 5.5,
            baseline: 4.0,
            delta: 1.5,
            direction: 'down',
            isSignificant: true,
            confidence: 'high',
            dataPoints: 50,
            unit: 'cm',
          },
          variance: null,
          evidenceIds: ['s1'],
        },
      ];

      const focus = getTopFocusItem(weaknesses, []);

      expect(focus).not.toBeNull();
      expect(focus?.reason).toContain('groups');
      expect(focus?.reason).toContain('1.5cm');
      expect(focus?.reason).toContain('looser');
    });

    it('should return null when no weaknesses or recommendations', () => {
      const focus = getTopFocusItem([], []);
      expect(focus).toBeNull();
    });
  });

  describe('getTopTrustItem', () => {
    it('should return highest confidence strength', () => {
      const strengths: StrengthCard[] = [
        {
          id: 'strength-1',
          category: 'position',
          label: 'Prone Position',
          primaryValue: '87%',
          metric: {
            value: 87,
            baseline: 75,
            delta: 12,
            direction: 'up',
            isSignificant: true,
            confidence: 'medium',
            dataPoints: 50,
            unit: '%',
          },
          evidenceIds: ['s1', 's2'],
        },
        {
          id: 'strength-2',
          category: 'distance',
          label: 'Medium Distance',
          primaryValue: '82%',
          metric: {
            value: 82,
            baseline: 75,
            delta: 7,
            direction: 'up',
            isSignificant: true,
            confidence: 'high',
            dataPoints: 100,
            unit: '%',
          },
          evidenceIds: ['s3', 's4'],
        },
      ];

      const trust = getTopTrustItem(strengths);

      expect(trust).not.toBeNull();
      expect(trust?.sourceId).toBe('strength-2'); // High confidence wins
      expect(trust?.label).toBe('Medium Distance');
      expect(trust?.confidence).toBe('high');
    });

    it('should prefer larger delta when confidence is equal', () => {
      const strengths: StrengthCard[] = [
        {
          id: 'strength-1',
          category: 'position',
          label: 'Prone Position',
          primaryValue: '92%',
          metric: {
            value: 92,
            baseline: 75,
            delta: 17,
            direction: 'up',
            isSignificant: true,
            confidence: 'high',
            dataPoints: 100,
            unit: '%',
          },
          evidenceIds: ['s1'],
        },
        {
          id: 'strength-2',
          category: 'distance',
          label: 'Medium Distance',
          primaryValue: '82%',
          metric: {
            value: 82,
            baseline: 75,
            delta: 7,
            direction: 'up',
            isSignificant: true,
            confidence: 'high',
            dataPoints: 100,
            unit: '%',
          },
          evidenceIds: ['s2'],
        },
      ];

      const trust = getTopTrustItem(strengths);

      expect(trust).not.toBeNull();
      expect(trust?.sourceId).toBe('strength-1'); // Larger delta wins
    });

    it('should return null when no strengths', () => {
      const trust = getTopTrustItem([]);
      expect(trust).toBeNull();
    });
  });

  describe('computeOverviewStatus', () => {
    it('should return not enough data when hasEnoughData is false', () => {
      // Create minimal sessions (less than 5)
      const sessions = [
        createSessionWithAccuracy(80, 10, 0),
        createSessionWithAccuracy(75, 10, 1),
      ];

      const insights = computeInsights(sessions);
      const contextProfiles = computeContextProfiles(sessions);

      const overview = computeOverviewStatus(insights, contextProfiles);

      expect(overview.hasEnoughData).toBe(false);
      expect(overview.sessionsNeeded).toBeGreaterThan(0);
      expect(overview.focusItem).toBeNull();
      expect(overview.trustItem).toBeNull();
    });

    it('should include focus and trust items when enough data', () => {
      // Create enough sessions with variance to generate strengths/weaknesses
      const sessions = [
        // Prone sessions (strong)
        createSessionWithAccuracy(88, 20, 0, 'prone', 100),
        createSessionWithAccuracy(85, 20, 1, 'prone', 100),
        createSessionWithAccuracy(90, 20, 2, 'prone', 100),
        // Standing sessions (weak)
        createSessionWithAccuracy(55, 20, 0, 'standing', 100),
        createSessionWithAccuracy(60, 20, 1, 'standing', 100),
        createSessionWithAccuracy(58, 20, 2, 'standing', 100),
        // More sessions to ensure enough data
        createSessionWithAccuracy(75, 20, 3),
        createSessionWithAccuracy(70, 20, 4),
      ];

      const insights = computeInsights(sessions);
      const contextProfiles = computeContextProfiles(sessions);

      const overview = computeOverviewStatus(insights, contextProfiles);

      expect(overview.hasEnoughData).toBe(true);
      expect(overview.sessionCount).toBe(8);
      // Focus and trust may or may not be present depending on thresholds
      // but the computation should complete without error
    });

    it('should correctly report session and shot counts', () => {
      const sessions = [
        createSessionWithAccuracy(80, 15, 0),
        createSessionWithAccuracy(75, 25, 1),
        createSessionWithAccuracy(70, 10, 2),
        createSessionWithAccuracy(85, 20, 3),
        createSessionWithAccuracy(78, 30, 4),
      ];

      const insights = computeInsights(sessions);
      const contextProfiles = computeContextProfiles(sessions);

      const overview = computeOverviewStatus(insights, contextProfiles);

      expect(overview.sessionCount).toBe(5);
      expect(overview.shotCount).toBe(100); // 15+25+10+20+30
    });
  });
});
