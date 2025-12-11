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

// =====================================================
// ENHANCED DRILL TYPES
// =====================================================

/** How the drill is scored */
export type ScoringMode = 'accuracy' | 'speed' | 'combined' | 'pass_fail' | 'points';

/** Difficulty level */
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Category of drill */
export type DrillCategory = 'fundamentals' | 'speed' | 'accuracy' | 'stress' | 'tactical' | 'competition' | 'qualification';

/** Shooting positions */
export type ShootingPosition = 'standing' | 'kneeling' | 'prone' | 'sitting' | 'barricade' | 'transition' | 'freestyle';

/** Start position before drill begins */
export type StartPosition = 'holstered' | 'low_ready' | 'high_ready' | 'table_start' | 'surrender' | 'compressed_ready';

/** Weapon categories */
export type WeaponCategory = 'rifle' | 'pistol' | 'shotgun' | 'carbine' | 'precision_rifle' | 'any';

/** Target size options */
export type TargetSize = 'full' | 'half' | 'head' | 'a_zone' | 'c_zone' | 'steel_8in' | 'steel_10in' | 'custom';

/** Movement types */
export type MovementType = 'none' | 'advance' | 'retreat' | 'lateral' | 'diagonal' | 'freestyle';

/**
 * Training - A scheduled training event for a team
 */
export interface Training {
  id: string;
  team_id: string;
  title: string;
  description?: string | null;
  scheduled_at: string;
  manual_start?: boolean; // If true, commander starts training manually (no auto-start)
  status: TrainingStatus;
  started_at?: string | null; // When training was actually started
  ended_at?: string | null; // When training was finished
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
 * Enhanced with comprehensive shooting drill configuration
 */
export interface TrainingDrill {
  id: string;
  training_id: string;
  order_index: number;
  name: string;
  description?: string | null;
  
  // === BASIC CONFIG ===
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  
  // === TIMING ===
  time_limit_seconds?: number | null;      // Max time allowed
  par_time_seconds?: number | null;        // Target time to beat
  
  // === SCORING ===
  scoring_mode?: ScoringMode | null;       // How drill is scored
  min_accuracy_percent?: number | null;    // Minimum to pass (0-100)
  points_per_hit?: number | null;          // Points awarded per hit
  penalty_per_miss?: number | null;        // Penalty for misses
  
  // === TARGET CONFIGURATION ===
  target_count?: number | null;            // Number of targets (default 1)
  target_size?: TargetSize | null;         // Target size
  shots_per_target?: number | null;        // Hits required per target
  target_exposure_seconds?: number | null; // For tactical - how long visible
  
  // === SHOOTING SETUP ===
  position?: ShootingPosition | null;      // Shooting position
  start_position?: StartPosition | null;   // Where shooter starts
  weapon_category?: WeaponCategory | null; // Weapon type
  
  // === STAGE SETUP ===
  strings_count?: number | null;           // Number of repetitions/strings
  reload_required?: boolean | null;        // Must reload during drill
  movement_type?: MovementType | null;     // Movement required
  movement_distance_m?: number | null;     // Distance to move
  
  // === DIFFICULTY & CATEGORY ===
  difficulty?: DrillDifficulty | null;     // Skill level
  category?: DrillCategory | null;         // Type of drill
  tags?: string[] | null;                  // Custom tags
  
  // === RICH CONTENT ===
  instructions?: string | null;            // Step-by-step instructions
  diagram_url?: string | null;             // Reference diagram
  video_url?: string | null;               // Demo video link
  safety_notes?: string | null;            // Safety considerations
  
  notes?: string | null;                   // General notes
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
  manual_start?: boolean; // If true, commander starts training manually (no auto-start)
  drills?: CreateDrillInput[];
}

/**
 * Input for creating a drill - Enhanced with all configuration options
 */
export interface CreateDrillInput {
  name: string;
  description?: string;
  
  // === BASIC CONFIG ===
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  
  // === TIMING ===
  time_limit_seconds?: number;
  par_time_seconds?: number;
  
  // === SCORING ===
  scoring_mode?: ScoringMode;
  min_accuracy_percent?: number;
  points_per_hit?: number;
  penalty_per_miss?: number;
  
  // === TARGET CONFIGURATION ===
  target_count?: number;
  target_size?: TargetSize;
  shots_per_target?: number;
  target_exposure_seconds?: number;
  
  // === SHOOTING SETUP ===
  position?: ShootingPosition;
  start_position?: StartPosition;
  weapon_category?: WeaponCategory;
  
  // === STAGE SETUP ===
  strings_count?: number;
  reload_required?: boolean;
  movement_type?: MovementType;
  movement_distance_m?: number;
  
  // === DIFFICULTY & CATEGORY ===
  difficulty?: DrillDifficulty;
  category?: DrillCategory;
  tags?: string[];
  
  // === RICH CONTENT ===
  instructions?: string;
  diagram_url?: string;
  video_url?: string;
  safety_notes?: string;
  
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
// DRILL TEMPLATE TYPES
// =====================================================

/**
 * DrillTemplate - Reusable drill that commanders can save and use across trainings
 * Enhanced with comprehensive configuration options
 */
export interface DrillTemplate {
  id: string;
  team_id: string;
  created_by: string;
  name: string;
  description?: string | null;
  
  // === BASIC CONFIG ===
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  
  // === TIMING ===
  time_limit_seconds?: number | null;
  par_time_seconds?: number | null;
  
  // === SCORING ===
  scoring_mode?: ScoringMode | null;
  min_accuracy_percent?: number | null;
  points_per_hit?: number | null;
  penalty_per_miss?: number | null;
  
  // === TARGET CONFIGURATION ===
  target_count?: number | null;
  target_size?: TargetSize | null;
  shots_per_target?: number | null;
  target_exposure_seconds?: number | null;
  
  // === SHOOTING SETUP ===
  position?: ShootingPosition | null;
  start_position?: StartPosition | null;
  weapon_category?: WeaponCategory | null;
  
  // === STAGE SETUP ===
  strings_count?: number | null;
  reload_required?: boolean | null;
  movement_type?: MovementType | null;
  movement_distance_m?: number | null;
  
  // === DIFFICULTY & CATEGORY ===
  difficulty?: DrillDifficulty | null;
  category?: DrillCategory | null;
  tags?: string[] | null;
  
  // === RICH CONTENT ===
  instructions?: string | null;
  diagram_url?: string | null;
  video_url?: string | null;
  safety_notes?: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a drill template - Enhanced with all options
 */
export interface CreateDrillTemplateInput {
  name: string;
  description?: string;
  
  // === BASIC CONFIG ===
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  
  // === TIMING ===
  time_limit_seconds?: number;
  par_time_seconds?: number;
  
  // === SCORING ===
  scoring_mode?: ScoringMode;
  min_accuracy_percent?: number;
  points_per_hit?: number;
  penalty_per_miss?: number;
  
  // === TARGET CONFIGURATION ===
  target_count?: number;
  target_size?: TargetSize;
  shots_per_target?: number;
  target_exposure_seconds?: number;
  
  // === SHOOTING SETUP ===
  position?: ShootingPosition;
  start_position?: StartPosition;
  weapon_category?: WeaponCategory;
  
  // === STAGE SETUP ===
  strings_count?: number;
  reload_required?: boolean;
  movement_type?: MovementType;
  movement_distance_m?: number;
  
  // === DIFFICULTY & CATEGORY ===
  difficulty?: DrillDifficulty;
  category?: DrillCategory;
  tags?: string[];
  
  // === RICH CONTENT ===
  instructions?: string;
  diagram_url?: string;
  video_url?: string;
  safety_notes?: string;
}

// =====================================================
// LEGACY/DEPRECATED - Keep for migration compatibility
// =====================================================

/** @deprecated Use TeamRole instead */
export type WorkspaceRole = 'owner' | 'admin' | 'instructor' | 'member' | 'attached';

/** @deprecated Use TeamRole instead */
export type TeamMemberShip = TeamRole;
