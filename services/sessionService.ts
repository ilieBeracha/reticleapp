/**
 * SESSION SERVICE
 * Handles session creation and management for both personal and org workspaces
 */

import { AuthenticatedClient } from './authenticatedClient';

export interface CreateSessionParams {
  workspace_type: 'personal' | 'org';
  workspace_owner_id?: string;
  org_workspace_id?: string;
  team_id?: string;
  session_mode?: 'solo' | 'group';
  session_data?: Record<string, any>;
}

export interface SessionWithDetails {
  id: string;
  workspace_type: 'personal' | 'org';
  workspace_owner_id: string | null;
  org_workspace_id: string | null;
  workspace_name?: string | null;
  user_id: string;
  user_full_name?: string | null;
  team_id: string | null;
  team_name?: string | null;
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

  return {
    id: row.id,
    workspace_type: row.workspace_type,
    workspace_owner_id: row.workspace_owner_id ?? null,
    org_workspace_id: row.org_workspace_id ?? null,
    workspace_name: row.workspace_name ?? profiles.workspace_name ?? null,
    user_id: row.user_id,
    user_full_name: row.user_full_name ?? profiles.full_name ?? null,
    team_id: row.team_id ?? null,
    team_name: row.team_name ?? teams.name ?? null,
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
 * Create a new session (personal or org)
 */
export async function createSession(params: CreateSessionParams) {
  const client = await AuthenticatedClient.getClient();
  const { data, error } = await client
    .rpc('create_session', {
      p_workspace_type: params.workspace_type,
      p_workspace_owner_id: params.workspace_owner_id ?? null,
      p_org_workspace_id: params.org_workspace_id ?? null,
      p_team_id: params.team_id ?? null,
      p_session_mode: params.session_mode ?? 'solo',
      p_session_data: params.session_data ?? null,
    })
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Get personal sessions for the authenticated user
 */
export async function getPersonalSessions(): Promise<SessionWithDetails[]> {
  const client = await AuthenticatedClient.getClient();

  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userResult.user?.id;

  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await client
    .from('sessions')
    .select(`
      id,
      workspace_type,
      workspace_owner_id,
      org_workspace_id,
      user_id,
      team_id,
      session_mode,
      status,
      started_at,
      ended_at,
      session_data,
      created_at,
      updated_at,
      profiles:user_id(full_name, workspace_name),
      teams:team_id(name)
    `)
    .eq('workspace_type', 'personal')
    .eq('workspace_owner_id', userId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Get sessions for a specific workspace
 */
export async function getWorkspaceSessions(workspaceId: string): Promise<SessionWithDetails[]> {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client
    .from('sessions')
    .select(`
      id,
      workspace_type,
      workspace_owner_id,
      org_workspace_id,
      user_id,
      team_id,
      session_mode,
      status,
      started_at,
      ended_at,
      session_data,
      created_at,
      updated_at,
      profiles:user_id(full_name, workspace_name),
      teams:team_id(name)
    `)
    .or(`workspace_owner_id.eq.${workspaceId},org_workspace_id.eq.${workspaceId}`)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
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
  const client = await AuthenticatedClient.getClient();

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
  
  const { data, error } = await client
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
  const client = await AuthenticatedClient.getClient();
  
  const { error } = await client
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
