/**
 * Pure helper functions for Trainings Screen
 * No React dependencies, no side effects
 */

import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';
import { addDays, isSameDay, startOfWeek } from 'date-fns';
import { DEFAULT_WEEKLY_GOAL, ROLE_CONFIG, STATUS_CONFIG } from './trainings.constants';
import type { GroupedTrainings, MemberStats, QuickStats, RoleConfig, StatusConfig, TeamStats } from './trainings.types';

// ============================================================================
// ROLE HELPERS
// ============================================================================

/**
 * Gets role configuration for display
 */
export function getRoleConfig(role: string | null | undefined): RoleConfig {
  if (!role) return ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_CONFIG[normalized] || ROLE_CONFIG.soldier;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

/**
 * Gets status configuration for display
 */
export function getStatusConfig(status: string | null | undefined): StatusConfig {
  return STATUS_CONFIG[status || 'scheduled'] || STATUS_CONFIG.scheduled;
}

// ============================================================================
// TRAINING GROUPING
// ============================================================================

/**
 * Groups trainings by timeframe (live, today, tomorrow, this week, upcoming, past)
 */
export function groupTrainingsByTimeframe(trainings: TrainingWithDetails[]): GroupedTrainings {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = addDays(todayStart, 1);
  const weekEnd = addDays(todayStart, 7);

  const live: TrainingWithDetails[] = [];
  const today: TrainingWithDetails[] = [];
  const tomorrow: TrainingWithDetails[] = [];
  const thisWeek: TrainingWithDetails[] = [];
  const upcoming: TrainingWithDetails[] = [];
  const past: TrainingWithDetails[] = [];

  trainings.forEach(t => {
    const date = new Date(t.scheduled_at);

    if (t.status === 'ongoing') {
      live.push(t);
    } else if (date < todayStart) {
      past.push(t);
    } else if (isSameDay(date, todayStart)) {
      today.push(t);
    } else if (isSameDay(date, tomorrowStart)) {
      tomorrow.push(t);
    } else if (date < weekEnd) {
      thisWeek.push(t);
    } else {
      upcoming.push(t);
    }
  });

  // Sort each group by time
  const sortByTime = (a: TrainingWithDetails, b: TrainingWithDetails) =>
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();

  const sortByTimeDesc = (a: TrainingWithDetails, b: TrainingWithDetails) =>
    new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();

  return {
    live: live.sort(sortByTime),
    today: today.sort(sortByTime),
    tomorrow: tomorrow.sort(sortByTime),
    thisWeek: thisWeek.sort(sortByTime),
    upcoming: upcoming.sort(sortByTime),
    past: past.sort(sortByTimeDesc),
  };
}

/**
 * Calculates quick stats from grouped trainings
 */
export function calculateQuickStats(grouped: GroupedTrainings): QuickStats {
  return {
    live: grouped.live.length,
    today: grouped.today.length,
    thisWeek: grouped.today.length + grouped.tomorrow.length + grouped.thisWeek.length,
  };
}

// ============================================================================
// MEMBER STATS
// ============================================================================

/**
 * Calculates member status distribution
 * Note: In production, this would come from a presence service
 */
export function calculateMemberStats(members: TeamMemberWithProfile[]): MemberStats {
  const stats: MemberStats = {
    total: members.length,
    training: 0,
    online: 0,
    idle: 0,
    offline: 0,
  };

  // Simulate status distribution (in production, this comes from presence service)
  members.forEach(() => {
    const rand = Math.random();
    if (rand < 0.1) stats.training++;
    else if (rand < 0.3) stats.online++;
    else if (rand < 0.6) stats.idle++;
    else stats.offline++;
  });

  return stats;
}

// ============================================================================
// TEAM STATS
// ============================================================================

/**
 * Calculates team statistics for the current week
 * Note: In production, this would come from an analytics service
 */
export function calculateTeamStats(trainings: TrainingWithDetails[]): TeamStats {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const sessionsThisWeek = trainings.filter(t => {
    const trainingDate = new Date(t.scheduled_at);
    return trainingDate >= weekStart && trainingDate < weekEnd;
  }).length;

  // Simulated values (in production, these come from analytics)
  return {
    sessionsThisWeek,
    totalShots: Math.floor(Math.random() * 3000) + 500,
    avgAccuracy: Math.floor(Math.random() * 30) + 60,
    weeklyGoal: DEFAULT_WEEKLY_GOAL,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Gets initials from a name or email
 */
export function getInitials(fullName: string | null | undefined, email: string): string {
  if (fullName) {
    return fullName.charAt(0).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

