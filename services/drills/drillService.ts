/**
 * DRILL SERVICE (Simplified Architecture)
 * 
 * Key concepts:
 * - Canonical Drills: Global, read-only execution patterns ("verbs")
 * - Team Presets: Saved configurations referencing canonical drills
 * - Training Instances: Config used in a specific training (not stored here)
 * 
 * "Drills are verbs. Presets are shortcuts. Standards are judgment."
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type DrillGoal = 'grouping' | 'engagement';
export type TargetType = 'paper' | 'tactical';
export type DrillCategory = 'zeroing' | 'grouping' | 'speed' | 'qualification';
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ShootingPosition = 'prone' | 'kneeling' | 'sitting' | 'standing';

/**
 * Canonical Drill - Global, read-only execution pattern
 */
export interface CanonicalDrill {
  id: string;
  name: string;
  description: string | null;
  drill_goal: DrillGoal;
  target_type: TargetType;
  default_shots: number;
  default_strings: number;
  supports_time: boolean;
  supports_position: boolean;
  allowed_distances: number[] | null;
  fixed_shots: boolean;
  category: DrillCategory | null;
  difficulty: DrillDifficulty | null;
  sort_order: number;
}

/**
 * Team Drill Preset - Saved configuration for a canonical drill
 */
export interface TeamDrillPreset {
  id: string;
  team_id: string;
  drill_id: string;
  label: string | null;
  distance_m: number | null;
  rounds: number | null;
  time_limit_seconds: number | null;
  position: ShootingPosition | null;
  strings_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  drill?: CanonicalDrill;
}

/**
 * Drill configuration for a training instance
 */
export interface DrillConfig {
  /** Distance in meters - null means soldier chooses */
  distance_m: number | null;
  /** Number of rounds - null means soldier chooses */
  rounds: number | null;
  time_limit_seconds?: number | null;
  position?: ShootingPosition | null;
  strings_count: number;
}

/**
 * Training drill item - what gets added to a training
 */
export interface TrainingDrillItem {
  id: string;                    // Instance ID
  drill_id: string;              // References canonical drill
  config: DrillConfig;
  preset_id?: string;            // If loaded from preset
  // Display helpers (computed from canonical drill)
  name?: string;
  description?: string | null;   // Drill explanation/purpose
  drill_goal?: DrillGoal;
  target_type?: TargetType;
  /**
   * Execution Policy - How strict must soldiers follow this drill config?
   * - 'locked': Must execute exactly as defined (qualification, assessment)
   * - 'guided': Defaults pre-filled, soldier may adjust (training)
   * - 'free': Drill is just a label, full freedom (open practice)
   * 
   * Default: 'locked' (commander intent is respected)
   */
  execution_policy?: 'locked' | 'guided' | 'free';
  /**
   * Engagement Mode - Commander's intent for how drill should be executed
   * - 'solo': Individual execution only (default for grouping)
   * - 'squad': Squad participation allowed (engagement only)
   * 
   * NOTE: For grouping drills, this MUST be 'solo' (enforced by canonical model)
   */
  engagement_mode?: 'solo' | 'squad';
}

// ============================================================================
// CANONICAL DRILLS (Read-Only)
// ============================================================================

/**
 * Get all canonical drills
 */
export async function getAllDrills(): Promise<CanonicalDrill[]> {
  const { data, error } = await supabase
    .from('drills')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[DrillService] Failed to fetch drills:', error);
    throw new Error(error.message);
  }

  return data as CanonicalDrill[];
}

/**
 * Get drills by category
 */
export async function getDrillsByCategory(category: DrillCategory): Promise<CanonicalDrill[]> {
  const { data, error } = await supabase
    .from('drills')
    .select('*')
    .eq('category', category)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[DrillService] Failed to fetch drills by category:', error);
    throw new Error(error.message);
  }

  return data as CanonicalDrill[];
}

/**
 * Get a single drill by ID
 */
export async function getDrill(drillId: string): Promise<CanonicalDrill | null> {
  const { data, error } = await supabase
    .from('drills')
    .select('*')
    .eq('id', drillId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[DrillService] Failed to fetch drill:', error);
    throw new Error(error.message);
  }

  return data as CanonicalDrill;
}

/**
 * Get drills grouped by category (for UI)
 */
export async function getDrillsGroupedByCategory(): Promise<Record<DrillCategory, CanonicalDrill[]>> {
  const drills = await getAllDrills();
  
  const grouped: Record<DrillCategory, CanonicalDrill[]> = {
    zeroing: [],
    grouping: [],
    speed: [],
    qualification: [],
  };

  for (const drill of drills) {
    if (drill.category) {
      grouped[drill.category].push(drill);
    }
  }

  return grouped;
}

// ============================================================================
// TEAM PRESETS
// ============================================================================

/**
 * Get all presets for a team
 */
export async function getTeamPresets(teamId: string): Promise<TeamDrillPreset[]> {
  const { data, error } = await supabase
    .from('team_drill_presets')
    .select(`
      *,
      drill:drills(*)
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DrillService] Failed to fetch team presets:', error);
    throw new Error(error.message);
  }

  return data as TeamDrillPreset[];
}

/**
 * Get presets for a specific drill
 */
export async function getPresetsForDrill(teamId: string, drillId: string): Promise<TeamDrillPreset[]> {
  const { data, error } = await supabase
    .from('team_drill_presets')
    .select(`
      *,
      drill:drills(*)
    `)
    .eq('team_id', teamId)
    .eq('drill_id', drillId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DrillService] Failed to fetch presets for drill:', error);
    throw new Error(error.message);
  }

  return data as TeamDrillPreset[];
}

/**
 * Create a team preset
 */
export interface CreatePresetInput {
  team_id: string;
  drill_id: string;
  label?: string | null;
  distance_m?: number | null;
  rounds?: number | null;
  time_limit_seconds?: number | null;
  position?: ShootingPosition | null;
  strings_count?: number;
}

export async function createTeamPreset(input: CreatePresetInput): Promise<TeamDrillPreset> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('team_drill_presets')
    .insert({
      team_id: input.team_id,
      drill_id: input.drill_id,
      label: input.label || null,
      distance_m: input.distance_m || null,
      rounds: input.rounds || null,
      time_limit_seconds: input.time_limit_seconds || null,
      position: input.position || null,
      strings_count: input.strings_count || 1,
      created_by: userData.user.id,
    })
    .select(`
      *,
      drill:drills(*)
    `)
    .single();

  if (error) {
    console.error('[DrillService] Failed to create preset:', error);
    throw new Error(error.message);
  }

  return data as TeamDrillPreset;
}

/**
 * Update a team preset
 */
export async function updateTeamPreset(
  presetId: string, 
  updates: Partial<Omit<CreatePresetInput, 'team_id' | 'drill_id'>>
): Promise<TeamDrillPreset> {
  const { data, error } = await supabase
    .from('team_drill_presets')
    .update({
      label: updates.label,
      distance_m: updates.distance_m,
      rounds: updates.rounds,
      time_limit_seconds: updates.time_limit_seconds,
      position: updates.position,
      strings_count: updates.strings_count,
    })
    .eq('id', presetId)
    .select(`
      *,
      drill:drills(*)
    `)
    .single();

  if (error) {
    console.error('[DrillService] Failed to update preset:', error);
    throw new Error(error.message);
  }

  return data as TeamDrillPreset;
}

/**
 * Delete a team preset
 */
export async function deleteTeamPreset(presetId: string): Promise<void> {
  const { error } = await supabase
    .from('team_drill_presets')
    .delete()
    .eq('id', presetId);

  if (error) {
    console.error('[DrillService] Failed to delete preset:', error);
    throw new Error(error.message);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a training drill item from a canonical drill + config
 */
export function buildTrainingDrillItem(
  drill: CanonicalDrill,
  config: Partial<DrillConfig>,
  presetId?: string
): TrainingDrillItem {
  return {
    id: `drill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    drill_id: drill.id,
    config: {
      distance_m: config.distance_m ?? 100,
      rounds: config.rounds ?? drill.default_shots,
      time_limit_seconds: config.time_limit_seconds ?? null,
      position: config.position ?? null,
      strings_count: config.strings_count ?? drill.default_strings,
    },
    preset_id: presetId,
    // Display helpers
    name: drill.name,
    description: drill.description,
    drill_goal: drill.drill_goal,
    target_type: drill.target_type,
  };
}

/**
 * Build a training drill item from a preset
 */
export function buildTrainingDrillItemFromPreset(preset: TeamDrillPreset): TrainingDrillItem {
  if (!preset.drill) {
    throw new Error('Preset must include drill data');
  }

  return {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    drill_id: preset.drill_id,
    config: {
      distance_m: preset.distance_m ?? 100,
      rounds: preset.rounds ?? preset.drill.default_shots,
      time_limit_seconds: preset.time_limit_seconds ?? null,
      position: preset.position ?? null,
      strings_count: preset.strings_count ?? preset.drill.default_strings,
    },
    preset_id: preset.id,
    // Display helpers
    name: preset.label || preset.drill.name,
    description: preset.drill.description,
    drill_goal: preset.drill.drill_goal,
    target_type: preset.drill.target_type,
  };
}

/**
 * Get display name for a drill (uses preset label if available)
 */
export function getDrillDisplayName(
  drill: CanonicalDrill,
  preset?: TeamDrillPreset | null
): string {
  if (preset?.label) {
    return preset.label;
  }
  return drill.name;
}

/**
 * Validate config against drill constraints
 * Note: fixed_shots is enforced automatically by the UI, not validated as an error
 */
export function validateDrillConfig(
  drill: CanonicalDrill,
  config: Partial<DrillConfig>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check allowed distances
  if (drill.allowed_distances && config.distance_m) {
    if (!drill.allowed_distances.includes(config.distance_m)) {
      errors.push(`Distance must be one of: ${drill.allowed_distances.join(', ')}m`);
    }
  }

  // Check time support
  if (!drill.supports_time && config.time_limit_seconds) {
    errors.push('This drill does not support time limits');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
