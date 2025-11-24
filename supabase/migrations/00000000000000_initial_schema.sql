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

  -- 2. ADD TO WORKSPACE
  INSERT INTO workspace_access (workspace_type, org_workspace_id, member_id, role)
  VALUES ('org', v_org_workspace_id, p_user_id, v_role)
  ON CONFLICT (org_workspace_id, member_id) DO NOTHING;
  
  -- 3. ADD TO TEAM (if applicable)
  IF v_team_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, user_id, role, details)
    VALUES (v_team_id, p_user_id, v_team_role, COALESCE(v_details, '{}'::jsonb))
    ON CONFLICT (team_id, user_id) DO UPDATE 
    SET role = v_team_role,
        details = COALESCE(v_details, team_members.details); -- Update details if provided
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



CREATE OR REPLACE FUNCTION "public"."check_team_member_is_workspace_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_workspace_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the org workspace id for this team
  SELECT org_workspace_id
  INTO v_org_workspace_id
  FROM teams
  WHERE id = NEW.team_id;

  -- Only check for org workspaces (personal workspaces won't have org_workspace_id)
  IF v_org_workspace_id IS NOT NULL THEN
    -- Check if user is a member of the organization and get their role
    SELECT role INTO v_user_role
    FROM workspace_access
    WHERE org_workspace_id = v_org_workspace_id
      AND member_id = NEW.user_id;

    -- User must exist in the org
    IF v_user_role IS NULL THEN
      RAISE EXCEPTION 'User must be a member of the organization before being added to a team';
    END IF;

    -- User must have 'member' role (not admin/owner/instructor)
    IF v_user_role != 'member' THEN
      RAISE EXCEPTION 'Only users with "member" role can be assigned to teams. Admins, owners, and instructors cannot be team members.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_team_member_is_workspace_member"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_team_member_is_workspace_member"() IS 'Ensures only workspace members with "member" role can be added to teams';



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
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'cancelled'::"text"])))
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


CREATE OR REPLACE FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid" DEFAULT NULL::"uuid", "p_org_workspace_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text", "p_squads" "text"[] DEFAULT ARRAY[]::"text"[]) RETURNS TABLE("team_id" "uuid", "team_workspace_type" "text", "team_workspace_owner_id" "uuid", "team_org_workspace_id" "uuid", "team_name" "text", "team_description" "text", "team_squads" "text"[], "team_created_at" timestamp with time zone, "team_updated_at" timestamp with time zone)
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
        AND role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to create team in org workspace';
    END IF;
  END IF;

  -- Insert team with squads
  INSERT INTO teams (
    workspace_type,
    workspace_owner_id,
    org_workspace_id,
    name,
    description,
    squads
  )
  VALUES (
    p_workspace_type,
    p_workspace_owner_id,
    p_org_workspace_id,
    p_name,
    p_description,
    p_squads
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
    t.squads AS team_squads,
    t.created_at AS team_created_at,
    t.updated_at AS team_updated_at
  FROM teams t
  WHERE t.id = v_team_id;
END;
$$;


ALTER FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text", "p_squads" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text", "p_squads" "text"[]) IS 'Create a new team in a workspace with optional squads';



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
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['commander'::"text", 'squad_commander'::"text", 'soldier'::"text"]))),
    CONSTRAINT "team_members_squad_requirement" CHECK ((("role" = 'commander'::"text") OR (("role" = ANY (ARRAY['soldier'::"text", 'squad_commander'::"text"])) AND ("details" ? 'squad_id'::"text") AND (("details" ->> 'squad_id'::"text") IS NOT NULL) AND (("details" ->> 'squad_id'::"text") <> ''::"text"))))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'Team membership';



COMMENT ON CONSTRAINT "team_members_squad_requirement" ON "public"."team_members" IS 'Ensures that soldiers and squad_commanders must have a non-empty squad_id in their details. Commanders do not need a squad_id.';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "team_type" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "squads" "text"[] DEFAULT ARRAY[]::"text"[],
    CONSTRAINT "teams_team_type_check" CHECK (("team_type" = ANY (ARRAY['field'::"text", 'back_office'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Teams within organizations';



COMMENT ON COLUMN "public"."teams"."org_workspace_id" IS 'The organization this team belongs to (required)';



COMMENT ON COLUMN "public"."teams"."squads" IS 'Optional array of squad names within this team. Users can create squads on-demand.';



CREATE TABLE IF NOT EXISTS "public"."workspace_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_workspace_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_access_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."workspace_access" OWNER TO "postgres";


COMMENT ON TABLE "public"."workspace_access" IS 'Organization membership table - users must belong to at least one organization';



COMMENT ON COLUMN "public"."workspace_access"."org_workspace_id" IS 'The organization (required - no personal workspaces)';



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
    "team_id" "uuid",
    "team_role" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "workspace_invitations_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text", 'member'::"text"]))),
    CONSTRAINT "workspace_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text"]))),
    CONSTRAINT "workspace_invitations_team_role_check" CHECK (("team_role" = ANY (ARRAY['commander'::"text", 'squad_commander'::"text", 'soldier'::"text"])))
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



CREATE INDEX "idx_team_members_team" ON "public"."team_members" USING "btree" ("team_id");



CREATE INDEX "idx_team_members_user" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "idx_teams_org_workspace" ON "public"."teams" USING "btree" ("org_workspace_id");






CREATE INDEX "idx_workspace_access_member" ON "public"."workspace_access" USING "btree" ("member_id");



CREATE INDEX "idx_workspace_access_org" ON "public"."workspace_access" USING "btree" ("org_workspace_id");






CREATE INDEX "idx_workspace_invitations_team" ON "public"."workspace_invitations" USING "btree" ("team_id");



CREATE UNIQUE INDEX "team_members_one_commander_per_team" ON "public"."team_members" USING "btree" ("team_id") WHERE ("role" = 'commander'::"text");



CREATE INDEX "workspace_invitations_expires_at_idx" ON "public"."workspace_invitations" USING "btree" ("expires_at");



CREATE INDEX "workspace_invitations_invite_code_idx" ON "public"."workspace_invitations" USING "btree" ("invite_code");



CREATE INDEX "workspace_invitations_org_workspace_idx" ON "public"."workspace_invitations" USING "btree" ("org_workspace_id");



CREATE INDEX "workspace_invitations_status_idx" ON "public"."workspace_invitations" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "enforce_team_member_workspace_role" BEFORE INSERT OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."check_team_member_is_workspace_member"();



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



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_org_workspace_fkey" FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;






ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_member_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_access"
    ADD CONSTRAINT "workspace_access_org_fkey" FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;






ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_org_workspace_fkey" FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE "public"."org_workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_workspaces_delete" ON "public"."org_workspaces" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "org_workspaces_insert" ON "public"."org_workspaces" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "org_workspaces_select" ON "public"."org_workspaces" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "org_workspaces"."id") AND ("wa"."member_id" = "auth"."uid"()))))));



CREATE POLICY "org_workspaces_update" ON "public"."org_workspaces" FOR UPDATE USING (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_self" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa1"
  WHERE (("wa1"."member_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
           FROM "public"."workspace_access" "wa2"
          WHERE (("wa2"."org_workspace_id" = "wa1"."org_workspace_id") AND ("wa2"."member_id" = "profiles"."id")))))))));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_delete" ON "public"."sessions" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR (("org_workspace_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "sessions"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))));



CREATE POLICY "sessions_insert" ON "public"."sessions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (("org_workspace_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "sessions"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"())))))));



CREATE POLICY "sessions_select" ON "public"."sessions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (("org_workspace_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "sessions"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"())))))));



CREATE POLICY "sessions_update" ON "public"."sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_delete" ON "public"."team_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."teams"
     JOIN "public"."workspace_access" ON (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id")))
  WHERE (("teams"."id" = "team_members"."team_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))));



CREATE POLICY "team_members_insert" ON "public"."team_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."teams"
     JOIN "public"."workspace_access" ON (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id")))
  WHERE (("teams"."id" = "team_members"."team_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))));



CREATE POLICY "team_members_select" ON "public"."team_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."teams"
     JOIN "public"."workspace_access" ON (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id")))
  WHERE (("teams"."id" = "team_members"."team_id") AND ("workspace_access"."member_id" = "auth"."uid"()))))));



CREATE POLICY "team_members_update" ON "public"."team_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."teams"
     JOIN "public"."workspace_access" ON (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id")))
  WHERE (("teams"."id" = "team_members"."team_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete" ON "public"."teams" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "teams_insert" ON "public"."teams" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))));



CREATE POLICY "teams_select" ON "public"."teams" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"())))));



CREATE POLICY "teams_update" ON "public"."teams" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access"
  WHERE (("workspace_access"."org_workspace_id" = "teams"."org_workspace_id") AND ("workspace_access"."member_id" = "auth"."uid"()) AND ("workspace_access"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'instructor'::"text"]))))));



ALTER TABLE "public"."workspace_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_access_delete" ON "public"."workspace_access" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "workspace_access"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = 'owner'::"text")))));



CREATE POLICY "workspace_access_insert" ON "public"."workspace_access" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "workspace_access"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "workspace_access_select" ON "public"."workspace_access" FOR SELECT USING (("member_id" = "auth"."uid"()));



CREATE POLICY "workspace_access_update" ON "public"."workspace_access" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workspace_access" "wa"
  WHERE (("wa"."org_workspace_id" = "workspace_access"."org_workspace_id") AND ("wa"."member_id" = "auth"."uid"()) AND ("wa"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



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



GRANT ALL ON FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_team_member"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_team_member_is_workspace_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_team_member_is_workspace_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_team_member_is_workspace_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_session"("p_workspace_type" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_team_id" "uuid", "p_session_mode" "text", "p_session_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text", "p_squads" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text", "p_squads" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team"("p_workspace_type" "text", "p_name" "text", "p_workspace_owner_id" "uuid", "p_org_workspace_id" "uuid", "p_description" "text", "p_squads" "text"[]) TO "service_role";



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



GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_team_member"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_member_role"("p_team_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_details" "jsonb") TO "service_role";



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

-- =========================================================
-- CRITICAL: AUTH TRIGGER FOR USER CREATION
-- =========================================================
-- This was missing - needed to create profiles when users sign up

CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();







