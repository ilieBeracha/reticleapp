import { Redirect, useLocalSearchParams } from 'expo-router';

export default function TrainingLiveRedirect() {
  const { trainingId, drillId } = useLocalSearchParams<{ trainingId: string; drillId?: string }>();

  const href = drillId
    ? `/(protected)/trainingDetail?id=${trainingId}&startDrillId=${drillId}`
    : `/(protected)/trainingDetail?id=${trainingId}`;

  return <Redirect href={href as any} />;
}
