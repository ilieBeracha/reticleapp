/**
 * TRAINING SERVICE
 * Handles all training-related operations for teams
 * 
 * Team-first architecture: Trainings belong to teams directly
 */

import { supabase } from '@/lib/supabase';
import type {
  CreateTrainingDrillInput,
  CreateTrainingInput,
  Training,
  TrainingDrill,
  TrainingStatus,
  TrainingWithDetails,
  UpdateTrainingInput,
} from '@/types/workspace';
import { scheduleTrainingReminder } from './notifications';
import { notifyTeamNewTraining, notifyTeamTrainingStarted } from './pushService';

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
      team_id: input.team_id,
      title: input.title,
      description: input.description || null,
      scheduled_at: input.scheduled_at,
      manual_start: input.manual_start ?? false,
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
      // NEW: drill_id references core Drill definition
      drill_id: drill.drill_id ?? null,
      // LEGACY: drill_template_id for backwards compatibility
      drill_template_id: drill.drill_template_id ?? drill.drill_id ?? null,
      name: drill.name,
      description: drill.description || null,

      // === PRIMARY CLASSIFICATION ===
      drill_goal: drill.drill_goal,

      // === BASIC CONFIG ===
      target_type: drill.target_type,
      distance_m: drill.distance_m,

      // rounds_per_shooter = bullets per round (per entry)
      rounds_per_shooter: drill.rounds_per_shooter,

      // === TIMING ===
      time_limit_seconds: drill.time_limit_seconds ?? null,
      par_time_seconds: drill.par_time_seconds ?? null,

      // === SCORING ===
      scoring_mode: drill.scoring_mode ?? null,
      min_accuracy_percent: drill.min_accuracy_percent ?? null,
      points_per_hit: drill.points_per_hit ?? null,
      penalty_per_miss: drill.penalty_per_miss ?? null,

      // === TARGET CONFIGURATION ===
      target_count: drill.target_count ?? 1,
      target_size: drill.target_size ?? null,
      shots_per_target: drill.shots_per_target ?? null,
      target_exposure_seconds: drill.target_exposure_seconds ?? null,

      // === SHOOTING SETUP ===
      position: drill.position ?? null,
      start_position: drill.start_position ?? null,
      weapon_category: drill.weapon_category ?? null,

      // === STAGE SETUP ===
      strings_count: drill.strings_count ?? 1,
      reload_required: drill.reload_required ?? false,
      movement_type: drill.movement_type ?? null,
      movement_distance_m: drill.movement_distance_m ?? null,

      // === DIFFICULTY & CATEGORY ===
      difficulty: drill.difficulty ?? null,
      category: drill.category ?? null,
      tags: drill.tags ?? null,

      // === RICH CONTENT ===
      instructions: drill.instructions ?? null,
      diagram_url: drill.diagram_url ?? null,
      video_url: drill.video_url ?? null,
      safety_notes: drill.safety_notes ?? null,

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

    const result = {
      ...training,
      drills: drills || [],
      drill_count: drills?.length || 0,
    } as TrainingWithDetails;

    // Send notifications (non-blocking)
    sendTrainingCreatedNotifications(result).catch(console.error);

    return result;
  }

  const result = {
    ...training,
    drills: [],
    drill_count: 0,
  } as TrainingWithDetails;

  // Send notifications (non-blocking)
  sendTrainingCreatedNotifications(result).catch(console.error);

  return result;
}

/**
 * Send notifications when training is created
 * - Local reminder for the creator (30 min before)
 * - Push notification to all team members via Edge Function
 */
async function sendTrainingCreatedNotifications(training: TrainingWithDetails) {
  const teamId = training.team_id || training.team?.id;
  const teamName = training.team?.name || 'Team';
  const creatorId = training.created_by || training.creator?.id;
  const creatorName = training.creator?.full_name || 'Someone';
  const scheduledAt = new Date(training.scheduled_at);

  // Schedule local reminder for the creator (30 min before)
  await scheduleTrainingReminder(
    training.id,
    training.title,
    teamName,
    scheduledAt
  );

  // Send push notification to all team members (excluding creator)
  if (teamId && creatorId) {
    await notifyTeamNewTraining(
      teamId,
      training.id,
      training.title,
      teamName,
      scheduledAt,
      creatorId,
      creatorName
    );
  }
}

/**
 * Get trainings for a team (team-first architecture)
 */
export async function getTeamTrainings(
  teamId: string,
  options?: {
    status?: TrainingStatus;
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
    .eq('team_id', teamId)
    .order('scheduled_at', { ascending: true });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch team trainings:', error);
    throw new Error(error.message || 'Failed to fetch team trainings');
  }

  return (data || []).map((t: any) => ({
    ...t,
    drill_count: t.training_drills?.length || 0,
    drills: t.training_drills || [],
    training_drills: undefined,
  })) as TrainingWithDetails[];
}

/**
 * @deprecated Use getTeamTrainings instead
 */
export async function getOrgTrainings(
  teamId: string,
  options?: {
    status?: TrainingStatus;
    limit?: number;
  }
): Promise<TrainingWithDetails[]> {
  return getTeamTrainings(teamId, options);
}

/**
 * Get upcoming trainings for a team
 */
export async function getUpcomingTrainings(
  teamId: string,
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
    .eq('team_id', teamId)
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
    drills: t.training_drills || [],
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
): Promise<Training | null> {
  // First check if training exists
  const { data: existing } = await supabase
    .from('trainings')
    .select('id, status')
    .eq('id', trainingId)
    .maybeSingle();

  if (!existing) {
    console.log('[TrainingService] Training not found for update:', trainingId);
    return null;
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updatePayload.title = updates.title;
  if (updates.description !== undefined) updatePayload.description = updates.description;
  if (updates.scheduled_at !== undefined) updatePayload.scheduled_at = updates.scheduled_at;
  if (updates.status !== undefined) updatePayload.status = updates.status;

  const { data, error } = await supabase
    .from('trainings')
    .update(updatePayload)
    .eq('id', trainingId)
    .select()
    .maybeSingle();

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
 * Start a training (change status to ongoing, set started_at)
 */
export async function startTraining(trainingId: string): Promise<Training | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  // First check if training exists and can be started
  const { data: existing } = await supabase
    .from('trainings')
    .select('id, status')
    .eq('id', trainingId)
    .maybeSingle();

  if (!existing) {
    console.log('[TrainingService] Training not found for start:', trainingId);
    return null;
  }

  // Already ongoing or finished
  if (existing.status === 'ongoing' || existing.status === 'finished') {
    const { data } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', trainingId)
      .single();
    return data as Training;
  }
  
  // Update with started_at timestamp
  const { data, error } = await supabase
    .from('trainings')
    .update({
      status: 'ongoing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', trainingId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Failed to start training:', error);
    throw new Error(error.message || 'Failed to start training');
  }

  if (!data) {
    console.log('[TrainingService] Training update returned no data:', trainingId);
    return null;
  }

  const training = data as Training;

  // Send push notification to team members
  if (training.team_id && user?.id) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('name')
      .eq('id', training.team_id)
      .single();

    notifyTeamTrainingStarted(
      training.team_id,
      trainingId,
      training.title,
      teamData?.name || 'Team',
      user.id
    ).catch(console.error);
  }

  return training;
}

/**
 * Finish a training (change status to finished, set ended_at)
 * 
 * Safe to call even if training is already finished or doesn't exist.
 */
export async function finishTraining(trainingId: string): Promise<Training | null> {
  console.log('[TrainingService] finishTraining called for:', trainingId);
  
  // Get current user for debugging
  const { data: { user } } = await supabase.auth.getUser();
  console.log('[TrainingService] Current user:', user?.id);
  
  if (!user) {
    console.log('[TrainingService] No authenticated user');
    return null;
  }

  // Get user's team memberships to check access
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', user.id);
  console.log('[TrainingService] User memberships:', JSON.stringify(memberships));
  
  // First check current status - use broader select like the list does
  const { data: existing, error: fetchError } = await supabase
    .from('trainings')
    .select('id, status, team_id, created_by')
    .eq('id', trainingId)
    .maybeSingle();

  console.log('[TrainingService] Existing training:', JSON.stringify(existing), 'FetchError:', fetchError);

  // If can't fetch, might be RLS issue - try direct update anyway
  if (!existing && !fetchError) {
    console.log('[TrainingService] Training not found via SELECT, trying direct UPDATE...');
    
    // Try the update directly - RLS will block if not authorized
    const { data: updated, error: updateError } = await supabase
      .from('trainings')
      .update({
        status: 'finished',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', trainingId)
      .select()
      .maybeSingle();
    
    console.log('[TrainingService] Direct update result:', JSON.stringify(updated), 'Error:', updateError);
    
    if (updateError) {
      throw new Error(updateError.message || 'Failed to finish training - no access');
    }
    
    return updated as Training;
  }

  // If already finished or doesn't exist, return early
  if (!existing) {
    console.log('[TrainingService] Training not found:', trainingId);
    return null;
  }
  
  if (existing.status === 'finished' || existing.status === 'cancelled') {
    console.log('[TrainingService] Training already finished/cancelled:', trainingId, existing.status);
    // Return the existing training
    const { data } = await supabase
      .from('trainings')
      .select('*')
      .eq('id', trainingId)
      .maybeSingle();
    return data as Training;
  }

  console.log('[TrainingService] Updating training to finished...');
  const { data, error } = await supabase
    .from('trainings')
    .update({
      status: 'finished',
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', trainingId)
    .select()
    .maybeSingle();

  console.log('[TrainingService] Update result:', JSON.stringify(data), 'Error:', error);

  if (error) {
    console.error('Failed to finish training:', error);
    throw new Error(error.message || 'Failed to finish training');
  }

  return data as Training;
}

/**
 * Cancel a training
 */
export async function cancelTraining(trainingId: string): Promise<Training | null> {
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
      training_drills(id)
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
    drills: t.training_drills || [],
    training_drills: undefined,
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

  // Count trainings by status without fetching rows (bounded payload).
  const base = supabase.from('trainings').select('id', { count: 'exact', head: true }).in('team_id', teamIds);

  const [{ count: totalCount, error: totalError }, { count: upcomingCount, error: upcomingError }, { count: completedCount, error: completedError }] =
    await Promise.all([
      base,
      base.in('status', ['planned', 'ongoing']),
      base.eq('status', 'finished'),
    ]);

  if (totalError || upcomingError || completedError) {
    console.error('Failed to fetch training stats:', totalError || upcomingError || completedError);
    return { upcoming: 0, completed: 0, total: 0 };
  }

  return {
    upcoming: upcomingCount ?? 0,
    completed: completedCount ?? 0,
    total: totalCount ?? 0,
  };
}

// =====================================================
// DRILL CRUD
// =====================================================

/**
 * Add a drill instance to a training.
 * 
 * NEW ARCHITECTURE:
 * - drill_id: Reference to core Drill definition
 * - Instance fields: Configured for this specific training
 */
export async function addDrill(
  trainingId: string,
  drill: CreateTrainingDrillInput
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
      // NEW: drill_id references core Drill definition
      drill_id: drill.drill_id ?? null,
      // LEGACY: drill_template_id for backwards compatibility
      drill_template_id: drill.drill_template_id ?? drill.drill_id ?? null,
      name: drill.name,
      description: drill.description || null,

      // === PRIMARY CLASSIFICATION ===
      drill_goal: drill.drill_goal,

      // === BASIC CONFIG ===
      target_type: drill.target_type,
      distance_m: drill.distance_m,
      rounds_per_shooter: drill.rounds_per_shooter,

      // === TIMING ===
      time_limit_seconds: drill.time_limit_seconds ?? null,
      par_time_seconds: drill.par_time_seconds ?? null,

      // === SCORING ===
      scoring_mode: drill.scoring_mode ?? null,
      min_accuracy_percent: drill.min_accuracy_percent ?? null,
      points_per_hit: drill.points_per_hit ?? null,
      penalty_per_miss: drill.penalty_per_miss ?? null,

      // === TARGET CONFIGURATION ===
      target_count: drill.target_count ?? 1,
      target_size: drill.target_size ?? null,
      shots_per_target: drill.shots_per_target ?? null,
      target_exposure_seconds: drill.target_exposure_seconds ?? null,

      // === SHOOTING SETUP ===
      position: drill.position ?? null,
      start_position: drill.start_position ?? null,
      weapon_category: drill.weapon_category ?? null,

      // === STAGE SETUP ===
      strings_count: drill.strings_count ?? 1,
      reload_required: drill.reload_required ?? false,
      movement_type: drill.movement_type ?? null,
      movement_distance_m: drill.movement_distance_m ?? null,

      // === DIFFICULTY & CATEGORY ===
      difficulty: drill.difficulty ?? null,
      category: drill.category ?? null,
      tags: drill.tags ?? null,

      // === RICH CONTENT ===
      instructions: drill.instructions ?? null,
      diagram_url: drill.diagram_url ?? null,
      video_url: drill.video_url ?? null,
      safety_notes: drill.safety_notes ?? null,

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
 * Update a drill instance within a training
 */
export async function updateDrill(
  drillId: string,
  updates: Partial<CreateTrainingDrillInput>
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

/**
 * Batch update drill instance configurations.
 * 
 * Used by commanders to set instance values (distance, shots, time)
 * before starting a training.
 */
export interface DrillInstanceOverrides {
  distance_m?: number;
  rounds_per_shooter?: number;
  time_limit_seconds?: number | null;
  strings_count?: number | null;
  par_time_seconds?: number | null;
  min_accuracy_percent?: number | null;
}

export async function updateTrainingDrills(
  trainingId: string,
  drillOverrides: Map<string, DrillInstanceOverrides>
): Promise<void> {
  if (drillOverrides.size === 0) return;

  const updates = Array.from(drillOverrides.entries()).map(([drillId, overrides]) => {
    const updateData: Record<string, unknown> = {};
    
    if (overrides.distance_m !== undefined) updateData.distance_m = overrides.distance_m;
    if (overrides.rounds_per_shooter !== undefined) updateData.rounds_per_shooter = overrides.rounds_per_shooter;
    if (overrides.time_limit_seconds !== undefined) updateData.time_limit_seconds = overrides.time_limit_seconds;
    if (overrides.strings_count !== undefined) updateData.strings_count = overrides.strings_count;
    if (overrides.par_time_seconds !== undefined) updateData.par_time_seconds = overrides.par_time_seconds;
    if (overrides.min_accuracy_percent !== undefined) updateData.min_accuracy_percent = overrides.min_accuracy_percent;

    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) return null;

    return supabase
      .from('training_drills')
      .update(updateData)
      .eq('id', drillId)
      .eq('training_id', trainingId);
  }).filter(Boolean);

  if (updates.length === 0) return;

  const results = await Promise.all(updates);
  const errors = results.filter(r => r?.error);
  
  if (errors.length > 0) {
    console.error('Failed to update drill instances:', errors);
    throw new Error('Failed to update some drill configurations');
  }
}

/**
 * Start a training with optional drill instance overrides.
 * 
 * This is the main flow for commanders to configure and start a training.
 * 1. Apply any drill overrides (distance, shots, time)
 * 2. Change training status to ongoing
 */
export async function startTrainingWithConfig(
  trainingId: string,
  drillOverrides?: Map<string, DrillInstanceOverrides>
): Promise<Training | null> {
  // First, apply any drill overrides
  if (drillOverrides && drillOverrides.size > 0) {
    await updateTrainingDrills(trainingId, drillOverrides);
  }

  // Then start the training
  return startTraining(trainingId);
}

// =====================================================
// DRILL PROGRESS TRACKING
// =====================================================

export interface DrillProgress {
  drillId: string;
  completed: boolean;
  sessionId?: string;
}

/**
 * Get current user's drill progress for a training
 * Returns which drills have been completed (have a completed session)
 */
export async function getMyDrillProgress(trainingId: string): Promise<DrillProgress[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get all drills for this training
  const { data: drills, error: drillsError } = await supabase
    .from('training_drills')
    .select('id')
    .eq('training_id', trainingId)
    .order('order_index', { ascending: true });

  if (drillsError) {
    console.error('Failed to fetch drills:', drillsError);
    throw new Error('Failed to fetch drills');
  }

  if (!drills || drills.length === 0) {
    return [];
  }

  // Drill completion is based on recorded completions (requirements met),
  // NOT simply on any completed session.
  const { data: completions, error: completionsError } = await supabase
    .from('user_drill_completions')
    .select('session_id, drill_id')
    .eq('training_id', trainingId)
    .eq('user_id', user.id);

  if (completionsError) {
    console.error('Failed to fetch drill completions:', completionsError);
    throw new Error('Failed to fetch drill progress');
  }

  // Create a map of drill_id -> session_id for completed drills
  const completedDrills = new Map<string, string>();
  (completions || []).forEach((c: any) => {
    if (c.drill_id) {
      completedDrills.set(c.drill_id, c.session_id);
    }
  });

  // Build progress array
  return drills.map(drill => ({
    drillId: drill.id,
    completed: completedDrills.has(drill.id),
    sessionId: completedDrills.get(drill.id),
  }));
}

