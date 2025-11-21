/**
 * Team Service (Multi-Profile Architecture)
 * Handles all team-related operations
 */

import { supabase } from '@/lib/supabase';
import { AuthenticatedClient } from './authenticatedClient';

export interface CreateTeamInput {
  org_id: string;
  name: string;
  team_type?: 'field' | 'back_office';
  description?: string;
  squads?: string[];
}

export interface UpdateTeamInput {
  team_id: string;
  name?: string;
  description?: string;
  squads?: string[];
}

export interface AddTeamMemberInput {
  team_id: string;
  profile_id: string;
  role: 'commander' | 'squad_commander' | 'soldier';
  details?: { squad_id?: string; [key: string]: any };
}

export interface Team {
  id: string;
  org_id: string;
  name: string;
  team_type?: 'field' | 'back_office' | null;
  description?: string | null;
  squads?: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  profile_id: string;
  role: string;
  details?: any;
  joined_at: string;
}

export interface TeamWithMembers extends Team {
  members?: (TeamMember & {
    profile?: {
      id: string;
      display_name?: string;
      avatar_url?: string;
    };
  })[];
  member_count?: number;
}

/**
 * Create a new team
 */
export async function createTeam(input: CreateTeamInput): Promise<any> {
  const { data, error } = await supabase
    .rpc('create_team_for_org', {
      p_org_id: input.org_id,
      p_name: input.name,
      p_team_type: input.team_type || 'field',
      p_description: input.description || null,
    });

  if (error) {
    console.error('Failed to create team:', error);
    throw new Error(error.message || 'Failed to create team');
  }
  
  return data;
}

/**
 * Get teams for an org with member count
 */
export async function getOrgTeams(orgId: string): Promise<(Team & { member_count?: number })[]> {
  const { data, error } = await supabase.rpc('get_org_teams', {
    p_org_id: orgId
  });

  if (error) {
    console.error('Failed to fetch teams:', error);
    throw new Error(error.message || 'Failed to fetch teams');
  }

  return (data || []).map((team: any) => ({
    id: team.team_id,
    org_id: orgId,
    name: team.team_name,
    team_type: team.team_type,
    description: null,
    squads: team.squads || [],
    member_count: parseInt(team.member_count) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

/**
 * Get a single team with members
 */
export async function getTeamWithMembers(teamId: string): Promise<TeamWithMembers | null> {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client
    .from('teams')
    .select(`
      *,
      members:team_members(
        *,
        profile:profiles!team_members_profile_fkey(id, display_name, avatar_url)
      )
    `)
    .eq('id', teamId)
    .single();

  if (error) {
    console.error('Failed to fetch team:', error);
    throw new Error(error.message || 'Failed to fetch team');
  }

  if (!data) return null;

  return {
    ...data,
    member_count: data.members?.length || 0,
  };
}

/**
 * Update a team
 */
export async function updateTeam(input: UpdateTeamInput): Promise<Team> {
  const client = await AuthenticatedClient.getClient();
  
  const updates: Partial<Team> = {};
  if (input.name) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.squads !== undefined) updates.squads = input.squads;

  const { data, error } = await client
    .from('teams')
    .update(updates)
    .eq('id', input.team_id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update team:', error);
    throw new Error(error.message || 'Failed to update team');
  }

  return data;
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  const client = await AuthenticatedClient.getClient();
  
  const { error } = await client
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
export async function addTeamMember(input: AddTeamMemberInput): Promise<void> {
  const client = await AuthenticatedClient.getClient();
  
  const { error } = await client
    .from('team_members')
    .insert({
      team_id: input.team_id,
      profile_id: input.profile_id,
      role: input.role,
      details: input.details || {},
    });

  if (error) {
    console.error('Failed to add team member:', error);
    throw new Error(error.message || 'Failed to add team member');
  }
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(teamId: string, profileId: string): Promise<void> {
  const client = await AuthenticatedClient.getClient();
  
  const { error } = await client
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Failed to remove team member:', error);
    throw new Error(error.message || 'Failed to remove team member');
  }
}

/**
 * Update a team member's role or details
 */
export async function updateTeamMember(
  teamId: string,
  profileId: string,
  updates: {
    role?: 'commander' | 'squad_commander' | 'soldier';
    details?: any;
  }
): Promise<void> {
  const client = await AuthenticatedClient.getClient();
  
  const { error } = await client
    .from('team_members')
    .update(updates)
    .eq('team_id', teamId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Failed to update team member:', error);
    throw new Error(error.message || 'Failed to update team member');
  }
}
