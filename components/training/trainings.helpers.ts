/**
 * Pure helper functions for Trainings Screen
 * No React dependencies, no side effects
 */

import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';
import { addDays, isSameDay, startOfWeek } from 'date-fns';
import { DEFAULT_WEEKLY_GOAL, ROLE_CONFIG, STATUS_CONFIG, getRoleConfig as getRoleConfigTranslated, getStatusConfig as getStatusConfigTranslated } from './trainings.constants';
import type { GroupedTrainings, MemberStats, QuickStats, RoleConfig, StatusConfig, TeamStats } from '@/types/trainings';

// ============================================================================
// ROLE HELPERS
// ============================================================================

/**
 * Gets role configuration for display
 */
export function getRoleConfig(role: string | null | undefined, t?: (key: string) => string): RoleConfig {
  if (!role) return t ? getRoleConfigTranslated(t).soldier : ROLE_CONFIG.soldier;
  const normalized = role === 'commander' ? 'team_commander' : role;
  const config = t ? getRoleConfigTranslated(t) : ROLE_CONFIG;
  return config[normalized] || config.soldier;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

/**
 * Gets status configuration for display
 */
export function getStatusConfig(status: string | null | undefined, t?: (key: string) => string): StatusConfig {
  const config = t ? getStatusConfigTranslated(t) : STATUS_CONFIG;
  return config[status || 'planned'] || config.planned;
}

// ============================================================================
// TRAINING GROUPING
// ============================================================================

/**
 * Groups trainings by timeframe (live, today, tomorrow, this week, upcoming, past)
 *
 * Status handling:
 * - 'ongoing' → live (regardless of scheduled date)
 * - 'finished' or 'cancelled' → past (regardless of scheduled date)
 * - 'planned' → grouped by scheduled date
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

  trainings.forEach((t) => {
    const date = new Date(t.scheduled_at);

    // Live trainings (ongoing status)
    if (t.status === 'ongoing') {
      live.push(t);
      return;
    }

    // Finished or cancelled trainings always go to past
    if (t.status === 'finished' || t.status === 'cancelled' || t.status === 'completed') {
      past.push(t);
      return;
    }

    // For planned trainings, group by date
    if (date < todayStart) {
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
 * Calculates team statistics for the current week from trainings only
 * Used as a fallback when session data is not available
 */
export function calculateTeamStats(trainings: TrainingWithDetails[]): TeamStats {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const sessionsThisWeek = trainings.filter((t) => {
    const trainingDate = new Date(t.scheduled_at);
    return trainingDate >= weekStart && trainingDate < weekEnd;
  }).length;

  // Default values when no session data is available
  return {
    sessionsThisWeek,
    totalShots: 0,
    avgAccuracy: 0,
    weeklyGoal: DEFAULT_WEEKLY_GOAL,
  };
}

/**
 * Session data for team stats calculation
 */
export interface SessionStatsData {
  shots_fired: number;
  accuracy_pct: number;
  started_at: string;
}

/**
 * Calculates real team statistics from session data
 */
export function calculateTeamStatsFromSessions(
  trainings: TrainingWithDetails[],
  sessions: SessionStatsData[]
): TeamStats {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  // Count trainings this week
  const trainingsThisWeek = trainings.filter((t) => {
    const trainingDate = new Date(t.scheduled_at);
    return trainingDate >= weekStart && trainingDate < weekEnd;
  }).length;

  // Filter sessions from this week
  const weekSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.started_at);
    return sessionDate >= weekStart && sessionDate < weekEnd;
  });

  // Calculate totals
  const totalShots = weekSessions.reduce((sum, s) => sum + (s.shots_fired || 0), 0);

  // Calculate weighted average accuracy (weighted by shots)
  let weightedAccuracy = 0;
  let totalShotsForAccuracy = 0;
  weekSessions.forEach((s) => {
    if (s.shots_fired > 0 && s.accuracy_pct > 0) {
      weightedAccuracy += s.accuracy_pct * s.shots_fired;
      totalShotsForAccuracy += s.shots_fired;
    }
  });
  const avgAccuracy = totalShotsForAccuracy > 0 ? Math.round(weightedAccuracy / totalShotsForAccuracy) : 0;

  return {
    sessionsThisWeek: weekSessions.length || trainingsThisWeek,
    totalShots,
    avgAccuracy,
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
