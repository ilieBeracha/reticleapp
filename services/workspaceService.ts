/**
 * WORKSPACE SERVICE
 * Org-only model: Users must belong to organizations
 */

import { supabase } from "@/lib/supabase";
import type {
  OrgWorkspaceSettings,
  TeamMemberShip,
  TeamMembership,
  Workspace,
  WorkspaceAccess,
  WorkspaceMemberWithTeams,
  WorkspaceRole
} from "@/types/workspace";

// =====================================================
// WORKSPACES I CAN ACCESS
// =====================================================

/**
 * Get all organization workspaces I have access to
 */
export async function getAccessibleWorkspaces(): Promise<Workspace[]> {
  // Use getSession instead of getUser - getUser can hang during auth state transitions
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user;

  // Get all org workspaces I have access to
  const { data: orgWorkspaces } = await supabase
    .from("workspace_access")
    .select(`
      role,
      org_workspace:org_workspaces!org_workspace_id(*)
    `)
    .eq("member_id", user.id);

  if (!orgWorkspaces) return [];

  const workspaces: Workspace[] = orgWorkspaces
    .filter((access: any) => access.org_workspace)
    .map((access: any) => ({
      id: access.org_workspace.id,
      workspace_name: access.org_workspace.name,
      workspace_slug: access.org_workspace.workspace_slug,
      description: access.org_workspace.description,
      created_by: access.org_workspace.created_by,
      created_at: access.org_workspace.created_at,
      updated_at: access.org_workspace.updated_at,
      access_role: access.role,
      // View settings
      show_teams_tab: access.org_workspace.show_teams_tab ?? true,
      show_attached_tab: access.org_workspace.show_attached_tab ?? true,
    }));

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
    workspace_name: orgWorkspace.name,
    workspace_slug: orgWorkspace.workspace_slug,
    description: orgWorkspace.description,
    created_by: orgWorkspace.created_by,
    created_at: orgWorkspace.created_at,
    updated_at: orgWorkspace.created_at,
    access_role: 'owner',
    show_teams_tab: true,
    show_attached_tab: true,
  };
}

/**
 * Update organization workspace settings (admin/owner only)
 * RLS policy ensures only admin/owner can update
 */
export async function updateOrgWorkspaceSettings(
  orgWorkspaceId: string,
  settings: OrgWorkspaceSettings
): Promise<void> {
  const { error } = await supabase
    .from("org_workspaces")
    .update({
      ...(settings.show_teams_tab !== undefined && { show_teams_tab: settings.show_teams_tab }),
      ...(settings.show_attached_tab !== undefined && { show_attached_tab: settings.show_attached_tab }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgWorkspaceId);

  if (error) throw error;
}


/**
 * Get all organization members WITH their team memberships in one optimized query
 * Returns complete member data including profile and all team assignments
 * No need for separate team fetches - everything is included!
 */
export async function getWorkspaceMembers(
  orgWorkspaceId: string
): Promise<WorkspaceMemberWithTeams[]> {
  const { data, error } = await supabase.rpc('get_org_workspace_members', {
    p_org_workspace_id: orgWorkspaceId
  });

  if (error) {
    console.error('Failed to fetch workspace members:', error);
    throw error;
  }

  return data || [];
}

/**
 * LEGACY: Get members without team context (backward compatibility)
 * Consider using getWorkspaceMembers() instead for better performance
 */
export async function getWorkspaceMembersLegacy(
  orgWorkspaceId: string
): Promise<(WorkspaceAccess & { profile?: any })[]> {
  const members = await getWorkspaceMembers(orgWorkspaceId);
  
  // Transform to legacy format
  return members.map((member) => ({
    id: member.id,
    org_workspace_id: member.org_workspace_id,
    member_id: member.member_id,
    role: member.role,
    joined_at: member.joined_at,
    profile: {
      id: member.profile_id,
      email: member.profile_email,
      full_name: member.profile_full_name,
      avatar_url: member.profile_avatar_url
    }
  }));
}

/**
 * Get members who are NOT assigned to any team
 * Useful for showing "available members" when adding to teams
 * NOTE: Only "member" role can be assigned to teams (not owner/admin/instructor)
 */
export function getUnassignedMembers(
  members: WorkspaceMemberWithTeams[]
): WorkspaceMemberWithTeams[] {
  return members.filter(m => m.role === 'member' && m.teams.length === 0);
}

/**
 * Get all assignable members (role = "member")
 * Owners, admins, and instructors cannot be assigned to teams
 */
export function getAssignableMembers(
  members: WorkspaceMemberWithTeams[]
): WorkspaceMemberWithTeams[] {
  return members.filter(m => m.role === 'member');
}

/**
 * Get non-assignable members (owner/admin/instructor)
 * These members manage the org but don't belong to teams
 */
export function getNonAssignableMembers(
  members: WorkspaceMemberWithTeams[]
): WorkspaceMemberWithTeams[] {
  return members.filter(m => m.role !== 'member');
}

/**
 * Group members by their team assignments
 * Returns a map of team_id -> { team info, members[] }
 */
export function groupMembersByTeam(members: WorkspaceMemberWithTeams[]) {
  const teamMap = new Map<string, {
    team: TeamMembership;
    members: WorkspaceMemberWithTeams[];
  }>();

  members.forEach(member => {
    member.teams.forEach(team => {
      const key = team.team_id;
      if (!teamMap.has(key)) {
        teamMap.set(key, {
          team,
          members: []
        });
      }
      teamMap.get(key)!.members.push(member);
    });
  });

  return Array.from(teamMap.values());
}

/**
 * Get all members assigned to a specific team
 * More efficient than fetching team members separately
 */
export function getMembersForTeam(
  members: WorkspaceMemberWithTeams[],
  teamId: string
): WorkspaceMemberWithTeams[] {
  return members.filter(m => 
    m.teams.some(t => t.team_id === teamId)
  );
}

/**
 * Check if a member is assigned to any teams
 */
export function isMemberAssigned(member: WorkspaceMemberWithTeams): boolean {
  return member.teams.length > 0;
}

/**
 * Get member's role in a specific team
 * Returns null if member is not in that team
 */
export function getMemberTeamRole(
  member: WorkspaceMemberWithTeams,
  teamId: string
): TeamMemberShip | null {
  const team = member.teams.find(t => t.team_id === teamId);
  return team?.team_role || null;
}

/**
 * Add a member to workspace
 */
export async function addWorkspaceMember(
  orgWorkspaceId: string,
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
      org_workspace_id: orgWorkspaceId,
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
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if user is workspace admin
 */
export async function isWorkspaceAdmin(orgWorkspaceId: string, userId?: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const checkUserId = userId || session?.user?.id;
  if (!checkUserId) return false;

  const { data } = await supabase
    .from("workspace_access")
    .select("role")
    .eq("org_workspace_id", orgWorkspaceId)
    .eq("member_id", checkUserId)
    .single();

  return data?.role === 'owner' || data?.role === 'admin';
}

/**
 * Check if user is team leader
 */
export async function isTeamLeader(teamId: string, userId?: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const checkUserId = userId || session?.user?.id;
  if (!checkUserId) return false;

  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", checkUserId)
    .single();

  return data?.role === 'manager' || data?.role === 'commander';
}
