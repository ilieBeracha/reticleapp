/**
 * SESSION SERVICE (Multi-Profile Architecture)
 * Handles session creation and management
 */

import { AuthenticatedClient } from './authenticatedClient';

export interface CreateSessionParams {
  org_id: string;
  profile_id?: string;
  team_id?: string;
  session_mode?: 'solo' | 'group';
  session_data?: Record<string, any>;
}

export interface SessionWithDetails {
  id: string;
  org_id: string;
  org_name?: string;
  profile_id: string | null;
  user_id: string;
  profile_name?: string;
  team_id: string | null;
  team_name?: string;
  session_mode: 'solo' | 'group';
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  session_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

function mapSession(row: any): SessionWithDetails {
  if (!row) throw new Error('Session payload is empty');

  return {
    id: row.id,
    org_id: row.org_id,
    org_name: row.org?.name ?? null,
    profile_id: row.profile_id ?? null,
    user_id: row.user_id,
    profile_name: row.profile?.display_name ?? null,
    team_id: row.team_id ?? null,
    team_name: row.team?.name ?? null,
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
 * Create a new session
 */
export async function createSession(params: CreateSessionParams) {
  const client = await AuthenticatedClient.getClient();
  const context = await AuthenticatedClient.getContext();
  
  const { data, error } = await client
    .from('sessions')
    .insert({
      org_id: params.org_id,
      profile_id: params.profile_id ?? context.profileId,
      user_id: context.userId,
      team_id: params.team_id ?? null,
      session_mode: params.session_mode ?? 'solo',
      session_data: params.session_data ?? {},
      status: 'active'
    })
    .select(`
      *,
      org:orgs(name),
      profile:profiles(display_name),
      team:teams(name)
    `)
    .single();

  if (error) throw error;
  return mapSession(data);
}

/**
 * Get all sessions for current user (across all profiles/orgs)
 */
export async function getAllSessions(): Promise<SessionWithDetails[]> {
  const client = await AuthenticatedClient.getClient();
  const context = await AuthenticatedClient.getContext();
  
  const { data, error } = await client
    .from('sessions')
    .select(`
      *,
      org:orgs(name),
      profile:profiles(display_name),
      team:teams(name)
    `)
    .eq('user_id', context.userId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSession);
}

/**
 * Get sessions for a specific org
 */
export async function getOrgSessions(orgId: string): Promise<SessionWithDetails[]> {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client
    .from('sessions')
    .select(`
      *,
      org:orgs(name),
      profile:profiles(display_name),
      team:teams(name)
    `)
    .eq('org_id', orgId)
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
    .select(`
      *,
      org:orgs(name),
      profile:profiles(display_name),
      team:teams(name)
    `)
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
