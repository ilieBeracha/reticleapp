import { getTrainingSessions } from '@/services/session/queries';
import type { SessionWithDetails } from '@/types/session';
import { DrillProgress, getMyDrillProgress, getTrainingById } from '@/services/trainingService';
import type { TrainingWithDetails } from '@/types/workspace';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

interface RefetchOptions {
  /** If true, won't show loading indicator (for background/realtime updates) */
  silent?: boolean;
}

interface UseTrainingDetailReturn {
  training: TrainingWithDetails | null;
  sessions: SessionWithDetails[];
  drillProgress: DrillProgress[];
  loading: boolean;
  loadingSessions: boolean;
  setTraining: React.Dispatch<React.SetStateAction<TrainingWithDetails | null>>;
  refetch: (options?: RefetchOptions) => void;
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

  const fetchTraining = useCallback(async (id: string, options?: RefetchOptions) => {
    if (!isMountedRef.current) return;
    if (!options?.silent) setLoading(true);
    try {
      const data = await getTrainingById(id);
      if (isMountedRef.current) setTraining(data);
    } catch (error) {
      console.error('Failed to fetch training:', error);
      if (isMountedRef.current && !options?.silent) {
        Alert.alert('Error', 'Failed to load training details');
        router.back();
      }
    } finally {
      if (isMountedRef.current && !options?.silent) setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async (id: string, options?: RefetchOptions) => {
    if (!isMountedRef.current) return;
    if (!options?.silent) setLoadingSessions(true);
    try {
      const data = await getTrainingSessions(id);
      if (isMountedRef.current) setSessions(data);
    } catch (error) {
      console.error('Failed to fetch training sessions:', error);
      if (isMountedRef.current) setSessions([]);
    } finally {
      if (isMountedRef.current && !options?.silent) setLoadingSessions(false);
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

  const refetch = useCallback((options?: RefetchOptions) => {
    if (!trainingId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    Promise.all([
      fetchTraining(trainingId, options),
      fetchSessions(trainingId, options),
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

  // NOTE: Removed useFocusEffect - it was causing rerenders on back navigation
  // Data is fetched on mount via useEffect above. Use refetch() or pull-to-refresh for updates.

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
