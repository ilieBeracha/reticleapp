/**
 * Standards Service
 * 
 * CRUD operations for team standards and modifiers.
 * This is the data layer - no business logic here.
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamStandard {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  drill_goal: 'grouping' | 'engagement';
  distance_m: number;
  weapon_category: string | null;
  // Primary metric determines PASS/FAIL (must match drill_goal)
  primary_metric: 'grouping_cm' | 'accuracy_pct';
  expected_grouping_cm: number | null;
  expected_accuracy_pct: number | null;
  expected_time_seconds: number | null; // Secondary constraint, not primary
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface StandardModifier {
  id: string;
  team_id: string;
  condition_type: ModifierConditionType;
  condition_threshold: Record<string, number | string | boolean>;
  // How this modifier affects the verdict
  // tolerance: adjusts expected values (default)
  // invalidate: marks drill as invalid (no verdict)
  // override: forces FAIL regardless of performance
  modifier_effect_type: 'tolerance' | 'invalidate' | 'override';
  grouping_penalty_cm: number;
  accuracy_penalty_pct: number;
  time_penalty_seconds: number;
  name: string;
  description: string | null;
  icon: string | null;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
}

export type ModifierConditionType = 
  | 'weather_rain'
  | 'weather_wind'
  | 'weather_cold'
  | 'weather_hot'
  | 'fatigue_shots'
  | 'fatigue_time'
  | 'fatigue_hr'
  | 'night_conditions'
  | 'elevation_high'
  | 'manual'; // Commander-marked condition

export interface CreateStandardInput {
  team_id: string;
  name: string;
  description?: string;
  drill_goal: 'grouping' | 'engagement';
  distance_m: number;
  weapon_category?: string | null;
  // primary_metric is auto-derived from drill_goal in service layer
  expected_grouping_cm?: number | null;
  expected_accuracy_pct?: number | null;
  expected_time_seconds?: number | null;
}

export interface CreateModifierInput {
  team_id: string;
  condition_type: ModifierConditionType;
  condition_threshold: Record<string, number | string | boolean>;
  modifier_effect_type?: 'tolerance' | 'invalidate' | 'override';
  grouping_penalty_cm?: number;
  accuracy_penalty_pct?: number;
  time_penalty_seconds?: number;
  name: string;
  description?: string;
  icon?: string;
}

// ============================================================================
// STANDARDS CRUD
// ============================================================================

/**
 * Get all active standards for a team
 */
export async function getTeamStandards(teamId: string): Promise<TeamStandard[]> {
  const { data, error } = await supabase
    .from('team_standards')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('distance_m')
    .order('drill_goal');

  if (error) {
    console.error('[StandardsService] Failed to fetch standards:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get a single standard by ID
 */
export async function getStandardById(standardId: string): Promise<TeamStandard | null> {
  const { data, error } = await supabase
    .from('team_standards')
    .select('*')
    .eq('id', standardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return data;
}

/**
 * Create a new standard
 */
export async function createStandard(input: CreateStandardInput): Promise<TeamStandard> {
  const { data: { user } } = await supabase.auth.getUser();

  // Auto-derive primary_metric from drill_goal (enforced at DB level too)
  const primary_metric = input.drill_goal === 'grouping' ? 'grouping_cm' : 'accuracy_pct';

  const { data, error } = await supabase
    .from('team_standards')
    .insert({
      ...input,
      primary_metric,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[StandardsService] Failed to create standard:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a standard
 */
export async function updateStandard(
  standardId: string,
  updates: Partial<CreateStandardInput>
): Promise<TeamStandard> {
  const { data, error } = await supabase
    .from('team_standards')
    .update(updates)
    .eq('id', standardId)
    .select()
    .single();

  if (error) {
    console.error('[StandardsService] Failed to update standard:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Soft delete a standard (set is_active = false)
 */
export async function deleteStandard(standardId: string): Promise<void> {
  const { error } = await supabase
    .from('team_standards')
    .update({ is_active: false })
    .eq('id', standardId);

  if (error) {
    console.error('[StandardsService] Failed to delete standard:', error);
    throw new Error(error.message);
  }
}

// ============================================================================
// MODIFIERS CRUD
// ============================================================================

/**
 * Get all active modifiers for a team
 */
export async function getTeamModifiers(teamId: string): Promise<StandardModifier[]> {
  const { data, error } = await supabase
    .from('team_standard_modifiers')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('condition_type');

  if (error) {
    console.error('[StandardsService] Failed to fetch modifiers:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Create a new modifier
 */
export async function createModifier(input: CreateModifierInput): Promise<StandardModifier> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('team_standard_modifiers')
    .insert({
      ...input,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[StandardsService] Failed to create modifier:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a modifier
 */
export async function updateModifier(
  modifierId: string,
  updates: Partial<CreateModifierInput>
): Promise<StandardModifier> {
  const { data, error } = await supabase
    .from('team_standard_modifiers')
    .update(updates)
    .eq('id', modifierId)
    .select()
    .single();

  if (error) {
    console.error('[StandardsService] Failed to update modifier:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Soft delete a modifier
 */
export async function deleteModifier(modifierId: string): Promise<void> {
  const { error } = await supabase
    .from('team_standard_modifiers')
    .update({ is_active: false })
    .eq('id', modifierId);

  if (error) {
    console.error('[StandardsService] Failed to delete modifier:', error);
    throw new Error(error.message);
  }
}

// ============================================================================
// VERDICT QUERIES
// ============================================================================

export interface SessionVerdict {
  id: string;
  session_id: string;
  // Evaluation scope (for future per-drill or per-target verdicts)
  evaluation_scope: 'session' | 'drill' | 'target';
  scope_ref_id: string | null; // Reference to drill_id or target_id
  base_standard_id: string | null;
  applied_modifiers: AppliedModifier[];
  effective_grouping_cm: number | null;
  effective_accuracy_pct: number | null;
  effective_time_seconds: number | null;
  actual_grouping_cm: number | null;
  actual_accuracy_pct: number | null;
  actual_time_seconds: number | null;
  passed: boolean;
  verdict_breakdown: VerdictBreakdown;
  created_at: string;
}

export interface AppliedModifier {
  id: string;
  name: string;
  description: string | null;
  effect_type: 'tolerance' | 'invalidate' | 'override';
  grouping_penalty_cm: number;
  accuracy_penalty_pct: number;
  time_penalty_seconds: number;
}

export interface VerdictBreakdown {
  base?: {
    name: string;
    expected_grouping_cm?: number;
    expected_accuracy_pct?: number;
    expected_time_seconds?: number;
  };
  modifiers: AppliedModifier[];
  calculation: string;
  comparison: string;
}

/**
 * Get verdict for a session
 */
export async function getSessionVerdict(sessionId: string): Promise<SessionVerdict | null> {
  const { data, error } = await supabase
    .from('session_standards_verdicts')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get verdicts for multiple sessions (for reports)
 */
export async function getSessionVerdicts(sessionIds: string[]): Promise<SessionVerdict[]> {
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('session_standards_verdicts')
    .select('*')
    .in('session_id', sessionIds);

  if (error) {
    console.error('[StandardsService] Failed to fetch verdicts:', error);
    throw new Error(error.message);
  }

  return data || [];
}
