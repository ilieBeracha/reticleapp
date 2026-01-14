import { getTrainingSessions, SessionWithDetails } from '@/services/sessionService';
import { DrillProgress, getMyDrillProgress, getTrainingById } from '@/services/trainingService';
import type { TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

  // Guards to prevent state updates during navigation or after unmount
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTraining = useCallback(async (id: string) => {
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const data = await getTrainingById(id);
      if (isMountedRef.current) setTraining(data);
    } catch (error) {
      console.error('Failed to fetch training:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to load training details');
        router.back();
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async (id: string) => {
    if (!isMountedRef.current) return;
    setLoadingSessions(true);
    try {
      const data = await getTrainingSessions(id);
      if (isMountedRef.current) setSessions(data);
    } catch (error) {
      console.error('Failed to fetch training sessions:', error);
      if (isMountedRef.current) setSessions([]);
    } finally {
      if (isMountedRef.current) setLoadingSessions(false);
    }
  }, []);

  const fetchDrillProgress = useCallback(async (id: string) => {
    if (!isMountedRef.current) return;
    try {
      const progress = await getMyDrillProgress(id);
      if (isMountedRef.current) setDrillProgress(progress);
    } catch (error) {
      console.error('Failed to fetch drill progress:', error);
      if (isMountedRef.current) setDrillProgress([]);
    }
  }, []);

  const refetch = useCallback(() => {
    if (!trainingId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    Promise.all([
      fetchTraining(trainingId),
      fetchSessions(trainingId),
      fetchDrillProgress(trainingId),
    ]).finally(() => {
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 500);
    });
  }, [trainingId, fetchTraining, fetchSessions, fetchDrillProgress]);

  useEffect(() => {
    if (trainingId) {
      isFetchingRef.current = true;

      Promise.all([
        fetchTraining(trainingId),
        fetchSessions(trainingId),
        fetchDrillProgress(trainingId),
      ]).finally(() => {
        setTimeout(() => {
          isFetchingRef.current = false;
        }, 500);
      });
    } else {
      Alert.alert('Error', 'No training selected');
      router.back();
    }
  }, [trainingId, fetchTraining, fetchSessions, fetchDrillProgress]);

  useFocusEffect(
    useCallback(() => {
      // Skip if already fetching or component unmounted
      if (!isMountedRef.current || isFetchingRef.current) return;

      if (trainingId) {
        isFetchingRef.current = true;

        // Batch the fetches
        Promise.all([
          fetchTraining(trainingId),
          fetchSessions(trainingId),
          fetchDrillProgress(trainingId),
        ]).finally(() => {
          // Add small delay before allowing next fetch to prevent rapid refires
          setTimeout(() => {
            isFetchingRef.current = false;
          }, 500);
        });
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
