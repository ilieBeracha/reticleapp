// =====================================================
// SIMPLIFIED WORKSPACE TYPES
// User = Workspace (no separate workspace table)
// =====================================================

export type WorkspaceRole = "owner" | "admin" | "member";

// Profile IS the workspace
export interface Workspace {
  id: string;                   // user's profile.id
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  workspace_name?: string | null;
  workspace_slug?: string | null;
  created_at: string;
  updated_at: string;
  
  // If viewing someone else's workspace, include access info
  access_role?: WorkspaceRole;
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

export type TeamRole =
  | "sniper"
  | "pistol"
  | "manager"
  | "commander"
  | "instructor"
  | "staff";

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
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
