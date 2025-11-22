// =====================================================
// ORGANIZATION-ONLY WORKSPACE TYPES
// Users must create or join organizations
// =====================================================

export type WorkspaceRole = 'owner' | 'admin' | 'instructor' | 'member';
export type TeamMemberShip =
  | "commander"        // One per team - full control
  | "squad_commander"  // Manages a squad
  | "soldier";         // Regular team member

// ORGANIZATION WORKSPACE
export interface Workspace {
  id: string;
  workspace_name: string;
  workspace_slug?: string | null;
  description?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Access info
  access_role: WorkspaceRole;
}

// Organization workspace (user-created)
export interface OrgWorkspace {
  id: string;
  name: string;
  description?: string | null;
  workspace_slug?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceAccess {
  id: string;
  org_workspace_id: string;  // Required - always org workspace
  member_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export interface WorkspaceInvitation {
  id: string;
  org_workspace_id: string;
  invite_code: string;
  role: WorkspaceRole;
  // NEW FIELDS
  team_id?: string | null;
  team_role?: TeamMemberShip | null;
  status: InvitationStatus;
  invited_by: string;
  accepted_by?: string | null;
  accepted_at?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceInvitationWithDetails extends WorkspaceInvitation {
  workspace_name?: string;
  invited_by_name?: string;
  accepted_by_name?: string;
  team_name?: string; // NEW
}

export type TeamType = "field" | "back_office";

export interface Team {
  id: string;
  org_workspace_id: string;  // Always org workspace
  name: string;
  team_type?: TeamType | null;
  description?: string | null;
  squads?: string[];  // Array of squad names (e.g. ["Alpha", "Bravo", "Charlie"])
  created_at: string;
  updated_at: string;
}


export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamMemberShip;
  details?: { squad_id?: string };  // Squad assignment from team's squads array
  joined_at: string;
}

// Enriched types
export interface WorkspaceWithTeams extends Workspace {
  teams?: Team[];
  member_count?: number;
}

export interface TeamWithMembers extends Team {
  members?: (TeamMember & {
    profile?: {
      id: string;
      email: string;
      full_name?: string | null;
      avatar_url?: string | null;
    };
  })[];
  member_count?: number;
}

// =====================================================
// ENHANCED MEMBER TYPES WITH TEAM CONTEXT
// =====================================================

/**
 * Team membership info embedded in workspace member data
 */
export interface TeamMembership {
  team_id: string;
  team_name: string;
  team_role: TeamMemberShip;
  team_type: TeamType | null;
  squads?: string[] | null;
  joined_team_at: string;
}

/**
 * Organization member with complete profile and team context
 * This is returned by the optimized get_org_workspace_members RPC
 */
export interface WorkspaceMemberWithTeams {
  // Workspace access fields
  id: string;
  org_workspace_id: string;
  member_id: string;
  role: WorkspaceRole;
  joined_at: string;
  
  // Profile fields (flattened for easier access)
  profile_id: string;
  profile_email: string;
  profile_full_name: string | null;
  profile_avatar_url: string | null;
  
  // Team assignments (aggregated)
  teams: TeamMembership[];
}
