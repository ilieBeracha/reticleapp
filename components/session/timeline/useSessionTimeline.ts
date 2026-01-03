/**
 * useSessionTimeline
 * 
 * Hook for fetching and managing session timeline data.
 * Handles loading states, errors, and data transformation.
 */

import {
    getSessionTimeline,
    getTimelineWithMarkers,
    hasSessionTimeline,
    type SessionTimeline,
    type TimelineWithMarkers,
} from '@/services/session/timelineService';
import { useCallback, useEffect, useState } from 'react';

interface UseSessionTimelineOptions {
  /** Session ID to fetch timeline for */
  sessionId: string;
  /** Skip initial fetch (manual trigger only) */
  skipInitialFetch?: boolean;
}

interface UseSessionTimelineReturn {
  /** Timeline data (null if not loaded or doesn't exist) */
  timeline: SessionTimeline | null;
  /** Whether timeline exists for this session */
  hasTimeline: boolean;
  /** Loading state */
  loading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Refresh timeline data */
  refresh: () => Promise<void>;
  /** Check if timeline exists without fetching full data */
  checkExists: () => Promise<boolean>;
}

export function useSessionTimeline({
  sessionId,
  skipInitialFetch = false,
}: UseSessionTimelineOptions): UseSessionTimelineReturn {
  const [timeline, setTimeline] = useState<SessionTimeline | null>(null);
  const [hasTimelineData, setHasTimelineData] = useState(false);
  const [loading, setLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getSessionTimeline(sessionId);
      setTimeline(data);
      setHasTimelineData(data !== null);
    } catch (err) {
      console.error('[useSessionTimeline] Error fetching timeline:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch timeline'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const checkExists = useCallback(async (): Promise<boolean> => {
    if (!sessionId) return false;
    
    try {
      const exists = await hasSessionTimeline(sessionId);
      setHasTimelineData(exists);
      return exists;
    } catch (err) {
      console.error('[useSessionTimeline] Error checking timeline:', err);
      return false;
    }
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    if (!skipInitialFetch && sessionId) {
      fetchTimeline();
    }
  }, [sessionId, skipInitialFetch, fetchTimeline]);

  return {
    timeline,
    hasTimeline: hasTimelineData,
    loading,
    error,
    refresh: fetchTimeline,
    checkExists,
  };
}

/**
 * Hook for timeline data formatted for chart visualization.
 */
export function useTimelineChartData(sessionId: string) {
  const [data, setData] = useState<TimelineWithMarkers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      try {
        const result = await getTimelineWithMarkers(sessionId);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch timeline'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { data, loading, error };
}

