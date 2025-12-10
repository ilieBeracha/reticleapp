import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { ACTIVE_DIAL_MODES, ACTIVE_MODES_ORDER, IDLE_DIAL_MODES, IDLE_MODES_ORDER } from '../constants';
import type {
    ActiveDialMode,
    DialModeConfig,
    DialValue,
    IdleDialMode,
    SessionStats,
    SessionWithDetails,
    WeeklyStats,
} from '../types';

interface UseDialStateProps {
  activeSession: SessionWithDetails | undefined;
  sessionStats: SessionStats | null;
  currentAccuracy: number;
  weeklyStats: WeeklyStats;
}

/**
 * Hook to manage dial mode state and navigation.
 * Handles switching between active/idle modes and calculating dial values.
 */
export function useDialState({
  activeSession,
  sessionStats,
  currentAccuracy,
  weeklyStats,
}: UseDialStateProps) {
  const [activeDialMode, setActiveDialMode] = useState<ActiveDialMode>('targets');
  const [idleDialMode, setIdleDialMode] = useState<IdleDialMode>('sessions');

  // Current mode configuration
  const currentModeConfig: DialModeConfig = activeSession
    ? ACTIVE_DIAL_MODES[activeDialMode]
    : IDLE_DIAL_MODES[idleDialMode];

  // Get dial value based on current mode
  const dialValue: DialValue = useMemo(() => {
    if (activeSession) {
      switch (activeDialMode) {
        case 'targets':
          return { value: sessionStats?.targetCount ?? 0 };
        case 'shots':
          return { value: sessionStats?.totalShotsFired ?? 0 };
        case 'accuracy':
          return { value: currentAccuracy };
        default:
          return { value: 0 };
      }
    } else {
      switch (idleDialMode) {
        case 'sessions':
          return { value: weeklyStats?.sessions ?? 0 };
        case 'shots':
          return { value: weeklyStats?.totalShots ?? 0 };
        case 'paper':
          return { value: weeklyStats?.paperTargets ?? 0 };
        case 'tactical':
          return { value: weeklyStats?.tacticalTargets ?? 0 };
        default:
          return { value: 0 };
      }
    }
  }, [activeSession, activeDialMode, idleDialMode, sessionStats, currentAccuracy, weeklyStats]);

  // Calculate dial progress (0-1)
  const dialProgress = useMemo(() => {
    return currentModeConfig.getProgress(dialValue.value, 100);
  }, [currentModeConfig, dialValue]);

  // Mode count and current index
  const modeCount = activeSession ? ACTIVE_MODES_ORDER.length : IDLE_MODES_ORDER.length;
  const currentModeIndex = activeSession
    ? ACTIVE_MODES_ORDER.indexOf(activeDialMode)
    : IDLE_MODES_ORDER.indexOf(idleDialMode);

  // Navigation handlers
  const handlePrevMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeSession) {
      const idx = ACTIVE_MODES_ORDER.indexOf(activeDialMode);
      const newIdx = idx > 0 ? idx - 1 : ACTIVE_MODES_ORDER.length - 1;
      setActiveDialMode(ACTIVE_MODES_ORDER[newIdx]);
    } else {
      const idx = IDLE_MODES_ORDER.indexOf(idleDialMode);
      const newIdx = idx > 0 ? idx - 1 : IDLE_MODES_ORDER.length - 1;
      setIdleDialMode(IDLE_MODES_ORDER[newIdx]);
    }
  }, [activeSession, activeDialMode, idleDialMode]);

  const handleNextMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeSession) {
      const idx = ACTIVE_MODES_ORDER.indexOf(activeDialMode);
      const newIdx = idx < ACTIVE_MODES_ORDER.length - 1 ? idx + 1 : 0;
      setActiveDialMode(ACTIVE_MODES_ORDER[newIdx]);
    } else {
      const idx = IDLE_MODES_ORDER.indexOf(idleDialMode);
      const newIdx = idx < IDLE_MODES_ORDER.length - 1 ? idx + 1 : 0;
      setIdleDialMode(IDLE_MODES_ORDER[newIdx]);
    }
  }, [activeSession, activeDialMode, idleDialMode]);

  return {
    activeDialMode,
    idleDialMode,
    currentModeConfig,
    dialValue,
    dialProgress,
    modeCount,
    currentModeIndex,
    handlePrevMode,
    handleNextMode,
  };
}
