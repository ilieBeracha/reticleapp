export interface CreateSessionParams {
  team_id?: string | null; // NULL for personal, UUID for team
  training_id?: string | null; // Link session to a training
  drill_id?: string | null; // Link session to a specific drill
  drill_template_id?: string | null; // For quick practice from template
  session_mode?: 'solo' | 'group';
  // Custom drill config for quick practice (inline, no template)
  custom_drill_config?: {
    name: string;
    drill_goal: 'grouping' | 'achievement';
    target_type: 'paper' | 'tactical';
    distance_m: number;
    rounds_per_shooter: number;
    time_limit_seconds?: number | null;
    strings_count?: number | null; // Number of entries allowed (null = unlimited)
  };
}

/** Drill configuration embedded in session */
export interface SessionDrillConfig {
  id: string;
  name: string;
  drill_goal: 'grouping' | 'achievement'; // Primary: what the drill measures
  target_type: 'paper' | 'tactical'; // Secondary: input method hint
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
  session_mode: 'solo' | 'group';
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at?: string;
  // Optional aggregated stats (populated when requested)
  stats?: SessionAggregatedStats;
}

// ============================================================================
// SESSION TARGETS
// ============================================================================

export type TargetType = 'paper' | 'tactical';
export type PaperType = 'achievement' | 'grouping';
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
}

export interface CreateTargetParams {
  session_id: string;
  target_type: TargetType;
  distance_m?: number | null;
  lane_number?: number | null;
  planned_shots?: number | null;
  notes?: string | null;
  target_data?: Record<string, any> | null;
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
}


