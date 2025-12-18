import type { SessionDrillConfig, SessionWithDetails } from './types';

export function mapSession(row: any): SessionWithDetails {
  if (!row) {
    throw new Error('Session payload is empty');
  }

  const profiles = row.profiles ?? {};
  const teams = row.teams ?? {};
  const trainings = row.trainings ?? {};
  const drills = row.training_drills ?? {};
  const drillTemplate = row.drill_templates ?? {};
  // NEW: Support fetching linked Drill definition via drill_id
  const linkedDrill = row.drills ?? {};
  const customConfig = row.custom_drill_config;

  // Build drill config from training_drills, drill_templates, drills, OR custom_drill_config
  let drillConfig: SessionDrillConfig | null = null;

  // Priority: training_drills > drills (via drill_id) > drill_templates > custom_drill_config
  // training_drills contains INSTANCE config (distance, shots, time)
  // drills contains STATIC config (name, goal, scoring rules) - merged if drill_id is set
  const drillSource = drills.id ? drills : drillTemplate.id ? drillTemplate : linkedDrill.id ? linkedDrill : null;

  if (drillSource) {
    drillConfig = {
      id: drillSource.id,
      name: drillSource.name,
      drill_goal: drillSource.drill_goal ?? 'achievement',
      target_type: drillSource.target_type,
      distance_m: drillSource.distance_m,
      rounds_per_shooter: drillSource.rounds_per_shooter,
      time_limit_seconds: drillSource.time_limit_seconds ?? null,
      par_time_seconds: drillSource.par_time_seconds ?? null,
      scoring_mode: drillSource.scoring_mode ?? null,
      min_accuracy_percent: drillSource.min_accuracy_percent ?? null,
      points_per_hit: drillSource.points_per_hit ?? null,
      penalty_per_miss: drillSource.penalty_per_miss ?? null,
      target_count: drillSource.target_count ?? null,
      target_size: drillSource.target_size ?? null,
      shots_per_target: drillSource.shots_per_target ?? null,
      target_exposure_seconds: drillSource.target_exposure_seconds ?? null,
      position: drillSource.position ?? null,
      start_position: drillSource.start_position ?? null,
      weapon_category: drillSource.weapon_category ?? null,
      strings_count: drillSource.strings_count ?? null,
      reload_required: drillSource.reload_required ?? null,
      movement_type: drillSource.movement_type ?? null,
      movement_distance_m: drillSource.movement_distance_m ?? null,
      difficulty: drillSource.difficulty ?? null,
      category: drillSource.category ?? null,
      instructions: drillSource.instructions ?? null,
      safety_notes: drillSource.safety_notes ?? null,
    };
  } else if (customConfig) {
    // Use custom drill config (inline, no template)
    drillConfig = {
      id: 'custom',
      name: customConfig.name ?? 'Quick Practice',
      drill_goal: customConfig.drill_goal ?? 'grouping',
      target_type: customConfig.target_type ?? 'paper',
      distance_m: customConfig.distance_m ?? 25,
      rounds_per_shooter: customConfig.rounds_per_shooter ?? 5,
      time_limit_seconds: customConfig.time_limit_seconds ?? null,
      par_time_seconds: null,
      scoring_mode: null,
      min_accuracy_percent: null,
      points_per_hit: null,
      penalty_per_miss: null,
      target_count: null,
      target_size: null,
      shots_per_target: null,
      target_exposure_seconds: null,
      position: null,
      start_position: null,
      weapon_category: null,
      strings_count: customConfig.strings_count ?? null,
      reload_required: null,
      movement_type: null,
      movement_distance_m: null,
      difficulty: null,
      category: null,
      instructions: null,
      safety_notes: null,
    };
  }

  // Determine drill name: prefer training_drills > drill_templates > custom
  const drillName = drills.name ?? drillTemplate.name ?? customConfig?.name ?? null;

  return {
    id: row.id,
    user_id: row.user_id,
    user_full_name: row.user_full_name ?? profiles.full_name ?? null,
    team_id: row.team_id ?? null,
    team_name: row.team_name ?? teams.name ?? null,
    training_id: row.training_id ?? null,
    training_title: row.training_title ?? trainings.title ?? null,
    drill_id: row.drill_id ?? null,
    drill_name: row.drill_name ?? drillName,
    drill_config: drillConfig,
    session_mode: row.session_mode,
    status: row.status,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}


