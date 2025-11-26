/**
 * SESSION SERVICE
 * Supports both personal and organization sessions
 */

import { supabase } from '@/lib/supabase';

export interface CreateSessionParams {
  org_workspace_id?: string | null;  // NULL for personal, UUID for org
  team_id?: string | null;
  training_id?: string | null;  // Link session to a training
  drill_id?: string | null;     // Link session to a specific drill
  session_mode?: 'solo' | 'group';
  session_data?: Record<string, any>;
}

export interface SessionWithDetails {
  id: string;
  org_workspace_id: string | null;
  workspace_name?: string | null;
  user_id: string;
  user_full_name?: string | null;
  team_id: string | null;
  team_name?: string | null;
  training_id: string | null;
  training_title?: string | null;
  drill_id: string | null;
  drill_name?: string | null;
  session_mode: 'solo' | 'group';
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  session_data: Record<string, any> | null;
  created_at: string;
  updated_at?: string;
}

function mapSession(row: any): SessionWithDetails {
  if (!row) {
    throw new Error('Session payload is empty');
  }

  const profiles = row.profiles ?? {};
  const teams = row.teams ?? {};
  const orgs = row.org_workspaces ?? {};
  const trainings = row.trainings ?? {};
  const drills = row.training_drills ?? {};

  return {
    id: row.id,
    org_workspace_id: row.org_workspace_id,
    workspace_name: row.workspace_name ?? orgs.name ?? 'Personal',
    user_id: row.user_id,
    user_full_name: row.user_full_name ?? profiles.full_name ?? null,
    team_id: row.team_id ?? null,
    team_name: row.team_name ?? teams.name ?? null,
    training_id: row.training_id ?? null,
    training_title: row.training_title ?? trainings.title ?? null,
    drill_id: row.drill_id ?? null,
    drill_name: row.drill_name ?? drills.name ?? null,
    session_mode: row.session_mode,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    session_data: row.session_data ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

/**
 * Create a new session - supports both personal and org sessions
 * Can be linked to a training and/or drill
 */
export async function createSession(params: CreateSessionParams): Promise<SessionWithDetails> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Direct insert for all sessions (RLS handles permissions)
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      org_workspace_id: params.org_workspace_id ?? null,
      team_id: params.team_id ?? null,
      training_id: params.training_id ?? null,
      drill_id: params.drill_id ?? null,
      session_mode: params.session_mode ?? 'solo',
      status: 'active',
      started_at: new Date().toISOString(),
      session_data: params.session_data ?? null,
    })
    .select(`
      id,
      org_workspace_id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      session_data,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      org_workspaces:org_workspace_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Create a session for a specific training
 * Used by team members (commander, squad_commander, soldier) to log their training sessions
 */
export async function createTrainingSession(params: {
  training_id: string;
  drill_id?: string | null;
  session_mode?: 'solo' | 'group';
  session_data?: Record<string, any>;
}): Promise<SessionWithDetails> {
  // First, get the training to know the org_workspace_id and team_id
  const { data: training, error: trainingError } = await supabase
    .from('trainings')
    .select('org_workspace_id, team_id')
    .eq('id', params.training_id)
    .single();

  if (trainingError || !training) {
    throw new Error('Training not found');
  }

  return createSession({
    org_workspace_id: training.org_workspace_id,
    team_id: training.team_id,
    training_id: params.training_id,
    drill_id: params.drill_id ?? null,
    session_mode: params.session_mode ?? 'solo',
    session_data: params.session_data,
  });
}

/**
 * Get sessions - fetches all sessions accessible to the user
 * Includes both personal sessions and org sessions
 */
export async function getSessions(workspaceId?: string | null): Promise<SessionWithDetails[]> {
  let query = supabase
    .from('sessions')
    .select(`
      id,
      org_workspace_id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      session_data,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      org_workspaces:org_workspace_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .order('started_at', { ascending: false });

  // Filter by workspace if provided
  if (workspaceId !== undefined) {
    if (workspaceId === null) {
      // Get personal sessions only
      query = query.is('org_workspace_id', null);
    } else {
      // Get org sessions only
      query = query.eq('org_workspace_id', workspaceId);
    }
  }
  // Otherwise, get ALL sessions (personal + org)

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Get sessions for a specific training
 */
export async function getTrainingSessions(trainingId: string): Promise<SessionWithDetails[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      org_workspace_id,
      user_id,
      team_id,
      training_id,
      drill_id,
      session_mode,
      status,
      started_at,
      ended_at,
      session_data,
      created_at,
      updated_at,
      profiles:user_id(full_name),
      teams:team_id(name),
      org_workspaces:org_workspace_id(name),
      trainings:training_id(title),
      training_drills:drill_id(name)
    `)
    .eq('training_id', trainingId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Get sessions for a specific workspace
 */
export async function getWorkspaceSessions(orgWorkspaceId: string | null): Promise<SessionWithDetails[]> {
  return getSessions(orgWorkspaceId);
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  updates: {
    status?: 'active' | 'completed' | 'cancelled';
    ended_at?: string;
    session_data?: Record<string, any>;
  }
) {
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.status !== 'undefined') {
    updatePayload.status = updates.status;
  }

  if (typeof updates.ended_at !== 'undefined') {
    updatePayload.ended_at = updates.ended_at;
  }

  if (typeof updates.session_data !== 'undefined') {
    updatePayload.session_data = updates.session_data;
  }
  
  const { data, error } = await supabase
    .from('sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Delete (cancel) a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
  return true;
}

/**
 * End a session (mark as completed)
 */
export async function endSession(sessionId: string) {
  return updateSession(sessionId, {
    status: 'completed',
    ended_at: new Date().toISOString(),
  });
}