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
      target_type: input.target_type,
      distance_m: input.distance_m,
      rounds_per_shooter: input.rounds_per_shooter,
      time_limit_seconds: input.time_limit_seconds || null,
      position: input.position || null,
      weapon_category: input.weapon_category || null,
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
    notes: template.description || undefined,
  };
}
