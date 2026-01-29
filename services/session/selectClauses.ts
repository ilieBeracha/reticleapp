/**
 * Centralized Supabase SELECT clauses for sessions
 *
 * IMPORTANT: These strings are used directly in .select() calls.
 * Changing field names here will affect ALL queries using that clause.
 *
 * Naming convention:
 * - SESSION_SELECT_*: For session queries
 * - TARGET_STATS_SELECT: For target statistics aggregation
 */

// ============================================================================
// SESSION SELECT CLAUSES
// ============================================================================

/**
 * Standard session select with weapon info.
 * Used for: getMyActiveSession, getSessions, getTeamSessions, etc.
 *
 * Includes: basic session fields + related names only (not full objects)
 * Note: Includes position for analytics/insights
 * Note: engagement_mode removed - squad logic lives in engagements table
 */
export const SESSION_SELECT_WITH_WEAPON = `
  id,
  user_id,
  team_id,
  training_id,
  drill_id,
  drill_template_id,
  custom_drill_config,
  weapon_id,
  session_mode,
  watch_controlled,
  status,
  started_at,
  ended_at,
  created_at,
  updated_at,
  weather,
  soldier_distance_m,
  soldier_bullets,
  soldier_position,
  profiles:user_id(full_name),
  teams:team_id(name),
  trainings:training_id(title),
  training_drills:drill_id(id, name, drill_goal, target_type, execution_policy, distance_m, distance_category, rounds_per_shooter, position, max_executions),
  drill_templates:drill_template_id(id, name, drill_goal, target_type, distance_m, rounds_per_shooter, position),
  user_weapons:weapon_id(name, caliber, category),
  engagement:engagements(
    id,
    drill_goal,
    engagement_mode,
    status,
    engagement_participants(
      id,
      user_id,
      state,
      role,
      shots_fired,
      hits
    )
  )
`;

/**
 * Minimal session select without weapon.
 * Used for: paginated queries, list views where weapon isn't needed.
 * Note: Includes position for analytics/insights
 * Note: engagement_mode removed - squad logic lives in engagements table
 */
export const SESSION_SELECT_MINIMAL = `
  id,
  user_id,
  team_id,
  training_id,
  drill_id,
  drill_template_id,
  custom_drill_config,
  session_mode,
  watch_controlled,
  status,
  started_at,
  ended_at,
  created_at,
  updated_at,
  weather,
  soldier_distance_m,
  soldier_bullets,
  soldier_position,
  profiles:user_id(full_name),
  teams:team_id(name),
  trainings:training_id(title),
  training_drills:drill_id(id, name, drill_goal, target_type, execution_policy, distance_m, distance_category, rounds_per_shooter, position, max_executions),
  drill_templates:drill_template_id(id, name, drill_goal, target_type, distance_m, rounds_per_shooter, position),
  engagement:engagements(
    id,
    drill_goal,
    engagement_mode,
    status,
    engagement_participants(
      id,
      user_id,
      state,
      role,
      shots_fired,
      hits
    )
  )
`;

/**
 * Full session select with complete drill details.
 * Used for: getSessionById where we need all drill configuration.
 *
 * Note: Fetches full drill objects (*) for both training_drills and drill_templates
 * Note: engagement_mode removed - squad logic lives in engagements table
 */
export const SESSION_SELECT_WITH_FULL_DRILL = `
  id,
  user_id,
  team_id,
  training_id,
  drill_id,
  drill_template_id,
  custom_drill_config,
  weapon_id,
  session_mode,
  watch_controlled,
  status,
  started_at,
  ended_at,
  created_at,
  updated_at,
  weather,
  soldier_distance_m,
  soldier_bullets,
  soldier_position,
  profiles:user_id(full_name),
  teams:team_id(name),
  trainings:training_id(title),
  training_drills:drill_id(
    id,
    name,
    drill_goal,
    target_type,
    input_method,
    execution_policy,
    distance_m,
    distance_category,
    rounds_per_shooter,
    time_limit_seconds,
    par_time_seconds,
    scoring_mode,
    min_accuracy_percent,
    points_per_hit,
    penalty_per_miss,
    target_count,
    target_size,
    shots_per_target,
    target_exposure_seconds,
    position,
    start_position,
    weapon_category,
    strings_count,
    reload_required,
    movement_type,
    movement_distance_m,
    difficulty,
    category,
    instructions,
    safety_notes,
    max_executions
  ),
  drill_templates:drill_template_id(
    id,
    name,
    drill_goal,
    target_type,
    distance_m,
    rounds_per_shooter,
    time_limit_seconds,
    par_time_seconds,
    scoring_mode,
    min_accuracy_percent,
    points_per_hit,
    penalty_per_miss,
    target_count,
    target_size,
    shots_per_target,
    target_exposure_seconds,
    position,
    start_position,
    weapon_category,
    strings_count,
    reload_required,
    movement_type,
    movement_distance_m,
    difficulty,
    category,
    instructions,
    safety_notes
  ),
  user_weapons:weapon_id(name, caliber, category),
  engagement:engagements(
    id,
    drill_goal,
    engagement_mode,
    status,
    started_at,
    created_at,
    engagement_participants(
      id,
      user_id,
      state,
      role,
      shots_fired,
      hits
    )
  )
`;

/**
 * Session select after CREATE operation.
 * Includes full drill objects and weapon with base_weapon.
 * Note: engagement_mode removed - squad logic lives in engagements table
 */
export const SESSION_SELECT_AFTER_CREATE = `
  id,
  user_id,
  team_id,
  training_id,
  weapon_id,
  drill_id,
  drill_template_id,
  custom_drill_config,
  session_mode,
  watch_controlled,
  status,
  started_at,
  ended_at,
  created_at,
  updated_at,
  weather,
  soldier_distance_m,
  soldier_bullets,
  soldier_position,
  profiles:user_id(full_name),
  teams:team_id(name),
  trainings:training_id(title),
  training_drills:drill_id(*),
  drill_templates:drill_template_id(*),
  user_weapons:weapon_id(id, name, base_weapon:weapons(*))
`;

/**
 * Session select after UPDATE operation.
 * Similar to create but with simpler weapon info.
 * Note: engagement_mode removed - squad logic lives in engagements table
 */
export const SESSION_SELECT_AFTER_UPDATE = `
  id,
  user_id,
  team_id,
  training_id,
  drill_id,
  drill_template_id,
  custom_drill_config,
  weapon_id,
  session_mode,
  watch_controlled,
  status,
  started_at,
  ended_at,
  created_at,
  updated_at,
  weather,
  soldier_distance_m,
  soldier_bullets,
  soldier_position,
  profiles:user_id(full_name),
  teams:team_id(name),
  trainings:training_id(title),
  training_drills:drill_id(*),
  drill_templates:drill_template_id(*),
  user_weapons:weapon_id(name, caliber)
`;

// ============================================================================
// TARGET STATISTICS SELECT
// ============================================================================

/**
 * Select clause for aggregating target statistics.
 * Used by: getSessionsWithStats, getTrainingSessions, etc.
 */
export const TARGET_STATS_SELECT = `
  session_id,
  distance_m,
  paper_target_results(
    bullets_fired,
    hits_total,
    dispersion_cm,
    scanned_image_url
  ),
  tactical_target_results(
    bullets_fired,
    hits
  )
`;
