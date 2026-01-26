import type { DrillGoal } from '@/types/workspace';

// Re-export DrillGoal for convenience
export type { DrillGoal };

// ============================================================================
// EXECUTION POLICY - How strict is drill configuration?
// ============================================================================

/**
 * Execution Policy - Commander's intent for how strictly a drill must be followed.
 * 
 * This is NOT about whether execution happens.
 * Training decides how strict execution is.
 * 
 * @example
 * - locked: Military qualification - execute EXACTLY as defined
 * - guided: Training drill - defaults provided, adjustments allowed
 * - free: Open practice - drill is just a label, full freedom
 */
export type ExecutionPolicy = 'locked' | 'guided' | 'free';

// ============================================================================
// ENGAGEMENT - The Atomic Execution Unit
// ============================================================================

/**
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * Mental model:
 * - Training decides "who is around" (context only)
 * - Session decides "what setup applies" (setup container)
 * - Engagement decides "what actually happened" (atomic execution)
 *
 * CANONICAL RULES:
 * - Grouping engagements are ALWAYS solo (enforced by enforceEngagementMode)
 * - Squad engagements are async-only (no live presence)
 * - Participants only acknowledge/consent, shooter executes alone
 */

/** Engagement mode: solo (individual) or squad (async team participation) */
export type EngagementMode = 'solo' | 'squad';

/** Engagement execution status: completed or aborted */
export type EngagementStatus = 'completed' | 'aborted';

/**
 * Engagement record - the atomic execution unit.
 * 
 * CANONICAL SCHEMA:
 * - One shooter, one result
 * - Optional participants (async consent only)
 * - drill_goal determines if squad mode is allowed
 */
export interface Engagement {
  id: string;
  /** Optional link to training context */
  training_id: string | null;
  /** Reference to session setup (weapon, environment) */
  session_id: string;
  /** The user who executed this engagement */
  shooter_id: string;
  /** Primary classification: grouping (always solo) or engagement (can be squad) */
  drill_goal: DrillGoal;
  /** Execution mode: solo or squad (grouping is ALWAYS solo) */
  engagement_mode: EngagementMode;
  /** Final status */
  status: EngagementStatus;
  created_at: string;
}

/** State of a participant in a squad engagement */
export type ParticipantState = 'pending' | 'joined' | 'left';

/**
 * A participant in a squad engagement.
 * 
 * CANONICAL RULES:
 * - References engagement_id ONLY (never session_id)
 * - Participants acknowledge/consent asynchronously
 * - Shooter executes alone, result is attributed to participants
 */
export interface EngagementParticipant {
  id: string;
  /** Reference to the engagement (execution unit) */
  engagement_id: string;
  user_id: string;
  state: ParticipantState;
  joined_at: string | null;
  created_at: string;
  /** Joined from user profile */
  user_full_name?: string | null;
  user_avatar_url?: string | null;
}

// ============================================================================
// ENGAGEMENT MODE GUARD (MANDATORY)
// ============================================================================

/**
 * Enforce engagement mode based on drill goal.
 * 
 * CANONICAL RULE: Grouping is ALWAYS solo.
 * 
 * @param drillGoal - The drill goal (grouping or engagement)
 * @param requested - The requested engagement mode (optional)
 * @returns The enforced engagement mode
 */
export function enforceEngagementMode(
  drillGoal: DrillGoal,
  requested?: EngagementMode
): EngagementMode {
  // Grouping is ALWAYS solo - this is non-negotiable
  if (drillGoal === 'grouping') {
    return 'solo';
  }
  // For engagement drills, use requested mode or default to solo
  return requested ?? 'solo';
}

// ============================================================================
// WEATHER DATA - Stored with session
// ============================================================================

/**
 * Weather data stored with a session.
 * Can come from OpenWeatherMap API or Garmin watch.
 */
export interface SessionWeatherData {
  /** Temperature in Celsius */
  temperature_c: number | null;
  /** Temperature in Fahrenheit */
  temperature_f?: number | null;
  /** Humidity percentage (0-100) */
  humidity: number | null;
  /** Wind speed in meters per second */
  wind_speed_mps: number | null;
  /** Wind speed in mph (computed) */
  wind_speed_mph?: number | null;
  /** Wind speed in kph (computed) */
  wind_speed_kph?: number | null;
  /** Wind direction cardinal (N, NE, E, etc.) */
  wind_direction: string | null;
  /** Wind bearing in degrees (0-360) */
  wind_bearing?: number | null;
  /** Atmospheric pressure in hPa */
  pressure_hpa: number | null;
  /** Weather condition string */
  condition: string | null;
  /** Wind impact assessment: calm | light | moderate | strong */
  wind_impact?: 'calm' | 'light' | 'moderate' | 'strong';
  /** Condition severity: ideal | good | challenging | difficult | extreme */
  condition_severity?: 'ideal' | 'good' | 'challenging' | 'difficult' | 'extreme';
  /** Data source */
  source?: 'openweathermap' | 'garmin_watch' | 'manual';
  /** When the weather was fetched */
  fetched_at?: string;
}

// ============================================================================
// BASE SESSION CONFIG - Unified structure for ALL session creation
// ============================================================================

/**
 * Inline drill configuration for custom/ad-hoc drills.
 * Used when starting a session without a saved template.
 */
export interface DrillConfig {
  name?: string;
  drill_goal: DrillGoal;
  target_type?: 'paper' | 'tactical';
  input_method?: 'scan' | 'manual' | null; // User's explicit choice
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  strings_count?: number | null; // Number of entries allowed (null = unlimited)
  /** Shooting position: prone, standing, kneeling, sitting */
  position?: string | null;
  /** When following a category drill, this is the drill ID from categoryDrills.ts */
  category_drill_id?: string | null;
  /** Execution policy - controls config freedom during session */
  execution_policy?: ExecutionPolicy | null;
  /** Custom detection sensitivity in G-force (for watch mode) */
  detection_sensitivity?: number | null;
}

/**
 * BaseSessionConfig - The unified structure ALL session creation flows must use.
 * 
 * SIMPLIFIED (v2):
 * - drill_id: Reference to ANY saved drill (team OR personal preset)
 * - drill_config: Inline config for Quick Start / Custom (no saved reference)
 * 
 * Entry points:
 * - Quick Start (one tap, uses defaults)
 * - Custom (inline config)
 * - My Presets (saved personal drills)
 * - Team Training (drill from training)
 * 
 * All funnel through sessionService.createSession(config: BaseSessionConfig)
 */
export interface BaseSessionConfig {
  // Context
  team_id: string | null;           // null = personal solo session
  training_id: string | null;       // null = ad-hoc session
  
  // Weapon (required for session - user_weapons.id)
  weapon_id: string | null;         // Reference to user's weapon profile
  
  // Config source (ONE of these, or neither for blank session)
  drill_id: string | null;          // Reference to saved drill/preset
  drill_template_id?: string | null; // @deprecated - use drill_id
  drill_config: DrillConfig | null; // Inline custom drill
  
  // Session mode
  session_mode: 'solo' | 'group';
  
  // Watch control
  watch_controlled: boolean;        // user's choice per session
  
  // Optional metadata
  notes?: string;
  
  // Weather conditions at session start (from OpenWeatherMap or manual)
  weather?: SessionWeatherData | null;
  
  // Start as pending (for watch selection flow)
  // When true, session is created as 'pending' and user must call activateSession()
  start_as_pending?: boolean;
}

/**
 * @deprecated Use BaseSessionConfig.drill_id instead.
 * drill_template_id is no longer used - all saved drills use drill_id.
 */
export type LegacyDrillTemplateId = string | null;

/**
 * @deprecated Use BaseSessionConfig instead. This type is kept for backwards compatibility.
 */
export interface CreateSessionParams {
  team_id?: string | null; // NULL for personal, UUID for team
  training_id?: string | null; // Link session to a training
  drill_id?: string | null; // Link session to a specific drill
  drill_template_id?: string | null; // For quick practice from template
  session_mode?: 'solo' | 'group';
  watch_controlled?: boolean; // Watch control choice
  // Custom drill config for quick practice (inline, no template)
  custom_drill_config?: DrillConfig;
}

/** Drill configuration embedded in session */
export interface SessionDrillConfig {
  id: string;
  name: string;
  drill_goal: DrillGoal; // Primary: what the drill measures
  target_type: 'paper' | 'tactical'; // Secondary: input method hint
  input_method?: 'scan' | 'manual' | null; // Commander's explicit choice (overrides target_type inference)
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number | null;
  par_time_seconds?: number | null;
  scoring_mode?: string | null;
  min_accuracy_percent?: number | null;
  points_per_hit?: number | null;
  penalty_per_miss?: number | null;
  target_count?: number | null;
  target_size?: string | null;
  shots_per_target?: number | null;
  target_exposure_seconds?: number | null;
  position?: string | null;
  start_position?: string | null;
  weapon_category?: string | null;
  strings_count?: number | null;
  reload_required?: boolean | null;
  movement_type?: string | null;
  movement_distance_m?: number | null;
  difficulty?: string | null;
  category?: string | null;
  instructions?: string | null;
  safety_notes?: string | null;
  /** Custom detection sensitivity in G-force (user calibrated) */
  detection_sensitivity?: number | null;
  /** Execution policy - controls whether user can reconfigure during session
   * 'locked' = must execute exactly as defined (qualification)
   * 'guided' = defaults pre-filled, can adjust (training)
   * 'free' = full freedom (open practice)
   */
  execution_policy?: 'locked' | 'guided' | 'free' | null;
}

/** Aggregated session statistics (computed from targets) */
export interface SessionAggregatedStats {
  shots_fired: number;
  hits_total: number;
  accuracy_pct: number;
  target_count: number;
  best_dispersion_cm: number | null;
  avg_distance_m: number | null;
}

export interface SessionWithDetails {
  id: string;
  user_id: string;
  user_full_name?: string | null;
  team_id: string | null;
  team_name?: string | null;
  training_id: string | null;
  training_title?: string | null;
  drill_id: string | null;
  drill_name?: string | null;
  drill_config?: SessionDrillConfig | null; // Full drill configuration
  weapon_id: string | null; // Reference to user's weapon profile
  weapon_name?: string | null; // Joined weapon name
  weapon_category?: string | null; // Weapon category for detection sensitivity
  weapon_caliber?: string | null; // Caliber for detection sensitivity derivation
  session_mode: 'solo' | 'group';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  watch_controlled: boolean; // Whether watch controls this session
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at?: string;
  // Weather conditions at session start
  weather?: SessionWeatherData | null;
  // Optional aggregated stats (populated when requested)
  stats?: SessionAggregatedStats;
  // Engagement (execution unit) - populated when fetched with engagement
  engagement?: Engagement | null;
}

// ============================================================================
// SESSION TARGETS
// ============================================================================

export type TargetType = 'paper' | 'tactical';
// 'achievement' is legacy DB value, 'engagement' is new preferred value
export type PaperType = 'engagement' | 'grouping' | 'achievement';
export type ParticipantRole = 'sniper' | 'spotter' | 'pistol' | 'observer' | 'instructor';

export interface SessionTarget {
  id: string;
  session_id: string;
  target_type: TargetType;
  sequence_in_session: number | null;
  distance_m: number | null;
  lane_number: number | null;
  planned_shots: number | null;
  notes: string | null;
  target_data: Record<string, any> | null;
  /** For squad sessions: links target to specific participant */
  participant_id: string | null;
}

export interface CreateTargetParams {
  session_id: string;
  target_type: TargetType;
  distance_m?: number | null;
  lane_number?: number | null;
  planned_shots?: number | null;
  notes?: string | null;
  target_data?: Record<string, any> | null;
  /** For squad sessions: links target to specific participant */
  participant_id?: string | null;
}

// ============================================================================
// TARGET RESULTS
// ============================================================================

export interface PaperTargetResult {
  id: string;
  session_target_id: string;
  paper_type: PaperType;
  bullets_fired: number;
  hits_total: number | null;
  hits_inside_scoring: number | null;
  dispersion_cm: number | null;
  offset_right_cm: number | null;
  offset_up_cm: number | null;
  scanned_image_url: string | null;
  notes: string | null;
  /**
   * Optional: User-declared actual shots for scanned targets.
   * For scanned targets, bullets_fired = detected holes, but user may have fired more that missed entirely.
   * If set: accuracy = hits_total / actual_shots_declared
   * If null for scanned targets: don't show accuracy (it would always be ~100%)
   */
  actual_shots_declared: number | null;
}

export interface TacticalTargetResult {
  id: string;
  session_target_id: string;
  bullets_fired: number;
  hits: number;
  is_stage_cleared: boolean;
  time_seconds: number | null;
  notes: string | null;
}

export interface CreatePaperResultParams {
  session_target_id: string;
  paper_type: PaperType;
  bullets_fired: number;
  hits_total?: number | null;
  hits_inside_scoring?: number | null;
  dispersion_cm?: number | null;
  offset_right_cm?: number | null;
  offset_up_cm?: number | null;
  scanned_image_url?: string | null;
  notes?: string | null;
  /** Optional user-declared actual shots for scanned targets */
  actual_shots_declared?: number | null;
}

export interface CreateTacticalResultParams {
  session_target_id: string;
  bullets_fired: number;
  hits: number;
  is_stage_cleared?: boolean;
  time_seconds?: number | null;
  notes?: string | null;
}

export interface SessionTargetWithResults extends SessionTarget {
  paper_result?: PaperTargetResult | null;
  tactical_result?: TacticalTargetResult | null;
}

// ============================================================================
// SESSION STATS (Computed)
// ============================================================================

export interface SessionStats {
  targetCount: number;
  paperTargets: number;
  tacticalTargets: number;
  totalShotsFired: number;
  totalHits: number;
  accuracyPct: number;
  avgDispersionCm: number | null;
  bestDispersionCm: number | null;
  stagesCleared: number;
  avgEngagementTimeSec: number | null;
  fastestEngagementTimeSec: number | null;
  // Biometrics from watch (if available)
  biometrics?: {
    avgHR?: number;
    maxHR?: number;
    minHR?: number;
    avgBreathRate?: number;
  };
}


