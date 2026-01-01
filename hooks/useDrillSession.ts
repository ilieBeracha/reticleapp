/**
 * useDrillSession
 * 
 * This hook manages a session that FOLLOWS a drill.
 * 
 * When a drill is selected:
 * - Distance, rounds, positions are LOCKED to the drill requirements
 * - Pass/fail criteria are tracked
 * - Results are evaluated against the drill's scoring tiers
 * 
 * This is not optional configuration - this is STRUCTURE.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  type CategoryDrill,
  evaluateDrillResult,
  getDrillById,
} from '@/constants/categoryDrills';

// ============================================================================
// TYPES
// ============================================================================

/** State of a drill-based session */
export interface DrillSessionState {
  /** The selected drill (null = free-form session) */
  drill: CategoryDrill | null;
  /** Current string/stage number (1-indexed) */
  currentString: number;
  /** Results per string */
  stringResults: StringResult[];
  /** Whether the session is locked to drill requirements */
  isLocked: boolean;
  /** Validation state */
  validation: DrillValidation;
}

/** Result of a single string/stage */
export interface StringResult {
  stringNumber: number;
  shotsRecorded: number;
  hits: number;
  timeSeconds: number | null;
  dispersionCm: number | null;
  notes: string;
}

/** Validation state */
export interface DrillValidation {
  /** Are minimum requirements met? */
  requirementsMet: boolean;
  /** What's missing? */
  missingRequirements: string[];
  /** Can the session be saved? */
  canSave: boolean;
}

/** Evaluation result after session completion */
export interface DrillEvaluation {
  passed: boolean;
  tier: { name: string; color: string } | null;
  feedback: string[];
  metrics: {
    totalShots: number;
    totalHits: number;
    accuracyPct: number;
    avgDispersion: number | null;
    totalTime: number | null;
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useDrillSession(initialDrillId?: string | null) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  
  const [drill, setDrill] = useState<CategoryDrill | null>(
    initialDrillId ? getDrillById(initialDrillId) : null
  );
  const [currentString, setCurrentString] = useState(1);
  const [stringResults, setStringResults] = useState<StringResult[]>([]);
  const [isLocked, setIsLocked] = useState(!!initialDrillId);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Session context pre-filled from drill */
  const drillContext = useMemo(() => {
    if (!drill) return null;
    
    return {
      drillId: drill.id,
      drillName: drill.name,
      drillType: drill.type,
      
      // Locked requirements
      distance: drill.distances[0],
      allowedDistances: drill.distances,
      rounds: drill.rounds,
      strings: drill.strings,
      positions: drill.positions,
      defaultPosition: drill.positions[0],
      targetType: drill.targetType,
      
      // Time constraints
      hasTimeLimit: drill.totalTimeLimit !== null || drill.timeLimitPerString !== null,
      totalTimeLimit: drill.totalTimeLimit,
      perStringTimeLimit: drill.timeLimitPerString,
      parTime: drill.parTime,
      
      // Evaluation criteria
      passFailCriteria: drill.passFailCriteria,
      scoringTiers: drill.scoringTiers,
      primaryMetric: drill.primaryMetric,
      
      // Instructions for the shooter
      instructions: drill.instructions,
      tips: drill.tips,
    };
  }, [drill]);

  /** Validation - are requirements being followed? */
  const validation = useMemo((): DrillValidation => {
    if (!drill) {
      return { requirementsMet: true, missingRequirements: [], canSave: true };
    }
    
    const missing: string[] = [];
    
    // Check total shots recorded
    const totalShots = stringResults.reduce((sum, r) => sum + r.shotsRecorded, 0);
    if (totalShots < drill.rounds) {
      missing.push(`Need ${drill.rounds} rounds, recorded ${totalShots}`);
    }
    
    // Check strings completed
    const stringsCompleted = stringResults.length;
    if (stringsCompleted < drill.strings) {
      missing.push(`Need ${drill.strings} strings, completed ${stringsCompleted}`);
    }
    
    return {
      requirementsMet: missing.length === 0,
      missingRequirements: missing,
      canSave: missing.length === 0 || !isLocked,
    };
  }, [drill, stringResults, isLocked]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Select a drill - this LOCKS the session to follow it */
  const selectDrill = useCallback((newDrill: CategoryDrill | null) => {
    setDrill(newDrill);
    setIsLocked(newDrill !== null);
    setCurrentString(1);
    setStringResults([]);
  }, []);

  /** Select drill by ID */
  const selectDrillById = useCallback((drillId: string | null) => {
    const foundDrill = drillId ? getDrillById(drillId) : null;
    selectDrill(foundDrill);
  }, [selectDrill]);

  /** Clear drill - go to free-form */
  const clearDrill = useCallback(() => {
    setDrill(null);
    setIsLocked(false);
    setCurrentString(1);
    setStringResults([]);
  }, []);

  /** Record a string result */
  const recordStringResult = useCallback((result: Omit<StringResult, 'stringNumber'>) => {
    if (!drill) return;
    
    const newResult: StringResult = {
      ...result,
      stringNumber: currentString,
    };
    
    setStringResults(prev => [...prev, newResult]);
    
    // Advance to next string if not at the end
    if (currentString < drill.strings) {
      setCurrentString(prev => prev + 1);
    }
  }, [drill, currentString]);

  /** Update a specific string result */
  const updateStringResult = useCallback((stringNumber: number, updates: Partial<StringResult>) => {
    setStringResults(prev => 
      prev.map(r => 
        r.stringNumber === stringNumber ? { ...r, ...updates } : r
      )
    );
  }, []);

  /** Evaluate the completed session against drill criteria */
  const evaluateSession = useCallback((): DrillEvaluation | null => {
    if (!drill) return null;
    
    // Aggregate results
    const totalShots = stringResults.reduce((sum, r) => sum + r.shotsRecorded, 0);
    const totalHits = stringResults.reduce((sum, r) => sum + r.hits, 0);
    const totalTime = stringResults.reduce((sum, r) => sum + (r.timeSeconds || 0), 0) || null;
    
    const dispersions = stringResults
      .map(r => r.dispersionCm)
      .filter((d): d is number => d !== null);
    const avgDispersion = dispersions.length > 0
      ? dispersions.reduce((a, b) => a + b, 0) / dispersions.length
      : null;
    
    const accuracyPct = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;
    
    // Evaluate against drill criteria
    const evaluation = evaluateDrillResult(drill, {
      dispersionCm: avgDispersion ?? undefined,
      accuracyPct,
      timeSeconds: totalTime ?? undefined,
      hits: totalHits,
      totalShots,
    });
    
    return {
      passed: evaluation.passed,
      tier: evaluation.tier,
      feedback: evaluation.feedback,
      metrics: {
        totalShots,
        totalHits,
        accuracyPct,
        avgDispersion,
        totalTime,
      },
    };
  }, [drill, stringResults]);

  /** Unlock session (allow saving without meeting requirements) */
  const unlockSession = useCallback(() => {
    setIsLocked(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────
  
  return {
    // State
    drill,
    drillContext,
    currentString,
    stringResults,
    isLocked,
    validation,
    
    // Is there an active drill?
    hasDrill: drill !== null,
    
    // Can we proceed to next step?
    canProceed: validation.requirementsMet || !isLocked,
    
    // Actions
    selectDrill,
    selectDrillById,
    clearDrill,
    recordStringResult,
    updateStringResult,
    evaluateSession,
    unlockSession,
    
    // Helpers
    getRoundsRemaining: () => {
      if (!drill) return null;
      const recorded = stringResults.reduce((sum, r) => sum + r.shotsRecorded, 0);
      return Math.max(0, drill.rounds - recorded);
    },
    getStringsRemaining: () => {
      if (!drill) return null;
      return Math.max(0, drill.strings - stringResults.length);
    },
  };
}

// ============================================================================
// HELPER: Convert drill context to session creation context
// ============================================================================

/**
 * Converts a drill's locked requirements into the session creation context format
 */
export function drillToSessionContext(drill: CategoryDrill) {
  return {
    // These are LOCKED by the drill
    distance: drill.distances[0],
    shots: drill.rounds,
    position: drill.positions[0],
    targetType: drill.targetType,
    
    // Drill metadata
    drillId: drill.id,
    drillName: drill.name,
    drillType: drill.type,
    
    // Time limits
    timeLimit: drill.totalTimeLimit,
    parTime: drill.parTime,
    
    // Instructions to show
    instructions: drill.instructions,
    
    // What to track
    primaryMetric: drill.primaryMetric,
    trackDispersion: drill.primaryMetric === 'dispersion',
    trackTime: drill.primaryMetric === 'time' || drill.totalTimeLimit !== null,
    trackHits: drill.primaryMetric === 'hits' || drill.primaryMetric === 'accuracy',
  };
}


