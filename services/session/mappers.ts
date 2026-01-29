import type { SessionDrillConfig, SessionWeatherData, SessionWithDetails } from './types';

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
  const userWeapon = row.user_weapons ?? {};
  const customConfig = row.custom_drill_config;

  // ═══════════════════════════════════════════════════════════════════════════
  // DRILL CONFIG: Source of truth is FK join (training_drills > drill_templates)
  // custom_drill_config is DEPRECATED - only used for solo quick practice
  // ═══════════════════════════════════════════════════════════════════════════
  let drillConfig: SessionDrillConfig | null = null;

  // Priority: training_drills > drill_templates > linkedDrill > custom_drill_config
  const drillSource = drills.id ? drills : drillTemplate.id ? drillTemplate : linkedDrill.id ? linkedDrill : null;

  if (drillSource) {
    // Commander's rules come from the FK-joined drill
    drillConfig = {
      id: drillSource.id,
      name: drillSource.name,
      drill_goal: drillSource.drill_goal ?? 'engagement',
      target_type: drillSource.target_type,
      input_method: drillSource.input_method ?? null,
      // Commander's constraints (NULL means soldier chooses)
      distance_m: drillSource.distance_m ?? null,
      distance_category: drillSource.distance_category ?? null,
      rounds_per_shooter: drillSource.rounds_per_shooter ?? null,
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
      detection_sensitivity: customConfig?.detection_sensitivity ?? null,
      execution_policy: drillSource.execution_policy ?? null,
    };
  } else if (customConfig) {
    // DEPRECATED: Solo quick practice only (no FK drill reference)
    drillConfig = {
      id: 'custom',
      name: customConfig.name ?? 'Quick Practice',
      drill_goal: customConfig.drill_goal ?? 'grouping',
      target_type: customConfig.target_type ?? 'paper',
      input_method: customConfig.input_method ?? null,
      distance_m: customConfig.distance_m ?? null,
      distance_category: customConfig.distance_category ?? null,
      rounds_per_shooter: customConfig.rounds_per_shooter ?? null,
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
      position: customConfig.position ?? null,
      start_position: customConfig.start_position ?? null,
      weapon_category: customConfig.weapon_category ?? null,
      strings_count: customConfig.strings_count ?? null,
      reload_required: null,
      movement_type: null,
      movement_distance_m: null,
      difficulty: null,
      category: customConfig.category ?? null,
      instructions: null,
      safety_notes: null,
      detection_sensitivity: customConfig.detection_sensitivity ?? null,
      execution_policy: customConfig.execution_policy ?? null,
    };
  }

  // Determine drill name: prefer training_drills > drill_templates > custom
  const drillName = drills.name ?? drillTemplate.name ?? customConfig?.name ?? null;

  // Map engagement if present (for squad/group sessions)
  // Note: engagement is a one-to-many relation, so it comes as an array from Supabase
  const engagementData = row.engagement;
  const rawEngagement = Array.isArray(engagementData) ? engagementData[0] : engagementData;

  // Map engagement with participants
  const engagement = rawEngagement
    ? {
        ...rawEngagement,
        engagement_participants:
          rawEngagement.engagement_participants?.map((p: any) => ({
            id: p.id,
            engagement_id: rawEngagement.id,
            user_id: p.user_id,
            state: p.state,
            role: p.role,
            shots_fired: p.shots_fired ?? null,
            hits: p.hits ?? null,
            joined_at: p.joined_at ?? null,
            created_at: p.created_at,
            // Note: user_full_name needs to be fetched separately (no FK relation to profiles)
            user_full_name: null,
            user_avatar_url: null,
          })) ?? [],
      }
    : null;

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
    weapon_id: row.weapon_id ?? null,
    weapon_name: userWeapon.name ?? null,
    weapon_category: userWeapon.category ?? null,
    weapon_caliber: userWeapon.caliber ?? null,
    session_mode: row.session_mode,
    status: row.status,
    watch_controlled: row.watch_controlled ?? false,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    weather: (row.weather as SessionWeatherData | null) ?? null,
    engagement: engagement ?? null,
    // Soldier choices (when commander allows flexibility)
    soldier_distance_m: row.soldier_distance_m ?? null,
    soldier_bullets: row.soldier_bullets ?? null,
    soldier_position: row.soldier_position ?? null,
  };
}
