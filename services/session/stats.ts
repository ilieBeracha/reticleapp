import type { SessionStats } from './types';
import { getSessionTargetsWithResults } from './targets';

/**
 * Calculate comprehensive session stats from targets and results
 *
 * IMPORTANT:
 * - Scanned paper targets → dispersion only, NO accuracy (AI detects all holes as "hits")
 * - Manual paper targets → accuracy is meaningful (user reports actual hits/misses)
 * - Tactical targets → always count towards accuracy (manual entry)
 */
export async function calculateSessionStats(sessionId: string): Promise<SessionStats> {
  const targets = await getSessionTargetsWithResults(sessionId);

  let paperTargets = 0;
  let tacticalTargets = 0;
  let totalShotsFired = 0;
  let totalHits = 0;
  let manualShotsFired = 0; // Only shots from manual entry (for accuracy)
  let manualHits = 0; // Only hits from manual entry (for accuracy)
  let totalDispersion = 0;
  let dispersionCount = 0;
  let bestDispersion: number | null = null;
  let stagesCleared = 0;
  let totalEngagementTime = 0;
  let engagementTimeCount = 0;
  let fastestEngagement: number | null = null;

  for (const target of targets) {
    if (target.target_type === 'paper') {
      paperTargets++;
      if (target.paper_result) {
        const bullets = target.paper_result.bullets_fired;
        totalShotsFired += bullets;

        // Check if this was scanned (AI detection) vs manual entry
        const isScanned = !!target.paper_result.scanned_image_url;

        const hits = target.paper_result.hits_total ?? 0;

        // Always add hits to total for display purposes
        totalHits += hits;

        // Track dispersion if available (applies to both scanned and manual)
        if (target.paper_result.dispersion_cm != null) {
          totalDispersion += target.paper_result.dispersion_cm;
          dispersionCount++;
          if (bestDispersion === null || target.paper_result.dispersion_cm < bestDispersion) {
            bestDispersion = target.paper_result.dispersion_cm;
          }
        }

        if (!isScanned) {
          // Only manual entry targets count towards accuracy calculation
          // Scanned targets: AI detects all holes, so accuracy is always ~100% (not meaningful)
          manualShotsFired += bullets;
          manualHits += hits;
        }
      }
    } else if (target.target_type === 'tactical') {
      tacticalTargets++;
      if (target.tactical_result) {
        const bullets = target.tactical_result.bullets_fired;
        const hits = target.tactical_result.hits;
        totalShotsFired += bullets;
        totalHits += hits;
        // Tactical targets always count towards accuracy (always manual entry)
        manualShotsFired += bullets;
        manualHits += hits;

        if (target.tactical_result.is_stage_cleared) {
          stagesCleared++;
        }

        if (target.tactical_result.time_seconds != null) {
          totalEngagementTime += target.tactical_result.time_seconds;
          engagementTimeCount++;
          if (fastestEngagement === null || target.tactical_result.time_seconds < fastestEngagement) {
            fastestEngagement = target.tactical_result.time_seconds;
          }
        }
      }
    }
  }

  // Calculate accuracy only from manual entry targets (not scanned)
  // Scanned targets always show ~100% because AI detects all holes
  const accuracyPct = manualShotsFired > 0 ? Math.round((manualHits / manualShotsFired) * 100 * 100) / 100 : 0;

  const avgDispersionCm = dispersionCount > 0 ? Math.round((totalDispersion / dispersionCount) * 100) / 100 : null;

  const avgEngagementTimeSec =
    engagementTimeCount > 0 ? Math.round((totalEngagementTime / engagementTimeCount) * 100) / 100 : null;

  return {
    targetCount: targets.length,
    paperTargets,
    tacticalTargets,
    totalShotsFired,
    totalHits,
    accuracyPct,
    avgDispersionCm,
    bestDispersionCm: bestDispersion,
    stagesCleared,
    avgEngagementTimeSec,
    fastestEngagementTimeSec: fastestEngagement,
  };
}











