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
      drill_goal: drillSource.drill_goal ?? 'engagement',
      target_type: drillSource.target_type,
      input_method: drillSource.input_method ?? null,
      distance_m: drillSource.distance_m,
      bullets: drillSource.rounds_per_shooter,  // Map DB column to TypeScript field
      time_limit_seconds: drillSource.time_limit_seconds ?? null,
      position: drillSource.position ?? null,
      strings_count: drillSource.strings_count ?? null,
      category: drillSource.category ?? null,
      detection_sensitivity: customConfig?.detection_sensitivity ?? null,
    };
  } else if (customConfig) {
    // Use custom drill config (inline, no template)
    drillConfig = {
      id: 'custom',
      name: customConfig.name ?? 'Quick Practice',
      drill_goal: customConfig.drill_goal ?? 'grouping',
      target_type: customConfig.target_type ?? 'paper',
      input_method: customConfig.input_method ?? null,
      distance_m: customConfig.distance_m ?? 25,
      bullets: customConfig.bullets ?? 5,  // Map TypeScript field
      time_limit_seconds: customConfig.time_limit_seconds ?? null,
      position: customConfig.position ?? null,
      strings_count: customConfig.strings_count ?? null,
      category: customConfig.category ?? null,
      detection_sensitivity: customConfig.detection_sensitivity ?? null,
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
    weather: row.weather as SessionWeatherData | null ?? null,
  };
}


