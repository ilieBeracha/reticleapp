/**
 * Training Detail Helpers
 * Pure functions for training summary view
 * 
 * NOTE: Training is a read-only dashboard. Complex phase logic has been removed.
 */

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
