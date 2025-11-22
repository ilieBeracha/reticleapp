/**
 * Team Service
 * Handles all team-related operations
 */

import { supabase } from '@/lib/supabase';
import type { Team, TeamMember, TeamMemberDetails, TeamMemberShip, TeamWithMembers } from '@/types/workspace';

export interface CreateTeamInput {
  workspace_type: 'personal' | 'org';
  workspace_owner_id?: string;  // For personal workspace
  org_workspace_id?: string;    // For org workspace
  name: string;
  description?: string;
  squads?: string[];  // Optional array of squad names
}

export interface UpdateTeamInput {
  team_id: string;
  name?: string;
  description?: string;
  squads?: string[];  // Update squads array
}

export interface AddTeamMemberInput {
  team_id: string;
  user_id: string;
  role: TeamMemberShip;
  details?: TeamMemberDetails; // NEW
}

/**
 * Create a new team
 */
export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { data, error } = await supabase
    .rpc('create_team', {
      p_workspace_type: input.workspace_type,
      p_name: input.name,
      p_workspace_owner_id: input.workspace_owner_id || null,
      p_org_workspace_id: input.org_workspace_id || null,
      p_description: input.description || null,
      p_squads: input.squads || [],
    })
    .single();

  if (error) {
    console.error('Failed to create team:', error);
    throw new Error(error.message || 'Failed to create team');
  }
  
  return data as Team;
}

/**
 * Get teams for a workspace with member count
 */
export async function getWorkspaceTeams(
  workspaceType: 'personal' | 'org',
  workspaceId: string
): Promise<(Team & { member_count?: number })[]> {
  let query = supabase
    .from('teams')
    .select('*, team_members(count)')
    .order('created_at', { ascending: false });

  if (workspaceType === 'personal') {
    query = query.eq('workspace_owner_id', workspaceId);
  } else {
    query = query.eq('org_workspace_id', workspaceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch teams:', error);
    throw new Error(error.message || 'Failed to fetch teams');
  }

  // Transform the data to include member_count
  const teams = (data || []).map((team: any) => ({
    ...team,
    member_count: team.team_members?.[0]?.count || 0,
    team_members: undefined, // Remove the nested structure
  }));

  return teams;
}

/**
 * Get a single team with members
 */
export async function getTeamWithMembers(teamId: string): Promise<TeamWithMembers | null> {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      members:team_members(
        *,
        profile:profiles!team_members_user_fkey(id, email, full_name, avatar_url)
      )
    `)
    .eq('id', teamId)
    .single();

  if (error) {
    console.error('Failed to fetch team:', error);
    throw new Error(error.message || 'Failed to fetch team');
  }

  return data as TeamWithMembers;
}

/**
 * Update a team
 */
export async function updateTeam(input: UpdateTeamInput): Promise<Team> {
  const updates: Partial<Team> = {};
  
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.squads !== undefined) updates.squads = input.squads;

  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', input.team_id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update team:', error);
    throw new Error(error.message || 'Failed to update team');
  }

  return data as Team;
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('Failed to delete team:', error);
    throw new Error(error.message || 'Failed to delete team');
  }
}

/**
 * Add a member to a team
 */
export async function addTeamMember(input: AddTeamMemberInput): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: input.team_id,
      user_id: input.user_id,
      role: input.role,
      details: input.details || {}, // NEW
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add team member:', error);
    throw new Error(error.message || 'Failed to add team member');
  }

  return data as TeamMember;
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to remove team member:', error);
    throw new Error(error.message || 'Failed to remove team member');
  }
}

/**
 * Update team member role & details
 */
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: TeamMemberShip,
  details?: TeamMemberDetails // NEW
): Promise<TeamMember> {
  const updates: any = { role };
  if (details) updates.details = details;

  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update team member role:', error);
    throw new Error(error.message || 'Failed to update team member role');
  }

  return data as TeamMember;
}

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<(TeamMember & { profile?: any })[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      profile:profiles!team_members_user_fkey(id, email, full_name, avatar_url)
    `)
    .eq('team_id', teamId)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch team members:', error);
    throw new Error(error.message || 'Failed to fetch team members');
  }

  return data || [];
}
