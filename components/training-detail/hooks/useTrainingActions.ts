import { createTrainingSession } from '@/services/sessionService';
import {
    cancelTraining,
    DrillInstanceOverrides,
    finishTraining,
    startTrainingWithConfig
} from '@/services/trainingService';
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
  showStartModal: boolean;
  setShowStartModal: (show: boolean) => void;
  handleOpenStartModal: () => void;
  handleStartTraining: (drillOverrides?: Map<string, DrillInstanceOverrides>) => Promise<void>;
  handleFinishTraining: () => void;
  handleCancelTraining: () => void;
  handleStartDrill: (drill: TrainingDrill) => void;
}

/**
 * Check if a training can be started based on its scheduled date.
 * Training can only be started on or after the scheduled date (same day or later).
 * 
 * @param scheduledAt - The scheduled_at timestamp from the training
 * @returns Object with canStart boolean and optional error message
 */
function canStartTrainingToday(scheduledAt: string): { canStart: boolean; message?: string } {
  const scheduledDate = new Date(scheduledAt);
  const today = new Date();
  
  // Compare dates only (ignore time) by setting both to start of day
  const scheduledDateOnly = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // If today is before the scheduled date, training cannot be started
  if (todayDateOnly < scheduledDateOnly) {
    const formattedDate = scheduledDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    return {
      canStart: false,
      message: `This training is scheduled for ${formattedDate}. You can only start it on that day.`,
    };
  }
  
  return { canStart: true };
}

export function useTrainingActions({
  training,
  setTraining,
  onTrainingUpdated,
}: UseTrainingActionsProps): UseTrainingActionsReturn {
  const [actionLoading, setActionLoading] = useState(false);
  const [startingDrillId, setStartingDrillId] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);

  // Open the start modal (for commanders to configure drill instances)
  const handleOpenStartModal = useCallback(() => {
    if (!training) return;
    
    // Check if training can be started today based on scheduled date
    const { canStart, message } = canStartTrainingToday(training.scheduled_at);
    if (!canStart) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Cannot Start Yet', message);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowStartModal(true);
  }, [training]);

  // Start training with optional drill overrides
  const handleStartTraining = useCallback(async (drillOverrides?: Map<string, DrillInstanceOverrides>) => {
    if (!training) return;

    // Check if training can be started today based on scheduled date
    const { canStart, message } = canStartTrainingToday(training.scheduled_at);
    if (!canStart) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Cannot Start Yet', message);
      return;
    }

    setActionLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startTrainingWithConfig(training.id, drillOverrides);
      setTraining((prev) => (prev ? { ...prev, status: 'ongoing' } : null));
      setShowStartModal(false);
      onTrainingUpdated?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start training');
    } finally {
      setActionLoading(false);
    }
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
    showStartModal,
    setShowStartModal,
    handleOpenStartModal,
    handleStartTraining,
    handleFinishTraining,
    handleCancelTraining,
    handleStartDrill,
  };
}
