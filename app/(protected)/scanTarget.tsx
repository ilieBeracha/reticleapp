import { PaperTargetFlow } from "@/components/addTarget";
import type { PaperType } from "@/services/sessionService";
import { useLocalSearchParams } from "expo-router";

/**
 * SCAN TARGET - Paper Target Scanning
 * 
 * Route: /(protected)/scanTarget?sessionId=xxx&distance=100&maxShots=30&drillGoal=grouping
 * 
 * Goes directly to camera for scanning paper targets.
 * drillGoal determines whether to save as grouping (dispersion only) or achievement (hit %)
 */
export default function ScanTargetSheet() {
  const { sessionId, distance, maxShots, bullets, locked, drillGoal } = useLocalSearchParams<{
    sessionId: string;
    distance?: string;
    maxShots?: string;
    /** Back-compat (old param name). */
    bullets?: string;
    locked?: string;
    drillGoal?: 'grouping' | 'achievement';
  }>();

  if (!sessionId) {
    return null;
  }

  // Map drill_goal to paper_type
  // - grouping → 'grouping' (dispersion only, no hit %)
  // - achievement → 'achievement' (tracks hit %)
  // - no drill_goal → default to 'grouping' for scan targets
  const paperType: PaperType = drillGoal === 'achievement' ? 'achievement' : 'grouping';

  return (
    <PaperTargetFlow
      sessionId={sessionId}
      defaultDistance={distance ? parseInt(distance) : 100}
      defaultMaxShots={maxShots ? parseInt(maxShots) : bullets ? parseInt(bullets) : undefined}
      lockDistance={locked === '1'}
      paperType={paperType}
    />
  );
}
