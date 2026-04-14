import { useEffect } from 'react';

import type { WeeklyStats } from '@/types/home';
import type { HomeSession } from '@/types/home.viewmodel';
import { syncHomeWidgets } from '@/services/widgets/widgetSyncService';

interface UseWidgetSyncParams {
  activeSession: HomeSession | null;
  nextSession: HomeSession | null;
  weeklyStats: WeeklyStats;
  streak: number;
  recentSessions: HomeSession[];
  upcomingSessions: HomeSession[];
}

export function useWidgetSync({
  activeSession,
  nextSession,
  weeklyStats,
  streak,
  recentSessions,
  upcomingSessions,
}: UseWidgetSyncParams) {
  useEffect(() => {
    if (__DEV__) {
      console.log('[useWidgetSync] effect fired', {
        hasActive: !!activeSession,
        hasNext: !!nextSession,
        weeklyAccuracy: weeklyStats?.accuracy,
        streak,
        recentCount: recentSessions.length,
        upcomingCount: upcomingSessions.length,
      });
    }
    void syncHomeWidgets({
      activeSession,
      nextSession,
      weeklyStats,
      streak,
      recentSessions,
      upcomingSessions,
    });
  }, [activeSession, nextSession, weeklyStats, streak, recentSessions, upcomingSessions]);
}
