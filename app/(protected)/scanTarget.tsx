import { PaperTargetFlow } from "@/components/addTarget";
import { useLocalSearchParams } from "expo-router";

/**
 * SCAN TARGET - Paper Target Only
 * 
 * Route: /(protected)/scanTarget?sessionId=xxx&distance=100&bullets=5
 * 
 * Goes directly to camera for scanning paper targets.
 * No target type selection needed.
 */
export default function ScanTargetSheet() {
  const { sessionId, distance, bullets } = useLocalSearchParams<{
    sessionId: string;
    distance?: string;
    bullets?: string;
  }>();

  if (!sessionId) {
    return null;
  }

  return (
    <PaperTargetFlow
      sessionId={sessionId}
      defaultDistance={distance ? parseInt(distance) : 100}
      defaultBullets={bullets ? parseInt(bullets) : 5}
    />
  );
}
