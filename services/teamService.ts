/**
 * Team Service - Team-First Architecture
 * Handles all team-related operations
 * Teams are the primary entity - no organization layer
 */

import { supabase } from '@/lib/supabase';
import type {
  Team,
  TeamInvitation,
  TeamMember,
  TeamMemberWithProfile,
  TeamRole,
  TeamWithMembers,
  TeamWithRole,
} from '@/types/workspace';

function normalizeTeamInvitation(row: any): TeamInvitation {
  // DB column is `team_role`, app type expects `role`.
  return {
    id: row.id,
    team_id: row.team_id,
    invite_code: row.invite_code,
    role: (row.role ?? row.team_role) as TeamRole,
    details: row.details ?? null,
    status: row.status,
    invited_by: row.invited_by,
    accepted_by: row.accepted_by ?? null,
    accepted_at: row.accepted_at ?? null,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeTeamMemberWithProfile(row: any): TeamMemberWithProfile {
  // Role can arrive in multiple shapes depending on RPC/select:
  // - string (e.g. "team_commander")
  // - { role: "team_commander", squad_id?: ... }
  const rawRole = row?.role?.role ?? row?.role ?? row?.team_role ?? null;
  const rawSquadId = row?.role?.squad_id ?? row?.details?.squad_id ?? null;

  return {
    team_id: row.team_id,
    user_id: row.user_id,
    joined_at: row.joined_at,
    details: row.details ?? null,
    role: {
      role: rawRole as any,
      squad_id: rawSquadId ?? undefined,
    },
    profile: row.profile ?? row.profiles ?? {},
  };
}

// =====================================================
// TEAM CRUD
// =====================================================

export interface CreateTeamInput {
  name: string;
  description?: string;
  squads?: string[];
}

export interface UpdateTeamInput {
  team_id: string;
  name?: string;
  description?: string;
  squads?: string[];
}

/**
 * Create a new team (current user becomes owner)
 */
export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { data, error } = await supabase.rpc('create_team_with_owner', {
    p_name: input.name,
    p_description: input.description || null,
    p_squads: input.squads || [],
  });

  if (error) {
    console.error('Failed to create team:', error);
    throw new Error(error.message || 'Failed to create team');
  }
  
  return data as Team;
}

/**
 * Get all teams the current user is a member of
 */
export async function getMyTeams(): Promise<TeamWithRole[]> {
  const { data, error } = await supabase.rpc('get_my_teams');

  if (error) {
    console.error('Failed to fetch teams:', error);
    throw new Error(error.message || 'Failed to fetch teams');
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    squads: t.squads,
    team_type: t.team_type,
    created_by: t.created_by,
    created_at: t.created_at,
    updated_at: t.created_at, // RPC doesn't return updated_at
    my_role: t.my_role,
    member_count: t.member_count,
  }));
}

/**
 * Get a single team with members
 */
export async function getTeamWithMembers(teamId: string): Promise<TeamWithMembers | null> {
  const { data, error } = await supabase.rpc('get_team_with_members', {
    p_team_id: teamId,
  });

  if (error) {
    console.error('Failed to fetch team:', error);
    throw new Error(error.message || 'Failed to fetch team');
  }

  if (!data) return null;

  // Normalize members returned by RPC (may have partial profile fields)
  let members: TeamMemberWithProfile[] = (data.members || []).map(normalizeTeamMemberWithProfile);

  // Some RPCs don't include `profiles.avatar_url` (or even profile at all).
  // If profile data looks incomplete, fetch members via direct select to ensure
  // consistent UI (avatars + names) across screens like TeamHomePage.
  const hasCompleteProfiles =
    members.length === 0 ||
    members.every((m: TeamMemberWithProfile) => m.profile && ('avatar_url' in m.profile || 'full_name' in m.profile));

  if (!hasCompleteProfiles) {
    try {
      members = await getTeamMembers(teamId);
    } catch (e) {
      // Keep RPC members if the fallback fetch fails.
      console.warn('Failed to hydrate member profiles, using RPC members:', e);
    }
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    squads: data.squads,
    team_type: data.team_type,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.created_at,
    members,
    member_count: members.length || 0,
  };
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

// =====================================================
// TEAM MEMBERS
// =====================================================

export interface AddTeamMemberInput {
  team_id: string;
  user_id: string;
  role: TeamRole;
  details?: Record<string, any>;
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
      details: input.details || {},
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
 * Update team member role
 */
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole,
  details?: Record<string, any>
): Promise<TeamMember> {
  const updates: any = { role };
  if (details !== undefined) updates.details = details;

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
 * Get team members with profiles
 */
export async function getTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      team_id,
      user_id,
      role,
      joined_at,
      details,
      profile:profiles!user_id(id, email, full_name, avatar_url)
    `)
    .eq('team_id', teamId)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch team members:', error);
    throw new Error(error.message || 'Failed to fetch team members');
  }

  // Transform flat role string to expected nested object format
  return (data || []).map((m: any) => ({
    team_id: m.team_id,
    user_id: m.user_id,
    joined_at: m.joined_at,
    details: m.details,
    role: {
      role: m.role, // DB stores as text, type expects { role: TeamRole }
      squad_id: m.details?.squad_id,
    },
    profile: m.profile || {},
  }));
}

// =====================================================
// INVITATIONS
// =====================================================

export interface CreateInvitationInput {
  team_id: string;
  role: TeamRole;
  details?: Record<string, any>;
  expires_in_days?: number;
}

/**
 * Create a team invitation
 */
export async function createTeamInvitation(input: CreateInvitationInput): Promise<TeamInvitation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate unique invite code
  const inviteCode = generateInviteCode();
  
  // Calculate expiry (default 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expires_in_days || 7));

  const { data, error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: input.team_id,
      invite_code: inviteCode,
      team_role: input.role,
      details: input.details || {},
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create invitation:', error);
    throw new Error(error.message || 'Failed to create invitation');
  }

  return normalizeTeamInvitation(data);
}

/**
 * Accept a team invitation
 */
export async function acceptTeamInvitation(inviteCode: string): Promise<{
  success: boolean;
  team_id: string;
  team_name: string;
  role: TeamRole;
}> {
  const { data, error } = await supabase.rpc('accept_team_invitation', {
    p_invite_code: inviteCode,
  });

  if (error) {
    console.error('Failed to accept invitation:', error);
    throw new Error(error.message || 'Failed to accept invitation');
  }

  return data;
}

/**
 * Get invitation by code (for preview)
 */
export async function getInvitationByCode(inviteCode: string): Promise<TeamInvitation & { team_name?: string } | null> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      team:teams(name)
    `)
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    console.log('Invitation lookup error:', error?.message);
    return null;
  }

  return {
    ...normalizeTeamInvitation(data),
    team_name: (data as any).team?.name,
  };
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (error) {
    console.error('Failed to cancel invitation:', error);
    throw new Error(error.message || 'Failed to cancel invitation');
  }
}

/**
 * Get pending invitations for a team
 */
export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch invitations:', error);
    throw new Error(error.message || 'Failed to fetch invitations');
  }

  return (data || []).map(normalizeTeamInvitation);
}

// =====================================================
// TEAM STATUS
// =====================================================

export interface TeamCommanderStatus {
  has_commander: boolean;
  has_pending_commander: boolean;
  commander_name: string | null;
  squads: string[];
}

/**
 * Get commander status for a team
 * Used to determine if commander role is available when inviting
 */
export async function getTeamCommanderStatus(teamId: string): Promise<TeamCommanderStatus> {
  // Get team squads
  const { data: team } = await supabase
    .from('teams')
    .select('squads')
    .eq('id', teamId)
    .single();

  // Check for existing commander
  const { data: commander } = await supabase
    .from('team_members')
    .select(`
      role,
      profile:profiles!user_id(full_name)
    `)
    .eq('team_id', teamId)
    .eq('role', 'commander')
    .maybeSingle();

  // Check for pending commander invitation
  const { data: pendingInvite } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('team_id', teamId)
    .eq('team_role', 'commander')
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return {
    has_commander: !!commander,
    has_pending_commander: !!pendingInvite,
    commander_name: (commander as any)?.profile?.full_name || null,
    squads: team?.squads || [],
  };
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Generate a random invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if user is team owner or commander
 */
export async function canManageTeam(teamId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if owner (created_by)
  const { data: team } = await supabase
    .from('teams')
    .select('created_by')
    .eq('id', teamId)
    .single();

  if (team?.created_by === user.id) return true;

  // Check if commander in team_members
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single();

  return membership?.role === 'owner' || membership?.role === 'commander';
}

/**
 * Get user's role in a team
 */
export async function getMyRoleInTeam(teamId: string): Promise<TeamRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single();

  return data?.role as TeamRole || null;
}
