/**
 * WORKSPACE SERVICE
 * Simplified: User = Workspace (no separate workspace table)
 * 
 * Each user's profile IS their workspace.
 * Access control via workspace_access table.
 */

import { supabase } from "@/lib/supabase";
import type { Team, TeamMember, TeamRole, Workspace, WorkspaceAccess, WorkspaceRole } from "@/types/workspace";

// =====================================================
// MY WORKSPACE
// =====================================================

/**
 * Get current user's profile (which is their workspace)
 */
export async function getMyWorkspace(): Promise<Workspace | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update my workspace (profile)
 */
export async function updateMyWorkspace(input: {
  workspace_name?: string;
  full_name?: string;
  avatar_url?: string;
}): Promise<Workspace> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(input)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// WORKSPACES I CAN ACCESS
// =====================================================

/**
 * Get all workspaces I have access to (including my own)
 */
export async function getAccessibleWorkspaces(): Promise<Workspace[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get profiles where I have workspace_access
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      access:workspace_access!workspace_owner_id(role)
    `)
    .eq("workspace_access.member_id", user.id);

  if (error) throw error;

  // Map to include access_role
  return (data || []).map((profile: any) => ({
    ...profile,
    access_role: profile.access?.[0]?.role || 'member'
  }));
}

/**
 * Get a specific workspace by owner ID
 */
export async function getWorkspace(workspaceOwnerId: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      access:workspace_access!workspace_owner_id(role)
    `)
    .eq("id", workspaceOwnerId)
    .single();

  if (error) throw error;

  return {
    ...data,
    access_role: data.access?.[0]?.role || 'member'
  };
}

// =====================================================
// WORKSPACE ACCESS (Members)
// =====================================================

/**
 * Get members of a workspace
 */
export async function getWorkspaceMembers(workspaceOwnerId: string): Promise<(WorkspaceAccess & { profile?: any })[]> {
  const { data, error } = await supabase
    .from("workspace_access")
    .select(`
      *,
      profile:profiles!member_id(id, email, full_name, avatar_url)
    `)
    .eq("workspace_owner_id", workspaceOwnerId);

  if (error) throw error;
  return data || [];
}

/**
 * Add a member to workspace
 */
export async function addWorkspaceMember(
  workspaceOwnerId: string,
  memberEmail: string,
  role: WorkspaceRole = 'member'
): Promise<WorkspaceAccess> {
  // Find user by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", memberEmail)
    .single();

  if (!profile) throw new Error("User not found");

  const { data, error } = await supabase
    .from("workspace_access")
    .insert({
      workspace_owner_id: workspaceOwnerId,
      member_id: profile.id,
      role
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a member from workspace
 */
export async function removeWorkspaceMember(accessId: string): Promise<void> {
  const { error } = await supabase
    .from("workspace_access")
    .delete()
    .eq("id", accessId);

  if (error) throw error;
}

/**
 * Update member role
 */
export async function updateWorkspaceMemberRole(
  accessId: string,
  role: WorkspaceRole
): Promise<WorkspaceAccess> {
  const { data, error } = await supabase
    .from("workspace_access")
    .update({ role })
    .eq("id", accessId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// TEAMS
// =====================================================

/**
 * Get teams for a workspace
 */
export async function getWorkspaceTeams(workspaceOwnerId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("workspace_owner_id", workspaceOwnerId)
    .order("name");

  if (error) throw error;
  return data || [];
}

/**
 * Create a team
 */
export async function createTeam(input: {
  workspace_owner_id: string;
  name: string;
  team_type?: 'field' | 'back_office';
  description?: string;
}): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: string,
  input: {
    name?: string;
    team_type?: 'field' | 'back_office';
    description?: string;
  }
): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .update(input)
    .eq("id", teamId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) throw error;
}

// =====================================================
// TEAM MEMBERS
// =====================================================

/**
 * Get team members
 */
export async function getTeamMembers(teamId: string): Promise<(TeamMember & { profile?: any })[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select(`
      *,
      profile:profiles(id, email, full_name, avatar_url)
    `)
    .eq("team_id", teamId);

  if (error) throw error;
  return data || [];
}

/**
 * Add team member
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  role: TeamRole
): Promise<TeamMember> {
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id: teamId,
      user_id: userId,
      role
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update team member role
 */
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole
): Promise<TeamMember> {
  const { data, error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove team member
 */
export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) throw error;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if user is workspace admin
 */
export async function isWorkspaceAdmin(workspaceOwnerId: string, userId?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const checkUserId = userId || user?.id;
  if (!checkUserId) return false;

  const { data } = await supabase
    .from("workspace_access")
    .select("role")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("member_id", checkUserId)
    .single();

  return data?.role === 'owner' || data?.role === 'admin';
}

/**
 * Check if user is team leader
 */
export async function isTeamLeader(teamId: string, userId?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const checkUserId = userId || user?.id;
  if (!checkUserId) return false;

  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", checkUserId)
    .single();

  return data?.role === 'manager' || data?.role === 'commander';
}
