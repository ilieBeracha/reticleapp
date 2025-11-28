/**
 * TRAINING SERVICE
 * Handles all training-related operations for organizations
 * 
 * Trainings are org-only and must include at least one team
 */

import { supabase } from '@/lib/supabase';
import type {
    CreateDrillInput,
    CreateTrainingInput,
    Training,
    TrainingDrill,
    TrainingStatus,
    TrainingWithDetails,
    UpdateTrainingInput,
} from '@/types/workspace';

// =====================================================
// TRAINING CRUD
// =====================================================

/**
 * Create a new training with drills
 */
export async function createTraining(input: CreateTrainingInput): Promise<TrainingWithDetails> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  if (!input.team_id) {
    throw new Error('Training must have at least one team');
  }

  // Create the training
  const { data: training, error: trainingError } = await supabase
    .from('trainings')
    .insert({
      org_workspace_id: input.org_workspace_id,
      team_id: input.team_id,
      title: input.title,
      description: input.description || null,
      scheduled_at: input.scheduled_at,
      status: 'planned',
      created_by: user.id,
    })
    .select(`
      *,
      team:teams(id, name, team_type),
      creator:profiles!trainings_created_by_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (trainingError) {
    console.error('Failed to create training:', trainingError);
    throw new Error(trainingError.message || 'Failed to create training');
  }

  // Create drills if provided
  if (input.drills && input.drills.length > 0) {
    const drillsToInsert = input.drills.map((drill, index) => ({
      training_id: training.id,
      order_index: index + 1,
      name: drill.name,
      target_type: drill.target_type,
      distance_m: drill.distance_m,
      rounds_per_shooter: drill.rounds_per_shooter,
      time_limit_seconds: drill.time_limit_seconds || null,
      position: drill.position || null,
      weapon_category: drill.weapon_category || null,
      notes: drill.notes || null,
    }));

    const { data: drills, error: drillsError } = await supabase
      .from('training_drills')
      .insert(drillsToInsert)
      .select();

    if (drillsError) {
      console.error('Failed to create drills:', drillsError);
      // Don't throw - training was created, just log the error
    }

    return {
      ...training,
      drills: drills || [],
      drill_count: drills?.length || 0,
    } as TrainingWithDetails;
  }

  return {
    ...training,
    drills: [],
    drill_count: 0,
  } as TrainingWithDetails;
}

/**
 * Get trainings for an organization
 */
export async function getOrgTrainings(
  orgWorkspaceId: string,
  options?: {
    status?: TrainingStatus;
    teamId?: string;
    limit?: number;
  }
): Promise<TrainingWithDetails[]> {
  let query = supabase
    .from('trainings')
    .select(`
      *,
      team:teams(id, name, team_type),
      creator:profiles!trainings_created_by_fkey(id, full_name, avatar_url),
      training_drills(id)
    `)
    .eq('org_workspace_id', orgWorkspaceId)
    .order('scheduled_at', { ascending: true });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.teamId) {
    query = query.eq('team_id', options.teamId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch trainings:', error);
    throw new Error(error.message || 'Failed to fetch trainings');
  }

  return (data || []).map((t: any) => ({
    ...t,
    drill_count: t.training_drills?.length || 0,
    drills: undefined,
    training_drills: undefined,
  })) as TrainingWithDetails[];
}

/**
 * Get upcoming trainings for an organization
 */
export async function getUpcomingTrainings(
  orgWorkspaceId: string,
  limit: number = 10
): Promise<TrainingWithDetails[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('trainings')
    .select(`
      *,
      team:teams(id, name, team_type),
      creator:profiles!trainings_created_by_fkey(id, full_name, avatar_url),
      training_drills(id)
    `)
    .eq('org_workspace_id', orgWorkspaceId)
    .in('status', ['planned', 'ongoing'])
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch upcoming trainings:', error);
    throw new Error(error.message || 'Failed to fetch upcoming trainings');
  }

  return (data || []).map((t: any) => ({
    ...t,
    drill_count: t.training_drills?.length || 0,
    drills: undefined,
    training_drills: undefined,
  })) as TrainingWithDetails[];
}

/**
 * Get a single training with full details
 */
export async function getTrainingById(trainingId: string): Promise<TrainingWithDetails | null> {
  const { data, error } = await supabase
    .from('trainings')
    .select(`
      *,
      team:teams(id, name, team_type, description, squads),
      creator:profiles!trainings_created_by_fkey(id, full_name, avatar_url),
      training_drills(*)
    `)
    .eq('id', trainingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Failed to fetch training:', error);
    throw new Error(error.message || 'Failed to fetch training');
  }

  return {
    ...data,
    drills: data.training_drills || [],
    drill_count: data.training_drills?.length || 0,
    training_drills: undefined,
  } as TrainingWithDetails;
}

/**
 * Update a training
 */
export async function updateTraining(
  trainingId: string,
  updates: UpdateTrainingInput
): Promise<Training> {
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.scheduled_at !== undefined) updatePayload.scheduled_at = updates.scheduled_at;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.team_id !== undefined) updatePayload.team_id = updates.team_id;

  const { data, error } = await supabase
    .from('trainings')
    .update(updatePayload)
    .eq('id', trainingId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update training:', error);
    throw new Error(error.message || 'Failed to update training');
  }

  return data as Training;
}

/**
 * Delete a training (and its drills via cascade)
 */
export async function deleteTraining(trainingId: string): Promise<void> {
  const { error } = await supabase
    .from('trainings')
    .delete()
    .eq('id', trainingId);

  if (error) {
    console.error('Failed to delete training:', error);
    throw new Error(error.message || 'Failed to delete training');
  }
}

/**
 * Start a training (change status to ongoing)
 */
export async function startTraining(trainingId: string): Promise<Training> {
  return updateTraining(trainingId, { status: 'ongoing' });
}

/**
 * Finish a training (change status to finished)
 */
export async function finishTraining(trainingId: string): Promise<Training> {
  return updateTraining(trainingId, { status: 'finished' });
}

/**
 * Cancel a training
 */
export async function cancelTraining(trainingId: string): Promise<Training> {
  return updateTraining(trainingId, { status: 'cancelled' });
}

// =====================================================
// USER'S TRAININGS (Personal View)
// =====================================================

/**
 * Get all trainings the current user has access to (via team membership)
 * This is for the personal home view - shows trainings across all orgs
 */
export async function getMyTrainings(
  options?: {
    status?: TrainingStatus[];
    limit?: number;
  }
): Promise<TrainingWithDetails[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get user's team memberships first
  const { data: teamMemberships, error: teamError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id);

  if (teamError) {
    console.error('Failed to fetch team memberships:', teamError);
    throw new Error('Failed to fetch your teams');
  }

  const teamIds = teamMemberships?.map(tm => tm.team_id) || [];

  if (teamIds.length === 0) {
    return []; // User has no team memberships
  }

  // Get trainings for those teams
  let query = supabase
    .from('trainings')
    .select(`
      *,
      team:teams(id, name, team_type),
      creator:profiles!trainings_created_by_fkey(id, full_name, avatar_url),
      training_drills(id),
      org:org_workspaces(id, name)
    `)
    .in('team_id', teamIds)
    .order('scheduled_at', { ascending: true });

  if (options?.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch user trainings:', error);
    throw new Error(error.message || 'Failed to fetch trainings');
  }

  return (data || []).map((t: any) => ({
    ...t,
    drill_count: t.training_drills?.length || 0,
    org_name: t.org?.name,
    drills: undefined,
    training_drills: undefined,
    org: undefined,
  })) as TrainingWithDetails[];
}

/**
 * Get upcoming trainings for the current user
 */
export async function getMyUpcomingTrainings(limit: number = 5): Promise<TrainingWithDetails[]> {
  return getMyTrainings({
    status: ['planned', 'ongoing'],
    limit,
  });
}

/**
 * Get training statistics for the current user
 */
export async function getMyTrainingStats(): Promise<{
  upcoming: number;
  completed: number;
  total: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get user's team memberships
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id);

  const teamIds = teamMemberships?.map(tm => tm.team_id) || [];

  if (teamIds.length === 0) {
    return { upcoming: 0, completed: 0, total: 0 };
  }

  // Count trainings by status
  const { data, error } = await supabase
    .from('trainings')
    .select('status')
    .in('team_id', teamIds);

  if (error) {
    console.error('Failed to fetch training stats:', error);
    return { upcoming: 0, completed: 0, total: 0 };
  }

  const trainings = data || [];
  return {
    upcoming: trainings.filter(t => t.status === 'planned' || t.status === 'ongoing').length,
    completed: trainings.filter(t => t.status === 'finished').length,
    total: trainings.length,
  };
}

// =====================================================
// DRILL CRUD
// =====================================================

/**
 * Add a drill to a training
 */
export async function addDrill(
  trainingId: string,
  drill: CreateDrillInput
): Promise<TrainingDrill> {
  // Get the current max order_index
  const { data: existingDrills } = await supabase
    .from('training_drills')
    .select('order_index')
    .eq('training_id', trainingId)
    .order('order_index', { ascending: false })
    .limit(1);

  const nextIndex = (existingDrills?.[0]?.order_index || 0) + 1;

  const { data, error } = await supabase
    .from('training_drills')
    .insert({
      training_id: trainingId,
      order_index: nextIndex,
      name: drill.name,
      target_type: drill.target_type,
      distance_m: drill.distance_m,
      rounds_per_shooter: drill.rounds_per_shooter,
      time_limit_seconds: drill.time_limit_seconds || null,
      position: drill.position || null,
      weapon_category: drill.weapon_category || null,
      notes: drill.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add drill:', error);
    throw new Error(error.message || 'Failed to add drill');
  }

  return data as TrainingDrill;
}

/**
 * Get drills for a training
 */
export async function getTrainingDrills(trainingId: string): Promise<TrainingDrill[]> {
  const { data, error } = await supabase
    .from('training_drills')
    .select('*')
    .eq('training_id', trainingId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Failed to fetch drills:', error);
    throw new Error(error.message || 'Failed to fetch drills');
  }

  return (data || []) as TrainingDrill[];
}

/**
 * Update a drill
 */
export async function updateDrill(
  drillId: string,
  updates: Partial<CreateDrillInput>
): Promise<TrainingDrill> {
  const { data, error } = await supabase
    .from('training_drills')
    .update(updates)
    .eq('id', drillId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update drill:', error);
    throw new Error(error.message || 'Failed to update drill');
  }

  return data as TrainingDrill;
}

/**
 * Delete a drill
 */
export async function deleteDrill(drillId: string): Promise<void> {
  const { error } = await supabase
    .from('training_drills')
    .delete()
    .eq('id', drillId);

  if (error) {
    console.error('Failed to delete drill:', error);
    throw new Error(error.message || 'Failed to delete drill');
  }
}

/**
 * Reorder drills
 */
export async function reorderDrills(
  trainingId: string,
  drillIds: string[]
): Promise<void> {
  // Update each drill's order_index
  const updates = drillIds.map((id, index) => 
    supabase
      .from('training_drills')
      .update({ order_index: index + 1 })
      .eq('id', id)
      .eq('training_id', trainingId)
  );

  const results = await Promise.all(updates);
  
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Failed to reorder drills:', errors);
    throw new Error('Failed to reorder drills');
  }
}

