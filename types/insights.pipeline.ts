// ============================================================================
// INSIGHT PIPELINE TYPES
// ============================================================================

/**
 * Session features as stored in database.
 * Canonical analysis layer - one row per session.
 */
export interface SessionFeatures {
  id: string;
  session_id: string;
  user_id: string;
  team_id: string | null;
  created_at: string;

  // Performance
  shots: number;
  hits: number;
  accuracy_pct: number | null;
  grouping_cm: number | null;
  best_grouping_cm: number | null;

  // Paper specifics
  dispersion_cm: number | null;
  offset_right_cm: number | null;
  offset_up_cm: number | null;

  // Tactical specifics
  stages_cleared: number;

  // Timing
  avg_time_between_shots_sec: number | null;
  engagement_time_sec: number | null;
  fastest_engagement_sec: number | null;
  session_duration_sec: number | null;

  // Context
  distance_m: number | null;
  position: string | null;
  weapon_id: string | null;
  weapon_category: string | null;
  drill_goal: string | null;
  target_type: string | null;

  // Biometrics
  has_biometrics: boolean;
  stress_avg: number | null;
  stress_trend: 'increasing' | 'decreasing' | 'stable' | null;
  hr_avg: number | null;
  hr_min: number | null;
  hr_max: number | null;
  flinch_count: number;
  optimal_shot_pct: number | null;

  // Weather
  has_weather: boolean;
  weather_temp_c: number | null;
  weather_humidity: number | null;
  weather_wind_speed_mps: number | null;
  weather_wind_bearing: number | null;
  weather_condition: string | null;
  weather_wind_impact: 'negligible' | 'minor' | 'moderate' | 'significant' | 'severe' | null;
  weather_condition_severity: 'ideal' | 'good' | 'moderate' | 'poor' | 'severe' | null;
}

/**
 * User baseline for a specific condition.
 */
export interface UserBaseline {
  id: string;
  user_id: string;
  condition_key: string;
  n: number;
  avg_accuracy: number | null;
  std_accuracy: number | null;
  avg_grouping: number | null;
  std_grouping: number | null;
  avg_stress: number | null;
  avg_optimal_shot_pct: number | null;
  updated_at: string;
}

/**
 * Insight types for categorization.
 */
export type InsightType =
  | 'baseline_deviation'
  | 'offset_pattern'
  | 'fatigue_correlation'
  | 'grouping_regression'
  | 'biometric_pattern'
  | 'achievement'
  | 'summary'
  // Anomaly types (immediate insights for exceptional sessions)
  | 'anomaly_high'
  | 'anomaly_low'
  // LLM-generated insights
  | 'llm_insight'
  // Contextual comparisons
  | 'contextual_comparison'
  | 'pattern_detection'
  // Widget-specific AI insights (on-demand)
  | 'widget_insight';

/**
 * Attribution factors for insights.
 */
export type InsightFactor =
  | 'execution'
  | 'wind'
  | 'weather'
  | 'fatigue'
  | 'stress'
  | 'stance'
  | 'zero'
  | 'trigger'
  | 'pacing'
  | 'conditions'
  | 'consistency'
  | 'temperature'
  | 'humidity'
  | 'unknown';

/**
 * Generated insight before storage.
 */
export interface GeneratedInsight {
  title: string;
  summary: string;
  primary_factor: InsightFactor | null;
  secondary_factor: InsightFactor | null;
  score: number; // 0-100, higher = more important
  tags: string[];
  insight_type: InsightType;
  evidence: Record<string, unknown>;
}

/**
 * Stored insight from database.
 */
export interface SessionInsight extends GeneratedInsight {
  id: string;
  session_id: string;
  user_id: string;
  created_at: string;
}

/**
 * Input for insight generation.
 */
export interface InsightGenerationInput {
  features: SessionFeatures;
  baseline: UserBaseline | null;
}

/**
 * Result of insight pipeline execution.
 */
export interface InsightPipelineResult {
  session_id: string;
  features_computed: boolean;
  baseline_refreshed: boolean;
  insights_generated: number;
  insights: GeneratedInsight[];
  error?: string;
}

