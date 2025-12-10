import { createTrainingSession } from '@/services/sessionService';
import { cancelTraining, finishTraining, startTraining } from '@/services/trainingService';
import type { TrainingDrill, TrainingWithDetails } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface UseTrainingActionsProps {
  training: TrainingWithDetails | null;
  setTraining: React.Dispatch<React.SetStateAction<TrainingWithDetails | null>>;
  onTrainingUpdated?: () => void;
}

interface UseTrainingActionsReturn {
  actionLoading: boolean;
  startingDrillId: string | null;
  handleStartTraining: () => void;
  handleFinishTraining: () => void;
  handleCancelTraining: () => void;
  handleStartDrill: (drill: TrainingDrill) => void;
}

export function useTrainingActions({
  training,
  setTraining,
  onTrainingUpdated,
}: UseTrainingActionsProps): UseTrainingActionsReturn {
  const [actionLoading, setActionLoading] = useState(false);
  const [startingDrillId, setStartingDrillId] = useState<string | null>(null);

  const handleStartTraining = useCallback(() => {
    if (!training) return;

    Alert.alert('Start Training', 'Are you sure you want to start this training?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: async () => {
          setActionLoading(true);
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await startTraining(training.id);
            setTraining((prev) => (prev ? { ...prev, status: 'ongoing' } : null));
            onTrainingUpdated?.();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to start training');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [training, setTraining, onTrainingUpdated]);

  const handleFinishTraining = useCallback(() => {
    if (!training) return;

    Alert.alert('Finish Training', 'Mark this training as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          setActionLoading(true);
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await finishTraining(training.id);
            setTraining((prev) => (prev ? { ...prev, status: 'finished' } : null));
            onTrainingUpdated?.();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to finish training');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [training, setTraining, onTrainingUpdated]);

  const handleCancelTraining = useCallback(() => {
    if (!training) return;

    Alert.alert(
      'Cancel Training',
      'Are you sure you want to cancel this training? This action cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Training',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await cancelTraining(training.id);
              setTraining((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
              onTrainingUpdated?.();
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel training');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [training, setTraining, onTrainingUpdated]);

  const handleStartDrill = useCallback(
    async (drill: TrainingDrill) => {
      if (!training) return;

      setStartingDrillId(drill.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const session = await createTrainingSession({
          training_id: training.id,
          drill_id: drill.id,
          session_mode: 'solo',
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/(protected)/activeSession?sessionId=${session.id}` as any);
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', error.message || 'Failed to start drill session');
      } finally {
        setStartingDrillId(null);
      }
    },
    [training]
  );

  return {
    actionLoading,
    startingDrillId,
    handleStartTraining,
    handleFinishTraining,
    handleCancelTraining,
    handleStartDrill,
  };
}
