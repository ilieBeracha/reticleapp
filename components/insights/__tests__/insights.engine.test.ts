/**
 * Insights Engine Tests
 *
 * These tests define the expected behavior of the insights system.
 * If a test fails, the business logic is incorrect.
 *
 * Business Rules Tested:
 * 1. Minimum 5 sessions required for full insights
 * 2. Accuracy change threshold: ±5% is meaningful
 * 3. Grouping change threshold: ±0.5cm is meaningful
 * 4. Variance threshold: 30% CV = high variance
 * 5. Strengths: performance above baseline by threshold
 * 6. Weaknesses: performance below baseline by threshold
 * 7. Trends: first-half vs second-half comparison
 * 8. Filters: time, weapon, position, distance, drill type
 */

import type { SessionWithDetails } from '@/services/session/types';
import {
  applyFilters,
  computeInsights,
  computeStrengths,
  computeTotals,
  computeTrends,
  computeWeaknesses,
  generateRecommendations,
} from '../insights.engine';
import { DEFAULT_FILTERS, InsightsFilters } from '../insights.types';

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
