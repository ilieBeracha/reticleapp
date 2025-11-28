// =====================================================
// ORGANIZATION-ONLY WORKSPACE TYPES
// Users must create or join organizations
// =====================================================

export type WorkspaceRole = 'owner' | 'admin' | 'instructor' | 'member' | 'attached';
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

// =====================================================
// TRAINING TYPES
// =====================================================

export type TrainingStatus = 'planned' | 'ongoing' | 'finished' | 'cancelled';
export type TargetType = 'paper' | 'tactical';

/**
 * Training - A scheduled training event for an organization
 * Must include at least one team
 */
export interface Training {
  id: string;
  org_workspace_id: string;
  team_id: string | null;  // Primary team (optional, can have multiple via sessions)
  title: string;
  description?: string | null;
  scheduled_at: string;
  status: TrainingStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Training with related data
 */
export interface TrainingWithDetails extends Training {
  team?: Team | null;
  drills?: TrainingDrill[];
  drill_count?: number;
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * TrainingDrill - Individual drill within a training
 */
export interface TrainingDrill {
  id: string;
  training_id: string;
  order_index: number;
  name: string;
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  position?: string | null;  // e.g. 'prone', 'kneeling', 'standing'
  weapon_category?: string | null;  // e.g. 'rifle', 'pistol'
  notes?: string | null;
  created_at: string;
}

/**
 * Input for creating a new training
 */
export interface CreateTrainingInput {
  org_workspace_id: string;
  team_id: string;  // Required - at least one team
  title: string;
  description?: string;
  scheduled_at: string;
  drills?: CreateDrillInput[];
}

/**
 * Input for creating a drill
 */
export interface CreateDrillInput {
  name: string;
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number;
  position?: string;
  weapon_category?: string;
  notes?: string;
}

/**
 * Input for updating a training
 */
export interface UpdateTrainingInput {
  title?: string;
  description?: string;
  scheduled_at?: string;
  status?: TrainingStatus;
  team_id?: string;
}
