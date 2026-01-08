-- ============================================================================
-- FIX WEATHER NULL HANDLING IN compute_session_features
-- ============================================================================
-- The previous version failed when weather JSONB existed but didn't have 
-- the expected fields. This version handles missing fields gracefully.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.compute_session_features(p_session_id uuid)
RETURNS public.session_features
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
  v_stats RECORD;
  v_paper RECORD;
  v_tactical RECORD;
  v_timeline RECORD;
  v_result public.session_features;
  -- Weather variables (declared separately for null safety)
  v_has_weather boolean := false;
  v_weather_temp_c numeric;
  v_weather_humidity integer;
  v_weather_wind_speed_mps numeric;
  v_weather_wind_bearing integer;
  v_weather_condition text;
  v_weather_wind_impact text;
  v_weather_condition_severity text;
BEGIN
  -- 1. Get session base info (including weather)
  SELECT 
    s.id,
    s.user_id,
    s.team_id,
    s.weapon_id,
    s.started_at,
    s.ended_at,
    s.weather,
    COALESCE(
      d.drill_goal,
      s.custom_drill_config->>'drill_goal',
      'achievement'
    ) as drill_goal,
    uw.category as weapon_category
  INTO v_session
  FROM sessions s
  LEFT JOIN drill_templates d ON d.id = s.drill_template_id
  LEFT JOIN user_weapons uw ON uw.id = s.weapon_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Extract weather data safely (each field individually)
  IF v_session.weather IS NOT NULL AND jsonb_typeof(v_session.weather) = 'object' THEN
    -- Check if weather has any useful data
    v_weather_temp_c := COALESCE(
      (v_session.weather->>'temperature_c')::numeric,
      (v_session.weather->>'temperatureC')::numeric,
      (v_session.weather->>'temp_c')::numeric
    );
    v_weather_humidity := COALESCE(
      (v_session.weather->>'humidity')::integer
    );
    v_weather_wind_speed_mps := COALESCE(
      (v_session.weather->>'wind_speed_mps')::numeric,
      (v_session.weather->>'windSpeedMps')::numeric
    );
    v_weather_wind_bearing := COALESCE(
      (v_session.weather->>'wind_bearing')::integer,
      (v_session.weather->>'windBearing')::integer
    );
    v_weather_condition := COALESCE(
      v_session.weather->>'condition'
    );
    v_weather_wind_impact := COALESCE(
      v_session.weather->>'wind_impact',
      v_session.weather->>'windImpact'
    );
    v_weather_condition_severity := COALESCE(
      v_session.weather->>'condition_severity',
      v_session.weather->>'conditionSeverity'
    );
    
    -- Mark as has_weather only if we have at least temp or condition
    v_has_weather := (v_weather_temp_c IS NOT NULL OR v_weather_condition IS NOT NULL);
  END IF;

  -- 2. Aggregate from session_targets + paper_target_results
  SELECT
    COALESCE(SUM(ptr.bullets_fired), 0) as total_shots,
    COALESCE(SUM(ptr.hits_total), 0) as total_hits,
    AVG(ptr.dispersion_cm) as avg_dispersion,
    MIN(ptr.dispersion_cm) as best_dispersion,
    AVG(ptr.offset_right_cm) as avg_offset_right,
    AVG(ptr.offset_up_cm) as avg_offset_up,
    MAX(st.distance_m) as distance_m,
    MODE() WITHIN GROUP (ORDER BY st.target_type) as target_type
  INTO v_paper
  FROM session_targets st
  LEFT JOIN paper_target_results ptr ON ptr.session_target_id = st.id
  WHERE st.session_id = p_session_id AND st.target_type = 'paper';

  -- 3. Aggregate from session_targets + tactical_target_results
  SELECT
    COALESCE(SUM(ttr.bullets_fired), 0) as total_shots,
    COALESCE(SUM(ttr.hits), 0) as total_hits,
    COUNT(*) FILTER (WHERE ttr.is_stage_cleared) as stages_cleared,
    AVG(ttr.time_seconds) as avg_engagement_time,
    MIN(ttr.time_seconds) as fastest_engagement,
    MAX(st.distance_m) as distance_m
  INTO v_tactical
  FROM session_targets st
  LEFT JOIN tactical_target_results ttr ON ttr.session_target_id = st.id
  WHERE st.session_id = p_session_id AND st.target_type = 'tactical';

  -- 4. Get biometrics from session_timelines (if exists)
  SELECT
    TRUE as has_data,
    (summary->>'stressAvg')::numeric as stress_avg,
    (summary->>'hrAvg')::numeric as hr_avg,
    (summary->>'hrMin')::numeric as hr_min,
    (summary->>'hrMax')::numeric as hr_max,
    (SELECT COUNT(*) FROM jsonb_array_elements(shot_details) sd WHERE (sd->>'flinch')::boolean) as flinch_count,
    (SELECT COUNT(*) FROM jsonb_array_elements(shot_details)) as total_shots_biometric,
    (SELECT COUNT(*) FROM jsonb_array_elements(shot_details) sd 
      WHERE (sd->>'breathPhase') = 'pause' 
      AND (sd->>'stress')::numeric < 50 
      AND (sd->>'steadiness')::numeric >= 70
    ) as optimal_shots
  INTO v_timeline
  FROM session_timelines
  WHERE session_id = p_session_id;

  -- 5. Calculate derived values
  DECLARE
    v_total_shots integer;
    v_total_hits integer;
    v_accuracy numeric;
    v_session_duration integer;
    v_position text;
    v_optimal_pct numeric;
    v_stress_trend text;
  BEGIN
    v_total_shots := COALESCE(v_paper.total_shots, 0) + COALESCE(v_tactical.total_shots, 0);
    v_total_hits := COALESCE(v_paper.total_hits, 0) + COALESCE(v_tactical.total_hits, 0);
    v_accuracy := CASE WHEN v_total_shots > 0 THEN ROUND((v_total_hits::numeric / v_total_shots) * 100, 2) ELSE NULL END;
    
    -- Session duration in seconds
    IF v_session.ended_at IS NOT NULL AND v_session.started_at IS NOT NULL THEN
      v_session_duration := EXTRACT(EPOCH FROM (v_session.ended_at - v_session.started_at))::integer;
    END IF;

    -- Get position from session_stats if available
    SELECT ss.position INTO v_position
    FROM session_stats ss
    WHERE ss.session_id = p_session_id
    LIMIT 1;

    -- Calculate optimal shot percentage
    IF v_timeline.has_data AND v_timeline.total_shots_biometric > 0 THEN
      v_optimal_pct := ROUND((v_timeline.optimal_shots::numeric / v_timeline.total_shots_biometric) * 100, 1);
    END IF;

    -- Stress trend default
    v_stress_trend := 'stable';

    -- 6. Upsert into session_features (WITH WEATHER)
    INSERT INTO session_features (
      session_id,
      user_id,
      team_id,
      shots,
      hits,
      accuracy_pct,
      grouping_cm,
      best_grouping_cm,
      dispersion_cm,
      offset_right_cm,
      offset_up_cm,
      stages_cleared,
      engagement_time_sec,
      fastest_engagement_sec,
      session_duration_sec,
      distance_m,
      position,
      weapon_id,
      weapon_category,
      drill_goal,
      target_type,
      has_biometrics,
      stress_avg,
      stress_trend,
      hr_avg,
      hr_min,
      hr_max,
      flinch_count,
      optimal_shot_pct,
      -- Weather fields
      has_weather,
      weather_temp_c,
      weather_humidity,
      weather_wind_speed_mps,
      weather_wind_bearing,
      weather_condition,
      weather_wind_impact,
      weather_condition_severity
    ) VALUES (
      p_session_id,
      v_session.user_id,
      v_session.team_id,
      v_total_shots,
      v_total_hits,
      v_accuracy,
      v_paper.avg_dispersion,
      v_paper.best_dispersion,
      v_paper.avg_dispersion,
      v_paper.avg_offset_right,
      v_paper.avg_offset_up,
      COALESCE(v_tactical.stages_cleared, 0),
      v_tactical.avg_engagement_time,
      v_tactical.fastest_engagement,
      v_session_duration,
      COALESCE(v_paper.distance_m, v_tactical.distance_m),
      v_position,
      v_session.weapon_id,
      v_session.weapon_category,
      v_session.drill_goal,
      COALESCE(v_paper.target_type, 'tactical'),
      COALESCE(v_timeline.has_data, false),
      v_timeline.stress_avg,
      v_stress_trend,
      v_timeline.hr_avg,
      v_timeline.hr_min,
      v_timeline.hr_max,
      COALESCE(v_timeline.flinch_count, 0),
      v_optimal_pct,
      -- Weather values (now safely extracted)
      v_has_weather,
      v_weather_temp_c,
      v_weather_humidity,
      v_weather_wind_speed_mps,
      v_weather_wind_bearing,
      v_weather_condition,
      v_weather_wind_impact,
      v_weather_condition_severity
    )
    ON CONFLICT (session_id) DO UPDATE SET
      shots = EXCLUDED.shots,
      hits = EXCLUDED.hits,
      accuracy_pct = EXCLUDED.accuracy_pct,
      grouping_cm = EXCLUDED.grouping_cm,
      best_grouping_cm = EXCLUDED.best_grouping_cm,
      dispersion_cm = EXCLUDED.dispersion_cm,
      offset_right_cm = EXCLUDED.offset_right_cm,
      offset_up_cm = EXCLUDED.offset_up_cm,
      stages_cleared = EXCLUDED.stages_cleared,
      engagement_time_sec = EXCLUDED.engagement_time_sec,
      fastest_engagement_sec = EXCLUDED.fastest_engagement_sec,
      session_duration_sec = EXCLUDED.session_duration_sec,
      distance_m = EXCLUDED.distance_m,
      position = EXCLUDED.position,
      weapon_id = EXCLUDED.weapon_id,
      weapon_category = EXCLUDED.weapon_category,
      drill_goal = EXCLUDED.drill_goal,
      target_type = EXCLUDED.target_type,
      has_biometrics = EXCLUDED.has_biometrics,
      stress_avg = EXCLUDED.stress_avg,
      stress_trend = EXCLUDED.stress_trend,
      hr_avg = EXCLUDED.hr_avg,
      hr_min = EXCLUDED.hr_min,
      hr_max = EXCLUDED.hr_max,
      flinch_count = EXCLUDED.flinch_count,
      optimal_shot_pct = EXCLUDED.optimal_shot_pct,
      -- Weather updates
      has_weather = EXCLUDED.has_weather,
      weather_temp_c = EXCLUDED.weather_temp_c,
      weather_humidity = EXCLUDED.weather_humidity,
      weather_wind_speed_mps = EXCLUDED.weather_wind_speed_mps,
      weather_wind_bearing = EXCLUDED.weather_wind_bearing,
      weather_condition = EXCLUDED.weather_condition,
      weather_wind_impact = EXCLUDED.weather_wind_impact,
      weather_condition_severity = EXCLUDED.weather_condition_severity
    RETURNING * INTO v_result;

    RETURN v_result;
  END;
END;
$$;

COMMENT ON FUNCTION public.compute_session_features IS 
'Computes and stores derived features for a session including weather. Handles missing weather fields gracefully. Idempotent (upserts).';
