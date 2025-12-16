/**
 * Training Live - Redirect to Training Detail
 * 
 * This route now redirects to the unified trainingDetail page.
 * Kept for backwards compatibility with existing navigation.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TrainingLiveRedirect() {
  const { trainingId, drillId } = useLocalSearchParams<{ trainingId: string; drillId?: string }>();

  // Redirect to the unified training detail page
  return (
    <Redirect
      href={
        drillId
          ? `/(protected)/trainingDetail?id=${trainingId}&startDrillId=${drillId}`
          : `/(protected)/trainingDetail?id=${trainingId}`
      }
    />
  );
}
