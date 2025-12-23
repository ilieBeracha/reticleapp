


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
    AS $$DECLARE
    v_user_id uuid;
    v_invitation RECORD;
    v_result jsonb;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Find invitation
    SELECT * INTO v_invitation
    FROM public.team_invitations
    WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND expires_at > now()
    AND team_id IS NOT NULL;
    
    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Check if already a member
    IF EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = v_invitation.team_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Already a member of this team';
    END IF;
    
    -- In accept_team_invitation, change the INSERT to:
    INSERT INTO public.team_members (team_id, user_id, role, squad_id, details)
    VALUES (
        v_invitation.team_id,
        v_user_id,
        COALESCE(v_invitation.team_role, 'soldier'),
        v_invitation.details->>'squad_id',  -- Extract to column
        COALESCE(v_invitation.details, '{}'::jsonb)
    );
    
    -- Update invitation
    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_by = v_user_id,
        accepted_at = now(),
        updated_at = now()
    WHERE id = v_invitation.id;
    
    -- Return result
    SELECT jsonb_build_object(
        'success', true,
        'team_id', v_invitation.team_id,
        'team_name', t.name,
        'role', COALESCE(v_invitation.team_role, 'soldier')
    ) INTO v_result
    FROM public.teams t
    WHERE t.id = v_invitation.team_id;
    
    RETURN v_result;
END;$$;


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



CREATE OR REPLACE FUNCTION "public"."check_commander_constraints"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  existing_commander_count integer;
  existing_squad_commander_count integer;
  squad_id text;
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
    squad_id := NEW.details->>'squad_id';
    
    IF squad_id IS NULL OR squad_id = '' THEN
      RAISE EXCEPTION 'Squad commander must be assigned to a squad. Please specify squad_id in details.';
    END IF;
    
    SELECT COUNT(*) INTO existing_squad_commander_count
    FROM team_members
    WHERE team_id = NEW.team_id 
      AND role = 'squad_commander'
      AND details->>'squad_id' = squad_id
      AND user_id != NEW.user_id;
    
    IF existing_squad_commander_count > 0 THEN
      RAISE EXCEPTION 'Squad "%" already has a commander. Only one squad commander per squad is allowed.', squad_id;
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

SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    CONSTRAINT "sessions_session_mode_check" CHECK (("session_mode" = ANY (ARRAY['solo'::"text", 'group'::"text"]))),
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


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


CREATE OR REPLACE FUNCTION "public"."create_team_with_owner"("p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_squads" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_team_id uuid;
    v_team jsonb;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Create team
    INSERT INTO public.teams (name, description, squads, created_by)
    VALUES (p_name, p_description, p_squads, v_user_id)
    RETURNING id INTO v_team_id;
    
    -- Add creator as owner
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, v_user_id, 'owner');
    
    -- Return team data
    SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'squads', t.squads,
        'created_by', t.created_by,
        'created_at', t.created_at
    ) INTO v_team
    FROM public.teams t
    WHERE t.id = v_team_id;
    
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
    "team_id" "uuid" NOT NULL,
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
    CONSTRAINT "drill_templates_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['fundamentals'::"text", 'speed'::"text", 'accuracy'::"text", 'stress'::"text", 'tactical'::"text", 'competition'::"text", 'qualification'::"text"])))),
    CONSTRAINT "drill_templates_difficulty_check" CHECK ((("difficulty" IS NULL) OR ("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text", 'expert'::"text"])))),
    CONSTRAINT "drill_templates_drill_goal_check" CHECK (("drill_goal" = ANY (ARRAY['grouping'::"text", 'achievement'::"text"]))),
    CONSTRAINT "drill_templates_min_accuracy_percent_check" CHECK ((("min_accuracy_percent" IS NULL) OR (("min_accuracy_percent" >= 0) AND ("min_accuracy_percent" <= 100)))),
    CONSTRAINT "drill_templates_movement_type_check" CHECK ((("movement_type" IS NULL) OR ("movement_type" = ANY (ARRAY['none'::"text", 'advance'::"text", 'retreat'::"text", 'lateral'::"text", 'diagonal'::"text", 'freestyle'::"text"])))),
    CONSTRAINT "drill_templates_position_check" CHECK ((("position" IS NULL) OR ("position" = ANY (ARRAY['standing'::"text", 'kneeling'::"text", 'prone'::"text", 'sitting'::"text", 'barricade'::"text", 'transition'::"text", 'freestyle'::"text"])))),
    CONSTRAINT "drill_templates_scoring_mode_check" CHECK ((("scoring_mode" IS NULL) OR ("scoring_mode" = ANY (ARRAY['accuracy'::"text", 'speed'::"text", 'combined'::"text", 'pass_fail'::"text", 'points'::"text"])))),
    CONSTRAINT "drill_templates_start_position_check" CHECK ((("start_position" IS NULL) OR ("start_position" = ANY (ARRAY['holstered'::"text", 'low_ready'::"text", 'high_ready'::"text", 'table_start'::"text", 'surrender'::"text", 'compressed_ready'::"text"])))),
    CONSTRAINT "drill_templates_target_size_check" CHECK ((("target_size" IS NULL) OR ("target_size" = ANY (ARRAY['full'::"text", 'half'::"text", 'head'::"text", 'a_zone'::"text", 'c_zone'::"text", 'steel_8in'::"text", 'steel_10in'::"text", 'custom'::"text"])))),
    CONSTRAINT "drill_templates_target_type_check" CHECK (("target_type" = ANY (ARRAY['paper'::"text", 'tactical'::"text"]))),
    CONSTRAINT "drill_templates_weapon_category_check" CHECK ((("weapon_category" IS NULL) OR ("weapon_category" = ANY (ARRAY['rifle'::"text", 'pistol'::"text", 'shotgun'::"text", 'carbine'::"text", 'precision_rifle'::"text", 'any'::"text"]))))
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
    CONSTRAINT "paper_target_results_paper_type_check" CHECK (("paper_type" = ANY (ARRAY['achievement'::"text", 'grouping'::"text"])))
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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    CONSTRAINT "session_targets_target_type_check" CHECK (("target_type" = ANY (ARRAY['paper'::"text", 'tactical'::"text"])))
);


ALTER TABLE "public"."session_targets" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."training_drills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "training_id" "uuid" NOT NULL,
    "order_index" integer NOT NULL,
    "name" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "distance_m" integer NOT NULL,
    "rounds_per_shooter" integer NOT NULL,
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
    CONSTRAINT "training_drills_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['fundamentals'::"text", 'speed'::"text", 'accuracy'::"text", 'stress'::"text", 'tactical'::"text", 'competition'::"text", 'qualification'::"text"])))),
    CONSTRAINT "training_drills_difficulty_check" CHECK ((("difficulty" IS NULL) OR ("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text", 'expert'::"text"])))),
    CONSTRAINT "training_drills_drill_goal_check" CHECK (("drill_goal" = ANY (ARRAY['grouping'::"text", 'achievement'::"text"]))),
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



COMMENT ON COLUMN "public"."training_drills"."drill_template_id" IS 'Reference to source drill template. If set, template values are used as defaults.';



COMMENT ON COLUMN "public"."training_drills"."drill_id" IS 'Reference to the source drill definition. NULL for legacy inline drills.';



COMMENT ON COLUMN "public"."training_drills"."instance_notes" IS 'Training-specific notes for this drill instance. Different from the drill''s core description.';



CREATE TABLE IF NOT EXISTS "public"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
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
    CONSTRAINT "trainings_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'ongoing'::"text", 'finished'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."trainings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trainings"."manual_start" IS 'If true, commander starts training manually. If false, training auto-starts at scheduled_at time.';



COMMENT ON COLUMN "public"."trainings"."started_at" IS 'When the training was actually started by the commander';



COMMENT ON COLUMN "public"."trainings"."ended_at" IS 'When the training was finished';



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



ALTER TABLE ONLY "public"."drill_templates"
    ADD CONSTRAINT "drill_templates_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_targets"
    ADD CONSTRAINT "session_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tactical_target_results"
    ADD CONSTRAINT "tactical_target_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tactical_target_results"
    ADD CONSTRAINT "tactical_target_results_session_target_id_key" UNIQUE ("session_target_id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_drills"
    ADD CONSTRAINT "training_drills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_user_id_training_id_drill_id_key" UNIQUE ("user_id", "training_id", "drill_id");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_drill_completions_drill" ON "public"."user_drill_completions" USING "btree" ("drill_id");



CREATE INDEX "idx_drill_completions_user_training" ON "public"."user_drill_completions" USING "btree" ("user_id", "training_id");



CREATE INDEX "idx_drill_templates_team_id" ON "public"."drill_templates" USING "btree" ("team_id");



CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_session_participants_role" ON "public"."session_participants" USING "btree" ("role");



CREATE INDEX "idx_session_participants_session" ON "public"."session_participants" USING "btree" ("session_id");



CREATE INDEX "idx_session_participants_user" ON "public"."session_participants" USING "btree" ("user_id");



CREATE INDEX "idx_session_targets_session" ON "public"."session_targets" USING "btree" ("session_id");



CREATE INDEX "idx_session_targets_type" ON "public"."session_targets" USING "btree" ("target_type");



CREATE INDEX "idx_sessions_custom_drill_goal" ON "public"."sessions" USING "btree" ((("custom_drill_config" ->> 'drill_goal'::"text")));



CREATE INDEX "idx_sessions_drill" ON "public"."sessions" USING "btree" ("drill_id");



CREATE INDEX "idx_sessions_drill_template" ON "public"."sessions" USING "btree" ("drill_template_id");



CREATE INDEX "idx_sessions_started" ON "public"."sessions" USING "btree" ("started_at");



CREATE INDEX "idx_sessions_started_at" ON "public"."sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sessions_status" ON "public"."sessions" USING "btree" ("status");



CREATE INDEX "idx_sessions_team" ON "public"."sessions" USING "btree" ("team_id");



CREATE INDEX "idx_sessions_training" ON "public"."sessions" USING "btree" ("training_id");



CREATE INDEX "idx_sessions_user" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_team_members_squad" ON "public"."team_members" USING "btree" ("team_id", "squad_id");



CREATE INDEX "idx_team_members_team" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_training_drills_drill_id" ON "public"."training_drills" USING "btree" ("drill_id");



CREATE INDEX "idx_training_drills_order" ON "public"."training_drills" USING "btree" ("training_id", "order_index");



CREATE INDEX "idx_training_drills_template" ON "public"."training_drills" USING "btree" ("drill_template_id");



CREATE INDEX "idx_training_drills_training" ON "public"."training_drills" USING "btree" ("training_id");



CREATE INDEX "idx_trainings_created_by" ON "public"."trainings" USING "btree" ("created_by");



CREATE INDEX "idx_trainings_scheduled" ON "public"."trainings" USING "btree" ("scheduled_at");



CREATE INDEX "idx_trainings_team" ON "public"."trainings" USING "btree" ("team_id");



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



CREATE OR REPLACE TRIGGER "on_training_created" AFTER INSERT ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_team_on_training_created"();



CREATE OR REPLACE TRIGGER "on_training_started" AFTER UPDATE ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."notify_team_on_training_started"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_stats_updated_at" BEFORE UPDATE ON "public"."session_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trainings_updated_at" BEFORE UPDATE ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."drill_templates"
    ADD CONSTRAINT "drill_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."drill_templates"
    ADD CONSTRAINT "drill_templates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paper_target_results"
    ADD CONSTRAINT "paper_target_results_session_target_id_fkey" FOREIGN KEY ("session_target_id") REFERENCES "public"."session_targets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_stats"
    ADD CONSTRAINT "session_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."session_targets"
    ADD CONSTRAINT "session_targets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."tactical_target_results"
    ADD CONSTRAINT "tactical_target_results_session_target_id_fkey" FOREIGN KEY ("session_target_id") REFERENCES "public"."session_targets"("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_drill_id_fkey" FOREIGN KEY ("drill_id") REFERENCES "public"."training_drills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "public"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_drill_completions"
    ADD CONSTRAINT "user_drill_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invitations"
    ADD CONSTRAINT "workspace_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



CREATE POLICY "Anyone can view pending invitations" ON "public"."team_invitations" FOR SELECT USING (true);



CREATE POLICY "Commanders can manage drill templates" ON "public"."drill_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "drill_templates"."team_id") AND ("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'commander'::"text"]))))));



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
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "trainings"."team_id") AND ("t"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
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



CREATE POLICY "Owners and commanders can update trainings" ON "public"."trainings" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND "public"."is_team_admin"("team_id"))));



CREATE POLICY "Owners can delete teams" ON "public"."teams" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Owners can delete trainings" ON "public"."trainings" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Team members can view drill templates" ON "public"."drill_templates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "drill_templates"."team_id") AND ("team_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Team members can view teammates" ON "public"."team_members" FOR SELECT USING (("team_id" IN ( SELECT "public"."get_my_team_ids"() AS "get_my_team_ids")));



CREATE POLICY "Users can create sessions" ON "public"."sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create teams" ON "public"."teams" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own push tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own sessions" ON "public"."sessions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own drill completions" ON "public"."user_drill_completions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own push tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own session stats" ON "public"."session_stats" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



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



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own push tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own session stats" ON "public"."session_stats" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own sessions" ON "public"."sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



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



CREATE POLICY "Users can view own and team drill completions" ON "public"."user_drill_completions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."trainings" "t"
  WHERE (("t"."id" = "user_drill_completions"."training_id") AND ("t"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "t"."team_id") AND ("tm"."user_id" = "auth"."uid"())))))))));



CREATE POLICY "Users can view own and team sessions" ON "public"."sessions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND "public"."is_team_member"("team_id"))));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own push tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



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



CREATE POLICY "Users can view team trainings" ON "public"."trainings" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (("team_id" IS NOT NULL) AND "public"."is_team_member"("team_id"))));



CREATE POLICY "Users can view training drills" ON "public"."training_drills" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."trainings" "t"
  WHERE (("t"."id" = "training_drills"."training_id") AND (("t"."created_by" = "auth"."uid"()) OR (("t"."team_id" IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM "public"."team_members" "tm"
          WHERE (("tm"."team_id" = "t"."team_id") AND ("tm"."user_id" = "auth"."uid"()))))))))));



ALTER TABLE "public"."drill_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paper_target_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_self" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tactical_target_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."training_drills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trainings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_drill_completions" ENABLE ROW LEVEL SECURITY;


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



GRANT ALL ON FUNCTION "public"."auto_start_trainings"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_start_trainings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_start_trainings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_commander_constraints"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_commander_constraints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_commander_constraints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_invitation_commander_constraints"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_invitation_commander_constraints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_invitation_commander_constraints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."notify_team_on_training_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_team_on_training_started"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_started"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_team_on_training_started"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shares_team_with"("p_other_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."drill_templates" TO "anon";
GRANT ALL ON TABLE "public"."drill_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."drill_templates" TO "service_role";



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



GRANT ALL ON TABLE "public"."session_participants" TO "anon";
GRANT ALL ON TABLE "public"."session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."session_participants" TO "service_role";



GRANT ALL ON TABLE "public"."session_stats" TO "anon";
GRANT ALL ON TABLE "public"."session_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."session_stats" TO "service_role";



GRANT ALL ON TABLE "public"."session_targets" TO "anon";
GRANT ALL ON TABLE "public"."session_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."session_targets" TO "service_role";



GRANT ALL ON TABLE "public"."tactical_target_results" TO "anon";
GRANT ALL ON TABLE "public"."tactical_target_results" TO "authenticated";
GRANT ALL ON TABLE "public"."tactical_target_results" TO "service_role";



GRANT ALL ON TABLE "public"."team_invitations" TO "anon";
GRANT ALL ON TABLE "public"."team_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."training_drills" TO "anon";
GRANT ALL ON TABLE "public"."training_drills" TO "authenticated";
GRANT ALL ON TABLE "public"."training_drills" TO "service_role";



GRANT ALL ON TABLE "public"."trainings" TO "anon";
GRANT ALL ON TABLE "public"."trainings" TO "authenticated";
GRANT ALL ON TABLE "public"."trainings" TO "service_role";



GRANT ALL ON TABLE "public"."user_drill_completions" TO "anon";
GRANT ALL ON TABLE "public"."user_drill_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_drill_completions" TO "service_role";



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







