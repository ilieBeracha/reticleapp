/**
 * useSessionCreation - Hook for step-based session creation
 *
 * Implements a 2-step pre-shooting flow:
 * 1. Intent - What am I going to do? (grouping/engagement)
 * 2. Details - Session configuration (weapon, distance, bullets, etc.)
 *
 * Weapon selection is a sheet within the Details step, not a separate step.
 *
 * Then hands off to:
 * - SessionPrepView for watch/phone selection
 * - activeSession.tsx for scan/manual selection (based on drill config)
 */

import type { BaseSessionConfig, DrillConfig } from '@/services/session/types';
import { getDefaultWeapon } from '@/services/weaponService';
import { useIsGarminConnected } from '@/store/garminStore';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

/** Initial state for editing - context can be partial */
export interface SessionCreationInitialState {
  step?: CreationStep;
  purpose?: SessionPurpose | null;
  drillSource?: DrillSource | null;
  selectedDrillId?: string | null;
  context?: Partial<SessionContextState>;
}

export interface UseSessionCreationOptions {
  onSubmit?: (config: BaseSessionConfig) => Promise<void>;
  /** Pre-fill state when coming back from SessionPrepView to edit */
  initialState?: SessionCreationInitialState;
}

export interface UseSessionCreationReturn {
  // State
  state: SessionCreationState;
  
  // Derived
  isWatchConnected: boolean;
  isLoadingWeapon: boolean;
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
  
  // Category Drill - When selected, session MUST follow this drill
  setDrill: (drillId: string | null) => void;
  
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
// STEP ORDER (2 user-facing steps - weapon is a sheet within details)
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
  const { onSubmit, initialState } = options;
  
  // Merge initial state with defaults
  const [state, setState] = useState<SessionCreationState>(() => {
    if (initialState) {
      return {
        ...DEFAULT_CREATION_STATE,
        step: initialState.step || DEFAULT_CREATION_STATE.step,
        purpose: initialState.purpose ?? DEFAULT_CREATION_STATE.purpose,
        drillSource: initialState.drillSource ?? DEFAULT_CREATION_STATE.drillSource,
        selectedDrillId: initialState.selectedDrillId ?? DEFAULT_CREATION_STATE.selectedDrillId,
        context: {
          ...DEFAULT_CREATION_STATE.context,
          ...(initialState.context || {}),
        },
      };
    }
    return DEFAULT_CREATION_STATE;
  });
  
  // Skip weapon loading if initial state already has a weapon
  const [isLoadingWeapon, setIsLoadingWeapon] = useState(!initialState?.context?.weaponId);
  const isWatchConnected = useIsGarminConnected();
  
  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-LOAD DEFAULT WEAPON
  // User's favorite or last-used weapon is pre-selected
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    // Skip if we already have a weapon from initialState
    if (initialState?.context?.weaponId) {
      setIsLoadingWeapon(false);
      return;
    }
    
    let cancelled = false;
    
    async function loadDefaultWeapon() {
      try {
        const weapon = await getDefaultWeapon();
        if (weapon && !cancelled) {
          setState(s => ({
            ...s,
            context: {
              ...s.context,
              weaponId: weapon.id,
              weaponName: weapon.name,
              weaponCategory: weapon.category || null,
            },
          }));
          console.log('[useSessionCreation] Auto-selected default weapon:', weapon.name);
        }
      } catch (error) {
        console.error('[useSessionCreation] Failed to load default weapon:', error);
      } finally {
        if (!cancelled) setIsLoadingWeapon(false);
      }
    }
    
    loadDefaultWeapon();
    
    return () => {
      cancelled = true;
    };
  }, []);
  
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
        // Weapon is required, distance and shots must be valid
        return state.context.weaponId !== null && state.context.distance > 0 && state.context.shotsPlanned > 0;
      case 'ready':
        return false; // This is the final step
      default:
        return false;
    }
  }, [state.step, state.purpose, state.context]);
  
  // Progress: 2 user-facing steps (intent, details)
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
    console.log('[useSessionCreation] updateContext called with:', partial);
    setState((s) => {
      const newContext = { ...s.context, ...partial };
      console.log('[useSessionCreation] New context:', { shotsPlanned: newContext.shotsPlanned, distance: newContext.distance });
      return {
        ...s,
        context: newContext,
      };
    });
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORY DRILL SELECTION
  // When a drill is selected, the session MUST follow it
  // ─────────────────────────────────────────────────────────────────────────
  
  const setDrill = useCallback((drillId: string | null) => {
    setState((s) => ({
      ...s,
      selectedDrillId: drillId,
      isDrillLocked: drillId !== null,
    }));
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  
  const goBack = useCallback(() => {
    setState((s) => {
      const currentIndex = STEP_ORDER.indexOf(s.step);
      if (currentIndex <= 0) return s;
      const prevStep = STEP_ORDER[currentIndex - 1];
      return { ...s, step: prevStep };
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
          // Weapon is required to continue
          canAdvance = s.context.weaponId !== null && s.context.distance > 0 && s.context.shotsPlanned > 0;
          break;
        default:
          canAdvance = false;
      }

      if (!canAdvance) return s;
      const nextStep = STEP_ORDER[currentIndex + 1];
      return { ...s, step: nextStep };
    });
  }, []);
  
  const goToStep = useCallback((step: CreationStep) => {
    setState((s) => ({ ...s, step }));
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // BUILD CONFIG
  // ─────────────────────────────────────────────────────────────────────────
  
  const buildConfig = useCallback((): BaseSessionConfig => {
    const { purpose, context, selectedDrillId, isDrillLocked } = state;
    console.log('[useSessionCreation] buildConfig - context:', { shotsPlanned: context.shotsPlanned, distance: context.distance });
    
    // For solo sessions, always use inline drill_config
    // Presets update context values, so we build config from context
    // (drill_id is only for training_drills in team context)
    
    // Determine drill name based on selection
    let drillName: string;
    if (isDrillLocked && selectedDrillId) {
      // When following a category drill, use its name
      // Note: We can't import getDrillById here to avoid circular deps,
      // but the name is stored in context when drill is selected
      drillName = `Drill: ${context.distance}m`;
    } else if (purpose === 'grouping') {
      drillName = `Grouping ${context.distance}m`;
    } else {
      drillName = 'Practice Session';
    }
    
    // Build inline drill config
    // Note: input_method is not set - user chooses scan vs manual during session
    const drillConfig: DrillConfig = {
      name: drillName,
      drill_goal: purposeToDrillGoal(purpose || 'engagement'),
      target_type: context.targetType === 'paper' ? 'paper' : 'tactical',
      distance_m: context.distance,
      rounds_per_shooter: context.shotsPlanned,
      time_limit_seconds: context.timeLimit,
      strings_count: 1,
      // Include category drill reference when locked
      category_drill_id: isDrillLocked ? selectedDrillId : undefined,
    };
    
    return {
      team_id: null,
      training_id: null,
      weapon_id: context.weaponId, // Weapon is required
      drill_id: null, // Only used for training_drills (team context)
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
    isLoadingWeapon,
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
    setDrill,
    goBack,
    goForward,
    goToStep,
    submit,
    buildConfig,
    reset,
  };
}
