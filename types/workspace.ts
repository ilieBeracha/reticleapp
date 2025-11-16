export type WorkspaceType = "personal" | "organization";

export interface Workspace {
  id: string;
  name: string;
  workspace_type: WorkspaceType;
  description: string | null;
  created_by: string;            // profile.id
  created_at: string;
  updated_at: string;
}

export type WorkspaceRole = "owner" | "admin" | "member";

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_role: WorkspaceRole;
  joined_at: string;
}

export type TeamType = "field" | "back_office";

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  team_type: TeamType;
  description: string | null;
  created_by: string;
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

export interface TeamMembership {
  id: string;
  user_id: string;
  team_id: string;
  role: TeamRole;
  is_active: boolean;
  joined_at: string;
}
