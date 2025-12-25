import { useSessionStats } from '@/hooks/useSessionStats';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { getSafeSessionDuration, MAX_REASONABLE_DURATION_SECONDS } from '@/utils/sessionDuration';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionStats, TotalTime } from '../types';

interface UseInsightsDataReturn {
  sessions: any[];
  stats: SessionStats;
  myStats: { upcoming: number };
  totalTime: TotalTime;
  completionRate: number;
  recentSessions: any[];
  refreshing: boolean;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function useInsightsData(): UseInsightsDataReturn {
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start loading
  const hasFetchedRef = useRef(false);
  
  // Get team context
  const { activeTeamId } = useTeamStore();
  
  // Get data directly from stores
  const { sessions, loadPersonalSessions, loadTeamSessions } = useSessionStore();
  const { loadMyStats, myStats } = useTrainingStore();

  // Load correct sessions based on mode (personal vs team)
  useEffect(() => {
    let cancelled = false;
    
    const fetchData = async () => {
      // Only show loading on first fetch of this mount
      if (!hasFetchedRef.current) {
        setIsLoading(true);
      }
      
      try {
        if (activeTeamId) {
          await loadTeamSessions();
        } else {
          await loadPersonalSessions();
        }
        await loadMyStats();
      } finally {
        if (!cancelled) {
          hasFetchedRef.current = true;
          setIsLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [activeTeamId, loadPersonalSessions, loadTeamSessions, loadMyStats]);

  const stats = useSessionStats(sessions);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const loadSessionsFn = activeTeamId ? loadTeamSessions : loadPersonalSessions;
    await Promise.all([loadSessionsFn(), loadMyStats()]);
    setRefreshing(false);
  }, [activeTeamId, loadPersonalSessions, loadTeamSessions, loadMyStats]);

  const totalTime = useMemo((): TotalTime => {
    const totalSeconds = sessions.reduce((acc, session) => {
      // Use safe duration to cap absurdly long sessions
      const durationSeconds = getSafeSessionDuration(session);
      return acc + durationSeconds;
    }, 0);
    const totalMinutes = totalSeconds / 60;
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
    isLoading,
    onRefresh,
  };
}
