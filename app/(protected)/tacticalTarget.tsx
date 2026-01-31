import { TacticalTargetFlow } from '@/components/targets/TacticalTargetFlow';
import { useLocalSearchParams } from 'expo-router';

/**
 * TACTICAL/GROUPING TARGET - Manual Entry
 *
 * Route: /(protected)/tacticalTarget?sessionId=xxx&distance=25&bullets=10&isGrouping=1&participantId=xxx
 *
 * For engagement: Shows hits counter
 * For grouping: Shows group size (cm) input
 * participantId is used for squad sessions to associate the target with a specific participant
 * distanceCategory/distanceMin/distanceMax are used when commander set a range instead of exact distance
 */
export default function TacticalTargetSheet() {
  const {
    sessionId,
    distance,
    bullets,
    locked,
    isGrouping,
    showTimeInput,
    participantId,
    targetCount,
    distanceCategory,
    distanceMin,
    distanceMax,
  } = useLocalSearchParams<{
    sessionId: string;
    distance?: string;
    bullets?: string;
    locked?: string;
    isGrouping?: string;
    showTimeInput?: string;
    /** For squad sessions: associates target with specific participant */
    participantId?: string;
    /** Multi-target: number of targets for this drill */
    targetCount?: string;
    /** Distance category when commander set a range (short/medium/long) */
    distanceCategory?: string;
    /** Min distance in meters for the range */
    distanceMin?: string;
    /** Max distance in meters for the range */
    distanceMax?: string;
  }>();

  if (!sessionId) {
    return null;
  }

  return (
    <TacticalTargetFlow
      sessionId={sessionId}
      defaultDistance={distance ? parseInt(distance) : 25}
      defaultBullets={bullets ? parseInt(bullets) : 10}
      lockDistance={locked === '1'}
      lockBullets={locked === '1'}
      isGrouping={isGrouping === '1'}
      showTimeInput={showTimeInput !== '0'}
      participantId={participantId}
      targetCount={targetCount ? parseInt(targetCount) : 1}
      distanceRange={
        distanceCategory && distanceMin && distanceMax
          ? {
              category: distanceCategory as 'short' | 'medium' | 'long',
              min: parseInt(distanceMin),
              max: parseInt(distanceMax),
            }
          : undefined
      }
    />
  );
}
