/**
 * useGarminSession
 *
 * Hook for integrating Garmin watch data with an active shooting session.
 * Handles:
 * - Syncing drill config to watch when session starts
 * - Receiving session data when session ends
 * - Processing shot timestamps and metrics from watch
 *
 * @example
 * ```tsx
 * function ActiveSessionScreen({ sessionId, drill }: Props) {
 *   const { isWatchConnected, watchData, requestWatchData } = useGarminSession({
 *     sessionId,
 *     drill: {
 *       name: drill.name,
 *       rounds: drill.rounds_per_shooter,
 *       distance: drill.distance_m,
 *       timeLimit: drill.time_limit_seconds,
 *     },
 *     onSessionData: (data) => {
 *       // Save watch metrics to your session
 *       console.log('Received from watch:', data.shotsRecorded, data.shotTimestamps);
 *     },
 *   });
 *
 *   const handleEndSession = async () => {
 *     // Request data from watch before ending
 *     requestWatchData();
 *     // ... then end session in DB
 *   };
 * }
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GarminSessionData,
  useGarminStore,
  useIsGarminConnected,
} from '@/store/garminStore';

export interface UseGarminSessionOptions {
  /** The session ID to associate with watch data */
  sessionId: string;

  /** Whether watch controls this session (user's choice from WatchControlPrompt) */
  watchControlled: boolean;

  /** Drill config to sync to watch */
  drill?: {
    name: string;
    rounds: number;
    distance?: number;
    timeLimit?: number;
  };

  /** Callback when session data is received from watch */
  onSessionData?: (data: GarminSessionData) => void;

  /** Auto-sync drill to watch on mount (default: true, but only if watchControlled) */
  autoSync?: boolean;
}

export interface UseGarminSessionResult {
  /** Whether a Garmin watch is connected */
  isWatchConnected: boolean;

  /** Latest session data received from watch */
  watchData: GarminSessionData | null;

  /** Whether we're waiting for data from watch */
  isWaitingForData: boolean;

  /** Send end session command and wait for data */
  requestWatchData: () => void;

  /** Sync drill config to watch */
  syncDrill: () => void;

  /** Start session tracking on watch */
  startWatchTracking: () => void;
}

export function useGarminSession(options: UseGarminSessionOptions): UseGarminSessionResult {
  const { sessionId, watchControlled, drill, onSessionData, autoSync = true } = options;

  const isWatchConnected = useIsGarminConnected();
  const { startSession, endSession, syncDrill: storeSyncDrill, setSessionDataCallback, lastSessionData } =
    useGarminStore();

  const [watchData, setWatchData] = useState<GarminSessionData | null>(null);
  const [isWaitingForData, setIsWaitingForData] = useState(false);

  // Track if we've already synced drill
  const hasSyncedRef = useRef(false);
  const callbackRef = useRef(onSessionData);
  callbackRef.current = onSessionData;

  // Effective connection: only true if watch connected AND user chose watch control
  const effectiveWatchActive = isWatchConnected && watchControlled;

  // Register callback for session data (only if watch controlled)
  useEffect(() => {
    if (!watchControlled) {
      return; // Don't register callback if watch not controlling
    }

    const handleSessionData = (data: GarminSessionData) => {
      // Only process if it's for our session
      if (data.sessionId && data.sessionId !== sessionId) {
        return;
      }

      setWatchData(data);
      setIsWaitingForData(false);

      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };

    setSessionDataCallback(handleSessionData);

    return () => {
      setSessionDataCallback(null);
    };
  }, [sessionId, watchControlled, setSessionDataCallback]);

  // Auto-sync drill to watch on mount (only if watchControlled)
  useEffect(() => {
    if (autoSync && effectiveWatchActive && drill && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      storeSyncDrill(drill);
      startSession(sessionId, drill.name);
    }
  }, [autoSync, effectiveWatchActive, drill, sessionId, storeSyncDrill, startSession]);

  // Manual sync drill
  const syncDrill = useCallback(() => {
    if (effectiveWatchActive && drill) {
      storeSyncDrill(drill);
    }
  }, [effectiveWatchActive, drill, storeSyncDrill]);

  // Start watch tracking
  const startWatchTracking = useCallback(() => {
    if (effectiveWatchActive) {
      startSession(sessionId, drill?.name);
    }
  }, [effectiveWatchActive, sessionId, drill, startSession]);

  // Request data from watch (ends watch session)
  // Only does something if watchControlled is true
  const requestWatchData = useCallback(() => {
    if (!watchControlled) {
      // If watch not controlling, immediately return - don't wait
      return;
    }
    
    if (isWatchConnected) {
      setIsWaitingForData(true);
      endSession(sessionId);

      // Timeout fallback in case watch doesn't respond
      setTimeout(() => {
        setIsWaitingForData(false);
      }, 5000);
    }
  }, [watchControlled, isWatchConnected, sessionId, endSession]);

  return {
    isWatchConnected,
    watchData,
    isWaitingForData,
    requestWatchData,
    syncDrill,
    startWatchTracking,
  };
}

export default useGarminSession;


