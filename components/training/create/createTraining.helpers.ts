/**
 * Pure helper functions for Create Training Screen
 * No React dependencies, no side effects
 */

import type { TrainingDrillItem } from './createTraining.types';
import { DEFAULT_HOURS_AHEAD } from './createTraining.constants';

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Creates a default scheduled date (now + DEFAULT_HOURS_AHEAD hours, rounded)
 */
export function createDefaultScheduledDate(): Date {
  const date = new Date();
  date.setHours(date.getHours() + DEFAULT_HOURS_AHEAD, 0, 0, 0);
  return date;
}

/**
 * Formats a date for display (Today, Tomorrow, or formatted date)
 */
export function formatDisplayDate(date: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Formats a time for display (12-hour format with AM/PM)
 */
export function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ============================================================================
// DRILL CALCULATIONS
// ============================================================================

/**
 * Calculates total shots for a list of drills
 */
export function calculateTotalShots(drills: TrainingDrillItem[]): number {
  return drills.reduce((sum, d) => sum + d.rounds_per_shooter * (d.strings_count || 1), 0);
}

/**
 * Calculates total time limit for a list of drills
 */
export function calculateTotalTime(drills: TrainingDrillItem[]): number {
  return drills.reduce((sum, d) => sum + (d.time_limit_seconds || 0), 0);
}

/**
 * Formats time limit for display
 */
export function formatTimeLimit(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m`;
  }
  return `${seconds}s`;
}

// ============================================================================
// DRILL REORDERING
// ============================================================================

/**
 * Moves a drill up or down in the list
 */
export function moveDrill(
  drills: TrainingDrillItem[],
  index: number,
  direction: 'up' | 'down'
): TrainingDrillItem[] {
  const newDrills = [...drills];
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  
  if (targetIndex < 0 || targetIndex >= newDrills.length) {
    return drills; // No change if out of bounds
  }
  
  [newDrills[index], newDrills[targetIndex]] = [newDrills[targetIndex], newDrills[index]];
  return newDrills;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Checks if step 1 (details) is complete
 */
export function isStep1Complete(selectedTeamId: string | null, title: string): boolean {
  return !!selectedTeamId && !!title.trim();
}

/**
 * Checks if step 2 (drills) is complete
 */
export function isStep2Complete(drills: TrainingDrillItem[]): boolean {
  return drills.length > 0;
}

/**
 * Gets drill goal color
 */
export function getDrillGoalColor(drillGoal: string | null | undefined): string {
  return drillGoal === 'grouping' ? '#10B981' : '#3B82F6';
}

