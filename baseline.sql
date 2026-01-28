


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_validation json;
  v_invitation json;
  v_org_workspace_id uuid;
  v_role text;
  v_invitation_id uuid;
  v_team_id uuid;
  v_team_role text;
  v_details jsonb;
BEGIN
  -- 1. VALIDATE
  v_validation := validate_invite_code(p_invite_code, p_user_id);
  
  IF NOT (v_validation->>'valid')::boolean THEN
    RETURN json_build_object('success', false, 'error', v_validation->>'error');
  END IF;
  
  v_invitation := v_validation->'invitation';
  v_org_workspace_id := (v_invitation->>'org_workspace_id')::uuid;
  v_role := v_invitation->>'role';
  v_invitation_id := (v_invitation->>'id')::uuid;
  
  -- Extract team info (handle nulls safely)
  IF (v_invitation->>'team_id') IS NOT NULL THEN
    v_team_id := (v_invitation->>'team_id')::uuid;
    v_team_role := v_invitation->>'team_role';
    -- Extract details safely
    IF (v_invitation->>'details') IS NOT NULL THEN
        v_details := (v_invitation->'details');
    ELSE 
        v_details := '{}'::jsonb;
    END IF;
  END IF;

  -- 2. ADD TO WORKSPACE (removed non-existent workspace_type column)
  INSERT INTO workspace_access (org_workspace_id, member_id, role)
  VALUES (v_org_workspace_id, p_user_id, v_role)
  ON CONFLICT (org_workspace_id, member_id) DO NOTHING;
  
  -- 3. ADD TO TEAM (if applicable)
  IF v_team_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, user_id, role, details)
    VALUES (v_team_id, p_user_id, v_team_role, COALESCE(v_details, '{}'::jsonb))
    ON CONFLICT (team_id, user_id) DO UPDATE 
    SET role = v_team_role,
        details = COALESCE(v_details, team_members.details);
  END IF;
  
  -- 4. UPDATE INVITATION
  UPDATE workspace_invitations
  SET status = 'accepted', accepted_by = p_user_id, accepted_at = now(), updated_at = now()
  WHERE id = v_invitation_id AND status = 'pending';
  
  RETURN json_build_object(
    'success', true,
    'workspace_id', v_org_workspace_id,
    'workspace_name', v_invitation->>'workspace_name',
    'role', v_role,
    'team_id', v_team_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error accepting invitation: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', 'Failed to accept invitation.');
END;
$$;


ALTER FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") IS 'Securely accepts an invite code and adds user to workspace.
Performs atomic validation and insertion in a single transaction.
Returns JSON with success flag and workspace details or error message.';



CREATE OR REPLACE FUNCTION "public"."accept_team_invitation"("p_invite_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_invitation RECORD;
    v_result jsonb;
    v_squad_id text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    SELECT * INTO v_invitation
    FROM public.team_invitations
    WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND expires_at > now()
    AND team_id IS NOT NULL;
    
    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = v_invitation.team_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Already a member of this team';
    END IF;
    
    v_squad_id := v_invitation.details->>'squad_id';
    
    INSERT INTO public.team_members (team_id, user_id, role, squad_id, details)
    VALUES (
        v_invitation.team_id,
        v_user_id,
        COALESCE(v_invitation.team_role, 'soldier'),
        v_squad_id,
        COALESCE(v_invitation.details, '{}'::jsonb)
    );
    
    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_by = v_user_id,
        accepted_at = now(),
        updated_at = now()
    WHERE id = v_invitation.id;
    
    SELECT jsonb_build_object(
        'success', true,
        'team_id', v_invitation.team_id,
        'team_name', t.name,
        'role', COALESCE(v_invitation.team_role, 'soldier')
    ) INTO v_result
    FROM public.teams t
    WHERE t.id = v_invitation.team_id;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."accept_team_invitation"("p_invite_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team record;
  v_has_permission boolean := false;
  v_result jsonb;
BEGIN
  -- Get team info
  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Check permissions: must be workspace admin/owner OR team commander
  -- For org workspaces
  IF v_team.org_workspace_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM workspace_access
      WHERE org_workspace_id = v_team.org_workspace_id
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) INTO v_has_permission;
    
    -- Also allow team commanders (but use SECURITY DEFINER to avoid recursion)
    IF NOT v_has_permission THEN
      -- Direct query without triggering RLS
      PERFORM 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role IN ('commander', 'squad_commander');
      
      v_has_permission := FOUND;
    END IF;
  -- For personal workspaces
  ELSIF v_team.workspace_owner_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM workspace_access
      WHERE workspace_owner_id = v_team.workspace_owner_id
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) INTO v_has_permission;
    
    IF NOT v_has_permission THEN
      PERFORM 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role IN ('commander', 'squad_commander');
      
      v_has_permission := FOUND;
    END IF;
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: must be workspace admin or team commander';
  END IF;

  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Insert team member (with SECURITY DEFINER, bypasses RLS)
  INSERT INTO team_members (team_id, user_id, role, details)
  VALUES (p_team_id, p_user_id, p_role, p_details)
  ON CONFLICT (team_id, user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    details = EXCLUDED.details;

  -- Return the created/updated member with profile info
  SELECT jsonb_build_object(
    'team_id', tm.team_id,
    'user_id', tm.user_id,
    'role', tm.role,
    'details', tm.details,
    'joined_at', tm.joined_at,
    'profile', jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url
    )
  ) INTO v_result
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id AND tm.user_id = p_user_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") IS 'Safely adds a team member with permission checks, bypassing RLS recursion. Can be called by workspace admins or team commanders.';



CREATE OR REPLACE FUNCTION "public"."auto_close_training_if_complete"("p_training_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_status text;
  v_should_close boolean;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM trainings
  WHERE id = p_training_id;
  
  -- Only check active trainings (planned or ongoing)
  IF v_current_status NOT IN ('planned', 'ongoing', 'in_progress') THEN
    RETURN v_current_status;
  END IF;
  
  -- Check if should close
  v_should_close := check_training_completion(p_training_id);
  
  IF v_should_close THEN
    UPDATE trainings
    SET 
      status = 'finished',
      ended_at = NOW(),
      updated_at = NOW()
    WHERE id = p_training_id;
    
    RETURN 'finished';
  END IF;
  
  RETURN v_current_status;
END;
$$;


ALTER FUNCTION "public"."auto_close_training_if_complete"("p_training_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_start_trainings"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update trainings that are 'planned' and past their scheduled time to 'ongoing'
  UPDATE public.trainings
  SET 
    status = 'ongoing',
    updated_at = now()
  WHERE 
    status = 'planned' 
    AND scheduled_at <= now();
END;
$$;


ALTER FUNCTION "public"."auto_start_trainings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_start_trainings"() IS 'Automatically starts trainings when their scheduled time arrives. 
Call this periodically via pg_cron or an edge function.';



CREATE OR REPLACE FUNCTION "public"."backfill_insight_triggers"() RETURNS TABLE("users_processed" integer, "triggers_created" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_users_processed INT := 0;
  v_triggers_created INT := 0;
BEGIN
  -- Insert triggers for all users with session features who don't have one yet
  INSERT INTO user_insight_triggers (user_id, sessions_since_last, bullets_since_last)
  SELECT 
    sf.user_id,
    COUNT(*)::INT,
    COALESCE(SUM(sf.shots), 0)::INT
  FROM session_features sf
  WHERE NOT EXISTS (
    SELECT 1 FROM user_insight_triggers t WHERE t.user_id = sf.user_id
  )
  GROUP BY sf.user_id
  ON CONFLICT (user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_triggers_created = ROW_COUNT;
  
  -- Count total users with session features
  SELECT COUNT(DISTINCT user_id) INTO v_users_processed FROM session_features;
  
  RETURN QUERY SELECT v_users_processed, v_triggers_created;
END;
$$;


ALTER FUNCTION "public"."backfill_insight_triggers"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_insight_triggers"() IS 'Backfills insight triggers for existing users. Run once after migration.';



CREATE OR REPLACE FUNCTION "public"."check_commander_constraints"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  existing_commander_count integer;
  existing_squad_commander_count integer;
  v_squad_id text;  -- Renamed from squad_id to avoid ambiguity
BEGIN
  -- Check team commander uniqueness
  IF NEW.role = 'commander' THEN
    SELECT COUNT(*) INTO existing_commander_count
    FROM team_members
    WHERE team_id = NEW.team_id 
      AND role = 'commander'
      AND user_id != NEW.user_id;
    
    IF existing_commander_count > 0 THEN
      RAISE EXCEPTION 'Team already has a commander. Only one commander per team is allowed.';
    END IF;
  END IF;

  -- Check squad commander uniqueness
  IF NEW.role = 'squad_commander' THEN
    v_squad_id := NEW.squad_id;  -- Use the column directly
    
    IF v_squad_id IS NULL OR v_squad_id = '' THEN
      RAISE EXCEPTION 'Squad commander must be assigned to a squad. Please specify squad_id.';
    END IF;
    
    SELECT COUNT(*) INTO existing_squad_commander_count
    FROM team_members
    WHERE team_id = NEW.team_id 
      AND role = 'squad_commander'
      AND squad_id = v_squad_id
      AND user_id != NEW.user_id;
    
    IF existing_squad_commander_count > 0 THEN
      RAISE EXCEPTION 'Squad "%" already has a commander. Only one squad commander per squad is allowed.', v_squad_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_commander_constraints"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_invitation_commander_constraints"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  existing_commander_count integer;
  existing_squad_commander_count integer;
  squad_id text;
BEGIN
  -- Only check pending invitations for team roles
  IF NEW.status != 'pending' OR NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check team commander uniqueness
  IF NEW.team_role = 'commander' THEN
    -- Check existing members
    SELECT COUNT(*) INTO existing_commander_count
    FROM team_members
    WHERE team_id = NEW.team_id 
      AND role = 'commander';
    
    IF existing_commander_count > 0 THEN
      RAISE EXCEPTION 'Team already has a commander. Cannot create commander invitation.';
    END IF;
    
    -- Check other pending invitations
    SELECT COUNT(*) INTO existing_commander_count
    FROM workspace_invitations
    WHERE team_id = NEW.team_id 
      AND team_role = 'commander'
      AND status = 'pending'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF existing_commander_count > 0 THEN
      RAISE EXCEPTION 'There is already a pending commander invitation for this team.';
    END IF;
  END IF;

  -- Check squad commander uniqueness
  IF NEW.team_role = 'squad_commander' THEN
    squad_id := NEW.details->>'squad_id';
    
    IF squad_id IS NULL OR squad_id = '' THEN
      RAISE EXCEPTION 'Squad commander invitation must specify a squad in details.';
    END IF;
    
    -- Check existing members
    SELECT COUNT(*) INTO existing_squad_commander_count
    FROM team_members
    WHERE team_id = NEW.team_id 
      AND role = 'squad_commander'
      AND details->>'squad_id' = squad_id;
    
    IF existing_squad_commander_count > 0 THEN
      RAISE EXCEPTION 'Squad "%" already has a commander.', squad_id;
    END IF;
    
    -- Check other pending invitations
    SELECT COUNT(*) INTO existing_squad_commander_count
    FROM workspace_invitations
    WHERE team_id = NEW.team_id 
      AND team_role = 'squad_commander'
      AND details->>'squad_id' = squad_id
      AND status = 'pending'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF existing_squad_commander_count > 0 THEN
      RAISE EXCEPTION 'There is already a pending squad commander invitation for squad "%".', squad_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_invitation_commander_constraints"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_training_completion"("p_training_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_team_id uuid;
  v_expires_at timestamptz;
  v_has_drills boolean;
  v_has_participants boolean;
  v_missing_count integer;
BEGIN
  -- Get training info
  SELECT t.team_id, t.expires_at
  INTO v_team_id, v_expires_at
  FROM trainings t
  WHERE t.id = p_training_id;
  
  -- Training not found
  IF v_team_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if deadline passed (if expires_at is set)
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Check if training has drills
  SELECT EXISTS (
    SELECT 1 FROM training_drills WHERE training_id = p_training_id
  ) INTO v_has_drills;
  
  -- No drills = nothing to complete
  IF NOT v_has_drills THEN
    RETURN FALSE;
  END IF;
  
  -- Check if team has participants
  SELECT EXISTS (
    SELECT 1 FROM team_members WHERE team_id = v_team_id
  ) INTO v_has_participants;
  
  -- No participants = nothing to complete
  IF NOT v_has_participants THEN
    RETURN FALSE;
  END IF;
  
  -- Count missing completions (participants × drills that are NOT in user_drill_completions)
  SELECT COUNT(*)
  INTO v_missing_count
  FROM (
    -- Required: every participant × every drill
    SELECT tm.user_id, td.id as drill_id
    FROM team_members tm
    CROSS JOIN training_drills td
    WHERE tm.team_id = v_team_id
      AND td.training_id = p_training_id
  ) required
  LEFT JOIN user_drill_completions udc
    ON udc.user_id = required.user_id 
    AND udc.drill_id = required.drill_id
    AND udc.training_id = p_training_id
  WHERE udc.id IS NULL;
  
  -- All done if no missing completions
  RETURN v_missing_count = 0;
END;
$$;


ALTER FUNCTION "public"."check_training_completion"("p_training_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."session_features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shots" integer DEFAULT 0 NOT NULL,
    "hits" integer DEFAULT 0 NOT NULL,
    "accuracy_pct" numeric,
    "grouping_cm" numeric,
    "best_grouping_cm" numeric,
    "dispersion_cm" numeric,
    "offset_right_cm" numeric,
    "offset_up_cm" numeric,
    "stages_cleared" integer DEFAULT 0,
    "avg_time_between_shots_sec" numeric,
    "engagement_time_sec" numeric,
    "fastest_engagement_sec" numeric,
    "session_duration_sec" integer,
    "distance_m" integer,
    "position" "text",
    "weapon_id" "uuid",
    "weapon_category" "text",
    "drill_goal" "text",
    "target_type" "text",
    "has_biometrics" boolean DEFAULT false,
    "stress_avg" numeric,
    "stress_trend" "text",
    "hr_avg" numeric,
    "hr_min" numeric,
    "hr_max" numeric,
    "flinch_count" integer DEFAULT 0,
    "optimal_shot_pct" numeric,
    "has_weather" boolean DEFAULT false,
    "weather_temp_c" numeric,
    "weather_humidity" integer,
    "weather_wind_speed_mps" numeric,
    "weather_wind_bearing" integer,
    "weather_condition" "text",
    "weather_wind_impact" "text",
    "weather_condition_severity" "text",
    "is_timed" boolean DEFAULT false
);


ALTER TABLE "public"."session_features" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_session_features"("p_session_id" "uuid") RETURNS "public"."session_features"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_session RECORD;
  v_stats RECORD;
  v_paper RECORD;
  v_tactical RECORD;
  v_timeline RECORD;
  v_is_timed boolean;
  v_result public.session_features;
  -- Weather variables (individual for null safety)
  v_has_weather boolean := false;
  v_weather_temp_c numeric;
  v_weather_humidity integer;
  v_weather_wind_speed_mps numeric;
  v_weather_wind_bearing integer;
  v_weather_condition text;
  v_weather_wind_impact text;
  v_weather_condition_severity text;
BEGIN
  -- 1. Get session base info (including weather + timed detection)
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
    uw.category as weapon_category,
    -- Detect is_timed from template or custom config
    (
      d.time_limit_seconds IS NOT NULL
      OR (s.custom_drill_config->>'time_limit_seconds') IS NOT NULL
    ) as is_timed
  INTO v_session
  FROM sessions s
  LEFT JOIN drill_templates d ON d.id = s.drill_template_id
  LEFT JOIN user_weapons uw ON uw.id = s.weapon_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  v_is_timed := COALESCE(v_session.is_timed, false);

  -- Extract weather data safely (each field individually)
  IF v_session.weather IS NOT NULL AND jsonb_typeof(v_session.weather) = 'object' THEN
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

    -- Stress trend (simplified)
    v_stress_trend := 'stable';

    -- 6. Upsert into session_features (WITH is_timed + created_at from started_at)
    INSERT INTO session_features (
      session_id,
      user_id,
      team_id,
      created_at,
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
      is_timed,
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
      v_session.started_at,  -- Use session started_at, not now()
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
      v_is_timed,
      COALESCE(v_timeline.has_data, false),
      v_timeline.stress_avg,
      v_stress_trend,
      v_timeline.hr_avg,
      v_timeline.hr_min,
      v_timeline.hr_max,
      COALESCE(v_timeline.flinch_count, 0),
      v_optimal_pct,
      -- Weather values
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
      created_at = EXCLUDED.created_at,
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
      is_timed = EXCLUDED.is_timed,
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


ALTER FUNCTION "public"."compute_session_features"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."compute_session_features"("p_session_id" "uuid") IS 'Computes and stores derived features for a session including weather and is_timed. Call after session completion. Idempotent (upserts).';



CREATE OR REPLACE FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "workspace_slug" "text", "created_by" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_slug text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate slug
  v_slug := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

  -- Create workspace
  INSERT INTO org_workspaces (name, description, workspace_slug, created_by)
  VALUES (p_name, p_description, v_slug, v_user_id)
  RETURNING org_workspaces.id INTO v_workspace_id;

  -- Grant owner access
  INSERT INTO workspace_access (org_workspace_id, member_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  -- Return created workspace
  RETURN QUERY
  SELECT ow.id, ow.name, ow.description, ow.workspace_slug, ow.created_by, ow.created_at
  FROM org_workspaces ow
  WHERE ow.id = v_workspace_id;
END;$$;


ALTER FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "session_mode" "text" DEFAULT 'solo'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "training_id" "uuid",
    "drill_id" "uuid",
    "drill_template_id" "uuid",
    "custom_drill_config" "jsonb",
    "watch_controlled" boolean DEFAULT false,
    "weapon_id" "uuid",
    "weather" "jsonb",
    CONSTRAINT "sessions_session_mode_check" CHECK (("session_mode" = ANY (ARRAY['solo'::"text", 'group'::"text"]))),
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);

ALTER TABLE ONLY "public"."sessions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sessions"."drill_template_id" IS 'For quick practice sessions started directly from a drill template.';



COMMENT ON COLUMN "public"."sessions"."custom_drill_config" IS 'Inline drill configuration for quick practice sessions (no template reference)';



CREATE OR REPLACE FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid" DEFAULT NULL::"uuid", "p_org_workspace_id" "uuid" DEFAULT NULL::"uuid", "p_team_id" "uuid" DEFAULT NULL::"uuid", "p_session_mode" "text" DEFAULT 'solo'::"text", "p_session_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "public"."sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_session public.sessions;
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate workspace type
  IF p_workspace_type NOT IN ('personal', 'org') THEN
    RAISE EXCEPTION 'Invalid workspace_type. Must be "personal" or "org"';
  END IF;

  -- Personal workspace session
  IF p_workspace_type = 'personal' THEN
    -- Must be in your own workspace
    IF p_workspace_owner_id != auth.uid() THEN
      RAISE EXCEPTION 'Can only create personal sessions in your own workspace';
    END IF;
    
    IF p_org_workspace_id IS NOT NULL THEN
      RAISE EXCEPTION 'Personal sessions cannot have org_workspace_id';
    END IF;
  
  -- Org workspace session
  ELSE
    IF p_org_workspace_id IS NULL THEN
      RAISE EXCEPTION 'Org sessions require org_workspace_id';
    END IF;
    
    IF p_workspace_owner_id IS NOT NULL THEN
      RAISE EXCEPTION 'Org sessions cannot have workspace_owner_id';
    END IF;
    
    -- Verify access to org workspace
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_access
      WHERE org_workspace_id = p_org_workspace_id
        AND member_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied to workspace';
    END IF;
  END IF;

  -- Create the session
  INSERT INTO public.sessions (
    workspace_type,
    workspace_owner_id,
    org_workspace_id,
    user_id,
    team_id,
    session_mode,
    session_data
  ) VALUES (
    p_workspace_type,
    p_workspace_owner_id,
    p_org_workspace_id,
    auth.uid(),
    p_team_id,
    p_session_mode,
    COALESCE(p_session_data, '{}'::jsonb)
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;


ALTER FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "team_type" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "squads" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_by" "uuid" NOT NULL,
    CONSTRAINT "teams_team_type_check" CHECK (("team_type" = ANY (ARRAY['field'::"text", 'back_office'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Teams within organizations';



COMMENT ON COLUMN "public"."teams"."squads" IS 'Optional array of squad names within this team. Users can create squads on-demand.';



CREATE OR REPLACE FUNCTION "public"."create_team_with_owner"("p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_squads" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "public"."teams"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team public.teams;
BEGIN
  -- Create the team
  INSERT INTO public.teams (name, description, squads, created_by)
  VALUES (p_name, p_description, p_squads, v_user_id)
  RETURNING * INTO v_team;

  -- Add creator as owner
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team.id, v_user_id, 'owner');

  RETURN v_team;
END;
$$;


ALTER FUNCTION "public"."create_team_with_owner"("p_name" "text", "p_description" "text", "p_squads" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_session"("p_session_id" "uuid", "p_status" "text" DEFAULT 'completed'::"text") RETURNS "public"."sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_session public.sessions;
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate status
  IF p_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Status must be "completed" or "cancelled"';
  END IF;

  -- Update and return
  UPDATE public.sessions
  SET 
    status = p_status,
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
  WHERE id = p_session_id
    AND user_id = auth.uid()
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;

  RETURN v_session;
END;
$$;


ALTER FUNCTION "public"."end_session"("p_session_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE "public"."workspace_invitations"
  SET "status" = 'expired', "updated_at" = now()
  WHERE "status" = 'pending'
    AND "expires_at" < now();
END;
$$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars (0, O, 1, I)
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_session_insights"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net'
    AS $$
DECLARE
  v_url text;
  v_service_role_key text;
  v_response_id bigint;
BEGIN
  -- Ensure session_features exist
  IF NOT EXISTS (SELECT 1 FROM session_features WHERE session_id = p_session_id) THEN
    -- Compute features first
    PERFORM compute_session_features(p_session_id);
  END IF;
  
  -- Get Edge Function URL
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-insights';
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF v_url IS NULL OR v_service_role_key IS NULL THEN
    RETURN jsonb_build_object('error', 'Webhook not configured');
  END IF;
  
  -- Call Edge Function
  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('session_id', p_session_id)
  ) INTO v_response_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'message', 'Insight generation triggered'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."generate_session_insights"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_session_insights"("p_session_id" "uuid") IS 'Manually trigger insight generation for a session. Computes features if needed, then calls Edge Function.';



CREATE OR REPLACE FUNCTION "public"."get_engagement_session_owner"("eng_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT s.user_id
  FROM engagements e
  JOIN sessions s ON s.id = e.session_id
  WHERE e.id = eng_id;
$$;


ALTER FUNCTION "public"."get_engagement_session_owner"("eng_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_insight_trigger_status"("p_user_id" "uuid") RETURNS TABLE("sessions_since_last" integer, "bullets_since_last" integer, "session_threshold" integer, "sessions_until_next" integer, "last_insight_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(t.sessions_since_last, 0),
    COALESCE(t.bullets_since_last, 0),
    COALESCE(t.session_threshold, 5),
    GREATEST(0, COALESCE(t.session_threshold, 5) - COALESCE(t.sessions_since_last, 0)),
    t.last_insight_at
  FROM user_insight_triggers t
  WHERE t.user_id = p_user_id;
  
  -- If no record exists, return defaults
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 5, 5, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_insight_trigger_status"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_insight_trigger_status"("p_user_id" "uuid") IS 'Returns insight trigger status for UI display (sessions until next insight).';



CREATE OR REPLACE FUNCTION "public"."get_my_sessions"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "workspace_type" "text", "workspace_owner_id" "uuid", "org_workspace_id" "uuid", "workspace_name" "text", "user_id" "uuid", "team_id" "uuid", "team_name" "text", "session_mode" "text", "status" "text", "started_at" timestamp with time zone, "ended_at" timestamp with time zone, "session_data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.workspace_type,
    s.workspace_owner_id,
    s.org_workspace_id,
    CASE 
      WHEN s.workspace_type = 'personal' THEN p.workspace_name
      WHEN s.workspace_type = 'org' THEN ow.name
      ELSE 'Unknown'
    END as workspace_name,
    s.user_id,
    s.team_id,
    t.name as team_name,
    s.session_mode,
    s.status,
    s.started_at,
    s.ended_at,
    s.session_data,
    s.created_at,
    s.updated_at
  FROM public.sessions s
  LEFT JOIN public.profiles p ON p.id = s.workspace_owner_id
  LEFT JOIN public.org_workspaces ow ON ow.id = s.org_workspace_id
  LEFT JOIN public.teams t ON t.id = s.team_id
  WHERE s.user_id = auth.uid()
  ORDER BY s.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_my_sessions"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_team_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_team_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_teams"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "squads" "text"[], "team_type" "text", "created_by" "uuid", "created_at" timestamp with time zone, "my_role" "text", "member_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.squads,
        t.team_type,
        t.created_by,
        t.created_at,
        tm.role,
        (SELECT COUNT(*) FROM public.team_members WHERE team_id = t.id)
    FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = auth.uid()
    ORDER BY t.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_my_teams"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") RETURNS TABLE("id" "uuid", "org_workspace_id" "uuid", "member_id" "uuid", "role" "text", "joined_at" timestamp with time zone, "profile_id" "uuid", "profile_email" "text", "profile_full_name" "text", "profile_avatar_url" "text", "teams" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Security check: verify caller has access to this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_access wa_check
    WHERE wa_check.org_workspace_id = p_org_workspace_id
      AND wa_check.member_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to workspace';
  END IF;

  RETURN QUERY
  SELECT 
    wa.id,
    wa.org_workspace_id,
    wa.member_id,
    wa.role,
    wa.joined_at,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_full_name,
    p.avatar_url as profile_avatar_url,
    
    -- Aggregate teams for this user in this workspace
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'team_id', t.id,
            'team_name', t.name,
            'team_role', tm.role,
            'team_type', t.team_type,
            'squads', t.squads,
            'joined_team_at', tm.joined_at
          )
          ORDER BY t.name
        )
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = wa.member_id
          AND t.org_workspace_id = p_org_workspace_id
      ),
      '[]'::jsonb
    ) as teams
    
  FROM workspace_access wa
  INNER JOIN profiles p ON p.id = wa.member_id
  WHERE wa.org_workspace_id = p_org_workspace_id
  ORDER BY wa.joined_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_session_baseline"("p_session_id" "uuid") RETURNS TABLE("condition_key" "text", "n" integer, "avg_accuracy" numeric, "std_accuracy" numeric, "avg_grouping" numeric, "std_grouping" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_session_baseline"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sessions_since_last_insight"("p_user_id" "uuid") RETURNS SETOF "public"."session_features"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_last_insight_at TIMESTAMPTZ;
BEGIN
  -- Get last insight timestamp
  SELECT last_insight_at INTO v_last_insight_at
  FROM user_insight_triggers
  WHERE user_id = p_user_id;
  
  -- Return all session features since last insight (or all if no previous insight)
  RETURN QUERY
  SELECT sf.*
  FROM session_features sf
  WHERE sf.user_id = p_user_id
    AND (v_last_insight_at IS NULL OR sf.created_at > v_last_insight_at)
  ORDER BY sf.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_sessions_since_last_insight"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_sessions_since_last_insight"("p_user_id" "uuid") IS 'Returns session features since last aggregate insight generation.';



CREATE OR REPLACE FUNCTION "public"."get_sniper_best_performance"("p_user_id" "uuid", "p_org_workspace_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("best_paper_accuracy" numeric, "best_tactical_accuracy" numeric, "best_overall_accuracy" numeric, "tightest_grouping_cm" numeric, "fastest_engagement_sec" numeric, "most_targets_cleared" integer, "longest_session_minutes" integer, "total_sessions" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MAX(avg_paper_accuracy_pct) as best_paper_accuracy,
        MAX(avg_tactical_accuracy_pct) as best_tactical_accuracy,
        MAX(overall_accuracy_pct) as best_overall_accuracy,
        MIN(best_grouping_cm) as tightest_grouping_cm,
        MIN(fastest_engagement_time_sec) as fastest_engagement_sec,
        MAX(stages_cleared) as most_targets_cleared,
        MAX(session_duration_seconds / 60) as longest_session_minutes,
        COUNT(*) as total_sessions
    FROM session_stats_sniper sss
    WHERE sss.user_id = p_user_id
    AND (p_org_workspace_id IS NULL OR sss.org_workspace_id = p_org_workspace_id);
END;
$$;


ALTER FUNCTION "public"."get_sniper_best_performance"("p_user_id" "uuid", "p_org_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sniper_progression"("p_user_id" "uuid", "p_org_workspace_id" "uuid" DEFAULT NULL::"uuid", "p_days_back" integer DEFAULT 30) RETURNS TABLE("session_date" "date", "avg_accuracy" numeric, "avg_grouping" numeric, "sessions_count" bigint, "total_rounds" integer, "improvement_trend" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            DATE(started_at) as session_date,
            AVG(overall_accuracy_pct) as daily_accuracy,
            AVG(avg_grouping_cm) as daily_grouping,
            COUNT(*) as daily_sessions,
            SUM(total_rounds_on_target) as daily_rounds
        FROM session_stats_sniper
        WHERE user_id = p_user_id
        AND (p_org_workspace_id IS NULL OR org_workspace_id = p_org_workspace_id)
        AND started_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
        GROUP BY DATE(started_at)
        ORDER BY session_date
    ),
    with_trends AS (
        SELECT *,
            CASE 
                WHEN LAG(daily_accuracy) OVER (ORDER BY session_date) IS NULL THEN 'baseline'
                WHEN daily_accuracy > LAG(daily_accuracy) OVER (ORDER BY session_date) THEN 'improving'
                WHEN daily_accuracy < LAG(daily_accuracy) OVER (ORDER BY session_date) THEN 'declining'
                ELSE 'stable'
            END as trend
        FROM daily_stats
    )
    SELECT 
        session_date,
        ROUND(daily_accuracy, 2) as avg_accuracy,
        ROUND(daily_grouping, 2) as avg_grouping,
        daily_sessions as sessions_count,
        daily_rounds::INTEGER as total_rounds,
        trend as improvement_trend
    FROM with_trends;
END;
$$;


ALTER FUNCTION "public"."get_sniper_progression"("p_user_id" "uuid", "p_org_workspace_id" "uuid", "p_days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_commander_status"("p_team_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
  team_squads text[];
  squads_with_cmdr text[];
BEGIN
  -- Get team's squads
  SELECT t.squads INTO team_squads FROM teams t WHERE t.id = p_team_id;
  
  -- Get squads that have commanders (either members or pending invites)
  SELECT ARRAY_AGG(DISTINCT sq) INTO squads_with_cmdr
  FROM (
    SELECT tm.details->>'squad_id' as sq
    FROM team_members tm
    WHERE tm.team_id = p_team_id 
      AND tm.role = 'squad_commander'
      AND tm.details->>'squad_id' IS NOT NULL
    UNION
    SELECT wi.details->>'squad_id' as sq
    FROM workspace_invitations wi
    WHERE wi.team_id = p_team_id 
      AND wi.team_role = 'squad_commander'
      AND wi.status = 'pending'
      AND wi.details->>'squad_id' IS NOT NULL
  ) subq;

  result := jsonb_build_object(
    'has_commander', EXISTS(
      SELECT 1 FROM team_members WHERE team_id = p_team_id AND role = 'commander'
    ),
    'has_pending_commander', EXISTS(
      SELECT 1 FROM workspace_invitations 
      WHERE team_id = p_team_id AND team_role = 'commander' AND status = 'pending'
    ),
    'commander_name', (
      SELECT p.full_name FROM team_members tm 
      JOIN profiles p ON p.id = tm.user_id 
      WHERE tm.team_id = p_team_id AND tm.role = 'commander' 
      LIMIT 1
    ),
    'squads', COALESCE(team_squads, ARRAY[]::text[]),
    'squads_with_commanders', COALESCE(squads_with_cmdr, ARRAY[]::text[]),
    'squads_available', COALESCE(
      ARRAY(SELECT unnest(team_squads) EXCEPT SELECT unnest(COALESCE(squads_with_cmdr, ARRAY[]::text[]))),
      team_squads
    )
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_team_commander_status"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_leaderboard"("p_team_id" "uuid", "p_days_back" integer DEFAULT 30) RETURNS TABLE("user_id" "uuid", "user_name" "text", "sessions_completed" bigint, "avg_accuracy" numeric, "best_accuracy" numeric, "avg_grouping" numeric, "total_rounds" integer, "rank_position" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH team_performance AS (
        SELECT 
            sss.user_id,
            sss.user_name,
            COUNT(*) as sessions,
            AVG(sss.overall_accuracy_pct) as avg_acc,
            MAX(sss.overall_accuracy_pct) as best_acc,
            AVG(sss.avg_grouping_cm) as avg_group,
            SUM(sss.total_rounds_on_target) as rounds
        FROM session_stats_sniper sss
        WHERE sss.team_id = p_team_id
        AND sss.started_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
        GROUP BY sss.user_id, sss.user_name
    )
    SELECT 
        user_id,
        user_name,
        sessions as sessions_completed,
        ROUND(avg_acc, 2) as avg_accuracy,
        ROUND(best_acc, 2) as best_accuracy,
        ROUND(avg_group, 2) as avg_grouping,
        rounds::INTEGER as total_rounds,
        RANK() OVER (ORDER BY avg_acc DESC, avg_group ASC) as rank_position
    FROM team_performance
    ORDER BY rank_position;
END;
$$;


ALTER FUNCTION "public"."get_team_leaderboard"("p_team_id" "uuid", "p_days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_members"("p_team_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "role" "text", "details" "jsonb", "joined_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Get workspace owner from team
  SELECT workspace_owner_id INTO v_workspace_id
  FROM teams WHERE id = p_team_id;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    tm.role,
    tm.details,
    tm.joined_at
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY tm.role, p.full_name;
END;
$$;


ALTER FUNCTION "public"."get_team_members"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_with_members"("p_team_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    
    -- Check access
    IF NOT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = p_team_id AND user_id = v_user_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = p_team_id AND created_by = v_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Build result
    SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'squads', t.squads,
        'team_type', t.team_type,
        'created_by', t.created_by,
        'created_at', t.created_at,
        'members', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'user_id', tm.user_id,
                    'role', tm.role,
                    'details', tm.details,
                    'joined_at', tm.joined_at,
                    'profile', jsonb_build_object(
                        'id', p.id,
                        'email', p.email,
                        'full_name', p.full_name,
                        'avatar_url', p.avatar_url
                    )
                )
            ), '[]'::jsonb)
            FROM public.team_members tm
            JOIN public.profiles p ON p.id = tm.user_id
            WHERE tm.team_id = t.id
        )
    ) INTO v_result
    FROM public.teams t
    WHERE t.id = p_team_id;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_team_with_members"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_training_completion_status"("p_training_id" "uuid") RETURNS TABLE("total_participants" integer, "participants_complete" integer, "total_drills" integer, "total_required_completions" integer, "total_actual_completions" integer, "completion_pct" numeric, "expires_at" timestamp with time zone, "is_expired" boolean, "should_auto_close" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_team_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Get training info
  SELECT t.team_id, t.expires_at
  INTO v_team_id, v_expires_at
  FROM trainings t
  WHERE t.id = p_training_id;
  
  RETURN QUERY
  WITH participants AS (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id = v_team_id
  ),
  drills AS (
    SELECT td.id as drill_id
    FROM training_drills td
    WHERE td.training_id = p_training_id
  ),
  required AS (
    SELECT p.user_id, d.drill_id
    FROM participants p
    CROSS JOIN drills d
  ),
  completions AS (
    SELECT udc.user_id, udc.drill_id
    FROM user_drill_completions udc
    WHERE udc.training_id = p_training_id
  ),
  participant_stats AS (
    SELECT 
      p.user_id,
      COUNT(c.drill_id) as drills_done,
      (SELECT COUNT(*) FROM drills) as total_drills
    FROM participants p
    LEFT JOIN completions c ON c.user_id = p.user_id
    GROUP BY p.user_id
  )
  SELECT
    (SELECT COUNT(*)::integer FROM participants),
    (SELECT COUNT(*)::integer FROM participant_stats WHERE drills_done = total_drills),
    (SELECT COUNT(*)::integer FROM drills),
    (SELECT COUNT(*)::integer FROM required),
    (SELECT COUNT(*)::integer FROM completions),
    CASE 
      WHEN (SELECT COUNT(*) FROM required) = 0 THEN 0
      ELSE ROUND((SELECT COUNT(*) FROM completions)::numeric / (SELECT COUNT(*) FROM required) * 100, 1)
    END,
    v_expires_at,
    v_expires_at IS NOT NULL AND v_expires_at < NOW(),
    check_training_completion(p_training_id);
END;
$$;


ALTER FUNCTION "public"."get_training_completion_status"("p_training_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_sessions"("p_workspace_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "workspace_type" "text", "user_id" "uuid", "user_full_name" "text", "team_id" "uuid", "team_name" "text", "session_mode" "text", "status" "text", "started_at" timestamp with time zone, "ended_at" timestamp with time zone, "session_data" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify access (could be personal or org workspace)
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_access wa
    WHERE (wa.workspace_owner_id = p_workspace_id OR wa.org_workspace_id = p_workspace_id)
      AND wa.member_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to workspace';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.workspace_type,
    s.user_id,
    p.full_name as user_full_name,
    s.team_id,
    t.name as team_name,
    s.session_mode,
    s.status,
    s.started_at,
    s.ended_at,
    s.session_data,
    s.created_at
  FROM public.sessions s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.teams t ON t.id = s.team_id
  WHERE (s.workspace_owner_id = p_workspace_id OR s.org_workspace_id = p_workspace_id)
  ORDER BY s.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_workspace_sessions"("p_workspace_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_type" "text", "member_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT has_workspace_access(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id;
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.team_type,
    COUNT(tm.user_id) AS member_count
  FROM teams t
  LEFT JOIN team_members tm ON tm.team_id = t.id
  WHERE t.workspace_owner_id = p_workspace_id
  GROUP BY t.id
  ORDER BY t.team_type, t.name;
END;
$$;


ALTER FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workspace_slug text;
BEGIN
  -- Generate unique workspace slug
  v_workspace_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    '[^a-zA-Z0-9]',
    '-',
    'g'
  )) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  
  -- Create profile ONLY (no workspace access)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    workspace_name,
    workspace_slug
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    CONCAT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), '''s Workspace'),
    v_workspace_slug
  )
  ON CONFLICT (id) DO NOTHING;

  -- NO automatic workspace creation!
  -- User must create or join an organization

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_sample_session_data"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_session_id UUID;
BEGIN
    -- Create a sample session
    INSERT INTO public.sessions (
        user_id, session_mode, status, started_at, ended_at, session_data
    ) VALUES (
        p_user_id, 'solo', 'completed', 
        NOW() - INTERVAL '1 hour', NOW(),
        '{"weather": "clear", "wind": "5mph", "temperature": "72F"}'::jsonb
    ) RETURNING id INTO new_session_id;
    
    -- Add simple session stats
    INSERT INTO public.session_stats (
        session_id, user_id, shots_fired, hits, accuracy_pct,
        grouping_cm, weapon_used, position, distance_m, target_type
    ) VALUES (
        new_session_id, p_user_id, 20, 18, 90.0,
        4.5, 'M24 SWS', 'prone', 300, 'paper'
    );
    
    RETURN new_session_id;
END;
$$;


ALTER FUNCTION "public"."insert_sample_session_data"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."insert_sample_session_data"("p_user_id" "uuid") IS 'Creates sample session data for testing purposes';



CREATE OR REPLACE FUNCTION "public"."is_engagement_owner"("eng_id" "uuid", "check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.id = eng_id
    AND s.user_id = check_user_id
  );
$$;


ALTER FUNCTION "public"."is_engagement_owner"("eng_id" "uuid", "check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_engagement_participant"("eng_id" "uuid", "check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagement_participants ep
    WHERE ep.engagement_id = eng_id
    AND ep.user_id = check_user_id
  );
$$;


ALTER FUNCTION "public"."is_engagement_participant"("eng_id" "uuid", "check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_engagement_team_member"("eng_id" "uuid", "check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE e.id = eng_id
    AND tm.user_id = check_user_id
  );
$$;


ALTER FUNCTION "public"."is_engagement_team_member"("eng_id" "uuid", "check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_squad_engagement"("eng_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagements e
    WHERE e.id = eng_id
    AND e.engagement_mode = 'squad'
  );
$$;


ALTER FUNCTION "public"."is_squad_engagement"("eng_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = p_team_id 
        AND user_id = p_user_id
        AND role IN ('owner', 'commander')
    )
    OR EXISTS (
        SELECT 1 FROM teams
        WHERE id = p_team_id AND created_by = p_user_id
    );
$$;


ALTER FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role IN ('manager', 'commander')
  );
END;
$$;


ALTER FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_member"("p_team_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = p_team_id AND user_id = p_user_id
    );
$$;


ALTER FUNCTION "public"."is_team_member"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$;


ALTER FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."make_condition_key"("p_drill_goal" "text", "p_position" "text", "p_distance_m" integer, "p_weapon_category" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
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


ALTER FUNCTION "public"."make_condition_key"("p_drill_goal" "text", "p_position" "text", "p_distance_m" integer, "p_weapon_category" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."make_condition_key"("p_drill_goal" "text", "p_position" "text", "p_distance_m" integer, "p_weapon_category" "text") IS 'Generates baseline lookup key from session context. Format: drill_goal|position|distance_bucket|weapon_category';



CREATE OR REPLACE FUNCTION "public"."notify_insight_generation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'net'
    AS $$
DECLARE
  v_url text;
  v_service_role_key text;
BEGIN
  -- Get the Edge Function URL from environment
  -- Format: https://<project-ref>.supabase.co/functions/v1/generate-insights
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-insights';
  
  -- Get service role key for authentication
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not configured, skip silently
  IF v_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'Insight webhook not configured, skipping';
    RETURN NEW;
  END IF;
  
  -- Make async HTTP POST to Edge Function
  -- Using pg_net extension for non-blocking requests
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('session_id', NEW.session_id)
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to call insight webhook: %', SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_insight_generation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_insight_generation"() IS 'Trigger function that calls generate-insights Edge Function via pg_net when session_features are inserted.';



CREATE OR REPLACE FUNCTION "public"."notify_team_on_training_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    team_member RECORD;
    training_title TEXT;
    team_name TEXT;
    creator_name TEXT;
BEGIN
    -- Get training title
    training_title := NEW.title;
    
    -- Get team name if available
    IF NEW.team_id IS NOT NULL THEN
        SELECT name INTO team_name FROM public.teams WHERE id = NEW.team_id;
    END IF;
    
    -- Get creator name
    SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
    
    -- If there's a team, notify all team members (except creator)
    IF NEW.team_id IS NOT NULL THEN
        FOR team_member IN 
            SELECT DISTINCT tm.user_id 
            FROM public.team_members tm
            WHERE tm.team_id = NEW.team_id
            AND tm.user_id != NEW.created_by
        LOOP
            INSERT INTO public.notifications (user_id, type, title, body, data)
            VALUES (
                team_member.user_id,
                'training_created',
                'New Training Scheduled',
                COALESCE(creator_name, 'Someone') || ' created "' || training_title || '"' || 
                    CASE WHEN team_name IS NOT NULL THEN ' for ' || team_name ELSE '' END,
                jsonb_build_object(
                    'training_id', NEW.id,
                    'team_id', NEW.team_id,
                    'scheduled_at', NEW.scheduled_at
                )
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_team_on_training_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_team_on_training_started"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    team_member RECORD;
    training_title TEXT;
BEGIN
    IF OLD.status != 'ongoing' AND NEW.status = 'ongoing' THEN
        training_title := NEW.title;
        
        IF NEW.team_id IS NOT NULL THEN
            FOR team_member IN 
                SELECT DISTINCT tm.user_id 
                FROM public.team_members tm
                WHERE tm.team_id = NEW.team_id
            LOOP
                INSERT INTO public.notifications (user_id, type, title, body, data)
                VALUES (
                    team_member.user_id,
                    'training_started',
                    'Training Started!',
                    '"' || training_title || '" is now live. Join now!',
                    jsonb_build_object(
                        'training_id', NEW.id,
                        'team_id', NEW.team_id
                    )
                );
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_team_on_training_started"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_user_baseline"("p_user_id" "uuid", "p_condition_key" "text", "p_limit" integer DEFAULT 30) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."refresh_user_baseline"("p_user_id" "uuid", "p_condition_key" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_user_baseline"("p_user_id" "uuid", "p_condition_key" "text", "p_limit" integer) IS 'Refreshes user baseline for a condition key from last N matching sessions. Minimum 3 sessions required.';



CREATE OR REPLACE FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team record;
  v_has_permission boolean := false;
BEGIN
  -- Get team info
  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Check permissions: can remove self OR be workspace admin OR be team commander
  IF p_user_id = auth.uid() THEN
    v_has_permission := true;
  ELSIF v_team.org_workspace_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM workspace_access
      WHERE org_workspace_id = v_team.org_workspace_id
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) INTO v_has_permission;
    
    IF NOT v_has_permission THEN
      PERFORM 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role IN ('commander', 'squad_commander');
      
      v_has_permission := FOUND;
    END IF;
  ELSIF v_team.workspace_owner_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM workspace_access
      WHERE workspace_owner_id = v_team.workspace_owner_id
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) INTO v_has_permission;
    
    IF NOT v_has_permission THEN
      PERFORM 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role IN ('commander', 'squad_commander');
      
      v_has_permission := FOUND;
    END IF;
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: must be the user, workspace admin, or team commander';
  END IF;

  -- Delete team member
  DELETE FROM team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") IS 'Safely removes a team member with permission checks, bypassing RLS recursion.';



CREATE OR REPLACE FUNCTION "public"."reset_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE user_insight_triggers
  SET 
    sessions_since_last = 0,
    bullets_since_last = 0,
    last_insight_at = now(),
    last_insight_session_id = p_session_id,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."reset_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid") IS 'Resets insight trigger counters after generating aggregate insights.';



CREATE OR REPLACE FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = auth.uid()
        AND tm2.user_id = p_other_user_id
    );
$$;


ALTER FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_engagement_participants_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.state = 'joined' AND (OLD.state IS NULL OR OLD.state != 'joined') THEN
    NEW.joined_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_engagement_participants_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_engagements_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_engagements_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid", "p_shots" integer) RETURNS TABLE("sessions_count" integer, "threshold_reached" boolean, "session_threshold" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_trigger RECORD;
BEGIN
  -- Upsert trigger record and increment counters
  INSERT INTO user_insight_triggers (
    user_id,
    sessions_since_last,
    bullets_since_last,
    updated_at
  ) VALUES (
    p_user_id,
    1,
    COALESCE(p_shots, 0),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    sessions_since_last = user_insight_triggers.sessions_since_last + 1,
    bullets_since_last = user_insight_triggers.bullets_since_last + COALESCE(p_shots, 0),
    updated_at = now()
  RETURNING * INTO v_trigger;

  -- Return current state
  RETURN QUERY SELECT 
    v_trigger.sessions_since_last,
    (v_trigger.sessions_since_last >= v_trigger.session_threshold),
    v_trigger.session_threshold;
END;
$$;


ALTER FUNCTION "public"."update_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid", "p_shots" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid", "p_shots" integer) IS 'Increments insight trigger counters after each session. Returns whether threshold is reached.';



CREATE OR REPLACE FUNCTION "public"."update_team_drill_presets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_team_drill_presets_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team record;
  v_has_permission boolean := false;
  v_result jsonb;
BEGIN
  -- Get team info
  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Check permissions
  IF v_team.org_workspace_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM workspace_access
      WHERE org_workspace_id = v_team.org_workspace_id
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) INTO v_has_permission;
    
    IF NOT v_has_permission THEN
      PERFORM 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role IN ('commander', 'squad_commander');
      
      v_has_permission := FOUND;
    END IF;
  ELSIF v_team.workspace_owner_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM workspace_access
      WHERE workspace_owner_id = v_team.workspace_owner_id
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) INTO v_has_permission;
    
    IF NOT v_has_permission THEN
      PERFORM 1 FROM team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role IN ('commander', 'squad_commander');
      
      v_has_permission := FOUND;
    END IF;
  END IF;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: must be workspace admin or team commander';
  END IF;

  -- Update team member
  UPDATE team_members
  SET 
    role = p_role,
    details = COALESCE(p_details, details)
  WHERE team_id = p_team_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team member not found';
  END IF;

  -- Return updated member with profile
  SELECT jsonb_build_object(
    'team_id', tm.team_id,
    'user_id', tm.user_id,
    'role', tm.role,
    'details', tm.details,
    'joined_at', tm.joined_at,
    'profile', jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url
    )
  ) INTO v_result
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id AND tm.user_id = p_user_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") IS 'Safely updates a team member role with permission checks, bypassing RLS recursion.';



CREATE OR REPLACE FUNCTION "public"."update_team_standards_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_team_standards_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_invitation record;
  v_is_member boolean;
  v_team_name text;
BEGIN
  -- 1. INPUT VALIDATION
  IF p_invite_code IS NULL OR length(trim(p_invite_code)) != 8 THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid invite code format');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'You must be logged in to validate an invitation');
  END IF;

  -- 2. CODE EXISTENCE CHECK
  SELECT 
    inv.*,
    org.name as workspace_name,
    t.name as team_name,
    prof.full_name as inviter_name,
    prof.email as inviter_email
  INTO v_invitation
  FROM workspace_invitations inv
  LEFT JOIN org_workspaces org ON org.id = inv.org_workspace_id
  LEFT JOIN teams t ON t.id = inv.team_id
  LEFT JOIN profiles prof ON prof.id = inv.invited_by
  WHERE inv.invite_code = upper(trim(p_invite_code));

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid invitation code');
  END IF;

  -- 3. SELF-INVITATION PREVENTION
  IF v_invitation.invited_by = p_user_id THEN
    RETURN json_build_object('valid', false, 'error', 'You cannot use your own invitation code');
  END IF;

  -- 4. STATUS VALIDATION
  IF v_invitation.status != 'pending' THEN
    RETURN json_build_object(
      'valid', false, 
      'error', CASE v_invitation.status
        WHEN 'accepted' THEN 'This invitation has already been used'
        WHEN 'cancelled' THEN 'This invitation has been cancelled'
        WHEN 'expired' THEN 'This invitation has expired'
        ELSE 'This invitation is not valid'
      END
    );
  END IF;

  -- 5. EXPIRATION CHECK
  IF v_invitation.expires_at <= now() THEN
    UPDATE workspace_invitations SET status = 'expired', updated_at = now() WHERE id = v_invitation.id;
    RETURN json_build_object('valid', false, 'error', 'This invitation has expired');
  END IF;

  -- 6. DUPLICATE MEMBERSHIP PREVENTION
  -- Check if user is already a member of this workspace
  SELECT EXISTS (
    SELECT 1 FROM workspace_access
    WHERE org_workspace_id = v_invitation.org_workspace_id AND member_id = p_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    -- We might want to allow invites for existing members to join teams, 
    -- but for now we stick to the original logic of blocking it.
    -- If we wanted to support it, we'd check if they are in the TEAM, not just workspace.
    RETURN json_build_object('valid', false, 'error', 'You are already a member of this workspace');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'org_workspace_id', v_invitation.org_workspace_id,
      'team_id', v_invitation.team_id,
      'team_role', v_invitation.team_role,
      'team_name', v_invitation.team_name,
      'details', v_invitation.details,
      'invite_code', v_invitation.invite_code,
      'role', v_invitation.role,
      'status', v_invitation.status,
      'workspace_name', v_invitation.workspace_name,
      'invited_by', v_invitation.invited_by,
      'invited_by_name', COALESCE(v_invitation.inviter_name, v_invitation.inviter_email),
      'expires_at', v_invitation.expires_at,
      'created_at', v_invitation.created_at
    )
  );
END;
$$;


ALTER FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") IS 'Securely validates an invite code with comprehensive security checks. 
Returns JSON with valid flag and invitation details or error message.
Bypasses RLS for consistent validation across all users.';



CREATE TABLE IF NOT EXISTS "public"."drill_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "target_type" "text" NOT NULL,
    "distance_m" integer NOT NULL,
    "rounds_per_shooter" integer NOT NULL,
    "time_limit_seconds" integer,
    "position" "text",
    "weapon_category" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "par_time_seconds" integer,
    "scoring_mode" "text",
    "min_accuracy_percent" integer,
    "points_per_hit" integer,
    "penalty_per_miss" integer,
    "target_count" integer DEFAULT 1,
    "target_size" "text",
    "shots_per_target" integer,
    "target_exposure_seconds" integer,
    "start_position" "text",
    "strings_count" integer DEFAULT 1,
    "reload_required" boolean DEFAULT false,
    "movement_type" "text",
    "movement_distance_m" integer,
    "difficulty" "text",
    "category" "text",
    "tags" "text"[],
    "instructions" "text",
    "diagram_url" "text",
    "video_url" "text",
    "safety_notes" "text",
    "drill_goal" "text" DEFAULT 'achievement'::"text" NOT NULL,
    "configurable_fields" "text"[],
    "default_values" "jsonb",
    "icon" "text",
    "default_distance_m" integer DEFAULT 25,
    "default_rounds_per_shooter" integer DEFAULT 5,
    "default_time_limit_seconds" integer,
    "default_par_time_seconds" integer,
    "default_strings_count" integer DEFAULT 1,
    "default_target_count" integer DEFAULT 1,
    "default_min_accuracy_percent" integer,
    "default_shots_per_target" integer,
    "default_target_size" "text",
    "default_target_exposure_seconds" integer,
    "default_movement_distance_m" integer,
    "owner_type" "text" DEFAULT 'team'::"text" NOT NULL,
    "owner_id" "uuid",
    "is_default" boolean DEFAULT false,
    "migrated_at" timestamp with time zone,
    CONSTRAINT "drill_templates_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['fundamentals'::"text", 'speed'::"text", 'accuracy'::"text", 'stress'::"text", 'tactical'::"text", 'competition'::"text", 'qualification'::"text"])))),
    CONSTRAINT "drill_templates_difficulty_check" CHECK ((("difficulty" IS NULL) OR ("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text", 'expert'::"text"])))),
    CONSTRAINT "drill_templates_min_accuracy_percent_check" CHECK ((("min_accuracy_percent" IS NULL) OR (("min_accuracy_percent" >= 0) AND ("min_accuracy_percent" <= 100)))),
    CONSTRAINT "drill_templates_movement_type_check" CHECK ((("movement_type" IS NULL) OR ("movement_type" = ANY (ARRAY['none'::"text", 'advance'::"text", 'retreat'::"text", 'lateral'::"text", 'diagonal'::"text", 'freestyle'::"text"])))),
    CONSTRAINT "drill_templates_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['user'::"text", 'team'::"text"]))),
    CONSTRAINT "drill_templates_position_check" CHECK ((("position" IS NULL) OR ("position" = ANY (ARRAY['standing'::"text", 'kneeling'::"text", 'prone'::"text", 'sitting'::"text", 'barricade'::"text", 'transition'::"text", 'freestyle'::"text"])))),
    CONSTRAINT "drill_templates_scoring_mode_check" CHECK ((("scoring_mode" IS NULL) OR ("scoring_mode" = ANY (ARRAY['accuracy'::"text", 'speed'::"text", 'combined'::"text", 'pass_fail'::"text", 'points'::"text"])))),
    CONSTRAINT "drill_templates_start_position_check" CHECK ((("start_position" IS NULL) OR ("start_position" = ANY (ARRAY['holstered'::"text", 'low_ready'::"text", 'high_ready'::"text", 'table_start'::"text", 'surrender'::"text", 'compressed_ready'::"text"])))),
    CONSTRAINT "drill_templates_target_size_check" CHECK ((("target_size" IS NULL) OR ("target_size" = ANY (ARRAY['full'::"text", 'half'::"text", 'head'::"text", 'a_zone'::"text", 'c_zone'::"text", 'steel_8in'::"text", 'steel_10in'::"text", 'custom'::"text"])))),
    CONSTRAINT "drill_templates_target_type_check" CHECK (("target_type" = ANY (ARRAY['paper'::"text", 'tactical'::"text"]))),
    CONSTRAINT "drill_templates_weapon_category_check" CHECK ((("weapon_category" IS NULL) OR ("weapon_category" = ANY (ARRAY['rifle'::"text", 'pistol'::"text", 'shotgun'::"text", 'carbine'::"text", 'precision_rifle'::"text", 'smg'::"text", 'any'::"text", 'other'::"text"]))))
);


ALTER TABLE "public"."drill_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."drill_templates" IS 'Core drill definitions. Contains static properties that define WHAT a drill is. Reusable across trainings.';



COMMENT ON COLUMN "public"."drill_templates"."distance_m" IS 'DEPRECATED: Use default_distance_m. Kept for backwards compatibility.';



COMMENT ON COLUMN "public"."drill_templates"."rounds_per_shooter" IS 'DEPRECATED: Use default_rounds_per_shooter. Kept for backwards compatibility.';



COMMENT ON COLUMN "public"."drill_templates"."time_limit_seconds" IS 'DEPRECATED: Use default_time_limit_seconds. Kept for backwards compatibility.';



COMMENT ON COLUMN "public"."drill_templates"."par_time_seconds" IS 'DEPRECATED: Use default_par_time_seconds. Kept for backwards compatibility.';



COMMENT ON COLUMN "public"."drill_templates"."target_count" IS 'DEPRECATED: Use default_target_count. Kept for backwards compatibility.';



COMMENT ON COLUMN "public"."drill_templates"."strings_count" IS 'DEPRECATED: Use default_strings_count. Kept for backwards compatibility.';



COMMENT ON COLUMN "public"."drill_templates"."configurable_fields" IS 'Array of field names that can be customized when adding this drill to a training. Non-configurable fields remain static from the template.';



COMMENT ON COLUMN "public"."drill_templates"."default_values" IS 'Default/suggested values for configurable fields. Shown as placeholders when adding drill to training.';



COMMENT ON COLUMN "public"."drill_templates"."icon" IS 'Emoji or icon identifier for visual representation (e.g., 🎯, 🔥, ⚡)';



COMMENT ON COLUMN "public"."drill_templates"."default_distance_m" IS 'Suggested distance in meters. Copied to instance but can be overridden.';



COMMENT ON COLUMN "public"."drill_templates"."default_rounds_per_shooter" IS 'Suggested shots per entry. Copied to instance but can be overridden.';



COMMENT ON COLUMN "public"."drill_templates"."default_time_limit_seconds" IS 'Suggested time limit. Copied to instance but can be overridden.';



COMMENT ON COLUMN "public"."drill_templates"."default_strings_count" IS 'Suggested number of rounds/strings. Copied to instance but can be overridden.';



COMMENT ON COLUMN "public"."drill_templates"."default_target_count" IS 'Suggested targets per round. Copied to instance but can be overridden.';



COMMENT ON COLUMN "public"."drill_templates"."owner_type" IS 'Ownership type: ''user'' for personal presets, ''team'' for team drills';



COMMENT ON COLUMN "public"."drill_templates"."owner_id" IS 'Owner ID: user_id when owner_type=''user'', team_id when owner_type=''team''';



COMMENT ON COLUMN "public"."drill_templates"."is_default" IS 'True for system/default drills used by Quick Start';



CREATE TABLE IF NOT EXISTS "public"."drills" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "drill_goal" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "default_shots" integer DEFAULT 5 NOT NULL,
    "default_strings" integer DEFAULT 1 NOT NULL,
    "supports_time" boolean DEFAULT false NOT NULL,
    "supports_position" boolean DEFAULT true NOT NULL,
    "allowed_distances" integer[],
    "fixed_shots" boolean DEFAULT false NOT NULL,
    "category" "text",
    "difficulty" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "drills_category_check" CHECK (("category" = ANY (ARRAY['zeroing'::"text", 'grouping'::"text", 'speed'::"text", 'qualification'::"text"]))),
    CONSTRAINT "drills_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "drills_drill_goal_check" CHECK (("drill_goal" = ANY (ARRAY['grouping'::"text", 'engagement'::"text"]))),
    CONSTRAINT "drills_target_type_check" CHECK (("target_type" = ANY (ARRAY['paper'::"text", 'tactical'::"text"])))
);


ALTER TABLE "public"."drills" OWNER TO "postgres";


COMMENT ON TABLE "public"."drills" IS 'Canonical drill definitions - global, read-only execution patterns';



COMMENT ON COLUMN "public"."drills"."id" IS 'Stable identifier, never changes';



COMMENT ON COLUMN "public"."drills"."allowed_distances" IS 'If set, only these distances are valid. NULL = any distance';



COMMENT ON COLUMN "public"."drills"."fixed_shots" IS 'If true, default_shots cannot be overridden';



CREATE TABLE IF NOT EXISTS "public"."engagement_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "state" "text" DEFAULT 'pending'::"text" NOT NULL,
    "joined_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "engagement_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "session_id" "uuid",
    "shots_fired" integer,
    "hits" integer,
    "role" "text" DEFAULT 'shooter'::"text",
    CONSTRAINT "engagement_participants_role_check" CHECK (("role" = ANY (ARRAY['shooter'::"text", 'spotter'::"text"]))),
    CONSTRAINT "engagement_participants_state_check" CHECK (("state" = ANY (ARRAY['pending'::"text", 'joined'::"text", 'declined'::"text", 'left'::"text"])))
);


ALTER TABLE "public"."engagement_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."engagement_participants" IS 'Participants in squad engagements. Async consent model.';



COMMENT ON COLUMN "public"."engagement_participants"."state" IS 'Participant state: pending (invited, awaiting response), joined (accepted), declined (rejected invite), left (removed/left after joining)';



COMMENT ON COLUMN "public"."engagement_participants"."joined_at" IS 'Timestamp when user joined (state changed to joined)';



COMMENT ON COLUMN "public"."engagement_participants"."engagement_id" IS 'Reference to the engagement (execution unit) - ONLY reference, never session_id';



COMMENT ON COLUMN "public"."engagement_participants"."role" IS 'Participant role: shooter (fires weapon, records results) or spotter (observer, assists shooter)';



CREATE TABLE IF NOT EXISTS "public"."engagements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "engagement_mode" "text" DEFAULT 'solo'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shooter_id" "uuid",
    "training_id" "uuid",
    "drill_goal" "text",
    "started_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "engagements_drill_goal_check" CHECK (("drill_goal" = ANY (ARRAY['grouping'::"text", 'engagement'::"text"]))),
    CONSTRAINT "engagements_engagement_mode_check" CHECK (("engagement_mode" = ANY (ARRAY['solo'::"text", 'squad'::"text"]))),
    CONSTRAINT "engagements_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."engagements" OWNER TO "postgres";


COMMENT ON TABLE "public"."engagements" IS 'Atomic execution unit. Squad logic lives here. Training and Session are passive context.';



COMMENT ON COLUMN "public"."engagements"."session_id" IS 'Reference to session setup (weapon, team, drill config)';



COMMENT ON COLUMN "public"."engagements"."engagement_mode" IS 'solo = individual, squad = async team participation. Grouping is ALWAYS solo.';



COMMENT ON COLUMN "public"."engagements"."status" IS 'Engagement status: pending (lobby/waiting), active (in progress), completed (finished normally), cancelled (aborted by commander)';



COMMENT ON COLUMN "public"."engagements"."shooter_id" IS 'The user who executed this engagement';



COMMENT ON COLUMN "public"."engagements"."training_id" IS 'Optional link to training context';



COMMENT ON COLUMN "public"."engagements"."drill_goal" IS 'Primary classification: grouping (ALWAYS solo) or engagement (can be squad)';



CREATE TABLE IF NOT EXISTS "public"."notification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "type" "text" DEFAULT 'default'::"text" NOT NULL,
    "screen" "text",
    "reference_id" "text",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "data" "jsonb",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paper_target_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_target_id" "uuid" NOT NULL,
    "paper_type" "text" NOT NULL,
    "bullets_fired" integer NOT NULL,
    "hits_total" integer,
    "hits_inside_scoring" integer,
    "dispersion_cm" numeric,
    "offset_right_cm" numeric,
    "offset_up_cm" numeric,
    "scanned_image_url" "text",
    "notes" "text",
    "actual_shots_declared" integer,
    CONSTRAINT "paper_target_results_paper_type_check" CHECK (("paper_type" = ANY (ARRAY['grouping'::"text", 'engagement'::"text"])))
);


ALTER TABLE "public"."paper_target_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "workspace_name" "text" DEFAULT 'My Workspace'::"text",
    "workspace_slug" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_admin" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Users (each user is also a workspace)';



CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "device_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "primary_factor" "text",
    "secondary_factor" "text",
    "score" numeric DEFAULT 0 NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "insight_type" "text",
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_aggregate" boolean DEFAULT false NOT NULL,
    "sessions_analyzed" "uuid"[] DEFAULT '{}'::"uuid"[],
    CONSTRAINT "session_insights_score_check" CHECK ((("score" >= (0)::numeric) AND ("score" <= (100)::numeric)))
);


ALTER TABLE "public"."session_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "weapon_id" "uuid",
    "sight_id" "uuid",
    "position" "text",
    "shots_fired" integer DEFAULT 0,
    "notes" "text",
    CONSTRAINT "session_participants_role_check" CHECK (("role" = ANY (ARRAY['sniper'::"text", 'spotter'::"text", 'pistol'::"text", 'observer'::"text", 'instructor'::"text"])))
);


ALTER TABLE "public"."session_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_standards_verdicts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "evaluation_scope" "text" DEFAULT 'session'::"text" NOT NULL,
    "scope_ref_id" "uuid",
    "base_standard_id" "uuid",
    "applied_modifiers" "jsonb" DEFAULT '[]'::"jsonb",
    "effective_grouping_cm" numeric,
    "effective_accuracy_pct" numeric,
    "effective_time_seconds" integer,
    "actual_grouping_cm" numeric,
    "actual_accuracy_pct" numeric,
    "actual_time_seconds" integer,
    "passed" boolean NOT NULL,
    "verdict_breakdown" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "session_standards_verdicts_evaluation_scope_check" CHECK (("evaluation_scope" = ANY (ARRAY['session'::"text", 'drill'::"text", 'target'::"text"])))
);


ALTER TABLE "public"."session_standards_verdicts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shots_fired" integer DEFAULT 0,
    "hits" integer DEFAULT 0,
    "accuracy_pct" numeric(5,2),
    "headshots" integer DEFAULT 0,
    "long_range_hits" integer DEFAULT 0,
    "grouping_cm" numeric(8,2),
    "weapon_used" "text",
    "position" "text",
    "distance_m" integer,
    "target_type" "text",
    "engagement_time_sec" numeric(8,2),
    "score" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_stats" IS 'Simple session statistics table for quick sniper performance tracking';



CREATE TABLE IF NOT EXISTS "public"."session_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "target_type" "text" NOT NULL,
    "sequence_in_session" integer,
    "distance_m" integer,
    "lane_number" integer,
    "notes" "text",
    "planned_shots" integer,
    "target_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "participant_id" "uuid",
    CONSTRAINT "session_targets_target_type_check" CHECK (("target_type" = ANY (ARRAY['paper'::"text", 'tactical'::"text"])))
);

ALTER TABLE ONLY "public"."session_targets" REPLICA IDENTITY FULL;


ALTER TABLE "public"."session_targets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."session_targets"."participant_id" IS 'For squad sessions: links target result to specific participant. NULL for solo sessions.';



CREATE TABLE IF NOT EXISTS "public"."session_timelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "points" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "shot_details" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "total_chunks" integer DEFAULT 1 NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_timelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_timelines" IS 'Stores time-series biometric data from Garmin watch sessions. 
Points are recorded every 3 seconds with HR, breath rate, stress, and event markers.
Shot details contain detailed biometrics at each shot moment.';



CREATE TABLE IF NOT EXISTS "public"."tactical_target_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_target_id" "uuid" NOT NULL,
    "bullets_fired" integer NOT NULL,
    "hits" integer NOT NULL,
    "is_stage_cleared" boolean DEFAULT false,
    "time_seconds" numeric,
    "notes" "text"
);


ALTER TABLE "public"."tactical_target_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_drill_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "drill_id" "text" NOT NULL,
    "label" "text",
    "distance_m" integer,
    "rounds" integer,
    "time_limit_seconds" integer,
    "position" "text",
    "strings_count" integer DEFAULT 1,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_drill_presets_position_check" CHECK (("position" = ANY (ARRAY['prone'::"text", 'kneeling'::"text", 'sitting'::"text", 'standing'::"text"])))
);


ALTER TABLE "public"."team_drill_presets" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_drill_presets" IS 'Team saved configurations for canonical drills';



COMMENT ON COLUMN "public"."team_drill_presets"."label" IS 'Optional custom name. NULL = use drill name';



CREATE TABLE IF NOT EXISTS "public"."team_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invite_code" "text" NOT NULL,
    "legacy_org_role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid",
    "team_role" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "team_invitations_team_role_check" CHECK ((("team_role" IS NULL) OR ("team_role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'squad_commander'::"text", 'soldier'::"text"])))),
    CONSTRAINT "workspace_invitations_role_check" CHECK (("legacy_org_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text", 'member'::"text", 'attached'::"text"]))),
    CONSTRAINT "workspace_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."team_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_invitations" IS 'Shareable invite codes for organization workspaces';



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "squad_id" "text",
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'squad_commander'::"text", 'soldier'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'Team membership';



CREATE TABLE IF NOT EXISTS "public"."team_standard_modifiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "condition_type" "text" NOT NULL,
    "condition_threshold" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "modifier_effect_type" "text" DEFAULT 'tolerance'::"text" NOT NULL,
    "grouping_penalty_cm" numeric DEFAULT 0,
    "accuracy_penalty_pct" numeric DEFAULT 0,
    "time_penalty_seconds" integer DEFAULT 0,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "team_standard_modifiers_condition_type_check" CHECK (("condition_type" = ANY (ARRAY['weather_rain'::"text", 'weather_wind'::"text", 'weather_cold'::"text", 'weather_hot'::"text", 'fatigue_shots'::"text", 'fatigue_time'::"text", 'fatigue_hr'::"text", 'night_conditions'::"text", 'elevation_high'::"text", 'manual'::"text"]))),
    CONSTRAINT "team_standard_modifiers_modifier_effect_type_check" CHECK (("modifier_effect_type" = ANY (ARRAY['tolerance'::"text", 'invalidate'::"text", 'override'::"text"])))
);


ALTER TABLE "public"."team_standard_modifiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_standards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "drill_goal" "text" NOT NULL,
    "distance_m" integer NOT NULL,
    "weapon_category" "text",
    "primary_metric" "text" NOT NULL,
    "expected_grouping_cm" numeric,
    "expected_accuracy_pct" numeric,
    "expected_time_seconds" integer,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "positive_grouping" CHECK ((("expected_grouping_cm" IS NULL) OR ("expected_grouping_cm" > (0)::numeric))),
    CONSTRAINT "positive_time" CHECK ((("expected_time_seconds" IS NULL) OR ("expected_time_seconds" > 0))),
    CONSTRAINT "primary_metric_matches_goal" CHECK (((("primary_metric" = 'grouping_cm'::"text") AND ("drill_goal" = 'grouping'::"text")) OR (("primary_metric" = 'accuracy_pct'::"text") AND ("drill_goal" = 'engagement'::"text")))),
    CONSTRAINT "team_standards_drill_goal_check" CHECK (("drill_goal" = ANY (ARRAY['grouping'::"text", 'engagement'::"text"]))),
    CONSTRAINT "team_standards_primary_metric_check" CHECK (("primary_metric" = ANY (ARRAY['grouping_cm'::"text", 'accuracy_pct'::"text"]))),
    CONSTRAINT "valid_accuracy" CHECK ((("expected_accuracy_pct" IS NULL) OR (("expected_accuracy_pct" >= (0)::numeric) AND ("expected_accuracy_pct" <= (100)::numeric)))),
    CONSTRAINT "valid_engagement_standard" CHECK ((("drill_goal" <> 'engagement'::"text") OR ("expected_accuracy_pct" IS NOT NULL))),
    CONSTRAINT "valid_grouping_standard" CHECK ((("drill_goal" <> 'grouping'::"text") OR ("expected_grouping_cm" IS NOT NULL)))
);


ALTER TABLE "public"."team_standards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_weapons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "base_weapon_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text",
    "caliber" "text",
    "serial_number" "text",
    "default_zero_distance_m" integer,
    "suppressor_config" "text",
    "barrel_notes" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "assigned_to" "uuid",
    "source_user_weapon_id" "uuid",
    "contributed_by" "uuid",
    "contribution_status" "text" DEFAULT 'approved'::"text",
    "pool_available" boolean DEFAULT false,
    CONSTRAINT "team_weapons_category_check" CHECK (("category" = ANY (ARRAY['rifle'::"text", 'pistol'::"text", 'shotgun'::"text", 'carbine'::"text", 'precision_rifle'::"text", 'smg'::"text", 'other'::"text"]))),
    CONSTRAINT "team_weapons_contribution_status_check" CHECK (("contribution_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."team_weapons" OWNER TO "postgres";


COMMENT ON COLUMN "public"."team_weapons"."pool_available" IS 'When true, weapon is available in shared pool for all team members to use';



CREATE TABLE IF NOT EXISTS "public"."training_drills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "training_id" "uuid" NOT NULL,
    "order_index" integer NOT NULL,
    "name" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "distance_m" integer,
    "rounds_per_shooter" integer,
    "time_limit_seconds" integer,
    "position" "text",
    "weapon_category" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "par_time_seconds" integer,
    "scoring_mode" "text",
    "min_accuracy_percent" integer,
    "points_per_hit" integer,
    "penalty_per_miss" integer,
    "target_count" integer DEFAULT 1,
    "target_size" "text",
    "shots_per_target" integer,
    "target_exposure_seconds" integer,
    "start_position" "text",
    "strings_count" integer DEFAULT 1,
    "reload_required" boolean DEFAULT false,
    "movement_type" "text",
    "movement_distance_m" integer,
    "difficulty" "text",
    "category" "text",
    "tags" "text"[],
    "instructions" "text",
    "diagram_url" "text",
    "video_url" "text",
    "safety_notes" "text",
    "drill_goal" "text" DEFAULT 'achievement'::"text" NOT NULL,
    "drill_template_id" "uuid",
    "drill_id" "uuid",
    "instance_notes" "text",
    "input_method" "text",
    "execution_policy" "text" DEFAULT 'locked'::"text",
    "engagement_mode" "text" DEFAULT 'solo'::"text",
    CONSTRAINT "training_drills_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['fundamentals'::"text", 'speed'::"text", 'accuracy'::"text", 'stress'::"text", 'tactical'::"text", 'competition'::"text", 'qualification'::"text"])))),
    CONSTRAINT "training_drills_difficulty_check" CHECK ((("difficulty" IS NULL) OR ("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text", 'expert'::"text"])))),
    CONSTRAINT "training_drills_engagement_mode_check" CHECK (("engagement_mode" = ANY (ARRAY['solo'::"text", 'squad'::"text"]))),
    CONSTRAINT "training_drills_execution_policy_check" CHECK (("execution_policy" = ANY (ARRAY['locked'::"text", 'guided'::"text", 'free'::"text"]))),
    CONSTRAINT "training_drills_input_method_check" CHECK ((("input_method" IS NULL) OR ("input_method" = ANY (ARRAY['scan'::"text", 'manual'::"text"])))),
    CONSTRAINT "training_drills_min_accuracy_percent_check" CHECK ((("min_accuracy_percent" IS NULL) OR (("min_accuracy_percent" >= 0) AND ("min_accuracy_percent" <= 100)))),
    CONSTRAINT "training_drills_movement_type_check" CHECK ((("movement_type" IS NULL) OR ("movement_type" = ANY (ARRAY['none'::"text", 'advance'::"text", 'retreat'::"text", 'lateral'::"text", 'diagonal'::"text", 'freestyle'::"text"])))),
    CONSTRAINT "training_drills_position_check" CHECK ((("position" IS NULL) OR ("position" = ANY (ARRAY['standing'::"text", 'kneeling'::"text", 'prone'::"text", 'sitting'::"text", 'barricade'::"text", 'transition'::"text", 'freestyle'::"text"])))),
    CONSTRAINT "training_drills_scoring_mode_check" CHECK ((("scoring_mode" IS NULL) OR ("scoring_mode" = ANY (ARRAY['accuracy'::"text", 'speed'::"text", 'combined'::"text", 'pass_fail'::"text", 'points'::"text"])))),
    CONSTRAINT "training_drills_start_position_check" CHECK ((("start_position" IS NULL) OR ("start_position" = ANY (ARRAY['holstered'::"text", 'low_ready'::"text", 'high_ready'::"text", 'table_start'::"text", 'surrender'::"text", 'compressed_ready'::"text"])))),
    CONSTRAINT "training_drills_target_size_check" CHECK ((("target_size" IS NULL) OR ("target_size" = ANY (ARRAY['full'::"text", 'half'::"text", 'head'::"text", 'a_zone'::"text", 'c_zone'::"text", 'steel_8in'::"text", 'steel_10in'::"text", 'custom'::"text"])))),
    CONSTRAINT "training_drills_target_type_check" CHECK (("target_type" = ANY (ARRAY['paper'::"text", 'tactical'::"text"]))),
    CONSTRAINT "training_drills_weapon_category_check" CHECK ((("weapon_category" IS NULL) OR ("weapon_category" = ANY (ARRAY['rifle'::"text", 'pistol'::"text", 'shotgun'::"text", 'carbine'::"text", 'precision_rifle'::"text", 'any'::"text"]))))
);


ALTER TABLE "public"."training_drills" OWNER TO "postgres";


COMMENT ON TABLE "public"."training_drills" IS 'Drill instances within a training. Contains HOW a drill is configured for a specific training session.';



COMMENT ON COLUMN "public"."training_drills"."distance_m" IS 'Distance in meters. NULL means soldier chooses at execution time (guided/free policy).';



COMMENT ON COLUMN "public"."training_drills"."rounds_per_shooter" IS 'Number of rounds. NULL means soldier chooses at execution time (guided/free policy).';



COMMENT ON COLUMN "public"."training_drills"."drill_template_id" IS 'Reference to source drill template. If set, template values are used as defaults.';



COMMENT ON COLUMN "public"."training_drills"."drill_id" IS 'Reference to the source drill definition. NULL for legacy inline drills.';



COMMENT ON COLUMN "public"."training_drills"."instance_notes" IS 'Training-specific notes for this drill instance. Different from the drill''s core description.';



COMMENT ON COLUMN "public"."training_drills"."execution_policy" IS 'How strictly soldiers must follow this drill config: locked (exact), guided (defaults), free (label only).';



COMMENT ON COLUMN "public"."training_drills"."engagement_mode" IS 'How the drill should be executed: solo (individual) or squad (team participation). Grouping drills must always be solo.';



CREATE TABLE IF NOT EXISTS "public"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "scheduled_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "manual_start" boolean DEFAULT false,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "auto_close_at" timestamp with time zone,
    CONSTRAINT "trainings_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'ongoing'::"text", 'finished'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."trainings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trainings"."team_id" IS 'Team that owns this training. Required - trainings always belong to a team.';



COMMENT ON COLUMN "public"."trainings"."manual_start" IS 'If true, commander starts training manually. If false, training auto-starts at scheduled_at time.';



COMMENT ON COLUMN "public"."trainings"."started_at" IS 'When the training was actually started by the commander';



COMMENT ON COLUMN "public"."trainings"."ended_at" IS 'When the training was finished';



CREATE TABLE IF NOT EXISTS "public"."user_baselines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "condition_key" "text" NOT NULL,
    "n" integer DEFAULT 0 NOT NULL,
    "avg_accuracy" numeric,
    "std_accuracy" numeric,
    "avg_grouping" numeric,
    "std_grouping" numeric,
    "avg_stress" numeric,
    "avg_optimal_shot_pct" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_baselines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_drill_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "drill_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shots_fired" integer,
    "hits" integer,
    "accuracy_pct" numeric,
    "time_seconds" numeric
);


ALTER TABLE "public"."user_drill_completions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_drill_completions" IS 'Tracks which drills each user has completed within a training';



CREATE TABLE IF NOT EXISTS "public"."user_insight_triggers" (
    "user_id" "uuid" NOT NULL,
    "sessions_since_last" integer DEFAULT 0 NOT NULL,
    "bullets_since_last" integer DEFAULT 0 NOT NULL,
    "last_insight_at" timestamp with time zone,
    "last_insight_session_id" "uuid",
    "session_threshold" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_insight_triggers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_weapons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "base_weapon_id" "uuid",
    "team_weapon_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text",
    "caliber" "text",
    "personal_zero_distance_m" integer,
    "personal_notes" "text",
    "is_favorite" boolean DEFAULT false,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "shared_with_team_id" "uuid",
    "share_status" "text",
    "cleaning_enabled" boolean DEFAULT false,
    "cleaning_interval_type" "text",
    "cleaning_interval_value" integer,
    "last_cleaned_at" timestamp with time zone,
    "rounds_since_cleaning" integer DEFAULT 0,
    "sessions_since_cleaning" integer DEFAULT 0,
    CONSTRAINT "user_weapons_category_check" CHECK (("category" = ANY (ARRAY['rifle'::"text", 'pistol'::"text", 'shotgun'::"text", 'carbine'::"text", 'precision_rifle'::"text", 'smg'::"text", 'other'::"text"]))),
    CONSTRAINT "user_weapons_cleaning_interval_type_check" CHECK (("cleaning_interval_type" = ANY (ARRAY['rounds'::"text", 'sessions'::"text", 'days'::"text"]))),
    CONSTRAINT "user_weapons_share_status_check" CHECK (("share_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", NULL::"text"])))
);


ALTER TABLE "public"."user_weapons" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_weapons"."cleaning_enabled" IS 'Whether cleaning reminders are enabled for this weapon';



COMMENT ON COLUMN "public"."user_weapons"."cleaning_interval_type" IS 'Type of cleaning interval: rounds, sessions, or days';



COMMENT ON COLUMN "public"."user_weapons"."cleaning_interval_value" IS 'Number of rounds/sessions/days before cleaning reminder';



COMMENT ON COLUMN "public"."user_weapons"."last_cleaned_at" IS 'When the weapon was last cleaned';



COMMENT ON COLUMN "public"."user_weapons"."rounds_since_cleaning" IS 'Rounds fired since last cleaning (auto-updated)';



COMMENT ON COLUMN "public"."user_weapons"."sessions_since_cleaning" IS 'Sessions completed since last cleaning (auto-updated)';



CREATE TABLE IF NOT EXISTS "public"."weapon_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_weapon_id" "uuid",
    "weapon_category" "text",
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weapon_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."weapon_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."weapon_requests" IS 'Weapon assignment requests from team members to commanders';



COMMENT ON COLUMN "public"."weapon_requests"."weapon_category" IS 'Preferred weapon category (rifle, pistol, etc.) - optional';



COMMENT ON COLUMN "public"."weapon_requests"."notes" IS 'Additional notes from the requester';



COMMENT ON COLUMN "public"."weapon_requests"."status" IS 'Request status: pending, approved, rejected, cancelled';



CREATE TABLE IF NOT EXISTS "public"."weapons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "manufacturer" "text",
    "caliber" "text",
    "description" "text",
    "image_url" "text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "weapons_category_check" CHECK (("category" = ANY (ARRAY['rifle'::"text", 'pistol'::"text", 'shotgun'::"text", 'carbine'::"text", 'precision_rifle'::"text", 'smg'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."weapons" OWNER TO "postgres";


ALTER TABLE ONLY "public"."drill_templates"
    ADD CONSTRAINT "drill_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drills"
    ADD CONSTRAINT "drills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."engagement_participants"
    ADD CONSTRAINT "engagement_participants_engagement_id_user_id_key" UNIQUE ("engagement_id", "user_id");



ALTER TABLE ONLY "public"."engagement_participants"
    ADD CONSTRAINT "engagement_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."engagements"
    ADD CONSTRAINT "engagements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."engagements"
    ADD CONSTRAINT "engagements_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."notification_history"
    ADD CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paper_target_results"
    ADD CONSTRAINT "paper_target_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paper_target_results"
    ADD CONSTRAINT "paper_target_results_session_target_id_key" UNIQUE ("session_target_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_workspace_slug_key" UNIQUE ("workspace_slug");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_expo_push_token_key" UNIQUE ("user_id", "expo_push_token");



ALTER TABLE ONLY "public"."session_features"
    ADD CONSTRAINT "session_features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_features"
    ADD CONSTRAINT "session_features_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."session_insights"
    ADD CONSTRAINT "session_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_insights"
    ADD CONSTRAINT "session_insights_unique" UNIQUE ("session_id", "user_id", "title");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_standards_verdicts"
    ADD CONSTRAINT "session_standards_verdicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_standards_verdicts"
    ADD CONSTRAINT "session_standards_verdicts_session_id_evaluation_scope_scop_key" UNIQUE ("session_id", "evaluation_scope", "scope_ref_id");



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_targets"
    ADD CONSTRAINT "session_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_timelines"
    ADD CONSTRAINT "session_timelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_timelines"
    ADD CONSTRAINT "session_timelines_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tactical_target_results"
    ADD CONSTRAINT "tactical_target_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tactical_target_results"
    ADD CONSTRAINT "tactical_target_results_session_target_id_key" UNIQUE ("session_target_id");



ALTER TABLE ONLY "public"."team_drill_presets"
    ADD CONSTRAINT "team_drill_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."team_standard_modifiers"
    ADD CONSTRAINT "team_standard_modifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_standards"
    ADD CONSTRAINT "team_standards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_weapons"
    ADD CONSTRAINT "team_weapons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_drills"
    ADD CONSTRAINT "training_drills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_baselines"
    ADD CONSTRAINT "user_baselines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_baselines"
    ADD CONSTRAINT "user_baselines_user_condition_unique" UNIQUE ("user_id", "condition_key");



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_user_id_training_id_drill_id_key" UNIQUE ("user_id", "training_id", "drill_id");



ALTER TABLE ONLY "public"."user_insight_triggers"
    ADD CONSTRAINT "user_insight_triggers_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_weapons"
    ADD CONSTRAINT "user_weapons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weapon_requests"
    ADD CONSTRAINT "weapon_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weapons"
    ADD CONSTRAINT "weapons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");



CREATE INDEX "engagement_participants_engagement_id_idx" ON "public"."engagement_participants" USING "btree" ("engagement_id");



CREATE INDEX "engagement_participants_role_idx" ON "public"."engagement_participants" USING "btree" ("role");



CREATE INDEX "engagement_participants_state_idx" ON "public"."engagement_participants" USING "btree" ("state");



CREATE INDEX "engagement_participants_user_id_idx" ON "public"."engagement_participants" USING "btree" ("user_id");



CREATE INDEX "engagements_drill_goal_idx" ON "public"."engagements" USING "btree" ("drill_goal");



CREATE INDEX "engagements_session_id_idx" ON "public"."engagements" USING "btree" ("session_id");



CREATE INDEX "engagements_shooter_id_idx" ON "public"."engagements" USING "btree" ("shooter_id");



CREATE INDEX "engagements_status_idx" ON "public"."engagements" USING "btree" ("status");



CREATE INDEX "engagements_training_id_idx" ON "public"."engagements" USING "btree" ("training_id");



CREATE INDEX "idx_drill_completions_drill" ON "public"."user_drill_completions" USING "btree" ("drill_id");



CREATE INDEX "idx_drill_completions_user_training" ON "public"."user_drill_completions" USING "btree" ("user_id", "training_id");



CREATE INDEX "idx_drill_templates_is_default" ON "public"."drill_templates" USING "btree" ("is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_drill_templates_owner" ON "public"."drill_templates" USING "btree" ("owner_type", "owner_id");



CREATE INDEX "idx_drill_templates_team_id" ON "public"."drill_templates" USING "btree" ("team_id");



CREATE INDEX "idx_notification_history_unread" ON "public"."notification_history" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_notification_history_user" ON "public"."notification_history" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_session_features_drill_goal" ON "public"."session_features" USING "btree" ("drill_goal") WHERE ("drill_goal" IS NOT NULL);



CREATE INDEX "idx_session_features_team" ON "public"."session_features" USING "btree" ("team_id") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "idx_session_features_user_created" ON "public"."session_features" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_session_features_weather_condition" ON "public"."session_features" USING "btree" ("weather_condition") WHERE ("has_weather" = true);



CREATE INDEX "idx_session_features_weather_wind" ON "public"."session_features" USING "btree" ("weather_wind_impact") WHERE ("has_weather" = true);



CREATE INDEX "idx_session_insights_aggregate" ON "public"."session_insights" USING "btree" ("user_id", "is_aggregate", "created_at" DESC) WHERE ("is_aggregate" = true);



CREATE INDEX "idx_session_insights_score" ON "public"."session_insights" USING "btree" ("session_id", "score" DESC);



CREATE INDEX "idx_session_insights_session" ON "public"."session_insights" USING "btree" ("session_id");



CREATE INDEX "idx_session_insights_user_created" ON "public"."session_insights" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_session_participants_role" ON "public"."session_participants" USING "btree" ("role");



CREATE INDEX "idx_session_participants_session" ON "public"."session_participants" USING "btree" ("session_id");



CREATE INDEX "idx_session_participants_user" ON "public"."session_participants" USING "btree" ("user_id");



CREATE INDEX "idx_session_targets_participant" ON "public"."session_targets" USING "btree" ("participant_id") WHERE ("participant_id" IS NOT NULL);



CREATE INDEX "idx_session_targets_session" ON "public"."session_targets" USING "btree" ("session_id");



CREATE INDEX "idx_session_targets_type" ON "public"."session_targets" USING "btree" ("target_type");



CREATE INDEX "idx_session_timelines_received" ON "public"."session_timelines" USING "btree" ("received_at" DESC);



CREATE INDEX "idx_session_timelines_session" ON "public"."session_timelines" USING "btree" ("session_id");



CREATE INDEX "idx_session_verdicts_failed" ON "public"."session_standards_verdicts" USING "btree" ("passed") WHERE ("passed" = false);



CREATE INDEX "idx_session_verdicts_scope" ON "public"."session_standards_verdicts" USING "btree" ("session_id", "evaluation_scope");



CREATE INDEX "idx_session_verdicts_session" ON "public"."session_standards_verdicts" USING "btree" ("session_id");



CREATE INDEX "idx_sessions_custom_drill_goal" ON "public"."sessions" USING "btree" ((("custom_drill_config" ->> 'drill_goal'::"text")));



CREATE INDEX "idx_sessions_drill" ON "public"."sessions" USING "btree" ("drill_id");



CREATE INDEX "idx_sessions_drill_template" ON "public"."sessions" USING "btree" ("drill_template_id");



CREATE INDEX "idx_sessions_started" ON "public"."sessions" USING "btree" ("started_at");



CREATE INDEX "idx_sessions_started_at" ON "public"."sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sessions_status" ON "public"."sessions" USING "btree" ("status");



CREATE INDEX "idx_sessions_team" ON "public"."sessions" USING "btree" ("team_id");



CREATE INDEX "idx_sessions_training" ON "public"."sessions" USING "btree" ("training_id");



CREATE INDEX "idx_sessions_user" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_weapon_id" ON "public"."sessions" USING "btree" ("weapon_id");



CREATE INDEX "idx_team_members_squad" ON "public"."team_members" USING "btree" ("team_id", "squad_id");



CREATE INDEX "idx_team_members_team" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_team_modifiers_team" ON "public"."team_standard_modifiers" USING "btree" ("team_id") WHERE ("is_active" = true);



CREATE INDEX "idx_team_presets_drill" ON "public"."team_drill_presets" USING "btree" ("drill_id");



CREATE INDEX "idx_team_presets_team" ON "public"."team_drill_presets" USING "btree" ("team_id");



CREATE UNIQUE INDEX "idx_team_presets_unique" ON "public"."team_drill_presets" USING "btree" ("team_id", "drill_id", COALESCE("label", ''::"text"));



CREATE INDEX "idx_team_standards_lookup" ON "public"."team_standards" USING "btree" ("team_id", "drill_goal", "distance_m") WHERE ("is_active" = true);



CREATE INDEX "idx_team_standards_team_active" ON "public"."team_standards" USING "btree" ("team_id") WHERE ("is_active" = true);



CREATE INDEX "idx_team_weapons_assigned_to" ON "public"."team_weapons" USING "btree" ("assigned_to");



CREATE INDEX "idx_team_weapons_base_weapon_id" ON "public"."team_weapons" USING "btree" ("base_weapon_id");



CREATE INDEX "idx_team_weapons_pool" ON "public"."team_weapons" USING "btree" ("team_id", "pool_available") WHERE (("pool_available" = true) AND ("is_active" = true));



CREATE INDEX "idx_team_weapons_team_id" ON "public"."team_weapons" USING "btree" ("team_id");



CREATE INDEX "idx_training_drills_drill_id" ON "public"."training_drills" USING "btree" ("drill_id");



CREATE INDEX "idx_training_drills_order" ON "public"."training_drills" USING "btree" ("training_id", "order_index");



CREATE INDEX "idx_training_drills_template" ON "public"."training_drills" USING "btree" ("drill_template_id");



CREATE INDEX "idx_training_drills_training" ON "public"."training_drills" USING "btree" ("training_id");



CREATE INDEX "idx_trainings_created_by" ON "public"."trainings" USING "btree" ("created_by");



CREATE INDEX "idx_trainings_scheduled" ON "public"."trainings" USING "btree" ("scheduled_at");



CREATE INDEX "idx_trainings_team" ON "public"."trainings" USING "btree" ("team_id");



CREATE INDEX "idx_user_baselines_updated" ON "public"."user_baselines" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_user_baselines_user" ON "public"."user_baselines" USING "btree" ("user_id");



CREATE INDEX "idx_user_insight_triggers_updated" ON "public"."user_insight_triggers" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_user_weapons_last_used" ON "public"."user_weapons" USING "btree" ("user_id", "last_used_at" DESC NULLS LAST);



CREATE INDEX "idx_user_weapons_team_weapon_id" ON "public"."user_weapons" USING "btree" ("team_weapon_id");



CREATE INDEX "idx_user_weapons_user_id" ON "public"."user_weapons" USING "btree" ("user_id");



CREATE INDEX "idx_weapon_requests_team_status" ON "public"."weapon_requests" USING "btree" ("team_id", "status");



CREATE UNIQUE INDEX "idx_weapon_requests_unique_pending" ON "public"."weapon_requests" USING "btree" ("team_id", "user_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_weapon_requests_user" ON "public"."weapon_requests" USING "btree" ("user_id");



CREATE INDEX "idx_workspace_invitations_team" ON "public"."team_invitations" USING "btree" ("team_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "notifications_user_unread_idx" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE UNIQUE INDEX "team_members_one_commander_per_team" ON "public"."team_members" USING "btree" ("team_id") WHERE ("role" = 'commander'::"text");



CREATE UNIQUE INDEX "unique_squad_commander" ON "public"."team_members" USING "btree" ("team_id", (("details" ->> 'squad_id'::"text"))) WHERE (("role" = 'squad_commander'::"text") AND (("details" ->> 'squad_id'::"text") IS NOT NULL));



CREATE UNIQUE INDEX "unique_team_commander" ON "public"."team_members" USING "btree" ("team_id") WHERE ("role" = 'commander'::"text");



CREATE INDEX "workspace_invitations_expires_at_idx" ON "public"."team_invitations" USING "btree" ("expires_at");



CREATE INDEX "workspace_invitations_invite_code_idx" ON "public"."team_invitations" USING "btree" ("invite_code");



CREATE INDEX "workspace_invitations_status_idx" ON "public"."team_invitations" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "enforce_commander_constraints" BEFORE INSERT OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."check_commander_constraints"();



CREATE OR REPLACE TRIGGER "engagement_participants_updated_at" BEFORE UPDATE ON "public"."engagement_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_engagement_participants_updated_at"();



CREATE OR REPLACE TRIGGER "engagements_updated_at" BEFORE UPDATE ON "public"."engagements" FOR EACH ROW EXECUTE FUNCTION "public"."update_engagements_updated_at"();



CREATE OR REPLACE TRIGGER "on_training_created" AFTER INSERT ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_team_on_training_created"();



CREATE OR REPLACE TRIGGER "on_training_started" AFTER UPDATE ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_team_on_training_started"();



CREATE OR REPLACE TRIGGER "team_drill_presets_updated_at" BEFORE UPDATE ON "public"."team_drill_presets" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_drill_presets_updated_at"();



CREATE OR REPLACE TRIGGER "team_standards_updated_at" BEFORE UPDATE ON "public"."team_standards" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_standards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_insight_generation" AFTER INSERT ON "public"."session_features" FOR EACH ROW EXECUTE FUNCTION "public"."notify_insight_generation"();



COMMENT ON TRIGGER "trigger_insight_generation" ON "public"."session_features" IS 'Automatically generates insights when session_features are computed.';



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_stats_updated_at" BEFORE UPDATE ON "public"."session_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trainings_updated_at" BEFORE UPDATE ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."drill_templates"
    ADD CONSTRAINT "drill_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."drill_templates"
    ADD CONSTRAINT "drill_templates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."engagement_participants"
    ADD CONSTRAINT "engagement_participants_engagement_id_fkey" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."engagement_participants"
    ADD CONSTRAINT "engagement_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id");



ALTER TABLE ONLY "public"."engagement_participants"
    ADD CONSTRAINT "engagement_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."engagements"
    ADD CONSTRAINT "engagements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."engagements"
    ADD CONSTRAINT "engagements_shooter_id_fkey" FOREIGN KEY ("shooter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."engagements"
    ADD CONSTRAINT "engagements_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_history"
    ADD CONSTRAINT "notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paper_target_results"
    ADD CONSTRAINT "paper_target_results_session_target_id_fkey" FOREIGN KEY ("session_target_id") REFERENCES "public"."session_targets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_features"
    ADD CONSTRAINT "session_features_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_features"
    ADD CONSTRAINT "session_features_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_features"
    ADD CONSTRAINT "session_features_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_features"
    ADD CONSTRAINT "session_features_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "public"."user_weapons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_insights"
    ADD CONSTRAINT "session_insights_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_insights"
    ADD CONSTRAINT "session_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."session_standards_verdicts"
    ADD CONSTRAINT "session_standards_verdicts_base_standard_id_fkey" FOREIGN KEY ("base_standard_id") REFERENCES "public"."team_standards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_standards_verdicts"
    ADD CONSTRAINT "session_standards_verdicts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."session_targets"
    ADD CONSTRAINT "session_targets_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_targets"
    ADD CONSTRAINT "session_targets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_timelines"
    ADD CONSTRAINT "session_timelines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "public"."training_drills"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_drill_template_id_fkey" FOREIGN KEY ("drill_template_id") REFERENCES "public"."drill_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "public"."user_weapons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tactical_target_results"
    ADD CONSTRAINT "tactical_target_results_session_target_id_fkey" FOREIGN KEY ("session_target_id") REFERENCES "public"."session_targets"("id");



ALTER TABLE ONLY "public"."team_drill_presets"
    ADD CONSTRAINT "team_drill_presets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."team_drill_presets"
    ADD CONSTRAINT "team_drill_presets_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_drill_presets"
    ADD CONSTRAINT "team_drill_presets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_standard_modifiers"
    ADD CONSTRAINT "team_standard_modifiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."team_standard_modifiers"
    ADD CONSTRAINT "team_standard_modifiers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_standards"
    ADD CONSTRAINT "team_standards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."team_standards"
    ADD CONSTRAINT "team_standards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_weapons"
    ADD CONSTRAINT "team_weapons_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_weapons"
    ADD CONSTRAINT "team_weapons_base_weapon_id_fkey" FOREIGN KEY ("base_weapon_id") REFERENCES "public"."weapons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_weapons"
    ADD CONSTRAINT "team_weapons_contributed_by_fkey" FOREIGN KEY ("contributed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_weapons"
    ADD CONSTRAINT "team_weapons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_weapons"
    ADD CONSTRAINT "team_weapons_source_user_weapon_id_fkey" FOREIGN KEY ("source_user_weapon_id") REFERENCES "public"."user_weapons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_weapons"
    ADD CONSTRAINT "team_weapons_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."training_drills"
    ADD CONSTRAINT "training_drills_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "public"."drill_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."training_drills"
    ADD CONSTRAINT "training_drills_drill_template_id_fkey" FOREIGN KEY ("drill_template_id") REFERENCES "public"."drill_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."training_drills"
    ADD CONSTRAINT "training_drills_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."user_baselines"
    ADD CONSTRAINT "user_baselines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "public"."training_drills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_insight_triggers"
    ADD CONSTRAINT "user_insight_triggers_last_insight_session_id_fkey" FOREIGN KEY ("last_insight_session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_insight_triggers"
    ADD CONSTRAINT "user_insight_triggers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_weapons"
    ADD CONSTRAINT "user_weapons_base_weapon_id_fkey" FOREIGN KEY ("base_weapon_id") REFERENCES "public"."weapons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_weapons"
    ADD CONSTRAINT "user_weapons_shared_with_team_id_fkey" FOREIGN KEY ("shared_with_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_weapons"
    ADD CONSTRAINT "user_weapons_team_weapon_id_fkey" FOREIGN KEY ("team_weapon_id") REFERENCES "public"."team_weapons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_weapons"
    ADD CONSTRAINT "user_weapons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weapon_requests"
    ADD CONSTRAINT "weapon_requests_requested_weapon_id_fkey" FOREIGN KEY ("requested_weapon_id") REFERENCES "public"."team_weapons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."weapon_requests"
    ADD CONSTRAINT "weapon_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."weapon_requests"
    ADD CONSTRAINT "weapon_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weapon_requests"
    ADD CONSTRAINT "weapon_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can delete global weapons" ON "public"."weapons" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can insert global weapons" ON "public"."weapons" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can update global weapons" ON "public"."weapons" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Anyone can read global weapons" ON "public"."weapons" FOR SELECT USING (true);



CREATE POLICY "Anyone can view pending invitations" ON "public"."team_invitations" FOR SELECT USING (true);



CREATE POLICY "Commanders can create presets" ON "public"."team_drill_presets" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can create trainings" ON "public"."trainings" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND "public"."is_team_admin"("team_id")));



CREATE POLICY "Commanders can delete presets" ON "public"."team_drill_presets" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can delete team weapons" ON "public"."team_weapons" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "team_weapons"."team_id") AND ("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can insert team weapons" ON "public"."team_weapons" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "team_weapons"."team_id") AND ("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can manage drill templates" ON "public"."drill_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "drill_templates"."team_id") AND ("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can manage modifiers" ON "public"."team_standard_modifiers" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can manage standards" ON "public"."team_standards" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can review requests" ON "public"."weapon_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "weapon_requests"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"])))))) WITH CHECK (("status" = ANY (ARRAY['approved'::"text", 'rejected'::"text"])));



CREATE POLICY "Commanders can update presets" ON "public"."team_drill_presets" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can update team weapons" ON "public"."team_weapons" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "team_weapons"."team_id") AND ("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can view paper results from team trainings" ON "public"."paper_target_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
     JOIN "public"."trainings" "t" ON (("t"."id" = "s"."training_id")))
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."team_id")))
  WHERE (("st"."id" = "paper_target_results"."session_target_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'admin'::"text"]))))));



CREATE POLICY "Commanders can view tactical results from team trainings" ON "public"."tactical_target_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
     JOIN "public"."trainings" "t" ON (("t"."id" = "s"."training_id")))
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."team_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'admin'::"text"]))))));



CREATE POLICY "Commanders can view targets from team trainings" ON "public"."session_targets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."sessions" "s"
     JOIN "public"."trainings" "t" ON (("t"."id" = "s"."training_id")))
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."team_id")))
  WHERE (("s"."id" = "session_targets"."session_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'admin'::"text"]))))));



CREATE POLICY "Commanders can view team requests" ON "public"."weapon_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "weapon_requests"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



CREATE POLICY "Commanders can view timelines from team trainings" ON "public"."session_timelines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "s"."team_id")))
  WHERE (("s"."id" = "session_timelines"."session_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'admin'::"text"]))))));



CREATE POLICY "Engagement owner can add participants" ON "public"."engagement_participants" FOR INSERT WITH CHECK ((("public"."get_engagement_session_owner"("engagement_id") = "auth"."uid"()) AND "public"."is_squad_engagement"("engagement_id")));



CREATE POLICY "Engagement owner can delete participants" ON "public"."engagement_participants" FOR DELETE USING (("public"."get_engagement_session_owner"("engagement_id") = "auth"."uid"()));



CREATE POLICY "Owners and commanders can add members" ON "public"."team_members" FOR INSERT WITH CHECK ("public"."is_team_admin"("team_id"));



CREATE POLICY "Owners and commanders can create drills" ON "public"."training_drills" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trainings" "t"
  WHERE (("t"."id" = "training_drills"."training_id") AND (("t"."created_by" = "auth"."uid"()) OR (("t"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "t"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"])))))))))));



CREATE POLICY "Owners and commanders can create invitations" ON "public"."team_invitations" FOR INSERT WITH CHECK ((("team_id" IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_invitations"."team_id") AND ("t"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_invitations"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))))));



CREATE POLICY "Owners and commanders can create trainings" ON "public"."trainings" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND (("team_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "trainings"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))))));



CREATE POLICY "Owners and commanders can delete drills" ON "public"."training_drills" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."trainings" "t"
  WHERE (("t"."id" = "training_drills"."training_id") AND (("t"."created_by" = "auth"."uid"()) OR (("t"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "t"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"])))))))))));



CREATE POLICY "Owners and commanders can delete invitations" ON "public"."team_invitations" FOR DELETE USING ((("team_id" IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_invitations"."team_id") AND ("t"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_invitations"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))))));



CREATE POLICY "Owners and commanders can delete trainings" ON "public"."trainings" FOR DELETE USING ("public"."is_team_admin"("team_id"));



CREATE POLICY "Owners and commanders can remove members" ON "public"."team_members" FOR DELETE USING (("public"."is_team_admin"("team_id") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Owners and commanders can update drills" ON "public"."training_drills" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."trainings" "t"
  WHERE (("t"."id" = "training_drills"."training_id") AND (("t"."created_by" = "auth"."uid"()) OR (("t"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "t"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"])))))))))));



CREATE POLICY "Owners and commanders can update invitations" ON "public"."team_invitations" FOR UPDATE USING ((("team_id" IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_invitations"."team_id") AND ("t"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_invitations"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))))));



CREATE POLICY "Owners and commanders can update members" ON "public"."team_members" FOR UPDATE USING ("public"."is_team_admin"("team_id"));



CREATE POLICY "Owners and commanders can update teams" ON "public"."teams" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR "public"."is_team_admin"("id")));



CREATE POLICY "Owners and commanders can update trainings" ON "public"."trainings" FOR UPDATE USING ("public"."is_team_admin"("team_id"));



CREATE POLICY "Owners can delete teams" ON "public"."teams" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Owners can delete trainings" ON "public"."trainings" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "System can insert verdicts" ON "public"."session_standards_verdicts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Team members can read modifiers" ON "public"."team_standard_modifiers" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Team members can read standards" ON "public"."team_standards" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Team members can read team verdicts" ON "public"."session_standards_verdicts" FOR SELECT USING (("session_id" IN ( SELECT "s"."id"
   FROM "public"."sessions" "s"
  WHERE ("s"."team_id" IN ( SELECT "team_members"."team_id"
           FROM "public"."team_members"
          WHERE ("team_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Team members can read team weapons" ON "public"."team_weapons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "team_weapons"."team_id") AND ("team_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Team members can view drill templates" ON "public"."drill_templates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "drill_templates"."team_id") AND ("team_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Team members can view presets" ON "public"."team_drill_presets" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Team members can view teammates" ON "public"."team_members" FOR SELECT USING (("team_id" IN ( SELECT "public"."get_my_team_ids"() AS "get_my_team_ids")));



CREATE POLICY "Users can cancel own pending requests" ON "public"."weapon_requests" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text"))) WITH CHECK (("status" = 'cancelled'::"text"));



CREATE POLICY "Users can create engagements for their sessions" ON "public"."engagements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "engagements"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create own requests" ON "public"."weapon_requests" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "weapon_requests"."team_id") AND ("tm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create sessions" ON "public"."sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create teams" ON "public"."teams" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can delete own insights" ON "public"."session_insights" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own notifications" ON "public"."notification_history" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own session features" ON "public"."session_features" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own sessions" ON "public"."sessions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own weapons" ON "public"."user_weapons" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own personal drills" ON "public"."drill_templates" FOR DELETE USING ((("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Users can delete timelines for own sessions" ON "public"."session_timelines" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_timelines"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own drill completions" ON "public"."user_drill_completions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own insights" ON "public"."session_insights" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own notifications" ON "public"."notification_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own session features" ON "public"."session_features" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own session stats" ON "public"."session_stats" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own weapons" ON "public"."user_weapons" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert paper results for own session targets" ON "public"."paper_target_results" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "paper_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert tactical results for own session targets" ON "public"."tactical_target_results" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert targets for own sessions" ON "public"."session_targets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_targets"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own personal drills" ON "public"."drill_templates" FOR INSERT WITH CHECK ((("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Users can insert timelines for own sessions" ON "public"."session_timelines" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_timelines"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own baselines" ON "public"."user_baselines" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage own insight triggers" ON "public"."user_insight_triggers" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own verdicts" ON "public"."session_standards_verdicts" FOR SELECT USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read own weapons" ON "public"."user_weapons" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update engagements" ON "public"."engagements" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "engagements"."session_id") AND ("s"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."sessions" "s"
     JOIN "public"."trainings" "t" ON (("t"."id" = "s"."training_id")))
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "t"."team_id")))
  WHERE (("s"."id" = "engagements"."session_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'squad_commander'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "s"."team_id")))
  WHERE (("s"."id" = "engagements"."session_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text", 'squad_commander'::"text"])))))));



CREATE POLICY "Users can update own insights" ON "public"."session_insights" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own notifications" ON "public"."notification_history" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own participant record" ON "public"."engagement_participants" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own session features" ON "public"."session_features" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own session stats" ON "public"."session_stats" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own sessions" ON "public"."sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own weapons" ON "public"."user_weapons" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update paper results from own sessions" ON "public"."paper_target_results" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "paper_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "paper_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update tactical results from own sessions" ON "public"."tactical_target_results" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own personal drills" ON "public"."drill_templates" FOR UPDATE USING ((("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()))) WITH CHECK ((("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Users can update timelines for own sessions" ON "public"."session_timelines" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_timelines"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view engagement participants" ON "public"."engagement_participants" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("public"."get_engagement_session_owner"("engagement_id") = "auth"."uid"()) OR "public"."is_engagement_team_member"("engagement_id", "auth"."uid"())));



CREATE POLICY "Users can view engagements" ON "public"."engagements" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "engagements"."session_id") AND ("s"."user_id" = "auth"."uid"())))) OR "public"."is_engagement_participant"("id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "s"."team_id")))
  WHERE (("s"."id" = "engagements"."session_id") AND ("tm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own and team drill completions" ON "public"."user_drill_completions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trainings" "t"
  WHERE (("t"."id" = "user_drill_completions"."training_id") AND ("t"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "t"."team_id") AND ("tm"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view own and team sessions" ON "public"."sessions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND "public"."is_team_member"("team_id"))));



CREATE POLICY "Users can view own baselines" ON "public"."user_baselines" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own insight triggers" ON "public"."user_insight_triggers" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own insights" ON "public"."session_insights" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own notifications" ON "public"."notification_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own requests" ON "public"."weapon_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own session features" ON "public"."session_features" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own session stats" ON "public"."session_stats" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own teams" ON "public"."teams" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR "public"."is_team_member"("id")));



CREATE POLICY "Users can view paper results from own sessions" ON "public"."paper_target_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "paper_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can view profiles of teammates" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."shares_team_with"("id")));



CREATE POLICY "Users can view tactical results from own sessions" ON "public"."tactical_target_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view targets from own sessions" ON "public"."session_targets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_targets"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view team trainings" ON "public"."trainings" FOR SELECT USING ((("team_id" IS NOT NULL) AND "public"."is_team_member"("team_id")));



CREATE POLICY "Users can view their own personal drills" ON "public"."drill_templates" FOR SELECT USING ((("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"())));



CREATE POLICY "Users can view timelines from own sessions" ON "public"."session_timelines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_timelines"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view training drills" ON "public"."training_drills" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trainings" "t"
  WHERE (("t"."id" = "training_drills"."training_id") AND (("t"."created_by" = "auth"."uid"()) OR (("t"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "t"."team_id") AND ("tm"."user_id" = "auth"."uid"()))))))))));



ALTER TABLE "public"."drill_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."engagement_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."engagements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paper_target_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_self" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_features" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_standards_verdicts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_targets_insert_policy" ON "public"."session_targets" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_targets"."session_id") AND ("s"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."engagements" "e"
     JOIN "public"."engagement_participants" "ep" ON (("ep"."engagement_id" = "e"."id")))
  WHERE (("e"."session_id" = "session_targets"."session_id") AND ("ep"."user_id" = "auth"."uid"()) AND ("ep"."state" = 'joined'::"text"))))));



CREATE POLICY "session_targets_select_policy" ON "public"."session_targets" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_targets"."session_id") AND ("s"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."team_members" "tm" ON (("tm"."team_id" = "s"."team_id")))
  WHERE (("s"."id" = "session_targets"."session_id") AND ("tm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."engagements" "e"
     JOIN "public"."engagement_participants" "ep" ON (("ep"."engagement_id" = "e"."id")))
  WHERE (("e"."session_id" = "session_targets"."session_id") AND ("ep"."user_id" = "auth"."uid"()))))));



CREATE POLICY "session_targets_update_policy" ON "public"."session_targets" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_targets"."session_id") AND ("s"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."engagements" "e"
     JOIN "public"."engagement_participants" "ep" ON (("ep"."engagement_id" = "e"."id")))
  WHERE (("e"."session_id" = "session_targets"."session_id") AND ("ep"."user_id" = "auth"."uid"()) AND ("ep"."state" = 'joined'::"text"))))));



ALTER TABLE "public"."session_timelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tactical_target_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tactical_target_results_insert_policy" ON "public"."tactical_target_results" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."session_targets" "st"
     JOIN "public"."engagements" "e" ON (("e"."session_id" = "st"."session_id")))
     JOIN "public"."engagement_participants" "ep" ON (("ep"."engagement_id" = "e"."id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("ep"."user_id" = "auth"."uid"()) AND ("ep"."state" = 'joined'::"text"))))));



CREATE POLICY "tactical_target_results_select_policy" ON "public"."tactical_target_results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND (("s"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "s"."team_id") AND ("tm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM ("public"."engagements" "e"
             JOIN "public"."engagement_participants" "ep" ON (("ep"."engagement_id" = "e"."id")))
          WHERE (("e"."session_id" = "s"."id") AND ("ep"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "tactical_target_results_update_policy" ON "public"."tactical_target_results" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."session_targets" "st"
     JOIN "public"."sessions" "s" ON (("s"."id" = "st"."session_id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("s"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM (("public"."session_targets" "st"
     JOIN "public"."engagements" "e" ON (("e"."session_id" = "st"."session_id")))
     JOIN "public"."engagement_participants" "ep" ON (("ep"."engagement_id" = "e"."id")))
  WHERE (("st"."id" = "tactical_target_results"."session_target_id") AND ("ep"."user_id" = "auth"."uid"()) AND ("ep"."state" = 'joined'::"text"))))));



ALTER TABLE "public"."team_drill_presets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_standard_modifiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_standards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_weapons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_drills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trainings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_baselines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_drill_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_insight_triggers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_weapons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weapon_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weapons" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_team_invitation"("p_invite_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_team_invitation"("p_invite_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_team_invitation"("p_invite_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_close_training_if_complete"("p_training_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_close_training_if_complete"("p_training_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_training_if_complete"("p_training_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_start_trainings"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_start_trainings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_start_trainings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_insight_triggers"() TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_insight_triggers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_insight_triggers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_commander_constraints"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_commander_constraints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_commander_constraints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_invitation_commander_constraints"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_invitation_commander_constraints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_invitation_commander_constraints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_training_completion"("p_training_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_training_completion"("p_training_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_training_completion"("p_training_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."session_features" TO "anon";
GRANT ALL ON TABLE "public"."session_features" TO "authenticated";
GRANT ALL ON TABLE "public"."session_features" TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_session_features"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."compute_session_features"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_session_features"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_team_with_owner"("p_name" "text", "p_description" "text", "p_squads" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_team_with_owner"("p_name" "text", "p_description" "text", "p_squads" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team_with_owner"("p_name" "text", "p_description" "text", "p_squads" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."end_session"("p_session_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."end_session"("p_session_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_session"("p_session_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_session_insights"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_session_insights"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_session_insights"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_engagement_session_owner"("eng_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_engagement_session_owner"("eng_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_engagement_session_owner"("eng_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_insight_trigger_status"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_insight_trigger_status"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_insight_trigger_status"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_sessions"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_sessions"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_sessions"("p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_team_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_team_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_team_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_session_baseline"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_session_baseline"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_session_baseline"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sessions_since_last_insight"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sessions_since_last_insight"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sessions_since_last_insight"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sniper_best_performance"("p_user_id" "uuid", "p_org_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sniper_best_performance"("p_user_id" "uuid", "p_org_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sniper_best_performance"("p_user_id" "uuid", "p_org_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sniper_progression"("p_user_id" "uuid", "p_org_workspace_id" "uuid", "p_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sniper_progression"("p_user_id" "uuid", "p_org_workspace_id" "uuid", "p_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sniper_progression"("p_user_id" "uuid", "p_org_workspace_id" "uuid", "p_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_commander_status"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_commander_status"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_commander_status"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_leaderboard"("p_team_id" "uuid", "p_days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_leaderboard"("p_team_id" "uuid", "p_days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_leaderboard"("p_team_id" "uuid", "p_days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_with_members"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_with_members"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_with_members"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_training_completion_status"("p_training_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_training_completion_status"("p_training_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_training_completion_status"("p_training_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workspace_sessions"("p_workspace_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_workspace_sessions"("p_workspace_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workspace_sessions"("p_workspace_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_sample_session_data"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_sample_session_data"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_sample_session_data"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_engagement_owner"("eng_id" "uuid", "check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_engagement_owner"("eng_id" "uuid", "check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_engagement_owner"("eng_id" "uuid", "check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_engagement_participant"("eng_id" "uuid", "check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_engagement_participant"("eng_id" "uuid", "check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_engagement_participant"("eng_id" "uuid", "check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_engagement_team_member"("eng_id" "uuid", "check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_engagement_team_member"("eng_id" "uuid", "check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_engagement_team_member"("eng_id" "uuid", "check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_squad_engagement"("eng_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_squad_engagement"("eng_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_squad_engagement"("eng_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."make_condition_key"("p_drill_goal" "text", "p_position" "text", "p_distance_m" integer, "p_weapon_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."make_condition_key"("p_drill_goal" "text", "p_position" "text", "p_distance_m" integer, "p_weapon_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."make_condition_key"("p_drill_goal" "text", "p_position" "text", "p_distance_m" integer, "p_weapon_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_insight_generation"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_insight_generation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_insight_generation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_team_on_training_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_team_on_training_started"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_started"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_started"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_user_baseline"("p_user_id" "uuid", "p_condition_key" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_user_baseline"("p_user_id" "uuid", "p_condition_key" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_user_baseline"("p_user_id" "uuid", "p_condition_key" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_engagement_participants_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_engagement_participants_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_engagement_participants_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_engagements_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_engagements_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_engagements_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid", "p_shots" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid", "p_shots" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_insight_triggers"("p_user_id" "uuid", "p_session_id" "uuid", "p_shots" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_drill_presets_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_drill_presets_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_drill_presets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_standards_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_standards_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_standards_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."drill_templates" TO "anon";
GRANT ALL ON TABLE "public"."drill_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."drill_templates" TO "service_role";



GRANT ALL ON TABLE "public"."drills" TO "anon";
GRANT ALL ON TABLE "public"."drills" TO "authenticated";
GRANT ALL ON TABLE "public"."drills" TO "service_role";



GRANT ALL ON TABLE "public"."engagement_participants" TO "anon";
GRANT ALL ON TABLE "public"."engagement_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."engagement_participants" TO "service_role";



GRANT ALL ON TABLE "public"."engagements" TO "anon";
GRANT ALL ON TABLE "public"."engagements" TO "authenticated";
GRANT ALL ON TABLE "public"."engagements" TO "service_role";



GRANT ALL ON TABLE "public"."notification_history" TO "anon";
GRANT ALL ON TABLE "public"."notification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_history" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."paper_target_results" TO "anon";
GRANT ALL ON TABLE "public"."paper_target_results" TO "authenticated";
GRANT ALL ON TABLE "public"."paper_target_results" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."session_insights" TO "anon";
GRANT ALL ON TABLE "public"."session_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."session_insights" TO "service_role";



GRANT ALL ON TABLE "public"."session_participants" TO "anon";
GRANT ALL ON TABLE "public"."session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."session_participants" TO "service_role";



GRANT ALL ON TABLE "public"."session_standards_verdicts" TO "anon";
GRANT ALL ON TABLE "public"."session_standards_verdicts" TO "authenticated";
GRANT ALL ON TABLE "public"."session_standards_verdicts" TO "service_role";



GRANT ALL ON TABLE "public"."session_stats" TO "anon";
GRANT ALL ON TABLE "public"."session_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."session_stats" TO "service_role";



GRANT ALL ON TABLE "public"."session_targets" TO "anon";
GRANT ALL ON TABLE "public"."session_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."session_targets" TO "service_role";



GRANT ALL ON TABLE "public"."session_timelines" TO "anon";
GRANT ALL ON TABLE "public"."session_timelines" TO "authenticated";
GRANT ALL ON TABLE "public"."session_timelines" TO "service_role";



GRANT ALL ON TABLE "public"."tactical_target_results" TO "anon";
GRANT ALL ON TABLE "public"."tactical_target_results" TO "authenticated";
GRANT ALL ON TABLE "public"."tactical_target_results" TO "service_role";



GRANT ALL ON TABLE "public"."team_drill_presets" TO "anon";
GRANT ALL ON TABLE "public"."team_drill_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."team_drill_presets" TO "service_role";



GRANT ALL ON TABLE "public"."team_invitations" TO "anon";
GRANT ALL ON TABLE "public"."team_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_standard_modifiers" TO "anon";
GRANT ALL ON TABLE "public"."team_standard_modifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."team_standard_modifiers" TO "service_role";



GRANT ALL ON TABLE "public"."team_standards" TO "anon";
GRANT ALL ON TABLE "public"."team_standards" TO "authenticated";
GRANT ALL ON TABLE "public"."team_standards" TO "service_role";



GRANT ALL ON TABLE "public"."team_weapons" TO "anon";
GRANT ALL ON TABLE "public"."team_weapons" TO "authenticated";
GRANT ALL ON TABLE "public"."team_weapons" TO "service_role";



GRANT ALL ON TABLE "public"."training_drills" TO "anon";
GRANT ALL ON TABLE "public"."training_drills" TO "authenticated";
GRANT ALL ON TABLE "public"."training_drills" TO "service_role";



GRANT ALL ON TABLE "public"."trainings" TO "anon";
GRANT ALL ON TABLE "public"."trainings" TO "authenticated";
GRANT ALL ON TABLE "public"."trainings" TO "service_role";



GRANT ALL ON TABLE "public"."user_baselines" TO "anon";
GRANT ALL ON TABLE "public"."user_baselines" TO "authenticated";
GRANT ALL ON TABLE "public"."user_baselines" TO "service_role";



GRANT ALL ON TABLE "public"."user_drill_completions" TO "anon";
GRANT ALL ON TABLE "public"."user_drill_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_drill_completions" TO "service_role";



GRANT ALL ON TABLE "public"."user_insight_triggers" TO "anon";
GRANT ALL ON TABLE "public"."user_insight_triggers" TO "authenticated";
GRANT ALL ON TABLE "public"."user_insight_triggers" TO "service_role";



GRANT ALL ON TABLE "public"."user_weapons" TO "anon";
GRANT ALL ON TABLE "public"."user_weapons" TO "authenticated";
GRANT ALL ON TABLE "public"."user_weapons" TO "service_role";



GRANT ALL ON TABLE "public"."weapon_requests" TO "anon";
GRANT ALL ON TABLE "public"."weapon_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."weapon_requests" TO "service_role";



GRANT ALL ON TABLE "public"."weapons" TO "anon";
GRANT ALL ON TABLE "public"."weapons" TO "authenticated";
GRANT ALL ON TABLE "public"."weapons" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







