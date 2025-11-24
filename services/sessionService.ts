/**
 * SESSION SERVICE
 * Supports both personal and organization sessions
 */

import { supabase } from '@/lib/supabase';
import { AuthenticatedClient } from './authenticatedClient';

export interface CreateSessionParams {
  org_workspace_id?: string | null;  // NULL for personal, UUID for org
  team_id?: string | null;
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

  return {
    id: row.id,
    org_workspace_id: row.org_workspace_id,
    workspace_name: row.workspace_name ?? orgs.name ?? 'Personal',
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
 * Create a new session - supports both personal and org sessions
 */
export async function createSession(params: CreateSessionParams): Promise<SessionWithDetails> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // If no org_workspace_id, it's a personal session - use direct insert
  if (!params.org_workspace_id) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        org_workspace_id: null,
        team_id: params.team_id ?? null,
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
        session_mode,
        status,
        started_at,
        ended_at,
        session_data,
        created_at,
        updated_at,
        profiles:user_id(full_name),
        teams:team_id(name),
        org_workspaces:org_workspace_id(name)
      `)
      .single();

    if (error) throw error;
    return mapSession(data);
  }

  // Organization session - use RPC function
  const client = await AuthenticatedClient.getClient();
  const { data, error } = await client
    .rpc('create_session', {
      p_workspace_type: 'org',
      p_workspace_owner_id: null,
      p_org_workspace_id: params.org_workspace_id,
      p_team_id: params.team_id ?? null,
      p_session_mode: params.session_mode ?? 'solo',
      p_session_data: params.session_data ?? null,
    })
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Get sessions - fetches all sessions accessible to the user
 * Includes both personal sessions and org sessions
 */
export async function getSessions(workspaceId?: string | null): Promise<SessionWithDetails[]> {
  const client = await AuthenticatedClient.getClient();
  
  let query = client
    .from('sessions')
    .select(`
      id,
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
      profiles:user_id(full_name),
      teams:team_id(name),
      org_workspaces:org_workspace_id(name)
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