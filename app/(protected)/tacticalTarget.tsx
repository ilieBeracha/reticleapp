import { TacticalTargetFlow } from "@/components/addTarget";
import { useLocalSearchParams } from "expo-router";

/**
 * TACTICAL TARGET - Manual Entry Only
 * 
 * Route: /(protected)/tacticalTarget?sessionId=xxx&distance=25&bullets=10
 * 
 * Goes directly to tactical target setup and results entry.
 * No target type selection needed.
 */
export default function TacticalTargetSheet() {
  const { sessionId, distance, bullets } = useLocalSearchParams<{
    sessionId: string;
    distance?: string;
    bullets?: string;
  }>();

  if (!sessionId) {
    return null;
  }

  return (
    <TacticalTargetFlow
      sessionId={sessionId}
      defaultDistance={distance ? parseInt(distance) : 25}
      defaultBullets={bullets ? parseInt(bullets) : 10}
    />
  );
}
