/**
 * Home View Model Types
 * 
 * Home is SESSION-CENTRIC. Training is an internal coordination concept
 * that never surfaces directly on Home.
 * 
 * Home answers three questions:
 * 1. What just happened? (last session)
 * 2. What is coming up? (next session - could be from a training)
 * 3. What is unresolved? (session needs review)
 */

import type { SessionWithDetails } from '@/services/session/types';
import type { TrainingWithDetails } from '@/types/workspace';

/** Session origin - solo practice or team scheduled */
export type SessionOrigin = 'solo' | 'team';

/** Session state for Home display */
export type HomeSessionState = 
  | 'active'        // Currently in progress
  | 'scheduled'     // Upcoming (from training, not yet started)
  | 'completed'     // Finished
  | 'unreviewed';   // Completed but needs attention

/**
 * Unified Home Session - the only entity Home cares about
 * 
 * This can represent:
 * - An actual session (active, completed)
 * - A "scheduled session" derived from an upcoming training
 */
export interface HomeSession {
  id: string;
  state: HomeSessionState;
  origin: SessionOrigin;
  
  // Timing
  scheduledAt: Date | null;  // When it's scheduled (for upcoming)
  startedAt: Date | null;    // When it started (for active/completed)
  endedAt: Date | null;      // When it ended (for completed)
  
  // Context (optional - only if team-based)
  teamName?: string;
  
  // Drill info (if available)
  drillName?: string;
  drillGoal?: 'grouping' | 'achievement';
  
  // Stats (for completed sessions)
  stats?: {
    shots: number;
    hits: number;
    accuracy: number;
    targets: number;
    bestDispersion?: number;
  };
  
  // Flags
  needsReview?: boolean;      // Completed but not reviewed
  hasBaseline?: boolean;      // Has baseline to compare
  
  // Original data reference (for navigation)
  sourceSession?: SessionWithDetails;
  sourceTraining?: TrainingWithDetails;
}

/**
 * Home State - what Home needs to render
 * 
 * Simple. Action-forward. No training concept.
 */
export interface HomeState {
  // Current
  activeSession: HomeSession | null;
  
  // Upcoming (next scheduled session if any)
  nextSession: HomeSession | null;
  
  // Recent
  lastSession: HomeSession | null;
  
  // Unresolved signal (one thing that needs attention)
  unresolvedSignal?: {
    type: 'no_review' | 'no_baseline' | 'no_recent_practice';
    message: string;
    sessionId?: string;
  };
  
  // Weekly summary (minimal)
  weeklyStats: {
    sessions: number;
    shots: number;
    avgAccuracy: number;
  };
  
  // Context
  hasTeams: boolean;
}

/**
 * Map a real session to HomeSession
 */
export function mapSessionToHomeSession(session: SessionWithDetails): HomeSession {
  const isTeam = !!session.team_id;
  
  let state: HomeSessionState = 'completed';
  if (session.status === 'active') {
    state = 'active';
  } else if (session.status === 'completed') {
    // Check if needs review (has targets but low/no stats)
    const hasTargets = (session.stats?.target_count ?? 0) > 0;
    const hasLowStats = (session.stats?.shots_fired ?? 0) === 0;
    state = hasTargets && hasLowStats ? 'unreviewed' : 'completed';
  }
  
  return {
    id: session.id,
    state,
    origin: isTeam ? 'team' : 'solo',
    scheduledAt: null,
    startedAt: session.started_at ? new Date(session.started_at) : null,
    endedAt: session.ended_at ? new Date(session.ended_at) : null,
    teamName: session.team_name ?? undefined,
    drillName: session.drill_name ?? session.drill_config?.name ?? undefined,
    drillGoal: session.drill_config?.drill_goal,
    stats: session.stats ? {
      shots: session.stats.shots_fired,
      hits: session.stats.hits_total,
      accuracy: session.stats.accuracy_pct,
      targets: session.stats.target_count,
      bestDispersion: session.stats.best_dispersion_cm ?? undefined,
    } : undefined,
    needsReview: state === 'unreviewed',
    sourceSession: session,
  };
}

/**
 * Map an upcoming training to a "scheduled session" for Home
 * 
 * Training is NOT surfaced as "training" - it becomes a scheduled session.
 */
export function mapTrainingToScheduledSession(training: TrainingWithDetails): HomeSession {
  return {
    id: `scheduled-${training.id}`,
    state: training.status === 'ongoing' ? 'active' : 'scheduled',
    origin: 'team',
    scheduledAt: training.scheduled_at ? new Date(training.scheduled_at) : null,
    startedAt: training.started_at ? new Date(training.started_at) : null,
    endedAt: null,
    teamName: training.team?.name ?? undefined,
    drillName: training.drills?.[0]?.name ?? undefined,
    sourceTraining: training,
  };
}

