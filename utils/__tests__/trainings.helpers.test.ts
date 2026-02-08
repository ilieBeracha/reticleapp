/**
 * Tests for trainings.helpers.ts
 * Pure helper functions for training grouping, stats, and display
 */

// Mock lucide-react-native (uses React Native internals not available in Node)
jest.mock('lucide-react-native', () => ({
  Crown: 'Crown',
  Shield: 'Shield',
  Target: 'Target',
}));

import {
  getRoleConfig,
  getStatusConfig,
  groupTrainingsByTimeframe,
  calculateQuickStats,
  calculateMemberStats,
  calculateTeamStats,
  calculateTeamStatsFromSessions,
  getInitials,
  type SessionStatsData,
} from '../trainings.helpers';
import type { TrainingWithDetails, TeamMemberWithProfile } from '@/types/workspace';
import { addDays } from 'date-fns';

// ============================================================================
// FACTORY HELPERS
// ============================================================================

function makeTraining(overrides: Partial<TrainingWithDetails> = {}): TrainingWithDetails {
  return {
    id: 'training-1',
    team_id: 'team-1',
    title: 'Test Training',
    scheduled_at: new Date().toISOString(),
    status: 'planned',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMember(): TeamMemberWithProfile {
  return {
    team_id: 'team-1',
    user_id: `user-${Math.random().toString(36).substring(7)}`,
    role: { role: 'soldier' },
    joined_at: new Date().toISOString(),
    profile: {
      id: 'profile-1',
      email: 'test@example.com',
      full_name: 'Test User',
    },
  };
}

// ============================================================================
// getRoleConfig
// ============================================================================

describe('getRoleConfig', () => {
  it('returns soldier config for null/undefined role', () => {
    expect(getRoleConfig(null)).toBeDefined();
    expect(getRoleConfig(undefined)).toBeDefined();
    expect(getRoleConfig(null)).toEqual(getRoleConfig(undefined));
  });

  it('normalizes "commander" to "team_commander"', () => {
    const config = getRoleConfig('commander');
    expect(config).toBeDefined();
    expect(config).toEqual(getRoleConfig('team_commander'));
  });

  it('returns soldier config for unknown roles', () => {
    const unknown = getRoleConfig('unknown_role');
    const soldier = getRoleConfig('soldier');
    expect(unknown).toEqual(soldier);
  });

  it('returns correct config for "owner" role', () => {
    const config = getRoleConfig('owner');
    expect(config).toBeDefined();
  });

  it('uses translated config when t function is provided', () => {
    const t = (key: string) => `translated:${key}`;
    const config = getRoleConfig('soldier', t);
    expect(config).toBeDefined();
  });
});

// ============================================================================
// getStatusConfig
// ============================================================================

describe('getStatusConfig', () => {
  it('returns planned config for null/undefined status', () => {
    const config = getStatusConfig(null);
    expect(config).toBeDefined();
    expect(config).toEqual(getStatusConfig('planned'));
  });

  it('returns config for valid statuses', () => {
    expect(getStatusConfig('planned')).toBeDefined();
    expect(getStatusConfig('ongoing')).toBeDefined();
    expect(getStatusConfig('finished')).toBeDefined();
    expect(getStatusConfig('cancelled')).toBeDefined();
  });

  it('falls back to planned for unknown status', () => {
    const config = getStatusConfig('nonexistent');
    expect(config).toEqual(getStatusConfig('planned'));
  });
});

// ============================================================================
// groupTrainingsByTimeframe
// ============================================================================

describe('groupTrainingsByTimeframe', () => {
  it('returns empty groups for empty input', () => {
    const result = groupTrainingsByTimeframe([]);
    expect(result.live).toHaveLength(0);
    expect(result.today).toHaveLength(0);
    expect(result.tomorrow).toHaveLength(0);
    expect(result.thisWeek).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
    expect(result.past).toHaveLength(0);
  });

  it('places ongoing trainings in live group regardless of date', () => {
    const training = makeTraining({
      status: 'ongoing',
      scheduled_at: addDays(new Date(), -5).toISOString(), // 5 days ago
    });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.live).toHaveLength(1);
    expect(result.past).toHaveLength(0);
  });

  it('places finished trainings in past group', () => {
    const training = makeTraining({ status: 'finished' });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.past).toHaveLength(1);
    expect(result.today).toHaveLength(0);
  });

  it('places cancelled trainings in past group', () => {
    const training = makeTraining({ status: 'cancelled' });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.past).toHaveLength(1);
  });

  it('places completed trainings in past group', () => {
    const training = makeTraining({ status: 'completed' });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.past).toHaveLength(1);
  });

  it('places today planned trainings in today group', () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0); // 2pm today
    const training = makeTraining({
      status: 'planned',
      scheduled_at: now.toISOString(),
    });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.today).toHaveLength(1);
  });

  it('places tomorrow planned trainings in tomorrow group', () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(10, 0, 0, 0);
    const training = makeTraining({
      status: 'planned',
      scheduled_at: tomorrow.toISOString(),
    });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.tomorrow).toHaveLength(1);
  });

  it('places past-date planned trainings in past group', () => {
    const pastDate = addDays(new Date(), -3);
    pastDate.setHours(10, 0, 0, 0);
    const training = makeTraining({
      status: 'planned',
      scheduled_at: pastDate.toISOString(),
    });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.past).toHaveLength(1);
  });

  it('places far-future planned trainings in upcoming group', () => {
    const future = addDays(new Date(), 14);
    const training = makeTraining({
      status: 'planned',
      scheduled_at: future.toISOString(),
    });
    const result = groupTrainingsByTimeframe([training]);
    expect(result.upcoming).toHaveLength(1);
  });

  it('sorts each group by time (ascending for non-past, descending for past)', () => {
    const early = makeTraining({
      id: 'early',
      status: 'finished',
      scheduled_at: addDays(new Date(), -2).toISOString(),
    });
    const late = makeTraining({
      id: 'late',
      status: 'finished',
      scheduled_at: addDays(new Date(), -1).toISOString(),
    });
    const result = groupTrainingsByTimeframe([early, late]);
    // Past is sorted descending (most recent first)
    expect(result.past[0].id).toBe('late');
    expect(result.past[1].id).toBe('early');
  });

  it('handles multiple trainings across groups', () => {
    const trainings = [
      makeTraining({ id: '1', status: 'ongoing' }),
      makeTraining({ id: '2', status: 'finished' }),
      makeTraining({
        id: '3',
        status: 'planned',
        scheduled_at: addDays(new Date(), 14).toISOString(),
      }),
    ];
    const result = groupTrainingsByTimeframe(trainings);
    expect(result.live).toHaveLength(1);
    expect(result.past).toHaveLength(1);
    expect(result.upcoming).toHaveLength(1);
  });
});

// ============================================================================
// calculateQuickStats
// ============================================================================

describe('calculateQuickStats', () => {
  it('returns zeros for empty groups', () => {
    const result = calculateQuickStats({
      live: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      upcoming: [],
      past: [],
    });
    expect(result.live).toBe(0);
    expect(result.today).toBe(0);
    expect(result.thisWeek).toBe(0);
  });

  it('counts live trainings', () => {
    const result = calculateQuickStats({
      live: [makeTraining(), makeTraining()],
      today: [],
      tomorrow: [],
      thisWeek: [],
      upcoming: [],
      past: [],
    });
    expect(result.live).toBe(2);
  });

  it('thisWeek includes today + tomorrow + thisWeek groups', () => {
    const result = calculateQuickStats({
      live: [],
      today: [makeTraining()],
      tomorrow: [makeTraining(), makeTraining()],
      thisWeek: [makeTraining()],
      upcoming: [makeTraining()],
      past: [],
    });
    expect(result.thisWeek).toBe(4); // 1 + 2 + 1
    expect(result.today).toBe(1);
  });
});

// ============================================================================
// calculateMemberStats
// ============================================================================

describe('calculateMemberStats', () => {
  it('returns total count matching members length', () => {
    const members = [makeMember(), makeMember(), makeMember()];
    const stats = calculateMemberStats(members);
    expect(stats.total).toBe(3);
    // Sum of all statuses should equal total
    expect(stats.training + stats.online + stats.idle + stats.offline).toBe(3);
  });

  it('returns zeros for empty members', () => {
    const stats = calculateMemberStats([]);
    expect(stats.total).toBe(0);
    expect(stats.training).toBe(0);
    expect(stats.online).toBe(0);
    expect(stats.idle).toBe(0);
    expect(stats.offline).toBe(0);
  });
});

// ============================================================================
// calculateTeamStats
// ============================================================================

describe('calculateTeamStats', () => {
  it('counts trainings in the current week', () => {
    // Create a training scheduled for now (within current week)
    const training = makeTraining({
      scheduled_at: new Date().toISOString(),
    });
    const stats = calculateTeamStats([training]);
    expect(stats.sessionsThisWeek).toBeGreaterThanOrEqual(1);
    expect(stats.totalShots).toBe(0);
    expect(stats.avgAccuracy).toBe(0);
  });

  it('excludes trainings outside current week', () => {
    const pastTraining = makeTraining({
      scheduled_at: addDays(new Date(), -14).toISOString(),
    });
    const stats = calculateTeamStats([pastTraining]);
    expect(stats.sessionsThisWeek).toBe(0);
  });

  it('returns default weekly goal', () => {
    const stats = calculateTeamStats([]);
    expect(stats.weeklyGoal).toBeGreaterThan(0);
  });
});

// ============================================================================
// calculateTeamStatsFromSessions
// ============================================================================

describe('calculateTeamStatsFromSessions', () => {
  it('calculates weighted accuracy from sessions', () => {
    const sessions: SessionStatsData[] = [
      { shots_fired: 10, accuracy_pct: 80, started_at: new Date().toISOString() },
      { shots_fired: 20, accuracy_pct: 60, started_at: new Date().toISOString() },
    ];
    const stats = calculateTeamStatsFromSessions([], sessions);
    // Weighted: (80*10 + 60*20) / (10+20) = 2000/30 = 66.67 → 67
    expect(stats.avgAccuracy).toBe(67);
    expect(stats.totalShots).toBe(30);
  });

  it('returns 0 accuracy when no valid sessions', () => {
    const stats = calculateTeamStatsFromSessions([], []);
    expect(stats.avgAccuracy).toBe(0);
    expect(stats.totalShots).toBe(0);
  });

  it('excludes sessions from previous weeks', () => {
    const sessions: SessionStatsData[] = [
      { shots_fired: 50, accuracy_pct: 90, started_at: addDays(new Date(), -14).toISOString() },
    ];
    const stats = calculateTeamStatsFromSessions([], sessions);
    expect(stats.totalShots).toBe(0);
  });

  it('uses trainings count when no sessions this week', () => {
    const training = makeTraining({
      scheduled_at: new Date().toISOString(),
    });
    const stats = calculateTeamStatsFromSessions([training], []);
    expect(stats.sessionsThisWeek).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// getInitials
// ============================================================================

describe('getInitials', () => {
  it('returns first letter of full name', () => {
    expect(getInitials('John Doe', 'john@example.com')).toBe('J');
  });

  it('falls back to email first letter when no name', () => {
    expect(getInitials(null, 'alice@example.com')).toBe('A');
    expect(getInitials(undefined, 'bob@example.com')).toBe('B');
  });

  it('returns uppercase letter', () => {
    expect(getInitials('alice', 'alice@example.com')).toBe('A');
  });
});
