/**
 * UnifiedHomePage Helpers
 *
 * Pure functions for the unified home page.
 * No side effects, state, or React dependencies.
 */

import type { SessionWithDetails } from '@/types/session';
import type { CoachMessageContext, WeeklyStats } from '@/types/home';

type TFunction = (key: string, options?: any) => string;

/**
 * Get contextual coach message based on user state
 */
export function getCoachMessage(context: CoachMessageContext, t: TFunction): string {
  const { sessions, shots, accuracy, hasActiveSession, hasUpcoming, streak } = context;

  if (hasActiveSession) {
    return t('home.coachMessage.activeSession');
  }
  if (sessions === 0) {
    return t('home.coachMessage.firstSession');
  }
  if (streak >= 5) {
    return t('home.coachMessage.streak', { count: streak });
  }
  if (accuracy >= 90) {
    return t('home.coachMessage.outstandingAccuracy');
  }
  if (accuracy >= 75) {
    return t('home.coachMessage.solidPerformance');
  }
  if (hasUpcoming) {
    return t('home.coachMessage.trainingScheduled');
  }
  if (sessions < 3) {
    return t('home.coachMessage.buildMomentum');
  }
  return t('home.coachMessage.keepRhythm');
}

/**
 * Format a date as relative time (e.g., "5m ago", "2d ago")
 */
export function formatTimeAgo(date: Date, t: TFunction): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays === 1) return t('time.yesterday');
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format minutes as readable time (e.g., "1h 30m", "45m")
 */
export function formatDuration(minutes: number, t: TFunction): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}${t('units.h')} ${m}${t('units.min')}` : `${h}${t('units.h')}`;
  }
  return `${minutes}${t('units.min')}`;
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(t: TFunction): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('home.greeting.morning');
  if (hour < 17) return t('home.greeting.afternoon');
  return t('home.greeting.evening');
}

/**
 * Get contextual subtitle for start practice card
 */
export function getStartPracticeSubtitle(lastSessionDaysAgo: number | null, t: TFunction): string {
  if (lastSessionDaysAgo === null) return t('home.startPractice.beginJourney');
  if (lastSessionDaysAgo === 0) return t('home.startPractice.greatMomentum');
  if (lastSessionDaysAgo === 1) return t('home.startPractice.pickUp');
  if (lastSessionDaysAgo <= 3) return t('home.startPractice.daysSince', { count: lastSessionDaysAgo });
  return t('home.startPractice.backOnRange');
}

/**
 * Calculate weekly stats from completed sessions
 * 
 * Note: Accuracy only calculated from engagement sessions (solo/team) that track hits.
 * Squad/group sessions don't track individual hits, so they're excluded from accuracy calculation.
 * Total shots still includes ALL sessions.
 */
export function calculateWeeklyStats(completedSessions: SessionWithDetails[]): WeeklyStats {
  let shots = 0;
  let accuracyShots = 0; // Shots from sessions that track hits (for accuracy calc)
  let hits = 0;
  let totalTimeMs = 0;
  let minDispersion = 1000;
  let hasDispersion = false;

  completedSessions.forEach((s) => {
    // Check if this is a squad/group engagement (no hit tracking)
    const engagementMode = s.engagement?.engagement_mode;
    const isSquadOrGroup = engagementMode === 'squad' || engagementMode === 'group';

    if (s.stats) {
      // Total shots includes ALL sessions
      shots += s.stats.shots_fired || 0;
      
      // Only count hits and accuracy shots from non-squad/group sessions
      if (!isSquadOrGroup) {
        accuracyShots += s.stats.shots_fired || 0;
        hits += s.stats.hits_total || 0;
      }
      
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

  // Accuracy based only on sessions that track hits (not squad/group)
  const accuracy = accuracyShots > 0 ? Math.round((hits / accuracyShots) * 100) : 0;
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
