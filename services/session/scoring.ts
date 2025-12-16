import type { SessionDrillConfig, SessionStats } from './types';

export interface SessionScore {
  mode: string;
  value: number;
}

/**
 * Compute a drill/session score from existing stored results.
 * This is intentionally small and composable so future scoring modes can be added safely.
 */
export function computeSessionScore(stats: SessionStats, drill: SessionDrillConfig | null | undefined): SessionScore | null {
  if (!drill?.scoring_mode) return null;

  switch (drill.scoring_mode) {
    case 'points': {
      const pointsPerHit = drill.points_per_hit ?? 0;
      const penaltyPerMiss = drill.penalty_per_miss ?? 0;

      // NOTE: We use total shots/hits (includes scanned paper targets) because they are persisted as counts.
      // If you want "manual-only points" later, we can extend SessionStats to include manual totals explicitly.
      const hits = stats.totalHits ?? 0;
      const shots = stats.totalShotsFired ?? 0;
      const misses = Math.max(0, shots - hits);

      const value = hits * pointsPerHit - misses * penaltyPerMiss;
      return { mode: 'points', value };
    }
    default:
      return null;
  }
}


