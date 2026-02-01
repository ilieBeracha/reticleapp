import type { DrillGoal } from '@/types/workspace';

// Re-export DrillGoal for convenience
export type { DrillGoal };

// ============================================================================
// EXECUTION POLICY - How strict is drill configuration?
// ============================================================================

/**
 * Execution Policy - Always locked. Soldiers execute exactly as commander defined.
 * Only weapon selection is editable.
 *
 * @deprecated Legacy types 'guided' and 'free' kept for backward compatibility
 *             but all new drills use 'locked' only.
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

/** Engagement mode: solo (individual), squad (detailed team tracking), or group (simple team totals) */
export type EngagementMode = 'solo' | 'squad' | 'group';

/** Engagement execution status: pending (lobby), active (in progress), completed, or cancelled */
export type EngagementStatus = 'pending' | 'active' | 'completed' | 'cancelled';

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
  /** When the engagement was started by the commander */
  started_at: string | null;
  created_at: string;
  /** Participants (populated when fetched with session) */
  engagement_participants?: EngagementParticipant[];
}

/** State of a participant in a squad engagement */
export type ParticipantState = 'pending' | 'joined' | 'declined' | 'left';

/**
 * Engagement role: shooter (fires weapon) or spotter (observer/assistant).
 * Different from ParticipantRole which is for broader session context.
 */
export type EngagementRole = 'shooter' | 'spotter';

/** Per-target result entry for multi-target engagements */
export interface TargetResultEntry {
  target_number: number;
  shots_fired: number;
  hits: number;
}

/** Measurement scope: who owns the results */
export type MeasurementScope = 'individual' | 'collective';

/**
 * A participant in a squad engagement.
 *
 * Squad mode tracks GROUP totals - all participants share one session.
 * Each participant can record their contribution (shots/hits).
 * Results are aggregated for the group, NOT counted in individual insights.
 */
export interface EngagementParticipant {
  id: string;
  /** Reference to the engagement */
  engagement_id: string;
  user_id: string;
  state: ParticipantState;
  /** Engagement role: shooter (fires weapon) or spotter (observer) */
  role: EngagementRole;
  joined_at: string | null;
  created_at: string;
  /** Participant's contribution to group totals */
  shots_fired?: number | null;
  hits?: number | null;
  /** Per-target results for multi-target engagements. NULL when target_count=1 */
  target_results?: TargetResultEntry[] | null;
  /** Joined from user profile */
  user_full_name?: string | null;
  user_avatar_url?: string | null;
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
  /** Range category constraint (short/medium/long). Soldier picks exact distance within range. */
  distance_category?: RangeCategory | null;
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
  team_id: string | null; // null = personal solo session
  training_id: string | null; // null = ad-hoc session

  // Weapon (required for session - user_weapons.id)
  weapon_id: string | null; // Reference to user's weapon profile

  // Config source (ONE of these, or neither for blank session)
  drill_id: string | null; // Reference to saved drill/preset
  drill_template_id?: string | null; // @deprecated - use drill_id
  drill_config: DrillConfig | null; // Inline custom drill (DEPRECATED for team training)

  // Session mode
  session_mode: 'solo' | 'group';

  // Watch control
  watch_controlled: boolean; // user's choice per session

  // Optional metadata
  notes?: string;

  // Weather conditions at session start (from OpenWeatherMap or manual)
  weather?: SessionWeatherData | null;

  // Start as pending (for watch selection flow)
  // When true, session is created as 'pending' and user must call activateSession()
  start_as_pending?: boolean;

  // ===================================================================
  // SOLDIER CHOICES - Values chosen by soldier when commander allows flexibility
  // Commander sets rules in training_drills, soldier picks within those constraints
  // ===================================================================
  /** Actual distance soldier chose (when commander set distance_category or NULL distance_m) */
  soldier_distance_m?: number | null;
  /** Actual bullets soldier chose (when commander left rounds_per_shooter NULL) */
  soldier_bullets?: number | null;
  /** Actual position soldier chose (when commander left position NULL) */
  soldier_position?: string | null;
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

/** Range category for distance selection (soldier picks exact distance within range) */
export type RangeCategory = 'short' | 'medium' | 'long';

/** Drill configuration embedded in session */
export interface SessionDrillConfig {
  id: string;
  name: string;
  drill_goal: DrillGoal; // Primary: what the drill measures
  target_type: 'paper' | 'tactical'; // Secondary: input method hint
  input_method?: 'scan' | 'manual' | null; // Commander's explicit choice (overrides target_type inference)
  distance_m?: number | null; // Exact distance (null when using distance_category)
  distance_category?: RangeCategory | null; // Range category (short 0-300, medium 300-600, long 600+)
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
  /** Max times a soldier can execute this drill */
  max_executions?: number | null;
  /** Measurement scope: individual or collective */
  measurement_scope?: 'individual' | 'collective' | null;
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
  drill_config?: SessionDrillConfig | null; // Full drill configuration (from FK join)
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

  // ===================================================================
  // SOLDIER CHOICES - Values chosen by soldier at execution time
  // These override drill defaults when commander allows flexibility
  // ===================================================================
  /** Actual distance soldier shot at (when commander set distance_category or NULL distance_m) */
  soldier_distance_m?: number | null;
  /** Actual bullets soldier used (when commander left rounds_per_shooter NULL) */
  soldier_bullets?: number | null;
  /** Actual position soldier used (when commander left position NULL) */
  soldier_position?: string | null;
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
// MISS ANALYZER - Normalized miss point data
// ============================================================================

/**
 * A single miss point in normalized coordinates.
 * Used by the Miss Analyzer to record where shots missed the target.
 *
 * Coordinate system:
 * - Center of target = (0, 0)
 * - x: -1 (far left) to +1 (far right)
 * - y: -1 (far below center) to +1 (far above center)
 * - distance: 0 (dead center) to 1 (edge of target)
 * - angle_deg: compass bearing, 0 = up (12 o'clock), clockwise
 *
 * Resolution-independent — no pixel values stored.
 */
export interface MissPoint {
  /** Horizontal offset from center: -1 (left) to +1 (right) */
  x: number;
  /** Vertical offset from center: -1 (below) to +1 (above) */
  y: number;
  /** Normalized radial distance from center: 0 to 1 */
  distance: number;
  /** Compass bearing in degrees: 0 = up, 90 = right, 180 = down, 270 = left */
  angle_deg: number;
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
  /**
   * Miss Analyzer data: array of normalized miss coordinates.
   * NULL = not analyzed. [] = analyzed, no misses recorded.
   */
  miss_points?: MissPoint[] | null;
}

export interface TacticalTargetResult {
  id: string;
  session_target_id: string;
  bullets_fired: number;
  hits: number;
  is_stage_cleared: boolean;
  time_seconds: number | null;
  notes: string | null;
  /**
   * Miss Analyzer data: array of normalized miss coordinates.
   * NULL = not analyzed. [] = analyzed, no misses recorded.
   */
  miss_points?: MissPoint[] | null;
  /**
   * Whether the first shot was a hit.
   * NULL = not tracked, true = hit, false = miss.
   */
  first_shot_hit?: boolean | null;
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
  /** Miss Analyzer: normalized miss coordinates */
  miss_points?: MissPoint[] | null;
}

export interface CreateTacticalResultParams {
  session_target_id: string;
  bullets_fired: number;
  hits: number;
  is_stage_cleared?: boolean;
  time_seconds?: number | null;
  notes?: string | null;
  /** Miss Analyzer: normalized miss coordinates */
  miss_points?: MissPoint[] | null;
  /** Whether the first shot was a hit */
  first_shot_hit?: boolean | null;
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
