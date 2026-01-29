/**
 * Standards Engine
 * 
 * The DETERMINISTIC core of the standards system.
 * 
 * RULE: This engine decides PASS/FAIL based on rules alone.
 *       AI/ML NEVER touches this code or its outputs.
 *       AI can only advise, explain, and compare - never judge.
 */

import { supabase } from '@/services/supabase';
import type { 
  TeamStandard, 
  StandardModifier, 
  AppliedModifier, 
  VerdictBreakdown,
  SessionVerdict 
} from './standardsService';
import { getTeamStandards, getTeamModifiers } from './standardsService';

// ============================================================================
// SESSION CONTEXT (Input to the engine)
// ============================================================================

export interface SessionContext {
  // Session identity
  session_id: string;
  team_id: string | null;
  
  // Drill configuration
  drill_goal: 'grouping' | 'engagement';
  distance_m: number;
  weapon_category: string | null; // 'rifle' | 'pistol' | 'shotgun'
  
  // Session metrics
  shots_fired: number;
  duration_seconds: number;
  
  // Weather conditions (from OpenWeather)
  weather_condition: string | null; // 'rain', 'clear', 'clouds', etc.
  wind_speed_kmh: number;
  temp_c: number;
  
  // Biometrics (from watch, optional)
  avg_heart_rate?: number;
  max_heart_rate?: number;
  
  // Actual results to evaluate
  actual_grouping_cm?: number;
  actual_accuracy_pct?: number;
  actual_time_seconds?: number;
}

// ============================================================================
// VERDICT RESULT (Output from the engine)
// ============================================================================

export interface StandardsVerdictResult {
  // Matching standard (null if none found)
  base_standard: TeamStandard | null;
  
  // Modifiers that were triggered
  applied_modifiers: AppliedModifier[];
  
  // Calculated effective thresholds
  effective_grouping_cm: number | null;
  effective_accuracy_pct: number | null;
  effective_time_seconds: number | null;
  
  // Actual values
  actual_grouping_cm: number | null;
  actual_accuracy_pct: number | null;
  actual_time_seconds: number | null;
  
  // THE VERDICT
  passed: boolean;
  
  // Special states (from modifier effects)
  invalidated: boolean; // Drill marked invalid, no verdict
  overridden: boolean;  // Verdict forced to FAIL
  
  // Explanation
  verdict_breakdown: VerdictBreakdown;
  
  // Meta
  no_standard_found: boolean;
}

// ============================================================================
// CORE ENGINE FUNCTIONS
// ============================================================================

/**
 * Find the best matching standard for this session
 */
function findMatchingStandard(
  standards: TeamStandard[],
  context: SessionContext
): TeamStandard | null {
  // Priority: exact match on all fields > partial match
  
  // First: exact match (goal + distance + weapon)
  const exactMatch = standards.find(s => 
    s.drill_goal === context.drill_goal &&
    s.distance_m === context.distance_m &&
    s.weapon_category === context.weapon_category
  );
  if (exactMatch) return exactMatch;
  
  // Second: match with weapon_category = null (any weapon)
  const anyWeaponMatch = standards.find(s =>
    s.drill_goal === context.drill_goal &&
    s.distance_m === context.distance_m &&
    s.weapon_category === null
  );
  if (anyWeaponMatch) return anyWeaponMatch;
  
  // No match
  return null;
}

/**
 * Check if a modifier's condition is met
 */
function checkModifierCondition(
  modifier: StandardModifier,
  context: SessionContext
): boolean {
  const threshold = modifier.condition_threshold;
  
  switch (modifier.condition_type) {
    case 'weather_rain':
      // Triggers if weather contains 'rain'
      return context.weather_condition?.toLowerCase().includes('rain') ?? false;
      
    case 'weather_wind':
      // Triggers if wind exceeds threshold
      const windThreshold = threshold.wind_kmh_gt as number ?? 15;
      return context.wind_speed_kmh > windThreshold;
      
    case 'weather_cold':
      // Triggers if temp below threshold
      const coldThreshold = threshold.temp_c_lt as number ?? 5;
      return context.temp_c < coldThreshold;
      
    case 'weather_hot':
      // Triggers if temp above threshold
      const hotThreshold = threshold.temp_c_gt as number ?? 35;
      return context.temp_c > hotThreshold;
      
    case 'fatigue_shots':
      // Triggers if shots fired exceed threshold
      const shotsThreshold = threshold.shots_gt as number ?? 50;
      return context.shots_fired > shotsThreshold;
      
    case 'fatigue_time':
      // Triggers if duration exceeds threshold (in minutes)
      const minutesThreshold = threshold.duration_minutes_gt as number ?? 30;
      return (context.duration_seconds / 60) > minutesThreshold;
      
    case 'fatigue_hr':
      // Triggers if average heart rate exceeds threshold
      const hrThreshold = threshold.hr_bpm_gt as number ?? 140;
      return (context.avg_heart_rate ?? 0) > hrThreshold;
      
    case 'night_conditions':
      // Would need time-of-day data; for now always false
      return false;
      
    case 'elevation_high':
      // Would need elevation data; for now always false
      return false;
      
    default:
      return false;
  }
}

/**
 * Build the human-readable calculation string
 */
function buildCalculationString(
  base: TeamStandard,
  appliedModifiers: AppliedModifier[],
  drillGoal: 'grouping' | 'engagement'
): string {
  if (drillGoal === 'grouping') {
    const baseValue = base.expected_grouping_cm ?? 0;
    const penalties = appliedModifiers.map(m => m.grouping_penalty_cm);
    
    if (penalties.length === 0) {
      return `${baseValue}cm (no modifiers)`;
    }
    
    const total = baseValue + penalties.reduce((a, b) => a + b, 0);
    const parts = [`${baseValue}cm`];
    appliedModifiers.forEach(m => {
      parts.push(`+ ${m.grouping_penalty_cm}cm (${m.name})`);
    });
    parts.push(`= ${total}cm`);
    
    return parts.join(' ');
  } else {
    const baseValue = base.expected_accuracy_pct ?? 0;
    const penalties = appliedModifiers.map(m => m.accuracy_penalty_pct);
    
    if (penalties.length === 0) {
      return `${baseValue}% (no modifiers)`;
    }
    
    const total = Math.max(0, baseValue - penalties.reduce((a, b) => a + b, 0));
    const parts = [`${baseValue}%`];
    appliedModifiers.forEach(m => {
      parts.push(`- ${m.accuracy_penalty_pct}% (${m.name})`);
    });
    parts.push(`= ${total}%`);
    
    return parts.join(' ');
  }
}

/**
 * Build the comparison string (actual vs expected)
 */
function buildComparisonString(
  actual: number | undefined,
  effective: number | null,
  drillGoal: 'grouping' | 'engagement',
  passed: boolean
): string {
  if (actual === undefined || effective === null) {
    return 'No comparison available';
  }
  
  const symbol = passed ? '✓' : '✗';
  
  if (drillGoal === 'grouping') {
    // Lower is better
    const comparison = actual <= effective ? '<=' : '>';
    return `${actual}cm ${comparison} ${effective}cm ${symbol}`;
  } else {
    // Higher is better
    const comparison = actual >= effective ? '>=' : '<';
    return `${actual}% ${comparison} ${effective}% ${symbol}`;
  }
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Calculate the verdict for a session
 * 
 * This is the CORE function. It is:
 * - Deterministic
 * - Rule-based
 * - Explainable
 * - NEVER influenced by AI/ML
 */
export function calculateVerdict(
  standards: TeamStandard[],
  modifiers: StandardModifier[],
  context: SessionContext
): StandardsVerdictResult {
  // 1. Find matching standard
  const baseStandard = findMatchingStandard(standards, context);
  
  // No standard found → no evaluation (implicit pass, flagged as no_standard_found)
  if (!baseStandard) {
    return {
      base_standard: null,
      applied_modifiers: [],
      effective_grouping_cm: null,
      effective_accuracy_pct: null,
      effective_time_seconds: null,
      actual_grouping_cm: context.actual_grouping_cm ?? null,
      actual_accuracy_pct: context.actual_accuracy_pct ?? null,
      actual_time_seconds: context.actual_time_seconds ?? null,
      passed: true, // No standard = no fail (but flagged)
      invalidated: false,
      overridden: false,
      verdict_breakdown: {
        modifiers: [],
        calculation: 'No matching standard found',
        comparison: 'No evaluation performed',
      },
      no_standard_found: true,
    };
  }
  
  // 2. Determine which modifiers apply
  const appliedModifiers: AppliedModifier[] = modifiers
    .filter(m => checkModifierCondition(m, context))
    .map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      effect_type: m.modifier_effect_type,
      grouping_penalty_cm: m.grouping_penalty_cm,
      accuracy_penalty_pct: m.accuracy_penalty_pct,
      time_penalty_seconds: m.time_penalty_seconds,
    }));
  
  // 2b. Check for special effect types
  const invalidatingModifier = appliedModifiers.find(m => m.effect_type === 'invalidate');
  const overrideModifier = appliedModifiers.find(m => m.effect_type === 'override');
  
  // If invalidated, no verdict is possible
  if (invalidatingModifier) {
    return {
      base_standard: baseStandard,
      applied_modifiers: appliedModifiers,
      effective_grouping_cm: null,
      effective_accuracy_pct: null,
      effective_time_seconds: null,
      actual_grouping_cm: context.actual_grouping_cm ?? null,
      actual_accuracy_pct: context.actual_accuracy_pct ?? null,
      actual_time_seconds: context.actual_time_seconds ?? null,
      passed: false, // Not really pass/fail, but must be boolean
      invalidated: true,
      overridden: false,
      verdict_breakdown: {
        base: {
          name: baseStandard.name,
          expected_grouping_cm: baseStandard.expected_grouping_cm ?? undefined,
          expected_accuracy_pct: baseStandard.expected_accuracy_pct ?? undefined,
          expected_time_seconds: baseStandard.expected_time_seconds ?? undefined,
        },
        modifiers: appliedModifiers,
        calculation: 'Drill invalidated',
        comparison: `Invalidated by: ${invalidatingModifier.name}`,
      },
      no_standard_found: false,
    };
  }
  
  // 3. Calculate effective thresholds (only for tolerance modifiers)
  const toleranceModifiers = appliedModifiers.filter(m => m.effect_type === 'tolerance');
  const totalGroupingPenalty = toleranceModifiers.reduce((sum, m) => sum + m.grouping_penalty_cm, 0);
  const totalAccuracyPenalty = toleranceModifiers.reduce((sum, m) => sum + m.accuracy_penalty_pct, 0);
  const totalTimePenalty = toleranceModifiers.reduce((sum, m) => sum + m.time_penalty_seconds, 0);
  
  const effectiveGrouping = baseStandard.expected_grouping_cm !== null
    ? baseStandard.expected_grouping_cm + totalGroupingPenalty
    : null;
    
  const effectiveAccuracy = baseStandard.expected_accuracy_pct !== null
    ? Math.max(0, baseStandard.expected_accuracy_pct - totalAccuracyPenalty)
    : null;
    
  const effectiveTime = baseStandard.expected_time_seconds !== null
    ? baseStandard.expected_time_seconds + totalTimePenalty
    : null;
  
  // 4. Evaluate pass/fail (THE VERDICT)
  let passed = true;
  let overridden = false;
  
  // Check for override modifier (forces FAIL)
  if (overrideModifier) {
    passed = false;
    overridden = true;
  } else {
    // Normal evaluation based on primary metric
    // Grouping: lower is better, must be <= expected
    if (effectiveGrouping !== null && context.actual_grouping_cm !== undefined) {
      if (context.actual_grouping_cm > effectiveGrouping) {
        passed = false;
      }
    }
    
    // Accuracy: higher is better, must be >= expected
    if (effectiveAccuracy !== null && context.actual_accuracy_pct !== undefined) {
      if (context.actual_accuracy_pct < effectiveAccuracy) {
        passed = false;
      }
    }
    
    // Time: secondary constraint (only fails if exceeded, doesn't override primary)
    // Time is a constraint, not the primary metric
    if (effectiveTime !== null && context.actual_time_seconds !== undefined) {
      if (context.actual_time_seconds > effectiveTime) {
        passed = false;
      }
    }
  }
  
  // 5. Build explanation
  const calculation = buildCalculationString(baseStandard, appliedModifiers, context.drill_goal);
  
  const primaryActual = context.drill_goal === 'grouping' 
    ? context.actual_grouping_cm 
    : context.actual_accuracy_pct;
  const primaryEffective = context.drill_goal === 'grouping'
    ? effectiveGrouping
    : effectiveAccuracy;
    
  const comparison = buildComparisonString(primaryActual, primaryEffective, context.drill_goal, passed);
  
  const verdictBreakdown: VerdictBreakdown = {
    base: {
      name: baseStandard.name,
      expected_grouping_cm: baseStandard.expected_grouping_cm ?? undefined,
      expected_accuracy_pct: baseStandard.expected_accuracy_pct ?? undefined,
      expected_time_seconds: baseStandard.expected_time_seconds ?? undefined,
    },
    modifiers: appliedModifiers,
    calculation,
    comparison,
  };
  
  // Add override info to comparison if applicable
  if (overridden && overrideModifier) {
    verdictBreakdown.comparison = `Overridden to FAIL by: ${overrideModifier.name}`;
  }
  
  return {
    base_standard: baseStandard,
    applied_modifiers: appliedModifiers,
    effective_grouping_cm: effectiveGrouping,
    effective_accuracy_pct: effectiveAccuracy,
    effective_time_seconds: effectiveTime,
    actual_grouping_cm: context.actual_grouping_cm ?? null,
    actual_accuracy_pct: context.actual_accuracy_pct ?? null,
    actual_time_seconds: context.actual_time_seconds ?? null,
    passed,
    invalidated: false,
    overridden,
    verdict_breakdown: verdictBreakdown,
    no_standard_found: false,
  };
}

// ============================================================================
// HIGH-LEVEL API
// ============================================================================

/**
 * Evaluate a session and store the verdict
 * 
 * Call this when a session is completed.
 */
export async function evaluateAndStoreVerdict(
  context: SessionContext
): Promise<StandardsVerdictResult | null> {
  // Only evaluate team sessions
  if (!context.team_id) {
    return null;
  }
  
  // Fetch standards and modifiers for this team
  const [standards, modifiers] = await Promise.all([
    getTeamStandards(context.team_id),
    getTeamModifiers(context.team_id),
  ]);
  
  // Calculate verdict
  const result = calculateVerdict(standards, modifiers, context);
  
  // Don't store verdict if invalidated
  if (result.invalidated) {
    return result;
  }
  
  // Store in database (even if no_standard_found, for tracking)
  const { error } = await supabase
    .from('session_standards_verdicts')
    .upsert({
      session_id: context.session_id,
      evaluation_scope: 'session', // v1: always session-level
      scope_ref_id: null,
      base_standard_id: result.base_standard?.id ?? null,
      applied_modifiers: result.applied_modifiers,
      effective_grouping_cm: result.effective_grouping_cm,
      effective_accuracy_pct: result.effective_accuracy_pct,
      effective_time_seconds: result.effective_time_seconds,
      actual_grouping_cm: result.actual_grouping_cm,
      actual_accuracy_pct: result.actual_accuracy_pct,
      actual_time_seconds: result.actual_time_seconds,
      passed: result.passed,
      verdict_breakdown: result.verdict_breakdown,
    }, {
      onConflict: 'session_id,evaluation_scope,scope_ref_id',
    });
  
  if (error) {
    console.error('[StandardsEngine] Failed to store verdict:', error);
    // Don't throw - verdict storage failure shouldn't break session completion
  }
  
  return result;
}

/**
 * Helper: Build session context from session data
 * 
 * Call this with your session object to create the context.
 */
export function buildSessionContext(session: {
  id: string;
  team_id?: string | null;
  drill_config?: {
    drill_goal?: string;
    distance_m?: number;
  };
  weapon?: {
    category?: string;
  };
  weather?: {
    conditions?: string;
    wind_speed_kmh?: number;
    temp_c?: number;
  };
  shots_fired?: number;
  started_at?: string;
  ended_at?: string;
  biometrics?: {
    avg_hr?: number;
    max_hr?: number;
  };
  paper_results?: Array<{
    grouping_cm?: number;
  }>;
  // For engagement drills
  hits?: number;
  total_shots?: number;
}): SessionContext {
  // Calculate duration
  let durationSeconds = 0;
  if (session.started_at && session.ended_at) {
    durationSeconds = Math.round(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
    );
  }
  
  // Calculate accuracy for engagement drills
  let actualAccuracy: number | undefined;
  if (session.hits !== undefined && session.total_shots && session.total_shots > 0) {
    actualAccuracy = Math.round((session.hits / session.total_shots) * 100);
  }
  
  // Get grouping from paper results
  const actualGrouping = session.paper_results?.[0]?.grouping_cm;
  
  return {
    session_id: session.id,
    team_id: session.team_id ?? null,
    drill_goal: (session.drill_config?.drill_goal as 'grouping' | 'engagement') || 'grouping',
    distance_m: session.drill_config?.distance_m ?? 100,
    weapon_category: session.weapon?.category ?? null,
    shots_fired: session.shots_fired ?? 0,
    duration_seconds: durationSeconds,
    weather_condition: session.weather?.conditions ?? null,
    wind_speed_kmh: session.weather?.wind_speed_kmh ?? 0,
    temp_c: session.weather?.temp_c ?? 20,
    avg_heart_rate: session.biometrics?.avg_hr,
    max_heart_rate: session.biometrics?.max_hr,
    actual_grouping_cm: actualGrouping,
    actual_accuracy_pct: actualAccuracy,
    actual_time_seconds: durationSeconds,
  };
}
