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

// =====================================================
// TRAINING TYPES
// =====================================================

export type TrainingStatus = 'planned' | 'ongoing' | 'finished' | 'cancelled';

/** @deprecated Use DrillGoal for primary classification */
export type TargetType = 'paper' | 'tactical';

/**
 * DrillGoal - Primary classification for drills
 * - grouping: Measure shot consistency/dispersion (scan-only, no hit %)
 * - achievement: Measure accuracy/hits (scan OR manual, tracks hit %)
 */
export type DrillGoal = 'grouping' | 'achievement';

// =====================================================
// DRILL TYPES (SIMPLIFIED)
// =====================================================

/** @deprecated Use simple accuracy tracking instead */
export type ScoringMode = 'accuracy' | 'speed' | 'combined' | 'pass_fail' | 'points';

/** @deprecated Removed - use tags if needed */
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** @deprecated Removed - use tags if needed */
export type DrillCategory = 'fundamentals' | 'speed' | 'accuracy' | 'stress' | 'tactical' | 'competition' | 'qualification';

/** @deprecated Simplified - just use freestyle/any */
export type ShootingPosition = 'standing' | 'kneeling' | 'prone' | 'sitting' | 'barricade' | 'transition' | 'freestyle';

/** @deprecated Removed */
export type StartPosition = 'holstered' | 'low_ready' | 'high_ready' | 'table_start' | 'surrender' | 'compressed_ready';

/** @deprecated Removed - weapon is implicit */
export type WeaponCategory = 'rifle' | 'pistol' | 'shotgun' | 'carbine' | 'precision_rifle' | 'any';

/** @deprecated Removed */
export type TargetSize = 'full' | 'half' | 'head' | 'a_zone' | 'c_zone' | 'steel_8in' | 'steel_10in' | 'custom';

/** @deprecated Removed */
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
 * TrainingDrill - Individual drill instance within a training.
 * 
 * NEW ARCHITECTURE:
 * - drill_id: Reference to the source Drill definition (static properties)
 * - Instance fields: Variable properties configured for this training
 * 
 * LEGACY:
 * - drill_template_id: Old reference (deprecated, use drill_id)
 * - Inline fields: All fields present for backwards compatibility
 */
export interface TrainingDrill {
  id: string;
  training_id: string;
  order_index: number;
  
  // === DRILL REFERENCE (NEW) ===
  drill_id?: string | null;                // Reference to source Drill
  
  // === LEGACY REFERENCE ===
  /** @deprecated Use drill_id */
  drill_template_id?: string | null;
  
  // === INLINE DRILL DATA (from linked drill or legacy) ===
  name: string;
  description?: string | null;
  drill_goal: DrillGoal;
  target_type: TargetType;
  
  // === INSTANCE CONFIGURATION (variable per training) ===
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  par_time_seconds?: number | null;
  strings_count?: number | null;
  target_count?: number | null;
  min_accuracy_percent?: number | null;
  shots_per_target?: number | null;
  target_size?: TargetSize | null;
  target_exposure_seconds?: number | null;
  movement_distance_m?: number | null;
  
  // === INSTANCE-SPECIFIC ===
  instance_notes?: string | null;          // Notes specific to this training
  notes?: string | null;                   // Legacy notes field
  
  // === STATIC FIELDS (from linked drill or legacy inline) ===
  scoring_mode?: ScoringMode | null;
  points_per_hit?: number | null;
  penalty_per_miss?: number | null;
  position?: ShootingPosition | null;
  start_position?: StartPosition | null;
  weapon_category?: WeaponCategory | null;
  reload_required?: boolean | null;
  movement_type?: MovementType | null;
  difficulty?: DrillDifficulty | null;
  category?: DrillCategory | null;
  tags?: string[] | null;
  instructions?: string | null;
  diagram_url?: string | null;
  video_url?: string | null;
  safety_notes?: string | null;
  
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
  drills?: CreateTrainingDrillInput[];
}

/**
 * Input for adding a drill instance to a training.
 * 
 * NEW ARCHITECTURE:
 * - Provide drill_id to link to an existing Drill definition
 * - Instance fields (distance, shots, time) are configured here
 * 
 * LEGACY:
 * - All fields inline for backwards compatibility
 */
export interface CreateTrainingDrillInput {
  // === DRILL REFERENCE (preferred) ===
  drill_id?: string;                      // Reference to source Drill
  
  // === LEGACY REFERENCE ===
  /** @deprecated Use drill_id */
  drill_template_id?: string;
  
  // === INLINE DRILL DATA (required if no drill_id) ===
  name: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  description?: string;
  
  // === INSTANCE CONFIGURATION (variable per training) ===
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number;
  par_time_seconds?: number;
  strings_count?: number;
  target_count?: number;
  min_accuracy_percent?: number;
  shots_per_target?: number;
  target_size?: TargetSize;
  target_exposure_seconds?: number;
  movement_distance_m?: number;
  
  // === INSTANCE-SPECIFIC ===
  instance_notes?: string;
  notes?: string;                         // Legacy
  
  // === STATIC FIELDS (from linked drill or inline) ===
  scoring_mode?: ScoringMode;
  points_per_hit?: number;
  penalty_per_miss?: number;
  position?: ShootingPosition;
  start_position?: StartPosition;
  weapon_category?: WeaponCategory;
  reload_required?: boolean;
  movement_type?: MovementType;
  difficulty?: DrillDifficulty;
  category?: DrillCategory;
  tags?: string[];
  instructions?: string;
  diagram_url?: string;
  video_url?: string;
  safety_notes?: string;
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
// DRILL TYPES (Core Drill Definition)
// =====================================================

/**
 * Drill - Simplified drill definition.
 *
 * ESSENTIAL PROPERTIES ONLY:
 * - name, goal, target_type (what kind of drill)
 * - distance, shots, time_limit, strings (how to run it)
 */
export interface Drill {
  id: string;
  team_id: string;
  created_by: string;

  // === ESSENTIAL ===
  name: string;
  description?: string | null;
  drill_goal: DrillGoal;                 // grouping vs achievement
  target_type: TargetType;               // paper vs tactical

  // === DEFAULTS FOR INSTANCES ===
  distance_m: number;                    // Default distance in meters
  rounds_per_shooter: number;            // Default shots per run
  time_limit_seconds?: number | null;    // Optional time limit
  strings_count?: number | null;         // Rounds/repetitions (default 1)

  // === LEGACY FIELDS (kept for backwards compatibility) ===
  /** @deprecated */ icon?: string | null;
  /** @deprecated */ scoring_mode?: ScoringMode | null;
  /** @deprecated */ points_per_hit?: number | null;
  /** @deprecated */ penalty_per_miss?: number | null;
  /** @deprecated */ position?: ShootingPosition | null;
  /** @deprecated */ start_position?: StartPosition | null;
  /** @deprecated */ weapon_category?: WeaponCategory | null;
  /** @deprecated */ reload_required?: boolean | null;
  /** @deprecated */ movement_type?: MovementType | null;
  /** @deprecated */ difficulty?: DrillDifficulty | null;
  /** @deprecated */ category?: DrillCategory | null;
  /** @deprecated */ tags?: string[] | null;
  /** @deprecated */ instructions?: string | null;
  /** @deprecated */ safety_notes?: string | null;
  /** @deprecated */ par_time_seconds?: number | null;
  /** @deprecated */ target_count?: number | null;
  /** @deprecated */ min_accuracy_percent?: number | null;
  /** @deprecated */ shots_per_target?: number | null;
  /** @deprecated */ target_size?: TargetSize | null;
  /** @deprecated */ target_exposure_seconds?: number | null;
  /** @deprecated */ movement_distance_m?: number | null;
  /** @deprecated */ default_distance_m?: number | null;
  /** @deprecated */ default_rounds_per_shooter?: number | null;
  /** @deprecated */ default_time_limit_seconds?: number | null;
  /** @deprecated */ default_par_time_seconds?: number | null;
  /** @deprecated */ default_strings_count?: number | null;
  /** @deprecated */ default_target_count?: number | null;
  /** @deprecated */ default_min_accuracy_percent?: number | null;
  /** @deprecated */ default_shots_per_target?: number | null;
  /** @deprecated */ default_target_size?: TargetSize | null;
  /** @deprecated */ default_target_exposure_seconds?: number | null;
  /** @deprecated */ default_movement_distance_m?: number | null;
  /** @deprecated */ diagram_url?: string | null;
  /** @deprecated */ video_url?: string | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * Instance-specific configuration for a drill within a training.
 * SIMPLIFIED: Only essential run-time properties.
 */
export interface DrillInstanceConfig {
  distance_m: number;                    // Distance in meters
  rounds_per_shooter: number;            // Shots per entry
  time_limit_seconds?: number | null;    // Max time allowed
  strings_count?: number | null;         // Number of rounds (default 1)

  // Legacy (kept for backwards compatibility)
  /** @deprecated */ par_time_seconds?: number | null;
  /** @deprecated */ target_count?: number | null;
  /** @deprecated */ min_accuracy_percent?: number | null;
  /** @deprecated */ shots_per_target?: number | null;
  /** @deprecated */ target_size?: TargetSize | null;
  /** @deprecated */ target_exposure_seconds?: number | null;
  /** @deprecated */ movement_distance_m?: number | null;
}

/**
 * Training Drill Instance - Links a drill to a training with instance config.
 * 
 * This is the junction table entry that combines:
 * - Reference to the source Drill (static definition)
 * - Instance-specific configuration (variable per training)
 * - Training-specific notes
 */
export interface TrainingDrillInstance extends DrillInstanceConfig {
  id: string;
  training_id: string;
  drill_id?: string | null;              // Reference to source Drill (null for legacy inline)
  order_index: number;
  
  // === INLINE DRILL DATA (for display, copied from drill or legacy) ===
  name: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  
  // Optional static fields (from linked drill or legacy inline)
  scoring_mode?: ScoringMode | null;
  position?: ShootingPosition | null;
  start_position?: StartPosition | null;
  weapon_category?: WeaponCategory | null;
  reload_required?: boolean | null;
  movement_type?: MovementType | null;
  difficulty?: DrillDifficulty | null;
  category?: DrillCategory | null;
  tags?: string[] | null;
  instructions?: string | null;
  diagram_url?: string | null;
  video_url?: string | null;
  safety_notes?: string | null;
  points_per_hit?: number | null;
  penalty_per_miss?: number | null;
  
  // === INSTANCE-SPECIFIC ===
  instance_notes?: string | null;        // Notes specific to this training
  description?: string | null;           // Legacy notes field
  
  // === LEGACY ===
  /** @deprecated Use drill_id */
  drill_template_id?: string | null;
  notes?: string | null;
  
  created_at: string;
}

/**
 * Input for creating a Drill - SIMPLIFIED
 * Only 6 essential fields: name, goal, target_type, distance, shots, time
 */
export interface CreateDrillInput {
  // === ESSENTIAL ===
  name: string;
  description?: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number;
  strings_count?: number;

  // === LEGACY (kept for backwards compatibility) ===
  /** @deprecated */ icon?: string;
  /** @deprecated */ scoring_mode?: ScoringMode;
  /** @deprecated */ points_per_hit?: number;
  /** @deprecated */ penalty_per_miss?: number;
  /** @deprecated */ position?: ShootingPosition;
  /** @deprecated */ start_position?: StartPosition;
  /** @deprecated */ weapon_category?: WeaponCategory;
  /** @deprecated */ reload_required?: boolean;
  /** @deprecated */ movement_type?: MovementType;
  /** @deprecated */ difficulty?: DrillDifficulty;
  /** @deprecated */ category?: DrillCategory;
  /** @deprecated */ tags?: string[];
  /** @deprecated */ instructions?: string;
  /** @deprecated */ diagram_url?: string;
  /** @deprecated */ video_url?: string;
  /** @deprecated */ safety_notes?: string;
  /** @deprecated */ default_distance_m?: number;
  /** @deprecated */ default_rounds_per_shooter?: number;
  /** @deprecated */ default_time_limit_seconds?: number;
  /** @deprecated */ default_par_time_seconds?: number;
  /** @deprecated */ default_strings_count?: number;
  /** @deprecated */ default_target_count?: number;
  /** @deprecated */ default_min_accuracy_percent?: number;
  /** @deprecated */ default_shots_per_target?: number;
  /** @deprecated */ default_target_size?: TargetSize;
  /** @deprecated */ default_target_exposure_seconds?: number;
  /** @deprecated */ default_movement_distance_m?: number;
}

/**
 * Input for creating a drill instance within a training
 */
export interface CreateDrillInstanceInput extends DrillInstanceConfig {
  drill_id?: string;                     // Reference to source Drill (optional for inline)
  
  // === INLINE FIELDS (required if no drill_id) ===
  name?: string;
  drill_goal?: DrillGoal;
  target_type?: TargetType;
  
  // === INSTANCE-SPECIFIC ===
  instance_notes?: string;
}

// =====================================================
// LEGACY ALIASES (for backwards compatibility)
// =====================================================

/** @deprecated Use Drill instead */
export type DrillTemplate = Drill;

/** @deprecated Use CreateDrillInput instead */
export interface CreateDrillTemplateInput extends CreateDrillInput {}

