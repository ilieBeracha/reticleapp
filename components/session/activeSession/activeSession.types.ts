/**
 * Type definitions for Active Session Screen
 */

import type { SessionStats, SessionTargetWithResults, SessionWithDetails } from '@/services/sessionService';

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
// WATCH STATE
// ============================================================================
export interface WatchState {
  isWatchControlled: boolean;
  watchActivelyControlling: boolean;
  watchStartFailed: boolean;
  watchStarting: boolean;
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
  isGroupingDrill: boolean;
  isAchievementDrill: boolean;
  isPaperDrill: boolean;
  isTacticalDrill: boolean;
  
  // Watch state
  watchState: WatchState;
  
  // Completion modal
  showCompletionModal: boolean;
  
  // Actions
  loadData: () => Promise<void>;
  handleRefresh: () => void;
  handleScanPaper: () => void;
  handleLogTactical: () => void;
  handleManualRoute: () => void;
  handleScanRoute: () => void;
  handleTargetPress: (target: SessionTargetWithResults) => void;
  handleEndSession: () => Promise<void>;
  handleClose: () => void;
  handleCompleteDrill: () => Promise<void>;
  handleFixResults: () => void;
  handleContinueWithoutWatch: () => Promise<void>;
  handleRetryWatchConnection: () => void;
  
  // Route helpers
  showManual: boolean;
  showScan: boolean;
}

