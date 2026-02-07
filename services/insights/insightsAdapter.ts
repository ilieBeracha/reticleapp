/**
 * Insights Adapter
 *
 * Maps lightweight DashboardFeature rows (from session_features table)
 * to SessionWithDetails shape expected by the insights engine.
 * Avoids rewriting the engine while eliminating heavy multi-table joins.
 */

import type { SessionWithDetails } from '@/types/session';
import type { DashboardFeature } from '@/types/insights';

/**
 * Convert an array of DashboardFeature rows into SessionWithDetails objects
 * that the insights engine can consume directly.
 */
export function featuresToSessions(features: DashboardFeature[]): SessionWithDetails[] {
  return features.map(featureToSession);
}

/** Normalize legacy 'achievement' to 'engagement' */
function normalizeDrillGoal(goal: string | null | undefined): 'grouping' | 'engagement' {
  return goal === 'grouping' ? 'grouping' : 'engagement';
}

function featureToSession(f: DashboardFeature): SessionWithDetails {
  return {
    id: f.session_id,
    user_id: f.user_id,
    team_id: f.team_id,
    training_id: null,
    drill_id: null,
    weapon_id: f.weapon_id,
    weapon_category: f.weapon_category,
    session_mode: 'solo',
    status: 'completed', // Only completed sessions have features
    watch_controlled: false,
    // NOTE: engagement_mode now lives on engagements table, not sessions
    started_at: f.created_at,
    ended_at: null,
    created_at: f.created_at,
    drill_config: {
      id: '',
      name: '',
      drill_goal: normalizeDrillGoal(f.drill_goal),
      target_type: (f.target_type as 'paper' | 'tactical') ?? 'paper',
      distance_m: f.distance_m ?? 0,
      rounds_per_shooter: f.shots,
      time_limit_seconds: f.is_timed ? 1 : null,
      position: f.position,
    },
    weather: f.has_weather
      ? {
          temperature_c: null,
          humidity: null,
          wind_speed_mps: f.weather_wind_speed_mps,
          wind_direction: null,
          pressure_hpa: null,
          condition: null,
        }
      : undefined,
    stats: {
      shots_fired: f.shots,
      hits_total: f.hits,
      accuracy_pct: f.accuracy_pct != null ? Math.round(f.accuracy_pct) : 0,
      target_count: 1,
      best_dispersion_cm: f.best_grouping_cm,
      avg_distance_m: f.distance_m,
    },
  };
}
