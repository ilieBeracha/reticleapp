/**
 * presetService - Personal drill presets (saved configurations)
 * 
 * Personal presets are stored in drill_templates with owner_type='user'
 * They allow users to save their favorite drill configurations for quick access.
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface DrillPreset {
  id: string;
  name: string;
  description?: string | null;
  drill_goal: 'grouping' | 'achievement';
  target_type: 'paper' | 'tactical';
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  strings_count?: number | null;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePresetInput {
  name: string;
  description?: string;
  drill_goal: 'grouping' | 'achievement';
  target_type: 'paper' | 'tactical';
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  strings_count?: number | null;
}

export interface UpdatePresetInput {
  name?: string;
  description?: string | null;
  drill_goal?: 'grouping' | 'achievement';
  target_type?: 'paper' | 'tactical';
  distance_m?: number;
  rounds_per_shooter?: number;
  time_limit_seconds?: number | null;
  strings_count?: number | null;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all personal presets for the current user
 */
export async function getMyPresets(): Promise<DrillPreset[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .select(`
      id,
      name,
      description,
      drill_goal,
      target_type,
      distance_m,
      rounds_per_shooter,
      time_limit_seconds,
      strings_count,
      is_default,
      created_at,
      updated_at
    `)
    .eq('owner_type', 'user')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[presetService] Error fetching presets:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single preset by ID
 */
export async function getPreset(presetId: string): Promise<DrillPreset | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .select(`
      id,
      name,
      description,
      drill_goal,
      target_type,
      distance_m,
      rounds_per_shooter,
      time_limit_seconds,
      strings_count,
      is_default,
      created_at,
      updated_at
    `)
    .eq('id', presetId)
    .eq('owner_type', 'user')
    .eq('owner_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('[presetService] Error fetching preset:', error);
    throw error;
  }

  return data;
}

/**
 * Get the Quick Start default drill (system default or user's custom default)
 */
export async function getDefaultPreset(): Promise<DrillPreset | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // First try to find user's custom default
  const { data: userDefault } = await supabase
    .from('drill_templates')
    .select(`
      id, name, description, drill_goal, target_type,
      distance_m, rounds_per_shooter, time_limit_seconds,
      strings_count, is_default, created_at, updated_at
    `)
    .eq('owner_type', 'user')
    .eq('owner_id', user.id)
    .eq('is_default', true)
    .single();

  if (userDefault) return userDefault;

  // Fall back to system default (hardcoded for now)
  return {
    id: 'quick-start-default',
    name: 'Quick Practice',
    description: 'Standard grouping drill at 25m',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 25,
    rounds_per_shooter: 5,
    time_limit_seconds: null,
    strings_count: 1,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new personal preset
 */
export async function createPreset(input: CreatePresetInput): Promise<DrillPreset> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .insert({
      owner_type: 'user',
      owner_id: user.id,
      created_by: user.id,
      team_id: null, // Personal presets have no team
      name: input.name,
      description: input.description || null,
      drill_goal: input.drill_goal,
      target_type: input.target_type,
      distance_m: input.distance_m,
      rounds_per_shooter: input.rounds_per_shooter,
      time_limit_seconds: input.time_limit_seconds || null,
      strings_count: input.strings_count || 1,
      is_default: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[presetService] Error creating preset:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing preset
 */
export async function updatePreset(presetId: string, input: UpdatePresetInput): Promise<DrillPreset> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', presetId)
    .eq('owner_type', 'user')
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[presetService] Error updating preset:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a preset
 */
export async function deletePreset(presetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('drill_templates')
    .delete()
    .eq('id', presetId)
    .eq('owner_type', 'user')
    .eq('owner_id', user.id);

  if (error) {
    console.error('[presetService] Error deleting preset:', error);
    throw error;
  }
}

/**
 * Set a preset as the user's default (for Quick Start)
 */
export async function setDefaultPreset(presetId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // First, unset any existing default
  await supabase
    .from('drill_templates')
    .update({ is_default: false })
    .eq('owner_type', 'user')
    .eq('owner_id', user.id)
    .eq('is_default', true);

  // Set the new default
  const { error } = await supabase
    .from('drill_templates')
    .update({ is_default: true })
    .eq('id', presetId)
    .eq('owner_type', 'user')
    .eq('owner_id', user.id);

  if (error) {
    console.error('[presetService] Error setting default preset:', error);
    throw error;
  }
}

/**
 * Save current drill config as a new preset
 */
export async function saveAsPreset(
  name: string,
  config: {
    drill_goal: 'grouping' | 'achievement';
    target_type: 'paper' | 'tactical';
    distance_m: number;
    rounds_per_shooter: number;
    time_limit_seconds?: number | null;
    strings_count?: number | null;
  }
): Promise<DrillPreset> {
  return createPreset({
    name,
    drill_goal: config.drill_goal,
    target_type: config.target_type,
    distance_m: config.distance_m,
    rounds_per_shooter: config.rounds_per_shooter,
    time_limit_seconds: config.time_limit_seconds,
    strings_count: config.strings_count,
  });
}

