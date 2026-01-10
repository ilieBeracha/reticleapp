import {
  cancelTraining,
  DrillInstanceOverrides,
  finishTraining,
  startTrainingWithConfig
} from '@/services/trainingService';
import { useTrainingStore } from '@/store/trainingStore';
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
  
  // Get store refresh function
  const loadMyUpcomingTrainings = useTrainingStore((s) => s.loadMyUpcomingTrainings);

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
    if (!training) {
      console.log('[TrainingActions] No training to finish');
      return;
    }

    console.log('[TrainingActions] Showing finish confirmation for:', training.id);

    Alert.alert('Finish Training', 'Mark this training as completed? You\'ll be taken to the debrief report.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete Training',
        onPress: async () => {
          console.log('[TrainingActions] User confirmed finish for:', training.id);
          setActionLoading(true);
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            console.log('[TrainingActions] Calling finishTraining...');
            const result = await finishTraining(training.id);
            console.log('[TrainingActions] finishTraining result:', result);
            
            if (!result) {
              console.log('[TrainingActions] Training not found');
              Alert.alert('Not Found', 'Training was not found. It may have been deleted.');
              setActionLoading(false);
              return;
            }
            
            // Only update local state if API succeeded
            setTraining((prev) => (prev ? { ...prev, status: 'finished' } : null));
            onTrainingUpdated?.();
            // Refresh store so home page updates
            loadMyUpcomingTrainings().catch(() => {});
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            console.log('[TrainingActions] Finish complete');
            
            // =========================================================================
            // NAVIGATION: Training Complete → Debrief Report
            // After finishing training, navigate to the Training Report for debrief
            // User can then "Return to Training" or "Exit to Home" from there
            // =========================================================================
            router.replace({
              pathname: '/(protected)/trainingReport',
              params: { trainingId: training.id },
            });
          } catch (error: any) {
            console.error('[TrainingActions] Finish failed:', error);
            // Show user-friendly error for permission issues
            const message = error.message?.includes('permission') 
              ? 'Only the training creator or team commanders can complete this training.'
              : error.message || 'Failed to finish training';
            Alert.alert('Cannot Complete', message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [training, setTraining, onTrainingUpdated, loadMyUpcomingTrainings]);

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
              // Refresh store so home page updates
              loadMyUpcomingTrainings().catch(() => {});
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
  }, [training, setTraining, onTrainingUpdated, loadMyUpcomingTrainings]);

  /**
   * handleStartDrill - Navigate to createSession with drill params prefilled
   * Uses the proper session creation flow instead of direct creation
   */
  const handleStartDrill = useCallback(
    (drill: TrainingDrill) => {
      if (!training) return;

      setStartingDrillId(drill.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Navigate to createSession with training/drill context
      // The createSession flow will handle weapon selection and session creation
      router.push({
        pathname: '/(protected)/createSession',
        params: {
          // Training context
          trainingId: training.id,
          drillId: drill.id,
          teamId: training.team_id || '',
          // Drill parameters (prefill)
          purpose: drill.drill_goal,
          distance: String(drill.distance_m),
          shots: String(drill.rounds_per_shooter),
          timeLimit: drill.time_limit_seconds ? String(drill.time_limit_seconds) : '',
          position: drill.position || '',
          targetType: drill.target_type || 'paper',
          drillName: drill.name,
          // Return destination
          returnTo: 'trainingDetail',
          returnId: training.id,
        },
      } as any);

      // Clear starting state after navigation
      setTimeout(() => setStartingDrillId(null), 300);
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
