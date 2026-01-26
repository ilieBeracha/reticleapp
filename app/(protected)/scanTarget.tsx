import { PaperTargetFlow } from '@/components/targets';
import type { PaperType } from '@/services/sessionService';
import { useLocalSearchParams } from 'expo-router';

/**
 * SCAN TARGET - Paper Target Scanning
 *
 * Route: /(protected)/scanTarget?sessionId=xxx&distance=100&maxShots=30&drillGoal=grouping&participantId=xxx
 *
 * Goes directly to camera for scanning paper targets.
 * drillGoal determines whether to save as grouping (dispersion only) or achievement (hit %)
 * participantId is used for squad sessions to associate the target with a specific participant
 */
export default function ScanTargetSheet() {
  const { sessionId, distance, maxShots, bullets, locked, drillGoal, autoFinish, participantId } =
    useLocalSearchParams<{
      sessionId: string;
      distance?: string;
      maxShots?: string;
      /** Back-compat (old param name). */
      bullets?: string;
      locked?: string;
      drillGoal?: 'grouping' | 'achievement';
      autoFinish?: string;
      /** For squad sessions: associates target with specific participant */
      participantId?: string;
    }>();

  if (!sessionId) {
    return null;
  }

  // Map drill_goal to paper_type
  // - grouping → 'grouping' (dispersion only, no hit %)
  // - achievement → 'achievement' (tracks hit %)
  // - no drill_goal → default to 'grouping' for scan targets
  const paperType: PaperType = drillGoal === 'achievement' ? 'engagement' : 'grouping';

  return (
    <PaperTargetFlow
      sessionId={sessionId}
      defaultDistance={distance ? parseInt(distance) : 100}
      defaultMaxShots={maxShots ? parseInt(maxShots) : bullets ? parseInt(bullets) : undefined}
      lockDistance={locked === '1'}
      paperType={paperType}
      autoFinishSession={autoFinish === '1'}
      participantId={participantId}
    />
  );
}
