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
}

export function useWidgetSync({
  activeSession,
  nextSession,
  weeklyStats,
  streak,
  recentSessions,
}: UseWidgetSyncParams) {
  useEffect(() => {
    if (__DEV__) {
      console.log('[useWidgetSync] effect fired', {
        hasActive: !!activeSession,
        hasNext: !!nextSession,
        weeklyAccuracy: weeklyStats?.accuracy,
        streak,
        recentCount: recentSessions.length,
      });
    }
    void syncHomeWidgets({
      activeSession,
      nextSession,
      weeklyStats,
      streak,
      recentSessions,
    });
  }, [activeSession, nextSession, weeklyStats, streak, recentSessions]);
}
