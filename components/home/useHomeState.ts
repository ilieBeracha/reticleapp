/**
 * useHomeState - Training-first Home state
 * 
 * This hook computes what Home needs to display:
 * - Active session (if any)
 * - Next TRAINING (shown explicitly with drill count + progress)
 * - Last session
 * - Unresolved signal
 * - Weekly stats
 * 
 * Training is EXPLICIT. Users see their trainings and drills clearly.
 */

import { useMemo } from 'react';
import type { SessionWithDetails } from '@/services/session/types';
import type { TrainingWithDetails } from '@/types/workspace';
import { 
  type HomeState, 
  type HomeSession,
  mapSessionToHomeSession, 
  mapTrainingToScheduledSession 
} from './types';

interface UseHomeStateParams {
  sessions: SessionWithDetails[];
  upcomingTrainings: TrainingWithDetails[];
  hasTeams: boolean;
}

export function useHomeState({ sessions, upcomingTrainings, hasTeams }: UseHomeStateParams): HomeState {
  return useMemo(() => {
    // Find active session
    const activeRaw = sessions.find(s => s.status === 'active');
    const activeSession = activeRaw ? mapSessionToHomeSession(activeRaw) : null;
    
    // Find next scheduled session from trainings
    // Filter to planned/ongoing trainings with a scheduled time
    const scheduledTrainings = upcomingTrainings
      .filter(t => t.status === 'planned' || t.status === 'ongoing')
      .filter(t => t.scheduled_at)
      .sort((a, b) => {
        const aTime = new Date(a.scheduled_at!).getTime();
        const bTime = new Date(b.scheduled_at!).getTime();
        return aTime - bTime;
      });
    
    // If there's an ongoing training, that's the "active team session"
    const ongoingTraining = scheduledTrainings.find(t => t.status === 'ongoing');
    
    // Next scheduled = ongoing training (live team session) or next planned
    let nextSession: HomeSession | null = null;
    if (ongoingTraining) {
      nextSession = mapTrainingToScheduledSession(ongoingTraining);
    } else if (scheduledTrainings.length > 0 && !activeSession) {
      // Only show next scheduled if no active session
      nextSession = mapTrainingToScheduledSession(scheduledTrainings[0]);
    }
    
    // Find last completed session
    const completedSessions = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => {
        const aTime = new Date(a.ended_at ?? a.started_at).getTime();
        const bTime = new Date(b.ended_at ?? b.started_at).getTime();
        return bTime - aTime;
      });
    
    const lastSession = completedSessions[0] 
      ? mapSessionToHomeSession(completedSessions[0]) 
      : null;
    
    // Compute unresolved signal (one thing that needs attention)
    let unresolvedSignal: HomeState['unresolvedSignal'] = undefined;
    
    // Check if last session needs review
    if (lastSession?.needsReview) {
      unresolvedSignal = {
        type: 'no_review',
        message: 'Last session needs review',
        sessionId: lastSession.sourceSession?.id,
      };
    } 
    // Check if no recent practice (no sessions in last 7 days)
    else if (completedSessions.length === 0) {
      unresolvedSignal = {
        type: 'no_recent_practice',
        message: 'No sessions this week',
      };
    }
    
    // Compute weekly stats from completed sessions
    const weeklyStats = completedSessions.reduce(
      (acc, session) => {
        acc.sessions++;
        acc.shots += session.stats?.shots_fired ?? 0;
        if (session.stats?.accuracy_pct) {
          acc.accuracySum += session.stats.accuracy_pct;
          acc.accuracyCount++;
        }
        return acc;
      },
      { sessions: 0, shots: 0, accuracySum: 0, accuracyCount: 0 }
    );
    
    return {
      activeSession,
      nextSession,
      lastSession,
      unresolvedSignal,
      weeklyStats: {
        sessions: weeklyStats.sessions,
        shots: weeklyStats.shots,
        avgAccuracy: weeklyStats.accuracyCount > 0 
          ? Math.round(weeklyStats.accuracySum / weeklyStats.accuracyCount) 
          : 0,
      },
      hasTeams,
    };
  }, [sessions, upcomingTrainings, hasTeams]);
}

