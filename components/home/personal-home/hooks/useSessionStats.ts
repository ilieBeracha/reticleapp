import { calculateSessionStats } from '@/services/sessionService';
import { useEffect, useMemo, useState } from 'react';
import type { SessionStats, SessionWithDetails } from '../types';

/**
 * Hook to load and manage stats for an active session.
 * Fetches target counts, shots, and accuracy data.
 */
export function useSessionStats(activeSession: SessionWithDetails | undefined) {
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);

  useEffect(() => {
    if (activeSession) {
      calculateSessionStats(activeSession.id)
        .then((stats) => setSessionStats(stats))
        .catch(() => setSessionStats(null));
    } else {
      setSessionStats(null);
    }
  }, [activeSession]);

  const currentAccuracy = useMemo(() => {
    if (!sessionStats || sessionStats.totalShotsFired === 0) return 0;
    return Math.round((sessionStats.totalHits / sessionStats.totalShotsFired) * 100);
  }, [sessionStats]);

  return {
    sessionStats,
    currentAccuracy,
  };
}
