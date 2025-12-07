// =====================================================
// TEAM-FIRST ARCHITECTURE TYPES
// Users create and manage teams directly
// =====================================================

export type TeamRole = 'owner' | 'commander' | 'squad_commander' | 'soldier';

// TEAM (Primary Entity)
export interface Team {
  id: string;
  name: string;
  description?: string | null;
  team_type?: TeamType | null;
  squads?: string[];  // Array of squad names (e.g. ["Alpha", "Bravo", "Charlie"])
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TeamType = "field" | "back_office";

// Team with user's role in it
export interface TeamWithRole extends Team {
  my_role: TeamRole;
  member_count?: number;
}

// Team member
export interface TeamMember {
  team_id: string;
  user_id: string;
  role: {
    role: TeamRole;
    squad_id?: string;
  };
  details?: { squad_id?: string };  // Squad assignment from team's squads array
  joined_at: string;
}

// Team member with profile info
export interface TeamMemberWithProfile extends TeamMember {
  profile: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

// Enriched team with members
export interface TeamWithMembers extends Team {
  members?: TeamMemberWithProfile[];
  member_count?: number;
}

// =====================================================
// INVITATION TYPES
// =====================================================

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export interface TeamInvitation {
  id: string;
  team_id: string;
  invite_code: string;
  role: TeamRole;  // Team role to be assigned
  details?: Record<string, any> | null;
  status: InvitationStatus;
  invited_by: string;
  accepted_by?: string | null;
  accepted_at?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitationWithDetails extends TeamInvitation {
  team_name?: string;
  invited_by_name?: string;
  accepted_by_name?: string;
}

/** @deprecated Use TeamInvitation instead */
export interface WorkspaceInvitation extends TeamInvitation {}

/** @deprecated Use TeamInvitationWithDetails instead */
export interface WorkspaceInvitationWithDetails extends TeamInvitationWithDetails {
  org_workspace_id?: string;
  workspace_name?: string;
}

// =====================================================
// TRAINING TYPES
// =====================================================

export type TrainingStatus = 'planned' | 'ongoing' | 'finished' | 'cancelled';
export type TargetType = 'paper' | 'tactical';

/**
 * Training - A scheduled training event for a team
 */
export interface Training {
  id: string;
  team_id: string;
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
  team_id: string;
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
}

// =====================================================
// LEGACY/DEPRECATED - Keep for migration compatibility
// =====================================================

/** @deprecated Use TeamRole instead */
export type WorkspaceRole = 'owner' | 'admin' | 'instructor' | 'member' | 'attached';

/** @deprecated Use TeamRole instead */
export type TeamMemberShip = TeamRole;
