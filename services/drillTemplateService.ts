/**
 * DRILL TEMPLATE SERVICE
 * @deprecated Use drillService.ts instead - the new normalized architecture
 *
 * This service is kept for backwards compatibility only.
 * New code should use:
 * - drillService.ts for core Drill definitions (static properties)
 * - trainingService.ts for drill instances within trainings (variable properties)
 */

import { supabase } from '@/lib/supabase';
import type { CreateDrillInput, Drill } from '@/types/workspace';

// Type alias for backwards compatibility
export type DrillTemplate = Drill;
export type CreateDrillTemplateInput = CreateDrillInput;

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Get all drill templates for a team
 * @deprecated Use getTeamDrills from drillService.ts
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
 * @deprecated Use createDrill from drillService.ts
 */
export async function createDrillTemplate(
  teamId: string,
  input: CreateDrillTemplateInput
): Promise<DrillTemplate> {
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

      // Legacy defaults (same values)
      default_distance_m: input.distance_m,
      default_rounds_per_shooter: input.rounds_per_shooter,
      default_time_limit_seconds: input.time_limit_seconds || null,
      default_strings_count: input.strings_count || 1,
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
 * @deprecated Use updateDrill from drillService.ts
 */
export async function updateDrillTemplate(
  templateId: string,
  updates: Partial<CreateDrillTemplateInput>
): Promise<DrillTemplate> {
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
 * @deprecated Use deleteDrill from drillService.ts
 */
export async function deleteDrillTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.from('drill_templates').delete().eq('id', templateId);

  if (error) {
    console.error('Failed to delete drill template:', error);
    throw new Error(error.message || 'Failed to delete drill template');
  }
}

/**
 * Convert a drill template to CreateTrainingDrillInput for use in training
 * @deprecated Use drillToTrainingInput from drillService.ts
 */
export function templateToDrillInput(template: DrillTemplate) {
  return {
    name: template.name,
    drill_id: template.id,
    drill_goal: template.drill_goal,
    target_type: template.target_type,
    distance_m: template.distance_m,
    rounds_per_shooter: template.rounds_per_shooter,
    time_limit_seconds: template.time_limit_seconds || undefined,
    strings_count: template.strings_count || 1,
  };
}
