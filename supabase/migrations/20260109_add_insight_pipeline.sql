-- ============================================================================
-- INSIGHT PIPELINE: Session Features, User Baselines, Session Insights
-- ============================================================================
-- 
-- This migration adds three tables and supporting functions to enable
-- explainable, user-relative insights per session.
--
-- Tables:
--   1. session_features  - Derived metrics per session (canonical analysis layer)
--   2. user_baselines    - Personal baselines by condition bucket
--   3. session_insights  - Stored insights with attribution
--
-- Functions:
--   1. make_condition_key()      - Generate baseline lookup key
--   2. compute_session_features() - Populate session_features from raw data
--   3. refresh_user_baseline()   - Update baseline from recent sessions
--
-- Apply this migration manually via Supabase Dashboard SQL Editor
-- ============================================================================


-- ============================================================================
-- TABLE: session_features
-- ============================================================================
-- Canonical analysis layer. One row per session with denormalized context.
-- This is the "truth layer" for analytics - no JSON parsing required.

CREATE TABLE IF NOT EXISTS public.session_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Performance metrics (from session_stats / target results)
  shots integer NOT NULL DEFAULT 0,
  hits integer NOT NULL DEFAULT 0,
  accuracy_pct numeric,
  grouping_cm numeric,           -- avg dispersion
  best_grouping_cm numeric,      -- best dispersion
  
  -- Paper target specifics
  dispersion_cm numeric,         -- overall dispersion
  offset_right_cm numeric,       -- horizontal offset (+ = right)
  offset_up_cm numeric,          -- vertical offset (+ = up)
  
  -- Tactical target specifics
  stages_cleared integer DEFAULT 0,
  
  -- Timing
  avg_time_between_shots_sec numeric,
  engagement_time_sec numeric,
  fastest_engagement_sec numeric,
  session_duration_sec integer,
  
  -- Context snapshot (denormalized ON PURPOSE for fast queries)
  distance_m integer,
  position text,
  weapon_id uuid,
  weapon_category text,
  drill_goal text,               -- 'grouping' | 'achievement' | 'zeroing' | 'physical'
  target_type text,              -- 'paper' | 'tactical'
  
  -- Biometrics (from session_timelines if available)
  has_biometrics boolean DEFAULT false,
  stress_avg numeric,
  stress_trend text,             -- 'increasing' | 'decreasing' | 'stable'
  hr_avg numeric,
  hr_min numeric,
  hr_max numeric,
  flinch_count integer DEFAULT 0,
  optimal_shot_pct numeric,      -- % of shots during breath pause + low stress
  
  -- Foreign keys
  CONSTRAINT session_features_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
  CONSTRAINT session_features_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT session_features_team_id_fkey 
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT session_features_weapon_id_fkey 
    FOREIGN KEY (weapon_id) REFERENCES public.user_weapons(id) ON DELETE SET NULL
);

-- Indexes for session_features
CREATE INDEX idx_session_features_user_created 
  ON public.session_features (user_id, created_at DESC);
CREATE INDEX idx_session_features_team 
  ON public.session_features (team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_session_features_drill_goal 
  ON public.session_features (drill_goal) WHERE drill_goal IS NOT NULL;

-- RLS for session_features
ALTER TABLE public.session_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session features"
  ON public.session_features FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own session features"
  ON public.session_features FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own session features"
  ON public.session_features FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own session features"
  ON public.session_features FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================================
-- TABLE: user_baselines
-- ============================================================================
-- Personal baseline per condition bucket. Compare user to themselves.
-- Key format: 'drill_goal|position|distance_bucket|weapon_category'

CREATE TABLE IF NOT EXISTS public.user_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  condition_key text NOT NULL,
  
  -- Sample size
  n integer NOT NULL DEFAULT 0,
  
  -- Accuracy baseline
  avg_accuracy numeric,
  std_accuracy numeric,
  
  -- Grouping baseline
  avg_grouping numeric,
  std_grouping numeric,
  
  -- Biometric baseline (if user has watch data)
  avg_stress numeric,
  avg_optimal_shot_pct numeric,
  
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Composite unique constraint
  CONSTRAINT user_baselines_user_condition_unique 
    UNIQUE (user_id, condition_key),
  CONSTRAINT user_baselines_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes for user_baselines
CREATE INDEX idx_user_baselines_user 
  ON public.user_baselines (user_id);
CREATE INDEX idx_user_baselines_updated 
  ON public.user_baselines (updated_at DESC);

-- RLS for user_baselines
ALTER TABLE public.user_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own baselines"
  ON public.user_baselines FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own baselines"
  ON public.user_baselines FOR ALL
  USING (user_id = auth.uid());


-- ============================================================================
-- TABLE: session_insights
-- ============================================================================
-- Stored insights per session with attribution and evidence.

CREATE TABLE IF NOT EXISTS public.session_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Insight content
  title text NOT NULL,
  summary text NOT NULL,
  
  -- Attribution (what caused this insight)
  primary_factor text,           -- e.g., 'wind', 'fatigue', 'stance', 'execution'
  secondary_factor text,
  
  -- Severity / priority for ranking
  score numeric NOT NULL DEFAULT 0,  -- 0-100, higher = more important
  
  -- Categorization
  tags text[] NOT NULL DEFAULT '{}',
  insight_type text,             -- 'baseline_deviation' | 'pattern' | 'correlation' | 'achievement'
  
  -- Evidence (JSONB for flexibility)
  evidence jsonb NOT NULL DEFAULT '{}',
  -- Example evidence:
  -- {
  --   "z_score": -1.8,
  --   "session_accuracy": 0.65,
  --   "baseline_accuracy": 0.78,
  --   "stress_avg": 68,
  --   "usual_stress": 45
  -- }
  
  -- Unique per insight type per session
  CONSTRAINT session_insights_unique 
    UNIQUE (session_id, user_id, title),
  CONSTRAINT session_insights_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
  CONSTRAINT session_insights_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT session_insights_score_check 
    CHECK (score >= 0 AND score <= 100)
);

-- Indexes for session_insights
CREATE INDEX idx_session_insights_session 
  ON public.session_insights (session_id);
CREATE INDEX idx_session_insights_user_created 
  ON public.session_insights (user_id, created_at DESC);
CREATE INDEX idx_session_insights_score 
  ON public.session_insights (session_id, score DESC);

-- RLS for session_insights
ALTER TABLE public.session_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.session_insights FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own insights"
  ON public.session_insights FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own insights"
  ON public.session_insights FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own insights"
  ON public.session_insights FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================================
-- FUNCTION: make_condition_key()
-- ============================================================================
-- Generates a deterministic key for baseline lookups.
-- Buckets distance and uses consistent format.

CREATE OR REPLACE FUNCTION public.make_condition_key(
  p_drill_goal text,
  p_position text,
  p_distance_m integer,
  p_weapon_category text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_distance_bucket text;
BEGIN
  -- Distance buckets: 0-50, 51-100, 101-200, 201-300, 301-500, 500+
  v_distance_bucket := CASE
    WHEN p_distance_m IS NULL THEN 'unknown'
    WHEN p_distance_m <= 50 THEN '0-50'
    WHEN p_distance_m <= 100 THEN '51-100'
    WHEN p_distance_m <= 200 THEN '101-200'
    WHEN p_distance_m <= 300 THEN '201-300'
    WHEN p_distance_m <= 500 THEN '301-500'
    ELSE '500+'
  END;

  RETURN 
    COALESCE(p_drill_goal, 'unknown') || '|' ||
    COALESCE(p_position, 'unknown') || '|' ||
    v_distance_bucket || '|' ||
    COALESCE(p_weapon_category, 'unknown');
END;
$$;

COMMENT ON FUNCTION public.make_condition_key IS 
'Generates baseline lookup key from session context. Format: drill_goal|position|distance_bucket|weapon_category';


-- ============================================================================
-- FUNCTION: compute_session_features()
-- ============================================================================
-- Populates session_features from raw session data.
-- Call this after session completion.

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
BEGIN
  -- 1. Get session base info
  SELECT 
    s.id,
    s.user_id,
    s.team_id,
    s.weapon_id,
    s.started_at,
    s.ended_at,
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

    -- Stress trend (simplified - compare first vs last quarter of timeline)
    -- For now, default to 'stable' - can be computed from timeline points in TypeScript
    v_stress_trend := 'stable';

    -- 6. Upsert into session_features
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
      optimal_shot_pct
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
      v_optimal_pct
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
      optimal_shot_pct = EXCLUDED.optimal_shot_pct
    RETURNING * INTO v_result;

    RETURN v_result;
  END;
END;
$$;

COMMENT ON FUNCTION public.compute_session_features IS 
'Computes and stores derived features for a session. Call after session completion. Idempotent (upserts).';


-- ============================================================================
-- FUNCTION: refresh_user_baseline()
-- ============================================================================
-- Recomputes baseline from last N sessions matching condition key.

CREATE OR REPLACE FUNCTION public.refresh_user_baseline(
  p_user_id uuid,
  p_condition_key text,
  p_limit integer DEFAULT 30
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stats RECORD;
BEGIN
  -- Aggregate from recent session_features matching condition
  WITH matching_sessions AS (
    SELECT
      sf.accuracy_pct,
      sf.grouping_cm,
      sf.stress_avg,
      sf.optimal_shot_pct
    FROM session_features sf
    WHERE sf.user_id = p_user_id
      AND make_condition_key(sf.drill_goal, sf.position, sf.distance_m, sf.weapon_category) = p_condition_key
      AND sf.accuracy_pct IS NOT NULL
      AND sf.shots >= 5  -- Minimum shots for meaningful data
    ORDER BY sf.created_at DESC
    LIMIT p_limit
  )
  SELECT
    COUNT(*)::integer as n,
    AVG(accuracy_pct) as avg_accuracy,
    STDDEV_SAMP(accuracy_pct) as std_accuracy,
    AVG(grouping_cm) as avg_grouping,
    STDDEV_SAMP(grouping_cm) as std_grouping,
    AVG(stress_avg) as avg_stress,
    AVG(optimal_shot_pct) as avg_optimal_pct
  INTO v_stats
  FROM matching_sessions;

  -- Only store if we have enough data
  IF v_stats.n >= 3 THEN
    INSERT INTO user_baselines (
      user_id,
      condition_key,
      n,
      avg_accuracy,
      std_accuracy,
      avg_grouping,
      std_grouping,
      avg_stress,
      avg_optimal_shot_pct,
      updated_at
    ) VALUES (
      p_user_id,
      p_condition_key,
      v_stats.n,
      v_stats.avg_accuracy,
      v_stats.std_accuracy,
      v_stats.avg_grouping,
      v_stats.std_grouping,
      v_stats.avg_stress,
      v_stats.avg_optimal_pct,
      now()
    )
    ON CONFLICT (user_id, condition_key) DO UPDATE SET
      n = EXCLUDED.n,
      avg_accuracy = EXCLUDED.avg_accuracy,
      std_accuracy = EXCLUDED.std_accuracy,
      avg_grouping = EXCLUDED.avg_grouping,
      std_grouping = EXCLUDED.std_grouping,
      avg_stress = EXCLUDED.avg_stress,
      avg_optimal_shot_pct = EXCLUDED.avg_optimal_shot_pct,
      updated_at = now();
  END IF;
END;
$$;

COMMENT ON FUNCTION public.refresh_user_baseline IS 
'Refreshes user baseline for a condition key from last N matching sessions. Minimum 3 sessions required.';


-- ============================================================================
-- FUNCTION: get_session_baseline()
-- ============================================================================
-- Helper to get baseline for a session (for client-side comparison).

CREATE OR REPLACE FUNCTION public.get_session_baseline(p_session_id uuid)
RETURNS TABLE (
  condition_key text,
  n integer,
  avg_accuracy numeric,
  std_accuracy numeric,
  avg_grouping numeric,
  std_grouping numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_key text;
BEGIN
  -- Get session features
  SELECT sf.user_id, make_condition_key(sf.drill_goal, sf.position, sf.distance_m, sf.weapon_category)
  INTO v_user_id, v_key
  FROM session_features sf
  WHERE sf.session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return baseline if exists
  RETURN QUERY
  SELECT 
    ub.condition_key,
    ub.n,
    ub.avg_accuracy,
    ub.std_accuracy,
    ub.avg_grouping,
    ub.std_grouping
  FROM user_baselines ub
  WHERE ub.user_id = v_user_id AND ub.condition_key = v_key;
END;
$$;


-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON TABLE public.session_features TO authenticated;
GRANT ALL ON TABLE public.session_features TO service_role;

GRANT ALL ON TABLE public.user_baselines TO authenticated;
GRANT ALL ON TABLE public.user_baselines TO service_role;

GRANT ALL ON TABLE public.session_insights TO authenticated;
GRANT ALL ON TABLE public.session_insights TO service_role;

GRANT EXECUTE ON FUNCTION public.make_condition_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.make_condition_key TO service_role;

GRANT EXECUTE ON FUNCTION public.compute_session_features TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_session_features TO service_role;

GRANT EXECUTE ON FUNCTION public.refresh_user_baseline TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_baseline TO service_role;

GRANT EXECUTE ON FUNCTION public.get_session_baseline TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_baseline TO service_role;


-- ============================================================================
-- FUNCTION: backfill_user_session_features()
-- ============================================================================
-- Processes all completed sessions for a user that don't have features yet.
-- Run this once to generate features for historical sessions.

CREATE OR REPLACE FUNCTION public.backfill_user_session_features(p_user_id uuid)
RETURNS TABLE (
  total_sessions integer,
  processed integer,
  already_exists integer,
  errors integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
  v_total integer := 0;
  v_processed integer := 0;
  v_exists integer := 0;
  v_errors integer := 0;
BEGIN
  -- Count total completed sessions
  SELECT COUNT(*) INTO v_total
  FROM sessions
  WHERE user_id = p_user_id AND status = 'completed';

  -- Process each completed session that doesn't have features yet
  FOR v_session IN
    SELECT s.id, s.started_at
    FROM sessions s
    LEFT JOIN session_features sf ON sf.session_id = s.id
    WHERE s.user_id = p_user_id
      AND s.status = 'completed'
      AND sf.id IS NULL
    ORDER BY s.started_at ASC  -- Process oldest first for baseline building
  LOOP
    BEGIN
      PERFORM compute_session_features(v_session.id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE NOTICE 'Error processing session %: %', v_session.id, SQLERRM;
    END;
  END LOOP;

  -- Count already existing
  v_exists := v_total - v_processed - v_errors;

  RETURN QUERY SELECT v_total, v_processed, v_exists, v_errors;
END;
$$;

COMMENT ON FUNCTION public.backfill_user_session_features IS 
'Backfills session_features for all completed sessions missing features. Run once for historical data.';


-- ============================================================================
-- FUNCTION: backfill_user_baselines()
-- ============================================================================
-- Refreshes all baselines for a user based on their session features.

CREATE OR REPLACE FUNCTION public.backfill_user_baselines(p_user_id uuid)
RETURNS TABLE (
  condition_key text,
  session_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_condition RECORD;
BEGIN
  -- Find all unique condition keys for this user
  FOR v_condition IN
    SELECT DISTINCT
      make_condition_key(sf.drill_goal, sf.position, sf.distance_m, sf.weapon_category) as ckey,
      COUNT(*) as cnt
    FROM session_features sf
    WHERE sf.user_id = p_user_id
    GROUP BY make_condition_key(sf.drill_goal, sf.position, sf.distance_m, sf.weapon_category)
  LOOP
    -- Refresh baseline for this condition
    PERFORM refresh_user_baseline(p_user_id, v_condition.ckey, 30);
    
    RETURN QUERY SELECT v_condition.ckey, v_condition.cnt::integer;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.backfill_user_baselines IS 
'Refreshes all baselines for a user from their session_features data.';


-- ============================================================================
-- FUNCTION: backfill_all_insights()
-- ============================================================================
-- Complete backfill: features + baselines for a user.
-- Returns summary of what was processed.

CREATE OR REPLACE FUNCTION public.backfill_all_insights(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_features RECORD;
  v_baselines jsonb;
BEGIN
  -- Step 1: Backfill features
  SELECT * INTO v_features FROM backfill_user_session_features(p_user_id);
  
  -- Step 2: Backfill baselines
  SELECT jsonb_agg(jsonb_build_object('condition', condition_key, 'sessions', session_count))
  INTO v_baselines
  FROM backfill_user_baselines(p_user_id);

  RETURN jsonb_build_object(
    'features', jsonb_build_object(
      'total_sessions', v_features.total_sessions,
      'processed', v_features.processed,
      'already_exists', v_features.already_exists,
      'errors', v_features.errors
    ),
    'baselines', COALESCE(v_baselines, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.backfill_all_insights IS 
'Complete insight backfill for a user. Run once for historical data processing.';

GRANT EXECUTE ON FUNCTION public.backfill_user_session_features TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_user_session_features TO service_role;

GRANT EXECUTE ON FUNCTION public.backfill_user_baselines TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_user_baselines TO service_role;

GRANT EXECUTE ON FUNCTION public.backfill_all_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_all_insights TO service_role;


-- ============================================================================
-- FUNCTION: backfill_all_users_insights()
-- ============================================================================
-- ONE QUERY TO BACKFILL EVERYTHING FOR ALL USERS.
-- Run this once manually from Supabase Dashboard.

CREATE OR REPLACE FUNCTION public.backfill_all_users_insights()
RETURNS TABLE (
  user_id uuid,
  sessions_processed integer,
  baselines_created integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user RECORD;
  v_session RECORD;
  v_condition RECORD;
  v_processed integer;
  v_baselines integer;
BEGIN
  -- Loop through all users who have completed sessions
  FOR v_user IN
    SELECT DISTINCT s.user_id
    FROM sessions s
    WHERE s.status = 'completed'
  LOOP
    v_processed := 0;
    v_baselines := 0;

    -- Process all completed sessions for this user that don't have features
    FOR v_session IN
      SELECT s.id
      FROM sessions s
      LEFT JOIN session_features sf ON sf.session_id = s.id
      WHERE s.user_id = v_user.user_id
        AND s.status = 'completed'
        AND sf.id IS NULL
      ORDER BY s.started_at ASC
    LOOP
      BEGIN
        PERFORM compute_session_features(v_session.id);
        v_processed := v_processed + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error processing session %: %', v_session.id, SQLERRM;
      END;
    END LOOP;

    -- Refresh all baselines for this user
    FOR v_condition IN
      SELECT DISTINCT make_condition_key(sf.drill_goal, sf.position, sf.distance_m, sf.weapon_category) as ckey
      FROM session_features sf
      WHERE sf.user_id = v_user.user_id
    LOOP
      PERFORM refresh_user_baseline(v_user.user_id, v_condition.ckey, 30);
      v_baselines := v_baselines + 1;
    END LOOP;

    RETURN QUERY SELECT v_user.user_id, v_processed, v_baselines;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.backfill_all_users_insights IS 
'Backfills session_features and baselines for ALL users. Run once manually.';

GRANT EXECUTE ON FUNCTION public.backfill_all_users_insights TO service_role;

