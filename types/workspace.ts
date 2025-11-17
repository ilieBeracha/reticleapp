// =====================================================
// HYBRID WORKSPACE TYPES
// Personal Workspace (user profile) + Org Workspaces (created)
// =====================================================

export type WorkspaceRole = 'owner' | 'admin' | 'instructor' | 'member';
export type WorkspaceType = 'personal' | 'org';
export type TeamMemberShip =
  | "sniper"
  | "pistol"
  | "manager"
  | "commander"
  | "instructor"
  | "staff";

// UNIFIED WORKSPACE INTERFACE
// Can be either a personal workspace (profile) or org workspace
export interface Workspace {
  id: string;
  personal_workspace_id?: string | null;
  workspace_type: WorkspaceType;
  workspace_name?: string | null;
  workspace_slug?: string | null;
  created_at: string;
  updated_at: string;
  
  // Personal workspace fields (when workspace_type = 'personal')
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  
  // Org workspace fields (when workspace_type = 'org')
  description?: string | null;
  created_by?: string;
  
  // Access info
  access_role?: WorkspaceRole;
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
  workspace_owner_id: string;  // profile.id of workspace owner
  member_id: string;            // user who has access
  role: WorkspaceRole;
  joined_at: string;
}

export type TeamType = "field" | "back_office";

export interface Team {
  id: string;
  workspace_owner_id: string;  // profile.id (workspace owner)
  name: string;
  team_type?: TeamType | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}


export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamMemberShip;
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
