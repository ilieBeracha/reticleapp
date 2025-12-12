/**
 * DRILL TEMPLATE SERVICE
 * Manages reusable drill templates for teams
 */

import { supabase } from '@/lib/supabase';
import type { CreateDrillTemplateInput, DrillTemplate } from '@/types/workspace';

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Get all drill templates for a team
 */
export async function getTeamDrillTemplates(teamId: string): Promise<DrillTemplate[]> {
  const { data, error } = await supabase
    .from('drill_templates')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch drill templates:', error);
    throw new Error(error.message || 'Failed to fetch drill templates');
  }

  return (data || []) as DrillTemplate[];
}

/**
 * Create a new drill template
 */
export async function createDrillTemplate(
  teamId: string,
  input: CreateDrillTemplateInput
): Promise<DrillTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('drill_templates')
    .insert({
      team_id: teamId,
      created_by: user.id,
      name: input.name,
      description: input.description || null,
      // === BASIC CONFIG ===
      target_type: input.target_type,
      distance_m: input.distance_m,
      rounds_per_shooter: input.rounds_per_shooter,

      // === TIMING ===
      time_limit_seconds: input.time_limit_seconds ?? null,
      par_time_seconds: input.par_time_seconds ?? null,

      // === SCORING ===
      scoring_mode: input.scoring_mode ?? null,
      min_accuracy_percent: input.min_accuracy_percent ?? null,
      points_per_hit: input.points_per_hit ?? null,
      penalty_per_miss: input.penalty_per_miss ?? null,

      // === TARGET CONFIGURATION ===
      target_count: input.target_count ?? 1,
      target_size: input.target_size ?? null,
      shots_per_target: input.shots_per_target ?? null,
      target_exposure_seconds: input.target_exposure_seconds ?? null,

      // === SHOOTING SETUP ===
      position: input.position ?? null,
      start_position: input.start_position ?? null,
      weapon_category: input.weapon_category ?? null,

      // === STAGE SETUP ===
      strings_count: input.strings_count ?? 1,
      reload_required: input.reload_required ?? false,
      movement_type: input.movement_type ?? null,
      movement_distance_m: input.movement_distance_m ?? null,

      // === DIFFICULTY & CATEGORY ===
      difficulty: input.difficulty ?? null,
      category: input.category ?? null,
      tags: input.tags ?? null,

      // === RICH CONTENT ===
      instructions: input.instructions ?? null,
      diagram_url: input.diagram_url ?? null,
      video_url: input.video_url ?? null,
      safety_notes: input.safety_notes ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create drill template:', error);
    throw new Error(error.message || 'Failed to create drill template');
  }

  return data as DrillTemplate;
}

/**
 * Update a drill template
 */
export async function updateDrillTemplate(
  templateId: string,
  updates: Partial<CreateDrillTemplateInput>
): Promise<DrillTemplate> {
  const { data, error } = await supabase
    .from('drill_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update drill template:', error);
    throw new Error(error.message || 'Failed to update drill template');
  }

  return data as DrillTemplate;
}

/**
 * Delete a drill template
 */
export async function deleteDrillTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('drill_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Failed to delete drill template:', error);
    throw new Error(error.message || 'Failed to delete drill template');
  }
}

/**
 * Convert a drill template to CreateDrillInput for use in training
 */
export function templateToDrillInput(template: DrillTemplate) {
  return {
    name: template.name,
    target_type: template.target_type,
    distance_m: template.distance_m,
    rounds_per_shooter: template.rounds_per_shooter,
    time_limit_seconds: template.time_limit_seconds || undefined,
    position: template.position || undefined,
    weapon_category: template.weapon_category || undefined,
    // Preserve round semantics (strings_count = rounds)
    strings_count: template.strings_count || undefined,
    target_count: template.target_count || undefined,
    shots_per_target: template.shots_per_target || undefined,
    min_accuracy_percent: template.min_accuracy_percent || undefined,
    par_time_seconds: template.par_time_seconds || undefined,
    scoring_mode: (template.scoring_mode as any) || undefined,
    start_position: template.start_position || undefined,
    reload_required: template.reload_required || undefined,
    movement_type: template.movement_type || undefined,
    movement_distance_m: template.movement_distance_m || undefined,
    difficulty: (template.difficulty as any) || undefined,
    category: (template.category as any) || undefined,
    tags: template.tags || undefined,
    instructions: template.instructions || undefined,
    diagram_url: template.diagram_url || undefined,
    video_url: template.video_url || undefined,
    safety_notes: template.safety_notes || undefined,
    notes: template.description || undefined,
  };
}
