import { TacticalTargetFlow } from '@/components/targets';
import { useLocalSearchParams } from 'expo-router';

/**
 * TACTICAL/GROUPING TARGET - Manual Entry
 *
 * Route: /(protected)/tacticalTarget?sessionId=xxx&distance=25&bullets=10&isGrouping=1
 *
 * For engagement: Shows hits counter
 * For grouping: Shows group size (cm) input
 */
export default function TacticalTargetSheet() {
  const { sessionId, distance, bullets, locked, isGrouping, showTimeInput } = useLocalSearchParams<{
    sessionId: string;
    distance?: string;
    bullets?: string;
    locked?: string;
    isGrouping?: string;
    showTimeInput?: string;
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
    />
  );
}
