/**
 * useSessionCreation - Hook for step-based session creation
 * 
 * Implements the 2-step pre-shooting flow:
 * 1. Intent - What am I going to do?
 * 2. Context - Under what conditions?
 * 
 * Then hands off to:
 * - SessionPrepView for watch/phone selection
 * - activeSession.tsx for scan/manual selection (based on drill config)
 */

import type { BaseSessionConfig, DrillConfig } from '@/services/session/types';
import { useIsGarminConnected } from '@/store/garminStore';
import { useCallback, useMemo, useState } from 'react';
import {
  getPurposeOption,
  purposeToDrillGoal,
} from './sessionCreation.constants';
import {
  DEFAULT_CREATION_STATE,
  type CreationStep,
  type DrillSource,
  type Position,
  type SessionContextState,
  type SessionCreationState,
  type SessionPurpose,
  type TargetType
} from './sessionCreation.types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSessionCreationOptions {
  onSubmit?: (config: BaseSessionConfig) => Promise<void>;
}

export interface UseSessionCreationReturn {
  // State
  state: SessionCreationState;
  
  // Derived
  isWatchConnected: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  progressPercent: number;
  
  // Step 1: Intent
  setPurpose: (purpose: SessionPurpose) => void;
  setDrillSource: (source: DrillSource) => void;
  selectPreset: (presetId: string) => void;
  selectLibraryDrill: (drillId: string) => void;
  
  // Step 2: Context
  setWeapon: (id: string | null, name: string | null) => void;
  setDistance: (distance: number) => void;
  setPosition: (position: Position) => void;
  setTargetType: (type: TargetType) => void;
  setShots: (shots: number) => void;
  setTimeLimit: (limit: number | null) => void;
  setNotes: (notes: string) => void;
  updateContext: (partial: Partial<SessionContextState>) => void;
  
  // Navigation
  goBack: () => void;
  goForward: () => void;
  goToStep: (step: CreationStep) => void;
  
  // Submission
  submit: () => void;
  buildConfig: () => BaseSessionConfig;
  reset: () => void;
}

// ============================================================================
// STEP ORDER (only 2 steps now)
// ============================================================================

const STEP_ORDER: CreationStep[] = ['intent', 'context', 'ready'];

function getStepIndex(step: CreationStep): number {
  return STEP_ORDER.indexOf(step);
}

// ============================================================================
// HOOK
// ============================================================================

export function useSessionCreation(
  options: UseSessionCreationOptions = {}
): UseSessionCreationReturn {
  const { onSubmit } = options;
  
  const [state, setState] = useState<SessionCreationState>(DEFAULT_CREATION_STATE);
  const isWatchConnected = useIsGarminConnected();
  
  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────────────────────────
  
  const stepIndex = getStepIndex(state.step);
  const canGoBack = stepIndex > 0;
  const canGoForward = useMemo(() => {
    switch (state.step) {
      case 'intent':
        return state.purpose !== null;
      case 'context':
        return state.context.distance > 0 && state.context.shotsPlanned > 0;
      case 'ready':
        return false; // This is the final step
      default:
        return false;
    }
  }, [state.step, state.purpose, state.context]);
  
  // Progress: 2 user-facing steps (intent, context)
  const progressPercent = ((stepIndex + 1) / 2) * 100;
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: INTENT
  // ─────────────────────────────────────────────────────────────────────────
  
  const setPurpose = useCallback((purpose: SessionPurpose) => {
    const option = getPurposeOption(purpose);
    setState((s) => ({
      ...s,
      purpose,
      // Apply purpose defaults to context
      context: {
        ...s.context,
        ...option?.defaults,
      },
    }));
  }, []);
  
  const setDrillSource = useCallback((drillSource: DrillSource) => {
    setState((s) => ({ ...s, drillSource }));
  }, []);
  
  const selectPreset = useCallback((presetId: string) => {
    setState((s) => ({
      ...s,
      selectedPresetId: presetId,
      drillSource: 'preset',
    }));
  }, []);
  
  const selectLibraryDrill = useCallback((drillId: string) => {
    setState((s) => ({
      ...s,
      selectedLibraryId: drillId,
      drillSource: 'library',
    }));
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  
  const setWeapon = useCallback((weaponId: string | null, weaponName: string | null) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, weaponId, weaponName },
    }));
  }, []);
  
  const setDistance = useCallback((distance: number) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, distance: Math.max(1, Math.min(1000, distance)) },
    }));
  }, []);
  
  const setPosition = useCallback((position: Position) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, position },
    }));
  }, []);
  
  const setTargetType = useCallback((targetType: TargetType) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, targetType },
    }));
  }, []);
  
  const setShots = useCallback((shotsPlanned: number) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, shotsPlanned: Math.max(1, Math.min(100, shotsPlanned)) },
    }));
  }, []);
  
  const setTimeLimit = useCallback((timeLimit: number | null) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, timeLimit },
    }));
  }, []);
  
  const setNotes = useCallback((notes: string) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, notes },
    }));
  }, []);
  
  const updateContext = useCallback((partial: Partial<SessionContextState>) => {
    setState((s) => ({
      ...s,
      context: { ...s.context, ...partial },
    }));
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  
  const goBack = useCallback(() => {
    setState((s) => {
      const currentIndex = STEP_ORDER.indexOf(s.step);
      if (currentIndex <= 0) return s;
      return { ...s, step: STEP_ORDER[currentIndex - 1] };
    });
  }, []);
  
  const goForward = useCallback(() => {
    setState((s) => {
      const currentIndex = STEP_ORDER.indexOf(s.step);
      if (currentIndex >= STEP_ORDER.length - 1) return s;
      
      // Validate current step before advancing
      let canAdvance = false;
      switch (s.step) {
        case 'intent':
          canAdvance = s.purpose !== null;
          break;
        case 'context':
          canAdvance = s.context.distance > 0 && s.context.shotsPlanned > 0;
          break;
        default:
          canAdvance = false;
      }
      
      if (!canAdvance) return s;
      return { ...s, step: STEP_ORDER[currentIndex + 1] };
    });
  }, []);
  
  const goToStep = useCallback((step: CreationStep) => {
    setState((s) => ({ ...s, step }));
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // BUILD CONFIG
  // ─────────────────────────────────────────────────────────────────────────
  
  const buildConfig = useCallback((): BaseSessionConfig => {
    const { purpose, context, selectedPresetId } = state;
    
    // If using a saved preset, reference it via drill_id
    if (selectedPresetId) {
      return {
        team_id: null,
        training_id: null,
        drill_id: selectedPresetId,
        drill_config: null, // Will be loaded from preset
        session_mode: 'solo',
        watch_controlled: false, // Set in SessionPrepView after form
        start_as_pending: true,
      };
    }
    
    // Build inline drill config
    // Note: input_method is not set - user chooses scan vs manual during session
    const drillConfig: DrillConfig = {
      name: purpose === 'zeroing' 
        ? `Zeroing ${context.distance}m`
        : purpose === 'physical'
        ? 'Physical Drill'
        : purpose === 'grouping'
        ? `Grouping ${context.distance}m`
        : 'Practice Session',
      drill_goal: purposeToDrillGoal(purpose || 'custom'),
      target_type: context.targetType === 'paper' ? 'paper' : 'tactical',
      distance_m: context.distance,
      rounds_per_shooter: context.shotsPlanned,
      time_limit_seconds: context.timeLimit,
      strings_count: 1,
    };
    
    return {
      team_id: null,
      training_id: null,
      drill_id: null,
      drill_config: drillConfig,
      session_mode: 'solo',
      watch_controlled: false, // Set in SessionPrepView after form
      notes: context.notes || undefined,
      start_as_pending: true,
    };
  }, [state]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────────────────────
  
  const submit = useCallback(async () => {
    if (!onSubmit) return;
    setState((s) => ({ ...s, isSubmitting: true }));
    try {
      const config = buildConfig();
      await onSubmit(config);
    } finally {
      setState((s) => ({ ...s, isSubmitting: false }));
    }
  }, [onSubmit, buildConfig]);
  
  // ─────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────
  
  const reset = useCallback(() => {
    setState(DEFAULT_CREATION_STATE);
  }, []);
  
  return {
    state,
    isWatchConnected,
    canGoBack,
    canGoForward,
    progressPercent,
    setPurpose,
    setDrillSource,
    selectPreset,
    selectLibraryDrill,
    setWeapon,
    setDistance,
    setPosition,
    setTargetType,
    setShots,
    setTimeLimit,
    setNotes,
    updateContext,
    goBack,
    goForward,
    goToStep,
    submit,
    buildConfig,
    reset,
  };
}
