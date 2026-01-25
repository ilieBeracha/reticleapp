/**
 * useSessionTimeline Hook
 *
 * Fetches timeline data for a session from the database.
 * Used to display biometric data, shot details, and performance insights.
 */
import { getSessionTimeline, type SessionTimeline } from '@/services/session/timelineService';
import { useCallback, useEffect, useState } from 'react';

interface UseSessionTimelineOptions {
  sessionId: string;
}

interface UseSessionTimelineReturn {
  timeline: SessionTimeline | null;
  hasTimeline: boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSessionTimeline({ sessionId }: UseSessionTimelineOptions): UseSessionTimelineReturn {
  const [timeline, setTimeline] = useState<SessionTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!sessionId) {
      setTimeline(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getSessionTimeline(sessionId);
      setTimeline(data);
    } catch (err) {
      console.error('[useSessionTimeline] Error fetching timeline:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch timeline'));
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    timeline,
    hasTimeline: timeline !== null,
    loading,
    error,
    refetch: fetchTimeline,
  };
}
