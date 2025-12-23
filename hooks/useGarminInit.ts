/**
 * Garmin Initialization Hook
 * 
 * Call this at the app level (protected layout) to ensure
 * Garmin listeners are set up before any session is started.
 */
import { useGarminStore } from '@/store/garminStore';
import { useEffect } from 'react';

export function useGarminInit() {
  const _initialize = useGarminStore((state) => state._initialize);

  useEffect(() => {
    const cleanup = _initialize();
    return cleanup;
  }, [_initialize]);
}

