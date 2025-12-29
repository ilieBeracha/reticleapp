/**
 * useSessionForm - Unified hook for session/drill form state
 * 
 * Rules:
 * - Grouping: allows scan OR manual, still needs shot count
 * - Scan input: watch control NOT available (auto-disabled)
 * - Time limit: optional for all modes
 */

import type { BaseSessionConfig, DrillConfig } from '@/services/session/types';
import { useIsGarminConnected } from '@/store/garminStore';
import { useCallback, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type DrillGoal = 'grouping' | 'achievement';
export type InputMethod = 'scan' | 'manual';
export type TargetType = 'paper' | 'tactical';
export type ControlMode = 'phone' | 'watch';

export interface SessionFormState {
  name: string;
  drillGoal: DrillGoal;
  inputMethod: InputMethod;
  distance: number;
  shots: number;
  rounds: number;
  timeLimit: number | null;
  controlMode: ControlMode;
}

export interface SessionFormContext {
  teamId: string | null;
  trainingId?: string | null;
  drillId?: string | null;  // Reference to saved drill/preset
}

export interface UseSessionFormOptions {
  initialValues?: Partial<SessionFormState>;
  context?: SessionFormContext;
  onSubmit?: (config: BaseSessionConfig) => Promise<void>;
}

export interface UseSessionFormReturn {
  state: SessionFormState;
  isValid: boolean;
  isSubmitting: boolean;
  targetType: TargetType;
  
  // Watch - disabled when using scan
  isWatchConnected: boolean;
  canUseWatch: boolean; // false if scan mode
  showWatchPrompt: boolean;
  pendingConfig: BaseSessionConfig | null;
  
  // Actions
  setName: (name: string) => void;
  setDrillGoal: (goal: DrillGoal) => void;
  setInputMethod: (method: InputMethod) => void;
  setDistance: (distance: number) => void;
  setShots: (shots: number) => void;
  setRounds: (rounds: number) => void;
  setTimeLimit: (limit: number | null) => void;
  setControlMode: (mode: ControlMode) => void;
  reset: (values?: Partial<SessionFormState>) => void;
  submit: () => void;
  handleWatchControlSelect: (watchControlled: boolean) => void;
  buildDrillConfig: () => DrillConfig;
  buildSessionConfig: (watchControlled: boolean) => BaseSessionConfig;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DISTANCE_PRESETS = [7, 15, 25, 50, 100];
export const SHOTS_PRESETS = [3, 5, 10, 20];
export const ROUNDS_PRESETS = [1, 2, 3, 5];
export const TIME_PRESETS: (number | null)[] = [null, 30, 60, 120];

const DEFAULT_STATE: SessionFormState = {
  name: '',
  drillGoal: 'grouping',
  inputMethod: 'scan',
  distance: 25,
  shots: 5,
  rounds: 1,
  timeLimit: null,
  controlMode: 'phone',
};

// ============================================================================
// HOOK
// ============================================================================

export function useSessionForm(options: UseSessionFormOptions = {}): UseSessionFormReturn {
  const { initialValues, context = { teamId: null }, onSubmit } = options;
  
  const [state, setState] = useState<SessionFormState>({
    ...DEFAULT_STATE,
    ...initialValues,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWatchPrompt, setShowWatchPrompt] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<BaseSessionConfig | null>(null);
  
  const isWatchConnected = useIsGarminConnected();
  
  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────────────────────────
  
  // Scan mode = paper target, manual + achievement = tactical
  const targetType: TargetType = 
    state.inputMethod === 'scan' ? 'paper' : 
    state.drillGoal === 'grouping' ? 'paper' : 'tactical';
  
  // Watch cannot be used with scan (phone camera needed)
  const canUseWatch = state.inputMethod === 'manual';
  
  const isValid = state.distance > 0 && state.shots > 0;
  
  // ─────────────────────────────────────────────────────────────────────────
  // SETTERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const setName = useCallback((name: string) => {
    setState(s => ({ ...s, name }));
  }, []);
  
  const setDrillGoal = useCallback((drillGoal: DrillGoal) => {
    setState(s => ({
      ...s,
      drillGoal,
      // Grouping defaults to scan but can be changed
      inputMethod: drillGoal === 'grouping' && s.inputMethod === 'manual' ? s.inputMethod : s.inputMethod,
    }));
  }, []);
  
  const setInputMethod = useCallback((inputMethod: InputMethod) => {
    setState(s => ({ ...s, inputMethod }));
  }, []);
  
  const setDistance = useCallback((distance: number) => {
    setState(s => ({ ...s, distance: Math.max(1, Math.min(1000, distance)) }));
  }, []);
  
  const setShots = useCallback((shots: number) => {
    setState(s => ({ ...s, shots: Math.max(1, Math.min(100, shots)) }));
  }, []);
  
  const setRounds = useCallback((rounds: number) => {
    setState(s => ({ ...s, rounds: Math.max(1, Math.min(20, rounds)) }));
  }, []);
  
  const setTimeLimit = useCallback((timeLimit: number | null) => {
    setState(s => ({ ...s, timeLimit }));
  }, []);
  
  const setControlMode = useCallback((controlMode: ControlMode) => {
    setState(s => ({ ...s, controlMode }));
  }, []);
  
  const reset = useCallback((values?: Partial<SessionFormState>) => {
    setState({ ...DEFAULT_STATE, ...initialValues, ...values });
  }, [initialValues]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // BUILDERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const buildDrillConfig = useCallback((): DrillConfig => {
    return {
      name: state.name || 'Quick Practice',
      drill_goal: state.drillGoal,
      target_type: targetType,
      input_method: state.inputMethod,
      distance_m: state.distance,
      rounds_per_shooter: state.shots,
      time_limit_seconds: state.timeLimit,
      strings_count: state.rounds,
    };
  }, [state, targetType]);
  
  const buildSessionConfig = useCallback((watchControlled: boolean, startAsPending = false): BaseSessionConfig => {
    return {
      team_id: context.teamId,
      training_id: context.trainingId ?? null,
      drill_id: context.drillId ?? null,
      // If drill_id is provided, drill_config is null (config comes from saved drill)
      // Otherwise, use inline drill_config
      drill_config: context.drillId ? null : buildDrillConfig(),
      session_mode: 'solo',
      watch_controlled: watchControlled,
      start_as_pending: startAsPending,
    };
  }, [context, buildDrillConfig]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // SUBMISSION
  // ─────────────────────────────────────────────────────────────────────────
  
  const doSubmit = useCallback(async (config: BaseSessionConfig) => {
    if (!onSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(config);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);
  
  const handleWatchControlSelect = useCallback((watchControlled: boolean) => {
    setShowWatchPrompt(false);
    if (pendingConfig) {
      doSubmit({ ...pendingConfig, watch_controlled: watchControlled });
      setPendingConfig(null);
    }
  }, [pendingConfig, doSubmit]);
  
  const submit = useCallback(() => {
    // Use user's control mode selection
    const watchControlled = state.controlMode === 'watch' && canUseWatch;
    // If watch controlled, start as pending so user sees SessionPrepView
    const startAsPending = watchControlled;
    const config = buildSessionConfig(watchControlled, startAsPending);
    doSubmit(config);
  }, [buildSessionConfig, doSubmit, state.controlMode, canUseWatch]);
  
  return {
    state,
    isValid,
    isSubmitting,
    targetType,
    isWatchConnected,
    canUseWatch,
    showWatchPrompt,
    pendingConfig,
    setName,
    setDrillGoal,
    setInputMethod,
    setDistance,
    setShots,
    setRounds,
    setTimeLimit,
    setControlMode,
    reset,
    submit,
    handleWatchControlSelect,
    buildDrillConfig,
    buildSessionConfig,
  };
}
