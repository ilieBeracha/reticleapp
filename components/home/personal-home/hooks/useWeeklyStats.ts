import { calculateSessionStats } from '@/services/sessionService';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionWithDetails, WeeklyStats } from '../types';

/**
 * Hook to calculate aggregated weekly stats from completed sessions.
 * Aggregates sessions, shots, and target counts from the last 7 days.
 */
export function useWeeklyStats(
  sessions: SessionWithDetails[],
  activeSession: SessionWithDetails | undefined
): WeeklyStats {
  const [detailedStats, setDetailedStats] = useState<{
    totalShots: number;
    paperTargets: number;
    tacticalTargets: number;
  }>({
    totalShots: 0,
    paperTargets: 0,
    tacticalTargets: 0,
  });

  // Track if we've loaded stats to avoid re-fetching unnecessarily
  const loadedForSessionsRef = useRef<string>('');

  // Calculate week sessions count directly (no async needed)
  const weekSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    return sessions.filter(
      (s) => s.status === 'completed' && new Date(s.created_at) >= weekStart
    );
  }, [sessions]);

  // Load detailed stats async
  useEffect(() => {
    // If no week sessions, reset stats
    if (weekSessions.length === 0) {
      setDetailedStats({ totalShots: 0, paperTargets: 0, tacticalTargets: 0 });
      loadedForSessionsRef.current = '';
      return;
    }

    // Create a key to track if sessions changed
    const sessionsKey = weekSessions.map((s) => s.id).join(',');
    if (loadedForSessionsRef.current === sessionsKey) {
      return;
    }

    let isMounted = true;

    const loadStats = async () => {
      let totalShots = 0;
      let paperTargets = 0;
      let tacticalTargets = 0;

      for (const session of weekSessions) {
        try {
          const stats = await calculateSessionStats(session.id);
          if (stats && isMounted) {
            totalShots += stats.totalShotsFired;
            paperTargets += stats.paperTargets;
            tacticalTargets += stats.tacticalTargets;
          }
        } catch {
          // Skip if stats unavailable
        }
      }

      if (isMounted) {
        setDetailedStats({ totalShots, paperTargets, tacticalTargets });
        loadedForSessionsRef.current = sessionsKey;
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [weekSessions]);

  // Combine session count with detailed stats
  return useMemo(() => ({
    sessions: weekSessions.length,
    totalShots: detailedStats.totalShots,
    paperTargets: detailedStats.paperTargets,
    tacticalTargets: detailedStats.tacticalTargets,
  }), [weekSessions.length, detailedStats]);
}
