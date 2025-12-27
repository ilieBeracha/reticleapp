/**
 * DRILL SERVICE - SIMPLIFIED
 *
 * Essential drill CRUD operations only.
 * Drills have 6 core properties: name, goal, target_type, distance, shots, time_limit
 */

import { supabase } from '@/lib/supabase';
import type { CreateDrillInput, Drill, DrillInstanceConfig } from '@/types/workspace';
import type { DrillTemplate } from '@/types/drillTypes';

// =====================================================
// DRILL CRUD
// =====================================================

/**
 * Get all drills for a team
 */
export async function getTeamDrills(teamId: string): Promise<Drill[]> {
  const { data, error } = await supabase
    .from('drill_templates')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch drills:', error);
    throw new Error(error.message || 'Failed to fetch drills');
  }

  return (data || []) as Drill[];
}

/**
 * Get personal drills for the current user (team_id is null)
 * These are drills saved from solo practice sessions.
 */
export async function getPersonalDrills(): Promise<Drill[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .select('*')
    .is('team_id', null)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch personal drills:', error);
    throw new Error(error.message || 'Failed to fetch personal drills');
  }

  return (data || []) as Drill[];
}

/**
 * Get a single drill by ID
 */
export async function getDrill(drillId: string): Promise<Drill | null> {
  const { data, error } = await supabase
    .from('drill_templates')
    .select('*')
    .eq('id', drillId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Failed to fetch drill:', error);
    throw new Error(error.message || 'Failed to fetch drill');
  }

  return data as Drill;
}

/**
 * Create a new drill - SIMPLIFIED (6 essential fields)
 */
export async function createDrill(teamId: string, input: CreateDrillInput): Promise<Drill> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .insert({
      team_id: teamId,
      created_by: user.id,

      // === ESSENTIAL FIELDS ===
      name: input.name,
      description: input.description || null,
      drill_goal: input.drill_goal,
      target_type: input.target_type,
      distance_m: input.distance_m,
      rounds_per_shooter: input.rounds_per_shooter,
      time_limit_seconds: input.time_limit_seconds || null,
      strings_count: input.strings_count || 1,

      // Legacy fields (same values for backwards compatibility)
      default_distance_m: input.distance_m,
      default_rounds_per_shooter: input.rounds_per_shooter,
      default_time_limit_seconds: input.time_limit_seconds || null,
      default_strings_count: input.strings_count || 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create drill:', error);
    throw new Error(error.message || 'Failed to create drill');
  }

  return data as Drill;
}

/**
 * Create a personal drill (team_id = null, user_id = current user)
 * Used when saving drills from solo practice sessions.
 */
export async function createPersonalDrill(input: CreateDrillInput): Promise<Drill> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .insert({
      team_id: null, // Personal drill
      user_id: user.id, // Owner
      created_by: user.id,

      // === ESSENTIAL FIELDS ===
      name: input.name,
      description: input.description || null,
      drill_goal: input.drill_goal,
      target_type: input.target_type,
      distance_m: input.distance_m,
      rounds_per_shooter: input.rounds_per_shooter,
      time_limit_seconds: input.time_limit_seconds || null,
      strings_count: input.strings_count || 1,

      // Legacy fields (same values for backwards compatibility)
      default_distance_m: input.distance_m,
      default_rounds_per_shooter: input.rounds_per_shooter,
      default_time_limit_seconds: input.time_limit_seconds || null,
      default_strings_count: input.strings_count || 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create personal drill:', error);
    throw new Error(error.message || 'Failed to create personal drill');
  }

  return data as Drill;
}

/**
 * Save a session's inline drill_config as a personal template.
 * Used after a session ends when user chooses to save the custom drill.
 */
export async function saveSessionDrillAsTemplate(
  drillConfig: {
    name: string;
    drill_goal: 'grouping' | 'achievement';
    target_type: 'paper' | 'tactical';
    distance_m: number;
    rounds_per_shooter: number;
    time_limit_seconds?: number | null;
    strings_count?: number | null;
  },
  customName?: string
): Promise<Drill> {
  return createPersonalDrill({
    name: customName || drillConfig.name,
    drill_goal: drillConfig.drill_goal,
    target_type: drillConfig.target_type,
    distance_m: drillConfig.distance_m,
    rounds_per_shooter: drillConfig.rounds_per_shooter,
    time_limit_seconds: drillConfig.time_limit_seconds ?? undefined,
    strings_count: drillConfig.strings_count ?? 1,
  });
}

/**
 * Update a drill
 */
export async function updateDrill(drillId: string, updates: Partial<CreateDrillInput>): Promise<Drill> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Essential fields
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.drill_goal !== undefined) updateData.drill_goal = updates.drill_goal;
  if (updates.target_type !== undefined) updateData.target_type = updates.target_type;

  if (updates.distance_m !== undefined) {
    updateData.distance_m = updates.distance_m;
    updateData.default_distance_m = updates.distance_m;
  }
  if (updates.rounds_per_shooter !== undefined) {
    updateData.rounds_per_shooter = updates.rounds_per_shooter;
    updateData.default_rounds_per_shooter = updates.rounds_per_shooter;
  }
  if (updates.time_limit_seconds !== undefined) {
    updateData.time_limit_seconds = updates.time_limit_seconds;
    updateData.default_time_limit_seconds = updates.time_limit_seconds;
  }
  if (updates.strings_count !== undefined) {
    updateData.strings_count = updates.strings_count;
    updateData.default_strings_count = updates.strings_count;
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .update(updateData)
    .eq('id', drillId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update drill:', error);
    throw new Error(error.message || 'Failed to update drill');
  }

  return data as Drill;
}

/**
 * Delete a drill
 */
export async function deleteDrill(drillId: string): Promise<void> {
  const { error } = await supabase.from('drill_templates').delete().eq('id', drillId);

  if (error) {
    console.error('Failed to delete drill:', error);
    throw new Error(error.message || 'Failed to delete drill');
  }
}

// =====================================================
// INSTANCE HELPERS
// =====================================================

/**
 * Get default instance config from a drill
 */
export function getDefaultInstanceConfig(drill: Drill): DrillInstanceConfig {
  return {
    distance_m: drill.distance_m,
    rounds_per_shooter: drill.rounds_per_shooter,
    time_limit_seconds: drill.time_limit_seconds,
    strings_count: drill.strings_count || 1,
  };
}

/**
 * Convert a Drill to CreateTrainingDrillInput for use in training creation.
 * Optionally override instance values with provided config.
 */
export function drillToTrainingInput(
  drill: Drill,
  instanceConfig?: Partial<DrillInstanceConfig>
): import('@/types/workspace').CreateTrainingDrillInput {
  // Determine input_method: from config, or derive from drill goal
  // Grouping drills are always scan, achievement defaults to manual unless specified
  const inputMethod = instanceConfig?.input_method 
    ?? (drill.drill_goal === 'grouping' ? 'scan' : 'manual');

  return {
    // Reference to source drill
    drill_id: drill.id,

    // Core drill data
    name: drill.name,
    drill_goal: drill.drill_goal,
    target_type: drill.target_type,
    description: drill.description || undefined,

    // Entry method (commander's choice)
    input_method: inputMethod,

    // Instance configuration (use overrides or drill defaults)
    distance_m: instanceConfig?.distance_m ?? drill.distance_m,
    rounds_per_shooter: instanceConfig?.rounds_per_shooter ?? drill.rounds_per_shooter,
    time_limit_seconds: instanceConfig?.time_limit_seconds ?? drill.time_limit_seconds ?? undefined,
    strings_count: instanceConfig?.strings_count ?? drill.strings_count ?? 1,
  };
}

// =====================================================
// TEMPLATE DUPLICATION
// =====================================================

/**
 * Duplicate a library template to a team's drill collection
 */
export async function duplicateTemplateToTeam(
  template: DrillTemplate,
  teamId: string,
  customName?: string
): Promise<Drill> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Map drill type to goal
  const drillGoal: 'grouping' | 'achievement' =
    template.drillType === 'zeroing' || template.drillType === 'grouping'
      ? 'grouping'
      : 'achievement';

  // Map drill type to target type
  const targetType: 'paper' | 'tactical' =
    template.drillType === 'timed' ? 'tactical' : 'paper';

  const { data, error } = await supabase
    .from('drill_templates')
    .insert({
      team_id: teamId,
      created_by: user.id,

      // Use custom name or append "(Copy)" to original
      name: customName || `${template.name}`,
      description: template.description,
      drill_goal: drillGoal,
      target_type: targetType,

      // Instance defaults from template
      distance_m: (template.defaults.distance as number) || 25,
      rounds_per_shooter: (template.defaults.shots as number) || 5,
      time_limit_seconds: (template.defaults.timeLimit as number) || null,
      strings_count: (template.defaults.strings as number) || 1,

      // Legacy fields
      default_distance_m: (template.defaults.distance as number) || 25,
      default_rounds_per_shooter: (template.defaults.shots as number) || 5,
      default_time_limit_seconds: (template.defaults.timeLimit as number) || null,
      default_strings_count: (template.defaults.strings as number) || 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to duplicate template:', error);
    throw new Error(error.message || 'Failed to duplicate template');
  }

  return data as Drill;
}
