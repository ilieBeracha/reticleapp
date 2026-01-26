/**
 * Type definitions for Active Session Screen
 */

import type { SessionStats, SessionTargetWithResults, SessionWithDetails } from '@/services/sessionService';
import type { EngagementParticipant } from '@/services/session/types';

// ============================================================================
// DRILL PROGRESS
// ============================================================================
export interface DrillProgress {
  rounds: number;
  targetsPerRound: number;
  bulletsPerRound: number | null;
  requiredRounds: number;
  requiredTargets: number;
  shotsProgress: number;
  targetsProgress: number;
  isComplete: boolean;
  meetsAccuracy: boolean;
  meetsTime: boolean;
  overTime: boolean;
  isPaper: boolean;
}

// ============================================================================
// NEXT TARGET PLAN
// ============================================================================
export interface NextTargetPlan {
  remainingShots: number;
  remainingTargets: number;
  nextBullets: number;
}

// ============================================================================
// SESSION MODE
// ============================================================================
/**
 * Session mode determines what the user can modify during the session.
 * - 'solo': Full control - user can edit drill config, change distance per target
 * - 'training': Locked - drill config is immutable, set by team training
 */
export type SessionMode = 'solo' | 'training';

// ============================================================================
// WATCH STATE
// ============================================================================
export interface WatchState {
  isWatchControlled: boolean;
  watchActivelyControlling: boolean;
  watchStartFailed: boolean;
  watchStarting: boolean;
  watchPreviewQueued: boolean;
  watchAppNotOpen: boolean;
}

// ============================================================================
// SESSION SCORE
// ============================================================================
export interface SessionScore {
  mode: 'accuracy' | 'points' | 'grouping';
  value: number;
  label: string;
}

// ============================================================================
// USE ACTIVE SESSION PARAMS
// ============================================================================
export interface UseActiveSessionParams {
  sessionId: string | undefined;
}

// ============================================================================
// USE ACTIVE SESSION RETURN
// ============================================================================
export interface UseActiveSessionReturn {
  // Data
  session: SessionWithDetails | null;
  targets: SessionTargetWithResults[];
  stats: SessionStats | null;

  // Loading states
  loading: boolean;
  refreshing: boolean;
  ending: boolean;

  // Timer
  elapsedTime: number;

  // Computed values
  drill: SessionWithDetails['drill_config'] | null;
  hasDrill: boolean;
  totalShots: number;
  totalHits: number;
  accuracy: number;
  drillProgress: DrillProgress | null;
  nextTargetPlan: NextTargetPlan | null;
  defaultDistance: number;
  drillLimitReached: boolean;
  score: SessionScore | null;

  // Drill type flags
  isGrouping: boolean;
  isEngagement: boolean;
  isPaperDrill: boolean;
  isTacticalDrill: boolean;

  // Watch state
  watchState: WatchState;

  // Team training state (for hiding back button)
  isTeamTraining: boolean;

  // Session mode - controls what user can modify
  sessionMode: SessionMode;
  canEditDrill: boolean;
  lockedConfig: SessionWithDetails['drill_config'] | null;

  // Completion modal
  showCompletionModal: boolean;

  // Squad engagement
  isSquadEngagement: boolean;
  participants: EngagementParticipant[];

  // Actions
  loadData: () => Promise<void>;
  handleRefresh: () => void;
  handleScanPaper: () => void;
  handleLogTactical: () => void;
  handleManualRoute: () => void;
  handleScanRoute: () => void;
  handleTargetPress: (target: SessionTargetWithResults) => void;
  handleEndSession: () => void;
  handleClose: () => void;
  handleCompleteDrill: () => Promise<void>;
  handleFixResults: () => void;
  handleContinueWithoutWatch: () => Promise<void>;
  handleRetryWatchConnection: () => void;

  // Route helpers
  canAddTarget: boolean;
}
