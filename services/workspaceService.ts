/**
 * WORKSPACE SERVICE
 * Simplified: User = Workspace (no separate workspace table)
 * 
 * Each user's profile IS their workspace.
 * Access control via workspace_access table.
 */

import { supabase } from "@/lib/supabase";
import type { Team, TeamMember, TeamMemberShip, Workspace, WorkspaceAccess, WorkspaceRole } from "@/types/workspace";

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
 * Get all workspaces I have access to (personal + org)
 */
export async function getAccessibleWorkspaces(): Promise<Workspace[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const workspaces: Workspace[] = [];

  // 1. Get my personal workspace (my profile)
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (myProfile) {
    workspaces.push({
      ...myProfile,
      workspace_type: 'personal' as const,
      access_role: 'owner' as const,
    });
  }

  // 2. Get personal workspaces I have access to (other people's profiles)
  const { data: sharedPersonalWorkspaces } = await supabase
    .from("workspace_access")
    .select(`
      role,
      workspace_owner:profiles!workspace_owner_id(*)
    `)
    .eq("member_id", user.id)
    .eq("workspace_type", "personal")
    .neq("workspace_owner_id", user.id);

  if (sharedPersonalWorkspaces) {
    sharedPersonalWorkspaces.forEach((access: any) => {
      if (access.workspace_owner) {
        workspaces.push({
          ...access.workspace_owner,
          workspace_type: 'personal' as const,
          access_role: access.role,
        });
      }
    });
  }

  // 3. Get org workspaces I have access to
  const { data: orgWorkspaces } = await supabase
    .from("workspace_access")
    .select(`
      role,
      org_workspace:org_workspaces!org_workspace_id(*)
    `)
    .eq("member_id", user.id)
    .eq("workspace_type", "org");

  if (orgWorkspaces) {
    orgWorkspaces.forEach((access: any) => {
      if (access.org_workspace) {
        workspaces.push({
          id: access.org_workspace.id,
          workspace_type: 'org' as const,
          workspace_name: access.org_workspace.name,
          workspace_slug: access.org_workspace.workspace_slug,
          description: access.org_workspace.description,
          created_by: access.org_workspace.created_by,
          created_at: access.org_workspace.created_at,
          updated_at: access.org_workspace.updated_at,
          access_role: access.role,
        });
      }
    });
  }

  return workspaces;
}

/**
 * Create a new organization workspace (uses RPC for clean permissions)
 */
export async function createOrgWorkspace(input: {
  name: string;
  description?: string;
}): Promise<Workspace> {
  const { data, error } = await supabase.rpc('create_org_workspace', {
    p_name: input.name,
    p_description: input.description || null,
  });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Failed to create workspace");

  const orgWorkspace = data[0];

  return {
    id: orgWorkspace.id,
    workspace_type: 'org',
    workspace_name: orgWorkspace.name,
    workspace_slug: orgWorkspace.workspace_slug,
    description: orgWorkspace.description,
    created_by: orgWorkspace.created_by,
    created_at: orgWorkspace.created_at,
    updated_at: orgWorkspace.created_at,
    access_role: 'owner',
  };
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
    workspace_type: 'personal' as const,
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
export async function getWorkspaceTeams(
  workspaceType: 'personal' | 'org',
  workspaceId: string
): Promise<Team[]> {
  let query = supabase
    .from("teams")
    .select("*, team_members(count)")
    .order("name");

  if (workspaceType === 'personal') {
    query = query.eq("workspace_owner_id", workspaceId);
  } else {
    query = query.eq("org_workspace_id", workspaceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Create a team
 */
export async function createTeam(input: {
  workspace_type: 'personal' | 'org';
  workspace_owner_id?: string;  // For personal workspace
  org_workspace_id?: string;    // For org workspace
  name: string;
  team_type?: 'field' | 'back_office';
  description?: string;
}): Promise<Team> {
  const { data, error } = await supabase
    .rpc('create_team', {
      p_workspace_type: input.workspace_type,
      p_name: input.name,
      p_workspace_owner_id: input.workspace_owner_id || null,
      p_org_workspace_id: input.org_workspace_id || null,
      p_team_type: input.team_type || 'field',
      p_description: input.description || null,
    })
    .single();

  if (error) throw error;
  return data as Team;
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
  role: TeamMemberShip
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
  role: TeamMemberShip
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
