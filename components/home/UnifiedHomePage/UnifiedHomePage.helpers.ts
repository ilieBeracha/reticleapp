/**
 * UnifiedHomePage Helpers
 *
 * Pure functions for the unified home page.
 * No side effects, state, or React dependencies.
 */

import type { SessionWithDetails } from '@/services/session/types';
import type { CoachMessageContext, WeeklyStats } from './UnifiedHomePage.types';

/**
 * Get contextual coach message based on user state
 */
export function getCoachMessage(context: CoachMessageContext): string {
  const { sessions, shots, accuracy, hasActiveSession, hasUpcoming, streak } = context;

  if (hasActiveSession) {
    return "You have a session in progress. Let's finish what you started.";
  }
  if (sessions === 0) {
    return 'Ready to get some rounds downrange? Start your first session today.';
  }
  if (streak >= 5) {
    return `${streak} day streak! You're building serious discipline.`;
  }
  if (accuracy >= 90) {
    return 'Outstanding accuracy this week. Keep pushing your limits.';
  }
  if (accuracy >= 75) {
    return 'Solid performance. Consistency is building.';
  }
  if (hasUpcoming) {
    return 'You have training scheduled. Stay sharp.';
  }
  if (sessions < 3) {
    return 'Build momentum with regular practice. Every session counts.';
  }
  return 'Keep the rhythm going. Your skills sharpen with each session.';
}

/**
 * Format a date as relative time (e.g., "5m ago", "2d ago")
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format minutes as readable time (e.g., "1h 30m", "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Get contextual subtitle for start practice card
 */
export function getStartPracticeSubtitle(lastSessionDaysAgo: number | null): string {
  if (lastSessionDaysAgo === null) return 'Begin your training journey';
  if (lastSessionDaysAgo === 0) return 'Great momentum today!';
  if (lastSessionDaysAgo === 1) return 'Pick up where you left off';
  if (lastSessionDaysAgo <= 3) return `${lastSessionDaysAgo} days since last session`;
  return 'Time to get back on the range';
}

/**
 * Calculate weekly stats from completed sessions
 */
export function calculateWeeklyStats(completedSessions: SessionWithDetails[]): WeeklyStats {
  let shots = 0;
  let hits = 0;
  let totalTimeMs = 0;
  let minDispersion = 1000;
  let hasDispersion = false;

  completedSessions.forEach((s) => {
    if (s.stats) {
      shots += s.stats.shots_fired || 0;
      hits += s.stats.hits_total || 0;
      if (s.stats.best_dispersion_cm && s.stats.best_dispersion_cm > 0) {
        hasDispersion = true;
        minDispersion = Math.min(minDispersion, s.stats.best_dispersion_cm);
      }
    }
    if (s.started_at && s.ended_at) {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.ended_at).getTime();
      totalTimeMs += end - start;
    }
  });

  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  const bestGroup = hasDispersion ? `${minDispersion.toFixed(1)}cm` : '—';
  const totalTimeMinutes = Math.round(totalTimeMs / 60000);

  return { shots, hits, accuracy, bestGroup, sessions: completedSessions.length, totalTimeMinutes };
}

/**
 * Calculate consecutive day streak from sessions
 */
export function calculateStreak(completedSessions: SessionWithDetails[]): number {
  if (completedSessions.length === 0) return 0;

  const sessionDates = new Set(
    completedSessions.map((s) => {
      const d = new Date(s.ended_at || s.started_at || '');
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let count = 0;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;

    if (sessionDates.has(key)) {
      count++;
    } else if (i > 0) {
      break;
    }
  }

  return count;
}

/**
 * Calculate days since last session
 */
export function calculateLastSessionDaysAgo(completedSessions: SessionWithDetails[]): number | null {
  if (completedSessions.length === 0) return null;

  const last = completedSessions[0];
  const lastDate = new Date(last.ended_at || last.started_at || '');
  return Math.floor((Date.now() - lastDate.getTime()) / 86400000);
}
