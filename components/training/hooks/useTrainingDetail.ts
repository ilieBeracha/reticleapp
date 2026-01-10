import { getTrainingSessions, SessionWithDetails } from '@/services/sessionService';
import { DrillProgress, getMyDrillProgress, getTrainingById } from '@/services/trainingService';
import type { TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface UseTrainingDetailReturn {
  training: TrainingWithDetails | null;
  sessions: SessionWithDetails[];
  drillProgress: DrillProgress[];
  loading: boolean;
  loadingSessions: boolean;
  setTraining: React.Dispatch<React.SetStateAction<TrainingWithDetails | null>>;
  refetch: () => void;
}

export function useTrainingDetail(
  trainingId: string | undefined,
  initialTraining: TrainingWithDetails | null
): UseTrainingDetailReturn {
  const [training, setTraining] = useState<TrainingWithDetails | null>(initialTraining);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [drillProgress, setDrillProgress] = useState<DrillProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchTraining = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await getTrainingById(id);
      setTraining(data);
    } catch (error) {
      console.error('Failed to fetch training:', error);
      Alert.alert('Error', 'Failed to load training details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async (id: string) => {
    setLoadingSessions(true);
    try {
      const data = await getTrainingSessions(id);
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch training sessions:', error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const fetchDrillProgress = useCallback(async (id: string) => {
    try {
      const progress = await getMyDrillProgress(id);
      setDrillProgress(progress);
    } catch (error) {
      console.error('Failed to fetch drill progress:', error);
      setDrillProgress([]);
    }
  }, []);

  const refetch = useCallback(() => {
    if (trainingId) {
      fetchTraining(trainingId);
      fetchSessions(trainingId);
      fetchDrillProgress(trainingId);
    }
  }, [trainingId, fetchTraining, fetchSessions, fetchDrillProgress]);

  useEffect(() => {
    if (trainingId) {
      fetchTraining(trainingId);
      fetchSessions(trainingId);
      fetchDrillProgress(trainingId);
    } else {
      Alert.alert('Error', 'No training selected');
      router.back();
    }
  }, [trainingId, fetchTraining, fetchSessions, fetchDrillProgress]);

  useFocusEffect(
    useCallback(() => {
      if (trainingId) {
        fetchTraining(trainingId);
        fetchSessions(trainingId);
        fetchDrillProgress(trainingId);
      }
    }, [trainingId, fetchTraining, fetchSessions, fetchDrillProgress])
  );

  return {
    training,
    sessions,
    drillProgress,
    loading,
    loadingSessions,
    setTraining,
    refetch,
  };
}
