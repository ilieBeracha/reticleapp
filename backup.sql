


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
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_validation json;
  v_invitation json;
  v_org_workspace_id uuid;
  v_role text;
  v_invitation_id uuid;
BEGIN
  -- ============================================
  -- 1. VALIDATE THE INVITATION
  -- ============================================
  
  -- Call validate_invite_code to perform all security checks
  v_validation := validate_invite_code(p_invite_code, p_user_id);
  
  -- Check if validation passed
  IF NOT (v_validation->>'valid')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', v_validation->>'error'
    );
  END IF;
  
  -- Extract invitation details from validation result
  v_invitation := v_validation->'invitation';
  v_org_workspace_id := (v_invitation->>'org_workspace_id')::uuid;
  v_role := v_invitation->>'role';
  v_invitation_id := (v_invitation->>'id')::uuid;

  -- ============================================
  -- 2. ADD USER TO WORKSPACE (ATOMIC)
  -- ============================================
  
  -- Insert workspace access
  INSERT INTO workspace_access (
    workspace_type,
    org_workspace_id,
    member_id,
    role
  ) VALUES (
    'org',
    v_org_workspace_id,
    p_user_id,
    v_role
  );
  
  -- ============================================
  -- 3. UPDATE INVITATION STATUS (ATOMIC)
  -- ============================================
  
  -- Mark invitation as accepted
  UPDATE workspace_invitations
  SET 
    status = 'accepted',
    accepted_by = p_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation_id
    AND status = 'pending'; -- Extra safety check
  
  -- ============================================
  -- RETURN SUCCESS
  -- ============================================
  
  RETURN json_build_object(
    'success', true,
    'workspace_id', v_org_workspace_id,
    'workspace_name', v_invitation->>'workspace_name',
    'role', v_role
  );


EXCEPTION
  -- Handle duplicate membership (shouldn't happen due to validation, but safety check)
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already a member of this workspace'
    );
  
  -- Handle foreign key violations
  WHEN foreign_key_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid workspace or user reference'
    );
  
  -- Handle any other errors
  WHEN OTHERS THEN
    -- Log error for debugging (will show in Supabase logs)
    RAISE WARNING 'Error accepting invitation: %', SQLERRM;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to accept invitation. Please try again.'
    );
END;
$$;


ALTER FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") IS 'Securely accepts an invite code and adds user to workspace.
Performs atomic validation and insertion in a single transaction.
Returns JSON with success flag and workspace details or error message.';



CREATE OR REPLACE FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "workspace_slug" "text", "created_by" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
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
  INSERT INTO workspace_access (workspace_type, org_workspace_id, member_id, role)
  VALUES ('org', v_workspace_id, v_user_id, 'owner');

  -- Return created workspace
  RETURN QUERY
  SELECT ow.id, ow.name, ow.description, ow.workspace_slug, ow.created_by, ow.created_at
  FROM org_workspaces ow
  WHERE ow.id = v_workspace_id;
END;
$$;


ALTER FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_type" "text" DEFAULT 'personal'::"text" NOT NULL,
    "workspace_owner_id" "uuid",
    "org_workspace_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "session_mode" "text" DEFAULT 'solo'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "session_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sessions_session_mode_check" CHECK (("session_mode" = ANY (ARRAY['solo'::"text", 'group'::"text"]))),
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "sessions_valid_workspace_refs" CHECK (((("workspace_type" = 'personal'::"text") AND ("workspace_owner_id" IS NOT NULL) AND ("org_workspace_id" IS NULL)) OR (("workspace_type" = 'org'::"text") AND ("org_workspace_id" IS NOT NULL) AND ("workspace_owner_id" IS NULL)))),
    CONSTRAINT "sessions_workspace_type_check" CHECK (("workspace_type" = ANY (ARRAY['personal'::"text", 'org'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid" DEFAULT NULL::"uuid", "p_org_workspace_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text") RETURNS TABLE("team_id" "uuid", "team_workspace_type" "text", "team_workspace_owner_id" "uuid", "team_org_workspace_id" "uuid", "team_name" "text", "team_description" "text", "team_created_at" timestamp with time zone, "team_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Validate workspace type
  IF p_workspace_type NOT IN ('personal', 'org') THEN
    RAISE EXCEPTION 'Invalid workspace type. Must be personal or org';
  END IF;

  -- Validate workspace references
  IF p_workspace_type = 'personal' AND p_workspace_owner_id IS NULL THEN
    RAISE EXCEPTION 'workspace_owner_id required for personal workspace';
  END IF;
  
  IF p_workspace_type = 'org' AND p_org_workspace_id IS NULL THEN
    RAISE EXCEPTION 'org_workspace_id required for org workspace';
  END IF;

  -- Check permissions using workspace_access table
  IF p_workspace_type = 'personal' THEN
    IF NOT EXISTS (
      SELECT 1 FROM workspace_access 
      WHERE workspace_type = 'personal'
        AND workspace_access.workspace_owner_id = p_workspace_owner_id 
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin', 'instructor')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to create team in personal workspace';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM workspace_access 
      WHERE workspace_type = 'org'
        AND workspace_access.org_workspace_id = p_org_workspace_id 
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin', 'instructor')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to create team in org workspace';
    END IF;
  END IF;

  -- Insert team
  INSERT INTO teams (
    workspace_type,
    workspace_owner_id,
    org_workspace_id,
    name,
    description
  )
  VALUES (
    p_workspace_type,
    p_workspace_owner_id,
    p_org_workspace_id,
    p_name,
    p_description
  )
  RETURNING id INTO v_team_id;

  -- Return the created team with aliased column names
  RETURN QUERY
  SELECT 
    t.id AS team_id,
    t.workspace_type AS team_workspace_type,
    t.workspace_owner_id AS team_workspace_owner_id,
    t.org_workspace_id AS team_org_workspace_id,
    t.name AS team_name,
    t.description AS team_description,
    t.created_at AS team_created_at,
    t.updated_at AS team_updated_at
  FROM teams t
  WHERE t.id = v_team_id;
END;
$$;


ALTER FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text") IS 'Create a new team in a workspace with proper permission checks';



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


CREATE OR REPLACE FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") RETURNS TABLE("id" "uuid", "workspace_type" "text", "workspace_owner_id" "uuid", "org_workspace_id" "uuid", "member_id" "uuid", "role" "text", "joined_at" timestamp with time zone, "profile_id" "uuid", "profile_email" "text", "profile_full_name" "text", "profile_avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wa.id,
    wa.workspace_type,
    wa.workspace_owner_id,
    wa.org_workspace_id,
    wa.member_id,
    wa.role,
    wa.joined_at,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_full_name,
    p.avatar_url as profile_avatar_url
  FROM workspace_access wa
  INNER JOIN profiles p ON p.id = wa.member_id
  WHERE wa.org_workspace_id = p_org_workspace_id
    AND wa.workspace_type = 'org'
  ORDER BY wa.joined_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_members"("p_team_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Get workspace owner from team
  SELECT workspace_owner_id INTO v_workspace_id
  FROM teams WHERE id = p_team_id;
  
  IF NOT has_workspace_access(v_workspace_id) THEN
    RAISE EXCEPTION 'Access denied to team %', p_team_id;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    tm.role
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY tm.role, p.full_name;
END;
$$;


ALTER FUNCTION "public"."get_team_members"("p_team_id" "uuid") OWNER TO "postgres";


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
  
  -- 1. Create profile (user IS a workspace)
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

  -- 2. Grant user access to their own workspace (personal workspace)
  INSERT INTO public.workspace_access (workspace_type, workspace_owner_id, member_id, role)
  VALUES ('personal', NEW.id, NEW.id, 'owner')
  ON CONFLICT (workspace_owner_id, member_id) DO NOTHING;

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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
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
BEGIN
  -- ============================================
  -- 1. INPUT VALIDATION
  -- ============================================
  
  -- Validate invite code format
  IF p_invite_code IS NULL OR length(trim(p_invite_code)) != 8 THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Invalid invite code format'
    );
  END IF;

  -- Validate user authentication
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'You must be logged in to validate an invitation'
    );
  END IF;

  -- ============================================
  -- 2. CODE EXISTENCE CHECK
  -- ============================================
  
  -- Get invitation details with related data
  SELECT 
    inv.*,
    org.name as workspace_name,
    prof.full_name as inviter_name,
    prof.email as inviter_email
  INTO v_invitation
  FROM workspace_invitations inv
  LEFT JOIN org_workspaces org ON org.id = inv.org_workspace_id
  LEFT JOIN profiles prof ON prof.id = inv.invited_by
  WHERE inv.invite_code = upper(trim(p_invite_code));

  -- Check if invitation exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Invalid invitation code'
    );
  END IF;

  -- ============================================
  -- 3. SELF-INVITATION PREVENTION
  -- ============================================
  
  -- Check if user is trying to use their own invitation
  IF v_invitation.invited_by = p_user_id THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'You cannot use your own invitation code'
    );
  END IF;

  -- ============================================
  -- 4. STATUS VALIDATION
  -- ============================================
  
  -- Check invitation status
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

  -- ============================================
  -- 5. EXPIRATION CHECK WITH AUTO-EXPIRATION
  -- ============================================
  
  -- Check if invitation has expired
  IF v_invitation.expires_at <= now() THEN
    -- Auto-expire the invitation
    UPDATE workspace_invitations
    SET 
      status = 'expired',
      updated_at = now()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object(
      'valid', false,
      'error', 'This invitation has expired'
    );
  END IF;

  -- ============================================
  -- 6. DUPLICATE MEMBERSHIP PREVENTION
  -- ============================================
  
  -- Check if user is already a member of this workspace
  SELECT EXISTS (
    SELECT 1 
    FROM workspace_access
    WHERE org_workspace_id = v_invitation.org_workspace_id
      AND member_id = p_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'You are already a member of this workspace'
    );
  END IF;

  -- ============================================
  -- ALL CHECKS PASSED - RETURN VALID INVITATION
  -- ============================================
  
  RETURN json_build_object(
    'valid', true,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'org_workspace_id', v_invitation.org_workspace_id,
      'invite_code', v_invitation.invite_code,
      'role', v_invitation.role,
      'status', v_invitation.status,
      'workspace_name', v_invitation.workspace_name,
      'invited_by', v_invitation.invited_by,
      'invited_by_name', COALESCE(v_invitation.inviter_name, v_invitation.inviter_email),
      'expires_at', v_invitation.expires_at,
      'created_at', v_invitation.created_at,
      'updated_at', v_invitation.updated_at
    )
  );
END;
$$;


ALTER FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") IS 'Securely validates an invite code with comprehensive security checks. 
Returns JSON with valid flag and invitation details or error message.
Bypasses RLS for consistent validation across all users.';



CREATE TABLE IF NOT EXISTS "public"."org_workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "workspace_slug" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_workspaces" OWNER TO "postgres";


COMMENT ON TABLE "public"."org_workspaces" IS 'User-created organization workspaces (multiple per user allowed)';



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



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['sniper'::"text", 'pistol'::"text", 'manager'::"text", 'commander'::"text", 'instructor'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'Team membership';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_owner_id" "uuid",
    "org_workspace_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workspace_type" "text" DEFAULT 'org'::"text" NOT NULL,
    "team_type" "text" DEFAULT 'field'::"text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Teams within workspaces (supports personal and org workspaces)';



CREATE TABLE IF NOT EXISTS "public"."workspace_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_type" "text" DEFAULT 'personal'::"text" NOT NULL,
    "workspace_owner_id" "uuid",
    "org_workspace_id" "uuid",
    "member_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_access_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"]))),
    CONSTRAINT "workspace_access_type_check" CHECK (("workspace_type" = ANY (ARRAY['personal'::"text", 'org'::"text"]))),
    CONSTRAINT "workspace_access_valid_refs" CHECK (((("workspace_type" = 'personal'::"text") AND ("workspace_owner_id" IS NOT NULL) AND ("org_workspace_id" IS NULL)) OR (("workspace_type" = 'org'::"text") AND ("org_workspace_id" IS NOT NULL) AND ("workspace_owner_id" IS NULL))))
);


ALTER TABLE "public"."workspace_access" OWNER TO "postgres";


COMMENT ON TABLE "public"."workspace_access" IS 'Workspace membership (supports personal and org workspaces)';



CREATE TABLE IF NOT EXISTS "public"."workspace_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_workspace_id" "uuid" NOT NULL,
    "invite_code" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_invitations_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text", 'member'::"text"]))),
    CONSTRAINT "workspace_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."workspace_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."workspace_invitations" IS 'Shareable invite codes for organization workspaces';



ALTER TABLE ONLY "public"."org_workspaces"
    ADD CONSTRAINT "org_workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_workspaces"
    ADD CONSTRAINT "org_workspaces_workspace_slug_key" UNIQUE ("workspace_slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_workspace_slug_key" UNIQUE ("workspace_slug");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_unique_org" UNIQUE ("org_workspace_id", "member_id");



ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_unique_personal" UNIQUE ("workspace_owner_id", "member_id");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_org_workspaces_created_by" ON "public"."org_workspaces" USING "btree" ("created_by");



CREATE INDEX "idx_sessions_org_workspace" ON "public"."sessions" USING "btree" ("org_workspace_id");



CREATE INDEX "idx_sessions_started_at" ON "public"."sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sessions_status" ON "public"."sessions" USING "btree" ("status");



CREATE INDEX "idx_sessions_team" ON "public"."sessions" USING "btree" ("team_id");



CREATE INDEX "idx_sessions_user" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_workspace_owner" ON "public"."sessions" USING "btree" ("workspace_owner_id");



CREATE INDEX "idx_team_members_team" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_teams_org_workspace" ON "public"."teams" USING "btree" ("org_workspace_id");



CREATE INDEX "idx_teams_workspace_owner" ON "public"."teams" USING "btree" ("workspace_owner_id");



CREATE INDEX "idx_workspace_access_member" ON "public"."workspace_access" USING "btree" ("member_id");



CREATE INDEX "idx_workspace_access_org" ON "public"."workspace_access" USING "btree" ("org_workspace_id");



CREATE INDEX "idx_workspace_access_owner" ON "public"."workspace_access" USING "btree" ("workspace_owner_id");



CREATE INDEX "idx_workspace_access_type" ON "public"."workspace_access" USING "btree" ("workspace_type");



CREATE INDEX "workspace_invitations_expires_at_idx" ON "public"."workspace_invitations" USING "btree" ("expires_at");



CREATE INDEX "workspace_invitations_invite_code_idx" ON "public"."workspace_invitations" USING "btree" ("invite_code");



CREATE INDEX "workspace_invitations_org_workspace_idx" ON "public"."workspace_invitations" USING "btree" ("org_workspace_id");



CREATE INDEX "workspace_invitations_status_idx" ON "public"."workspace_invitations" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "update_org_workspaces_updated_at" BEFORE UPDATE ON "public"."org_workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."org_workspaces"
    ADD CONSTRAINT "org_workspaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_org_workspace_fkey" FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_workspace_owner_fkey" FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_org_workspace_fkey" FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_workspace_owner_fkey" FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_member_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_org_fkey" FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_owner_fkey" FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_org_workspace_fkey" FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE "public"."org_workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_workspaces_delete" ON "public"."org_workspaces" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "org_workspaces_insert" ON "public"."org_workspaces" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "org_workspaces_select" ON "public"."org_workspaces" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "org_workspaces"."id") AND ("wa"."member_id" = "auth"."uid"()))))));



CREATE POLICY "org_workspaces_update" ON "public"."org_workspaces" FOR UPDATE USING (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_self" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR ("id" IN ( SELECT "workspace_access"."workspace_owner_id"
   FROM "public"."workspace_access"
  WHERE ("workspace_access"."member_id" = "auth"."uid"())))));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_delete" ON "public"."sessions" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR ("workspace_owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "sessions"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



CREATE POLICY "sessions_insert" ON "public"."sessions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (("workspace_owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "sessions"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"())))))));



CREATE POLICY "sessions_select" ON "public"."sessions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("workspace_owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE ((("wa"."workspace_owner_id" = "sessions"."workspace_owner_id") OR ("wa"."org_workspace_id" = "sessions"."org_workspace_id")) AND ("wa"."member_id" = "auth"."uid"()))))));



CREATE POLICY "sessions_update" ON "public"."sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_delete" ON "public"."team_members" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_members"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['manager'::"text", 'commander'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ((("t"."workspace_type" = 'personal'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "t"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"])))))) OR (("t"."workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "t"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))))))))));



CREATE POLICY "team_members_insert" ON "public"."team_members" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_members"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['manager'::"text", 'commander'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ((("t"."workspace_type" = 'personal'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "t"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"])))))) OR (("t"."workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "t"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))))))))));



CREATE POLICY "team_members_select" ON "public"."team_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ((("t"."workspace_type" = 'personal'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "t"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"()))))) OR (("t"."workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "t"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"())))))))))));



CREATE POLICY "team_members_update" ON "public"."team_members" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "team_members"."team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."role" = ANY (ARRAY['manager'::"text", 'commander'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ((("t"."workspace_type" = 'personal'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "t"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"])))))) OR (("t"."workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa"
          WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "t"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))))))))));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete" ON "public"."teams" FOR DELETE USING (((("workspace_type" = 'personal'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "teams"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) OR (("workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "teams"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))));



CREATE POLICY "teams_insert" ON "public"."teams" FOR INSERT WITH CHECK (((("workspace_type" = 'personal'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "teams"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"])))))) OR (("workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "teams"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))))));



CREATE POLICY "teams_select" ON "public"."teams" FOR SELECT USING (((("workspace_type" = 'personal'::"text") AND (("workspace_owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "teams"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"())))))) OR (("workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "teams"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"())))))));



CREATE POLICY "teams_update" ON "public"."teams" FOR UPDATE USING (((("workspace_type" = 'personal'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'personal'::"text") AND ("wa"."workspace_owner_id" = "teams"."workspace_owner_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"])))))) OR (("workspace_type" = 'org'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."workspace_type" = 'org'::"text") AND ("wa"."org_workspace_id" = "teams"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))))));



ALTER TABLE "public"."workspace_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_access_delete" ON "public"."workspace_access" FOR DELETE USING ((("member_id" = "auth"."uid"()) OR ("workspace_owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."org_workspaces" "ow"
  WHERE (("ow"."id" = "workspace_access"."org_workspace_id") AND ("ow"."created_by" = "auth"."uid"()))))));



CREATE POLICY "workspace_access_insert" ON "public"."workspace_access" FOR INSERT WITH CHECK (("workspace_owner_id" = "auth"."uid"()));



CREATE POLICY "workspace_access_select" ON "public"."workspace_access" FOR SELECT USING ((("member_id" = "auth"."uid"()) OR ("workspace_owner_id" = "auth"."uid"())));



CREATE POLICY "workspace_access_update" ON "public"."workspace_access" FOR UPDATE USING (("workspace_owner_id" = "auth"."uid"()));



ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_invitations_accept" ON "public"."workspace_invitations" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("status" = 'pending'::"text") AND ("expires_at" > "now"())));



CREATE POLICY "workspace_invitations_delete_by_workspace_admin" ON "public"."workspace_invitations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "workspace_invitations_insert_by_workspace_admin" ON "public"."workspace_invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "workspace_invitations_select_by_code" ON "public"."workspace_invitations" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "workspace_invitations_select_by_workspace_admin" ON "public"."workspace_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "workspace_invitations_update_by_workspace_admin" ON "public"."workspace_invitations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "workspace_invitations"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_org_workspace_members"("p_org_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invite_code"("p_invite_code" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."org_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."org_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."org_workspaces" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_access" TO "anon";
GRANT ALL ON TABLE "public"."workspace_access" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_access" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_invitations" TO "anon";
GRANT ALL ON TABLE "public"."workspace_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_invitations" TO "service_role";



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







