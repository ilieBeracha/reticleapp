import { useEffect, useRef, useState } from 'react';
import type { ElapsedTime, SessionWithDetails } from '../types';

/**
 * Hook to manage a live timer for an active session.
 * Calculates elapsed time from session start and updates every second.
 */
export function useSessionTimer(activeSession: SessionWithDetails | undefined) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeSession) {
      const startTime = new Date(activeSession.started_at).getTime();
      
      const updateElapsed = () => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      };

      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      setElapsedTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [activeSession]);

  const formatElapsedTime = (seconds: number): ElapsedTime => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { minutes: mins, seconds: secs };
  };

  return {
    elapsedTime,
    elapsed: formatElapsedTime(elapsedTime),
  };
}
