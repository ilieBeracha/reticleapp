import { useSessionStats } from '@/hooks/useSessionStats';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useSessionStore } from '@/store/sessionStore';
import { useTrainingStore } from '@/store/trainingStore';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import type { SessionStats, TotalTime } from '../types';

interface UseInsightsDataReturn {
  sessions: any[];
  stats: SessionStats;
  myStats: { upcoming: number };
  totalTime: TotalTime;
  completionRate: number;
  recentSessions: any[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export function useInsightsData(): UseInsightsDataReturn {
  const [refreshing, setRefreshing] = useState(false);
  const { sessions } = useWorkspaceData();
  const { loadSessions } = useSessionStore();
  const { loadMyStats, myStats } = useTrainingStore();

  useFocusEffect(
    useCallback(() => {
      loadSessions();
      loadMyStats();
    }, [loadSessions, loadMyStats])
  );

  const stats = useSessionStats(sessions);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadSessions(), loadMyStats()]);
    setRefreshing(false);
  }, [loadSessions, loadMyStats]);

  const totalTime = useMemo((): TotalTime => {
    const totalMinutes = sessions.reduce((acc, session) => {
      if (session.started_at && session.ended_at) {
        return (
          acc +
          (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) /
            (1000 * 60)
        );
      }
      return acc;
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return { hours, mins, display: hours > 0 ? `${hours}h ${mins}m` : `${mins}m` };
  }, [sessions]);

  const completionRate = useMemo(() => {
    if (stats.totalSessions === 0) return 0;
    return Math.round((stats.completedSessions / stats.totalSessions) * 100);
  }, [stats]);

  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  return {
    sessions,
    stats,
    myStats,
    totalTime,
    completionRate,
    recentSessions,
    refreshing,
    onRefresh,
  };
}
