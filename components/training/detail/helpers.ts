/**
 * Training Detail Helpers
 * Pure functions for training detail logic
 */

import type { PhaseConfig, PhaseStatus, TrainingPhase } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// PHASE STATUS LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determines the status of each phase based on training status
 */
export function getPhaseStatus(trainingStatus: string): PhaseConfig {
  switch (trainingStatus) {
    case 'planned':
      return { setup: 'completed', execution: 'active', debrief: 'locked' };
    case 'ongoing':
      return { setup: 'completed', execution: 'active', debrief: 'upcoming' };
    case 'finished':
      return { setup: 'completed', execution: 'completed', debrief: 'active' };
    case 'cancelled':
      return { setup: 'completed', execution: 'locked', debrief: 'locked' };
    default:
      return { setup: 'completed', execution: 'upcoming', debrief: 'locked' };
  }
}

/**
 * Gets narrative text for a phase based on its status
 */
export function getPhaseNarrativeText(
  phase: TrainingPhase,
  status: PhaseStatus,
  context?: { completedDrills?: number; totalDrills?: number; isPlanned?: boolean }
): string {
  const narratives = {
    setup: {
      completed: 'Training preparation complete',
      active: 'Configure your training',
      upcoming: 'Awaiting setup',
      locked: 'Setup unavailable',
    },
    execution: {
      completed: 'All chapters completed',
      active: context?.isPlanned
        ? `${context.totalDrills || 0} drill${(context.totalDrills || 0) !== 1 ? 's' : ''} ready`
        : context?.totalDrills
          ? `${context.completedDrills || 0} of ${context.totalDrills} drills completed`
          : 'Range is live',
      upcoming: 'Awaiting training start',
      locked: 'Training not started',
    },
    debrief: {
      completed: 'Performance reviewed',
      active: 'Review your performance',
      upcoming: 'Awaiting completion',
      locked: 'Complete training first',
    },
  };
  return narratives[phase][status];
}

/**
 * Calculate training duration from start and end timestamps
 */
export function calculateTrainingDuration(startedAt: string | null, endedAt: string | null): string | null {
  if (!startedAt || !endedAt) return null;

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);

  if (mins < 60) return `${mins} minutes`;

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

/**
 * Check if all drills in training are completed
 */
export function areAllDrillsCompleted(
  drills: any[],
  drillProgress: Array<{ drillId: string; completed: boolean }>
): boolean {
  if (drills.length === 0) return false;
  const completedCount = drillProgress.filter((p) => p.completed).length;
  return completedCount === drills.length;
}
