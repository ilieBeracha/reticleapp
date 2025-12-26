/**
 * Home View Model Types
 * 
 * Home is TRAINING-FIRST. Users see their trainings, drills, and progress.
 * 
 * Home answers three questions:
 * 1. What's my next training? (upcoming trainings with drill count)
 * 2. What drills do I need to do? (drill progress within training)
 * 3. What's my recent activity? (completed sessions)
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
 * Unified Home Session - represents activity on Home
 * 
 * This can represent:
 * - An actual session (active, completed)
 * - A "scheduled training" with drills to complete
 */
export interface HomeSession {
  id: string;
  state: HomeSessionState;
  origin: SessionOrigin;
  
  // Timing
  scheduledAt: Date | null;  // When it's scheduled (for upcoming)
  startedAt: Date | null;    // When it started (for active/completed)
  endedAt: Date | null;      // When it ended (for completed)
  expiresAt: Date | null;    // When training expires/deadline
  
  // Context (optional - only if team-based)
  teamName?: string;
  
  // TRAINING INFO (explicit - not hidden)
  trainingTitle?: string;    // "Squad Alpha Range Day"
  drillCount?: number;       // 5 drills
  drillsCompleted?: number;  // 2/5 done
  
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
    expiresAt: null,
    teamName: session.team_name ?? undefined,
    
    // Training context if session is part of training
    trainingTitle: session.training_title ?? undefined,
    
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
 * Map a training to HomeSession for display
 * 
 * Training IS surfaced explicitly - users see training name, drill count, progress
 */
export function mapTrainingToScheduledSession(training: TrainingWithDetails, drillsCompleted?: number): HomeSession {
  const drillCount = training.drill_count ?? training.drills?.length ?? 0;
  
  return {
    id: `training-${training.id}`,
    state: training.status === 'ongoing' ? 'active' : 'scheduled',
    origin: 'team',
    scheduledAt: training.scheduled_at ? new Date(training.scheduled_at) : null,
    startedAt: training.started_at ? new Date(training.started_at) : null,
    endedAt: null,
    expiresAt: (training as any).expires_at ? new Date((training as any).expires_at) : null,
    teamName: training.team?.name ?? undefined,
    
    // EXPLICIT TRAINING INFO
    trainingTitle: training.title,
    drillCount,
    drillsCompleted: drillsCompleted ?? 0,
    
    drillName: drillCount === 1 ? training.drills?.[0]?.name : undefined,
    sourceTraining: training,
  };
}

