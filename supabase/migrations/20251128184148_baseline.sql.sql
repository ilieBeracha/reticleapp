-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.accept_invite_code(p_invite_code text, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.add_team_member(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.check_commander_constraints()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.check_invitation_commander_constraints()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.check_team_member_is_workspace_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.create_org_workspace(p_name text, p_description text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, name text, description text, workspace_slug text, created_by uuid, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
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
END;$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.create_session(p_workspace_type text, p_workspace_owner_id uuid DEFAULT NULL::uuid, p_org_workspace_id uuid DEFAULT NULL::uuid, p_team_id uuid DEFAULT NULL::uuid, p_session_mode text DEFAULT 'solo'::text, p_session_data jsonb DEFAULT NULL::jsonb)
 RETURNS sessions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.create_team(p_workspace_type text, p_name text, p_workspace_owner_id uuid DEFAULT NULL::uuid, p_org_workspace_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_squads text[] DEFAULT ARRAY[]::text[])
 RETURNS TABLE(team_id uuid, team_workspace_type text, team_workspace_owner_id uuid, team_org_workspace_id uuid, team_name text, team_description text, team_squads text[], team_created_at timestamp with time zone, team_updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.end_session(p_session_id uuid, p_status text DEFAULT 'completed'::text)
 RETURNS sessions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE "public"."workspace_invitations"
  SET "status" = 'expired', "updated_at" = now()
  WHERE "status" = 'pending'
    AND "expires_at" < now();
END;
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.generate_invite_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_my_sessions(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, workspace_type text, workspace_owner_id uuid, org_workspace_id uuid, workspace_name text, user_id uuid, team_id uuid, team_name text, session_mode text, status text, started_at timestamp with time zone, ended_at timestamp with time zone, session_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_org_workspace_members(p_org_workspace_id uuid)
 RETURNS TABLE(id uuid, org_workspace_id uuid, member_id uuid, role text, joined_at timestamp with time zone, profile_id uuid, profile_email text, profile_full_name text, profile_avatar_url text, teams jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_sniper_best_performance(p_user_id uuid, p_org_workspace_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(best_paper_accuracy numeric, best_tactical_accuracy numeric, best_overall_accuracy numeric, tightest_grouping_cm numeric, fastest_engagement_sec numeric, most_targets_cleared integer, longest_session_minutes integer, total_sessions bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_sniper_progression(p_user_id uuid, p_org_workspace_id uuid DEFAULT NULL::uuid, p_days_back integer DEFAULT 30)
 RETURNS TABLE(session_date date, avg_accuracy numeric, avg_grouping numeric, sessions_count bigint, total_rounds integer, improvement_trend text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_team_commander_status(p_team_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_team_leaderboard(p_team_id uuid, p_days_back integer DEFAULT 30)
 RETURNS TABLE(user_id uuid, user_name text, sessions_completed bigint, avg_accuracy numeric, best_accuracy numeric, avg_grouping numeric, total_rounds integer, rank_position integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_team_members(p_team_id uuid)
 RETURNS TABLE(user_id uuid, email text, full_name text, role text, details jsonb, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_workspace_sessions(p_workspace_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, workspace_type text, user_id uuid, user_full_name text, team_id uuid, team_name text, session_mode text, status text, started_at timestamp with time zone, ended_at timestamp with time zone, session_data jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.get_workspace_teams(p_workspace_id uuid)
 RETURNS TABLE(team_id uuid, team_name text, team_type text, member_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.has_workspace_access(p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = auth.uid()
  );
END;
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.insert_sample_session_data(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.is_team_leader(p_team_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role IN ('manager', 'commander')
  );
END;
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.remove_team_member(p_team_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.update_team_member_role(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

-- HAS_UNTRACKABLE_DEPENDENCIES: Dependencies, i.e. other functions used in the function body, of non-sql functions cannot be tracked. As a result, we cannot guarantee that function dependencies are ordered properly relative to this statement. For adds, this means you need to ensure that all functions this function depends on are created/altered before this statement.
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_invite_code text, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE "public"."org_workspaces" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text COLLATE "pg_catalog"."default" NOT NULL,
	"description" text COLLATE "pg_catalog"."default",
	"workspace_slug" text COLLATE "pg_catalog"."default",
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "org_workspaces_delete" ON "public"."org_workspaces"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING ((created_by = auth.uid()));

CREATE POLICY "org_workspaces_insert" ON "public"."org_workspaces"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK ((created_by = auth.uid()));

CREATE POLICY "org_workspaces_select" ON "public"."org_workspaces"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = org_workspaces.id) AND (wa.member_id = auth.uid()))))));

CREATE POLICY "org_workspaces_update" ON "public"."org_workspaces"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((created_by = auth.uid()));

ALTER TABLE "public"."org_workspaces" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX CONCURRENTLY org_workspaces_pkey ON public.org_workspaces USING btree (id);

ALTER TABLE "public"."org_workspaces" ADD CONSTRAINT "org_workspaces_pkey" PRIMARY KEY USING INDEX "org_workspaces_pkey";

CREATE UNIQUE INDEX CONCURRENTLY org_workspaces_workspace_slug_key ON public.org_workspaces USING btree (workspace_slug);

ALTER TABLE "public"."org_workspaces" ADD CONSTRAINT "org_workspaces_workspace_slug_key" UNIQUE USING INDEX "org_workspaces_workspace_slug_key";

CREATE INDEX CONCURRENTLY idx_org_workspaces_created_by ON public.org_workspaces USING btree (created_by);

CREATE TRIGGER update_org_workspaces_updated_at BEFORE UPDATE ON public.org_workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "public"."paper_target_results" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_target_id" uuid NOT NULL,
	"paper_type" text COLLATE "pg_catalog"."default" NOT NULL,
	"bullets_fired" integer NOT NULL,
	"hits_total" integer,
	"hits_inside_scoring" integer,
	"dispersion_cm" numeric,
	"offset_right_cm" numeric,
	"offset_up_cm" numeric,
	"scanned_image_url" text COLLATE "pg_catalog"."default",
	"notes" text COLLATE "pg_catalog"."default"
);

ALTER TABLE "public"."paper_target_results" ADD CONSTRAINT "paper_target_results_paper_type_check" CHECK((paper_type = ANY (ARRAY['achievement'::text, 'grouping'::text])));

ALTER TABLE "public"."paper_target_results" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX CONCURRENTLY paper_target_results_pkey ON public.paper_target_results USING btree (id);

ALTER TABLE "public"."paper_target_results" ADD CONSTRAINT "paper_target_results_pkey" PRIMARY KEY USING INDEX "paper_target_results_pkey";

CREATE UNIQUE INDEX CONCURRENTLY paper_target_results_session_target_id_key ON public.paper_target_results USING btree (session_target_id);

ALTER TABLE "public"."paper_target_results" ADD CONSTRAINT "paper_target_results_session_target_id_key" UNIQUE USING INDEX "paper_target_results_session_target_id_key";

CREATE TABLE "public"."profiles" (
	"id" uuid NOT NULL,
	"email" text COLLATE "pg_catalog"."default" NOT NULL,
	"full_name" text COLLATE "pg_catalog"."default",
	"avatar_url" text COLLATE "pg_catalog"."default",
	"workspace_name" text COLLATE "pg_catalog"."default" DEFAULT 'My Workspace'::text,
	"workspace_slug" text COLLATE "pg_catalog"."default",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "profiles_delete_self" ON "public"."profiles"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING ((auth.uid() = id));

CREATE POLICY "profiles_select" ON "public"."profiles"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM workspace_access wa1
  WHERE ((wa1.member_id = auth.uid()) AND (EXISTS ( SELECT 1
           FROM workspace_access wa2
          WHERE ((wa2.org_workspace_id = wa1.org_workspace_id) AND (wa2.member_id = profiles.id)))))))));

CREATE POLICY "profiles_update_self" ON "public"."profiles"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((auth.uid() = id));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."profiles" VALIDATE CONSTRAINT "profiles_id_fkey";

CREATE UNIQUE INDEX CONCURRENTLY profiles_email_key ON public.profiles USING btree (email);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE USING INDEX "profiles_email_key";

CREATE UNIQUE INDEX CONCURRENTLY profiles_pkey ON public.profiles USING btree (id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY USING INDEX "profiles_pkey";

CREATE UNIQUE INDEX CONCURRENTLY profiles_workspace_slug_key ON public.profiles USING btree (workspace_slug);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_workspace_slug_key" UNIQUE USING INDEX "profiles_workspace_slug_key";

ALTER TABLE "public"."org_workspaces" ADD CONSTRAINT "org_workspaces_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."org_workspaces" VALIDATE CONSTRAINT "org_workspaces_created_by_fkey";

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "public"."session_participants" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text COLLATE "pg_catalog"."default" NOT NULL,
	"weapon_id" uuid,
	"sight_id" uuid,
	"position" text COLLATE "pg_catalog"."default",
	"shots_fired" integer DEFAULT 0,
	"notes" text COLLATE "pg_catalog"."default"
);

ALTER TABLE "public"."session_participants" ADD CONSTRAINT "session_participants_role_check" CHECK((role = ANY (ARRAY['sniper'::text, 'spotter'::text, 'pistol'::text, 'observer'::text, 'instructor'::text])));

ALTER TABLE "public"."session_participants" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."session_participants" ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) NOT VALID;

ALTER TABLE "public"."session_participants" VALIDATE CONSTRAINT "session_participants_user_id_fkey";

CREATE UNIQUE INDEX CONCURRENTLY session_participants_pkey ON public.session_participants USING btree (id);

ALTER TABLE "public"."session_participants" ADD CONSTRAINT "session_participants_pkey" PRIMARY KEY USING INDEX "session_participants_pkey";

CREATE UNIQUE INDEX CONCURRENTLY session_participants_session_id_user_id_key ON public.session_participants USING btree (session_id, user_id);

ALTER TABLE "public"."session_participants" ADD CONSTRAINT "session_participants_session_id_user_id_key" UNIQUE USING INDEX "session_participants_session_id_user_id_key";

CREATE INDEX CONCURRENTLY idx_session_participants_role ON public.session_participants USING btree (role);

CREATE INDEX CONCURRENTLY idx_session_participants_session ON public.session_participants USING btree (session_id);

CREATE INDEX CONCURRENTLY idx_session_participants_user ON public.session_participants USING btree (user_id);

CREATE TABLE "public"."session_stats" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"shots_fired" integer DEFAULT 0,
	"hits" integer DEFAULT 0,
	"accuracy_pct" numeric(5,2),
	"headshots" integer DEFAULT 0,
	"long_range_hits" integer DEFAULT 0,
	"grouping_cm" numeric(8,2),
	"weapon_used" text COLLATE "pg_catalog"."default",
	"position" text COLLATE "pg_catalog"."default",
	"distance_m" integer,
	"target_type" text COLLATE "pg_catalog"."default",
	"engagement_time_sec" numeric(8,2),
	"score" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

CREATE POLICY "Users can insert own session stats" ON "public"."session_stats"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can update own session stats" ON "public"."session_stats"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((user_id = auth.uid()));

CREATE POLICY "Users can view own session stats" ON "public"."session_stats"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING ((user_id = auth.uid()));

ALTER TABLE "public"."session_stats" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."session_stats" ADD CONSTRAINT "session_stats_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) NOT VALID;

ALTER TABLE "public"."session_stats" VALIDATE CONSTRAINT "session_stats_user_id_fkey";

CREATE UNIQUE INDEX CONCURRENTLY session_stats_pkey ON public.session_stats USING btree (id);

ALTER TABLE "public"."session_stats" ADD CONSTRAINT "session_stats_pkey" PRIMARY KEY USING INDEX "session_stats_pkey";

CREATE UNIQUE INDEX CONCURRENTLY session_stats_session_id_user_id_key ON public.session_stats USING btree (session_id, user_id);

ALTER TABLE "public"."session_stats" ADD CONSTRAINT "session_stats_session_id_user_id_key" UNIQUE USING INDEX "session_stats_session_id_user_id_key";

CREATE TRIGGER update_session_stats_updated_at BEFORE UPDATE ON public.session_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "public"."session_targets" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"target_type" text COLLATE "pg_catalog"."default" NOT NULL,
	"sequence_in_session" integer,
	"distance_m" integer,
	"lane_number" integer,
	"notes" text COLLATE "pg_catalog"."default"
);

ALTER TABLE "public"."session_targets" ADD CONSTRAINT "session_targets_target_type_check" CHECK((target_type = ANY (ARRAY['paper'::text, 'tactical'::text])));

ALTER TABLE "public"."session_targets" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX CONCURRENTLY session_targets_pkey ON public.session_targets USING btree (id);

ALTER TABLE "public"."session_targets" ADD CONSTRAINT "session_targets_pkey" PRIMARY KEY USING INDEX "session_targets_pkey";

CREATE INDEX CONCURRENTLY idx_session_targets_session ON public.session_targets USING btree (session_id);

CREATE INDEX CONCURRENTLY idx_session_targets_type ON public.session_targets USING btree (target_type);

ALTER TABLE "public"."paper_target_results" ADD CONSTRAINT "paper_target_results_session_target_id_fkey" FOREIGN KEY (session_target_id) REFERENCES session_targets(id) NOT VALID;

ALTER TABLE "public"."paper_target_results" VALIDATE CONSTRAINT "paper_target_results_session_target_id_fkey";

CREATE TABLE "public"."sessions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_workspace_id" uuid,
	"user_id" uuid NOT NULL,
	"team_id" uuid,
	"session_mode" text COLLATE "pg_catalog"."default" DEFAULT 'solo'::text NOT NULL,
	"status" text COLLATE "pg_catalog"."default" DEFAULT 'active'::text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"session_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"training_id" uuid,
	"drill_id" uuid
);

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_session_mode_check" CHECK((session_mode = ANY (ARRAY['solo'::text, 'group'::text])));

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_status_check" CHECK((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])));

CREATE POLICY "Users can view sessions" ON "public"."sessions"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING ((((org_workspace_id IS NULL) AND (user_id = auth.uid())) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = sessions.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role <> 'attached'::text))))));

CREATE POLICY "sessions_delete" ON "public"."sessions"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING (((user_id = auth.uid()) OR ((org_workspace_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = sessions.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))));

CREATE POLICY "sessions_insert" ON "public"."sessions"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK (((user_id = auth.uid()) AND ((org_workspace_id IS NULL) OR (EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = sessions.org_workspace_id) AND (wa.member_id = auth.uid()))))) AND ((training_id IS NULL) OR (EXISTS ( SELECT 1
   FROM trainings t
  WHERE ((t.id = sessions.training_id) AND ((EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM workspace_access wa
          WHERE ((wa.org_workspace_id = t.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text]))))))))))));

CREATE POLICY "sessions_select" ON "public"."sessions"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING (((user_id = auth.uid()) OR ((org_workspace_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = sessions.org_workspace_id) AND (wa.member_id = auth.uid()) AND ((wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text])) OR ((wa.role = 'member'::text) AND ((sessions.team_id IS NULL) OR (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = sessions.team_id) AND (tm.user_id = auth.uid())))))))))))));

CREATE POLICY "sessions_update" ON "public"."sessions"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((user_id = auth.uid()));

ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_org_workspace_fkey" FOREIGN KEY (org_workspace_id) REFERENCES org_workspaces(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."sessions" VALIDATE CONSTRAINT "sessions_org_workspace_fkey";

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."sessions" VALIDATE CONSTRAINT "sessions_user_id_fkey";

CREATE UNIQUE INDEX CONCURRENTLY sessions_pkey ON public.sessions USING btree (id);

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY USING INDEX "sessions_pkey";

CREATE INDEX CONCURRENTLY idx_sessions_drill ON public.sessions USING btree (drill_id);

CREATE INDEX CONCURRENTLY idx_sessions_org_workspace ON public.sessions USING btree (org_workspace_id);

CREATE INDEX CONCURRENTLY idx_sessions_started ON public.sessions USING btree (started_at);

CREATE INDEX CONCURRENTLY idx_sessions_started_at ON public.sessions USING btree (started_at DESC);

CREATE INDEX CONCURRENTLY idx_sessions_status ON public.sessions USING btree (status);

CREATE INDEX CONCURRENTLY idx_sessions_team ON public.sessions USING btree (team_id);

CREATE INDEX CONCURRENTLY idx_sessions_training ON public.sessions USING btree (training_id);

CREATE INDEX CONCURRENTLY idx_sessions_user ON public.sessions USING btree (user_id);

ALTER TABLE "public"."session_participants" ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."session_participants" VALIDATE CONSTRAINT "session_participants_session_id_fkey";

ALTER TABLE "public"."session_stats" ADD CONSTRAINT "session_stats_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."session_stats" VALIDATE CONSTRAINT "session_stats_session_id_fkey";

ALTER TABLE "public"."session_targets" ADD CONSTRAINT "session_targets_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."session_targets" VALIDATE CONSTRAINT "session_targets_session_id_fkey";

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "public"."tactical_target_results" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_target_id" uuid NOT NULL,
	"bullets_fired" integer NOT NULL,
	"hits" integer NOT NULL,
	"is_stage_cleared" boolean DEFAULT false,
	"time_seconds" numeric,
	"notes" text COLLATE "pg_catalog"."default"
);

ALTER TABLE "public"."tactical_target_results" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tactical_target_results" ADD CONSTRAINT "tactical_target_results_session_target_id_fkey" FOREIGN KEY (session_target_id) REFERENCES session_targets(id) NOT VALID;

ALTER TABLE "public"."tactical_target_results" VALIDATE CONSTRAINT "tactical_target_results_session_target_id_fkey";

CREATE UNIQUE INDEX CONCURRENTLY tactical_target_results_pkey ON public.tactical_target_results USING btree (id);

ALTER TABLE "public"."tactical_target_results" ADD CONSTRAINT "tactical_target_results_pkey" PRIMARY KEY USING INDEX "tactical_target_results_pkey";

CREATE UNIQUE INDEX CONCURRENTLY tactical_target_results_session_target_id_key ON public.tactical_target_results USING btree (session_target_id);

ALTER TABLE "public"."tactical_target_results" ADD CONSTRAINT "tactical_target_results_session_target_id_key" UNIQUE USING INDEX "tactical_target_results_session_target_id_key";

CREATE TABLE "public"."team_members" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text COLLATE "pg_catalog"."default" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_role_check" CHECK((role = ANY (ARRAY['commander'::text, 'squad_commander'::text, 'soldier'::text])));

ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_squad_requirement" CHECK(((role = 'commander'::text) OR ((role = ANY (ARRAY['soldier'::text, 'squad_commander'::text])) AND (details ? 'squad_id'::text) AND ((details ->> 'squad_id'::text) IS NOT NULL) AND ((details ->> 'squad_id'::text) <> ''::text))));

CREATE POLICY "team_members_delete" ON "public"."team_members"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM (teams
     JOIN workspace_access ON ((workspace_access.org_workspace_id = teams.org_workspace_id)))
  WHERE ((teams.id = team_members.team_id) AND (workspace_access.member_id = auth.uid()) AND (workspace_access.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text]))))));

CREATE POLICY "team_members_insert" ON "public"."team_members"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK ((EXISTS ( SELECT 1
   FROM (teams
     JOIN workspace_access ON ((workspace_access.org_workspace_id = teams.org_workspace_id)))
  WHERE ((teams.id = team_members.team_id) AND (workspace_access.member_id = auth.uid()) AND (workspace_access.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text]))))));

CREATE POLICY "team_members_select" ON "public"."team_members"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (teams
     JOIN workspace_access ON ((workspace_access.org_workspace_id = teams.org_workspace_id)))
  WHERE ((teams.id = team_members.team_id) AND (workspace_access.member_id = auth.uid()))))));

CREATE POLICY "team_members_update" ON "public"."team_members"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM (teams
     JOIN workspace_access ON ((workspace_access.org_workspace_id = teams.org_workspace_id)))
  WHERE ((teams.id = team_members.team_id) AND (workspace_access.member_id = auth.uid()) AND (workspace_access.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text]))))));

ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_user_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."team_members" VALIDATE CONSTRAINT "team_members_user_fkey";

CREATE UNIQUE INDEX CONCURRENTLY team_members_pkey ON public.team_members USING btree (team_id, user_id);

ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_pkey" PRIMARY KEY USING INDEX "team_members_pkey";

CREATE INDEX CONCURRENTLY idx_team_members_team ON public.team_members USING btree (team_id);

CREATE INDEX CONCURRENTLY idx_team_members_user ON public.team_members USING btree (user_id);

CREATE UNIQUE INDEX CONCURRENTLY team_members_one_commander_per_team ON public.team_members USING btree (team_id) WHERE (role = 'commander'::text);

CREATE UNIQUE INDEX CONCURRENTLY unique_squad_commander ON public.team_members USING btree (team_id, ((details ->> 'squad_id'::text))) WHERE ((role = 'squad_commander'::text) AND ((details ->> 'squad_id'::text) IS NOT NULL));

CREATE UNIQUE INDEX CONCURRENTLY unique_team_commander ON public.team_members USING btree (team_id) WHERE (role = 'commander'::text);

CREATE TRIGGER enforce_commander_constraints BEFORE INSERT OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION check_commander_constraints();

CREATE TRIGGER enforce_team_member_workspace_role BEFORE INSERT OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION check_team_member_is_workspace_member();

CREATE TABLE "public"."teams" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_workspace_id" uuid NOT NULL,
	"name" text COLLATE "pg_catalog"."default" NOT NULL,
	"team_type" text COLLATE "pg_catalog"."default",
	"description" text COLLATE "pg_catalog"."default",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"squads" text[] COLLATE "pg_catalog"."default" DEFAULT ARRAY[]::text[]
);

ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_team_type_check" CHECK((team_type = ANY (ARRAY['field'::text, 'back_office'::text])));

CREATE POLICY "teams_delete" ON "public"."teams"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access
  WHERE ((workspace_access.org_workspace_id = teams.org_workspace_id) AND (workspace_access.member_id = auth.uid()) AND (workspace_access.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

CREATE POLICY "teams_insert" ON "public"."teams"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK ((EXISTS ( SELECT 1
   FROM workspace_access
  WHERE ((workspace_access.org_workspace_id = teams.org_workspace_id) AND (workspace_access.member_id = auth.uid()) AND (workspace_access.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text]))))));

CREATE POLICY "teams_select" ON "public"."teams"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access
  WHERE ((workspace_access.org_workspace_id = teams.org_workspace_id) AND (workspace_access.member_id = auth.uid())))));

CREATE POLICY "teams_update" ON "public"."teams"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access
  WHERE ((workspace_access.org_workspace_id = teams.org_workspace_id) AND (workspace_access.member_id = auth.uid()) AND (workspace_access.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text]))))));

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_org_workspace_fkey" FOREIGN KEY (org_workspace_id) REFERENCES org_workspaces(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."teams" VALIDATE CONSTRAINT "teams_org_workspace_fkey";

CREATE UNIQUE INDEX CONCURRENTLY teams_pkey ON public.teams USING btree (id);

ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_pkey" PRIMARY KEY USING INDEX "teams_pkey";

CREATE INDEX CONCURRENTLY idx_teams_org_workspace ON public.teams USING btree (org_workspace_id);

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE "public"."sessions" VALIDATE CONSTRAINT "sessions_team_id_fkey";

ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_team_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."team_members" VALIDATE CONSTRAINT "team_members_team_fkey";

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "public"."training_drills" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"training_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"name" text COLLATE "pg_catalog"."default" NOT NULL,
	"target_type" text COLLATE "pg_catalog"."default" NOT NULL,
	"distance_m" integer NOT NULL,
	"rounds_per_shooter" integer NOT NULL,
	"time_limit_seconds" integer,
	"position" text COLLATE "pg_catalog"."default",
	"weapon_category" text COLLATE "pg_catalog"."default",
	"notes" text COLLATE "pg_catalog"."default",
	"created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."training_drills" ADD CONSTRAINT "training_drills_target_type_check" CHECK((target_type = ANY (ARRAY['paper'::text, 'tactical'::text])));

CREATE POLICY "training_drills_delete" ON "public"."training_drills"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM (trainings t
     JOIN workspace_access wa ON ((wa.org_workspace_id = t.org_workspace_id)))
  WHERE ((t.id = training_drills.training_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

CREATE POLICY "training_drills_insert" ON "public"."training_drills"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK ((EXISTS ( SELECT 1
   FROM (trainings t
     JOIN workspace_access wa ON ((wa.org_workspace_id = t.org_workspace_id)))
  WHERE ((t.id = training_drills.training_id) AND (wa.member_id = auth.uid()) AND ((wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text])) OR ((wa.role = 'member'::text) AND (t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text))))))))));

CREATE POLICY "training_drills_select" ON "public"."training_drills"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM (trainings t
     JOIN workspace_access wa ON ((wa.org_workspace_id = t.org_workspace_id)))
  WHERE ((t.id = training_drills.training_id) AND (wa.member_id = auth.uid()) AND ((wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text])) OR ((wa.role = 'member'::text) AND (t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid()))))))))));

CREATE POLICY "training_drills_update" ON "public"."training_drills"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM (trainings t
     JOIN workspace_access wa ON ((wa.org_workspace_id = t.org_workspace_id)))
  WHERE ((t.id = training_drills.training_id) AND (wa.member_id = auth.uid()) AND ((wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text])) OR ((wa.role = 'member'::text) AND (t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text))))))))));

ALTER TABLE "public"."training_drills" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX CONCURRENTLY training_drills_pkey ON public.training_drills USING btree (id);

ALTER TABLE "public"."training_drills" ADD CONSTRAINT "training_drills_pkey" PRIMARY KEY USING INDEX "training_drills_pkey";

CREATE INDEX CONCURRENTLY idx_training_drills_order ON public.training_drills USING btree (training_id, order_index);

CREATE INDEX CONCURRENTLY idx_training_drills_training ON public.training_drills USING btree (training_id);

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_drill_id_fkey" FOREIGN KEY (drill_id) REFERENCES training_drills(id) NOT VALID;

ALTER TABLE "public"."sessions" VALIDATE CONSTRAINT "sessions_drill_id_fkey";

CREATE TABLE "public"."trainings" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_workspace_id" uuid NOT NULL,
	"team_id" uuid,
	"title" text COLLATE "pg_catalog"."default" NOT NULL,
	"description" text COLLATE "pg_catalog"."default",
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text COLLATE "pg_catalog"."default" DEFAULT 'planned'::text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "public"."trainings" ADD CONSTRAINT "trainings_status_check" CHECK((status = ANY (ARRAY['planned'::text, 'ongoing'::text, 'finished'::text, 'cancelled'::text])));

CREATE POLICY "Users can view trainings" ON "public"."trainings"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = trainings.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role <> 'attached'::text))))));

CREATE POLICY "trainings_delete" ON "public"."trainings"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = trainings.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

CREATE POLICY "trainings_insert" ON "public"."trainings"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = trainings.org_workspace_id) AND (wa.member_id = auth.uid()) AND ((wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text])) OR ((wa.role = 'member'::text) AND (trainings.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = trainings.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text))))))))));

CREATE POLICY "trainings_select" ON "public"."trainings"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = trainings.org_workspace_id) AND (wa.member_id = auth.uid()) AND ((wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text])) OR ((wa.role = 'member'::text) AND (trainings.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = trainings.team_id) AND (tm.user_id = auth.uid()))))))))));

CREATE POLICY "trainings_update" ON "public"."trainings"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = trainings.org_workspace_id) AND (wa.member_id = auth.uid()) AND ((wa.role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text])) OR ((wa.role = 'member'::text) AND (trainings.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM team_members tm
          WHERE ((tm.team_id = trainings.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text))))))))));

ALTER TABLE "public"."trainings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."trainings" ADD CONSTRAINT "trainings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) NOT VALID;

ALTER TABLE "public"."trainings" VALIDATE CONSTRAINT "trainings_created_by_fkey";

ALTER TABLE "public"."trainings" ADD CONSTRAINT "trainings_org_workspace_id_fkey" FOREIGN KEY (org_workspace_id) REFERENCES org_workspaces(id) NOT VALID;

ALTER TABLE "public"."trainings" VALIDATE CONSTRAINT "trainings_org_workspace_id_fkey";

ALTER TABLE "public"."trainings" ADD CONSTRAINT "trainings_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) NOT VALID;

ALTER TABLE "public"."trainings" VALIDATE CONSTRAINT "trainings_team_id_fkey";

CREATE UNIQUE INDEX CONCURRENTLY trainings_pkey ON public.trainings USING btree (id);

ALTER TABLE "public"."trainings" ADD CONSTRAINT "trainings_pkey" PRIMARY KEY USING INDEX "trainings_pkey";

CREATE INDEX CONCURRENTLY idx_trainings_created_by ON public.trainings USING btree (created_by);

CREATE INDEX CONCURRENTLY idx_trainings_org_workspace ON public.trainings USING btree (org_workspace_id);

CREATE INDEX CONCURRENTLY idx_trainings_scheduled ON public.trainings USING btree (scheduled_at);

CREATE INDEX CONCURRENTLY idx_trainings_team ON public.trainings USING btree (team_id);

ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_training_id_fkey" FOREIGN KEY (training_id) REFERENCES trainings(id) NOT VALID;

ALTER TABLE "public"."sessions" VALIDATE CONSTRAINT "sessions_training_id_fkey";

ALTER TABLE "public"."training_drills" ADD CONSTRAINT "training_drills_training_id_fkey" FOREIGN KEY (training_id) REFERENCES trainings(id) NOT VALID;

ALTER TABLE "public"."training_drills" VALIDATE CONSTRAINT "training_drills_training_id_fkey";

CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "public"."workspace_access" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_workspace_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role" text COLLATE "pg_catalog"."default" DEFAULT 'member'::text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."workspace_access" ADD CONSTRAINT "workspace_access_role_check" CHECK((role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text, 'member'::text, 'attached'::text])));

CREATE POLICY "workspace_access_delete" ON "public"."workspace_access"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = workspace_access.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = 'owner'::text)))));

CREATE POLICY "workspace_access_insert" ON "public"."workspace_access"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = workspace_access.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

CREATE POLICY "workspace_access_select" ON "public"."workspace_access"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING ((member_id = auth.uid()));

CREATE POLICY "workspace_access_update" ON "public"."workspace_access"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = workspace_access.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

ALTER TABLE "public"."workspace_access" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspace_access" ADD CONSTRAINT "workspace_access_member_fkey" FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_access" VALIDATE CONSTRAINT "workspace_access_member_fkey";

ALTER TABLE "public"."workspace_access" ADD CONSTRAINT "workspace_access_org_fkey" FOREIGN KEY (org_workspace_id) REFERENCES org_workspaces(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_access" VALIDATE CONSTRAINT "workspace_access_org_fkey";

CREATE UNIQUE INDEX CONCURRENTLY workspace_access_pkey ON public.workspace_access USING btree (id);

ALTER TABLE "public"."workspace_access" ADD CONSTRAINT "workspace_access_pkey" PRIMARY KEY USING INDEX "workspace_access_pkey";

CREATE UNIQUE INDEX CONCURRENTLY workspace_access_unique_org ON public.workspace_access USING btree (org_workspace_id, member_id);

ALTER TABLE "public"."workspace_access" ADD CONSTRAINT "workspace_access_unique_org" UNIQUE USING INDEX "workspace_access_unique_org";

CREATE INDEX CONCURRENTLY idx_workspace_access_member ON public.workspace_access USING btree (member_id);

CREATE INDEX CONCURRENTLY idx_workspace_access_org ON public.workspace_access USING btree (org_workspace_id);

CREATE TABLE "public"."workspace_invitations" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_workspace_id" uuid NOT NULL,
	"invite_code" text COLLATE "pg_catalog"."default" NOT NULL,
	"role" text COLLATE "pg_catalog"."default" DEFAULT 'member'::text NOT NULL,
	"status" text COLLATE "pg_catalog"."default" DEFAULT 'pending'::text NOT NULL,
	"invited_by" uuid NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"team_id" uuid,
	"team_role" text COLLATE "pg_catalog"."default",
	"details" jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_role_check" CHECK((role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text, 'member'::text, 'attached'::text])));

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_status_check" CHECK((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'cancelled'::text, 'expired'::text])));

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_team_role_check" CHECK((team_role = ANY (ARRAY['commander'::text, 'squad_commander'::text, 'soldier'::text])));

CREATE POLICY "workspace_invitations_delete" ON "public"."workspace_invitations"
	AS PERMISSIVE
	FOR DELETE
	TO PUBLIC
	USING (((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = workspace_invitations.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR ((team_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.team_id = workspace_invitations.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text))))) OR (invited_by = auth.uid())));

CREATE POLICY "workspace_invitations_insert" ON "public"."workspace_invitations"
	AS PERMISSIVE
	FOR INSERT
	TO PUBLIC
	WITH CHECK (((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = workspace_invitations.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR ((team_id IS NOT NULL) AND (role = 'member'::text) AND (team_role = ANY (ARRAY['squad_commander'::text, 'soldier'::text])) AND (EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.team_id = workspace_invitations.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text)))))));

CREATE POLICY "workspace_invitations_select" ON "public"."workspace_invitations"
	AS PERMISSIVE
	FOR SELECT
	TO PUBLIC
	USING (((auth.uid() IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = workspace_invitations.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR ((team_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.team_id = workspace_invitations.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text))))) OR (invited_by = auth.uid()) OR (status = 'pending'::text))));

CREATE POLICY "workspace_invitations_update" ON "public"."workspace_invitations"
	AS PERMISSIVE
	FOR UPDATE
	TO PUBLIC
	USING (((EXISTS ( SELECT 1
   FROM workspace_access wa
  WHERE ((wa.org_workspace_id = workspace_invitations.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR ((team_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM team_members tm
  WHERE ((tm.team_id = workspace_invitations.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = 'commander'::text))))) OR ((status = 'pending'::text) AND (expires_at > now()))));

ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_accepted_by_fkey" FOREIGN KEY (accepted_by) REFERENCES profiles(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE "public"."workspace_invitations" VALIDATE CONSTRAINT "workspace_invitations_accepted_by_fkey";

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_invitations" VALIDATE CONSTRAINT "workspace_invitations_invited_by_fkey";

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_org_workspace_fkey" FOREIGN KEY (org_workspace_id) REFERENCES org_workspaces(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE "public"."workspace_invitations" VALIDATE CONSTRAINT "workspace_invitations_org_workspace_fkey";

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE "public"."workspace_invitations" VALIDATE CONSTRAINT "workspace_invitations_team_id_fkey";

CREATE UNIQUE INDEX CONCURRENTLY workspace_invitations_invite_code_key ON public.workspace_invitations USING btree (invite_code);

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_invite_code_key" UNIQUE USING INDEX "workspace_invitations_invite_code_key";

CREATE UNIQUE INDEX CONCURRENTLY workspace_invitations_pkey ON public.workspace_invitations USING btree (id);

ALTER TABLE "public"."workspace_invitations" ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY USING INDEX "workspace_invitations_pkey";

CREATE INDEX CONCURRENTLY idx_workspace_invitations_team ON public.workspace_invitations USING btree (team_id);

CREATE INDEX CONCURRENTLY workspace_invitations_expires_at_idx ON public.workspace_invitations USING btree (expires_at);

CREATE INDEX CONCURRENTLY workspace_invitations_invite_code_idx ON public.workspace_invitations USING btree (invite_code);

CREATE INDEX CONCURRENTLY workspace_invitations_org_workspace_idx ON public.workspace_invitations USING btree (org_workspace_id);

CREATE INDEX CONCURRENTLY workspace_invitations_status_idx ON public.workspace_invitations USING btree (status);

CREATE TRIGGER enforce_invitation_commander_constraints BEFORE INSERT OR UPDATE ON public.workspace_invitations FOR EACH ROW EXECUTE FUNCTION check_invitation_commander_constraints();

CREATE VIEW "public"."session_stats_sniper" AS
 SELECT s.id AS session_id,
    s.org_workspace_id,
    s.training_id,
    s.team_id,
    s.drill_id,
    s.session_mode,
    s.status,
    s.started_at,
    s.ended_at,
    EXTRACT(epoch FROM s.ended_at - s.started_at)::integer AS session_duration_seconds,
    sp.user_id,
    sp.role,
    sp.weapon_id,
    sp.sight_id,
    sp."position",
    sp.shots_fired AS total_shots_fired,
    count(st.id) AS targets_engaged,
    count(
        CASE
            WHEN st.target_type = 'paper'::text THEN 1
            ELSE NULL::integer
        END) AS paper_targets,
    count(
        CASE
            WHEN st.target_type = 'tactical'::text THEN 1
            ELSE NULL::integer
        END) AS tactical_targets,
    COALESCE(avg(ptr.hits_total::numeric / NULLIF(ptr.bullets_fired, 0)::numeric * 100::numeric), 0::numeric) AS avg_paper_accuracy_pct,
    avg(ptr.dispersion_cm) AS avg_grouping_cm,
    min(ptr.dispersion_cm) AS best_grouping_cm,
    sum(ptr.hits_inside_scoring) AS total_scoring_hits,
    sum(ptr.bullets_fired) AS total_paper_rounds,
    sum(ttr.hits) AS total_tactical_hits,
    sum(ttr.bullets_fired) AS total_tactical_rounds,
    COALESCE(avg(ttr.hits::numeric / NULLIF(ttr.bullets_fired, 0)::numeric * 100::numeric), 0::numeric) AS avg_tactical_accuracy_pct,
    count(
        CASE
            WHEN ttr.is_stage_cleared = true THEN 1
            ELSE NULL::integer
        END) AS stages_cleared,
    avg(ttr.time_seconds) AS avg_engagement_time_sec,
    min(ttr.time_seconds) AS fastest_engagement_time_sec,
    COALESCE(sum(ptr.hits_total), 0::bigint) + COALESCE(sum(ttr.hits), 0::bigint) AS total_hits,
    COALESCE(sum(ptr.bullets_fired), 0::bigint) + COALESCE(sum(ttr.bullets_fired), 0::bigint) AS total_rounds_on_target,
        CASE
            WHEN (COALESCE(sum(ptr.bullets_fired), 0::bigint) + COALESCE(sum(ttr.bullets_fired), 0::bigint)) > 0 THEN round((COALESCE(sum(ptr.hits_total), 0::bigint) + COALESCE(sum(ttr.hits), 0::bigint))::numeric / (COALESCE(sum(ptr.bullets_fired), 0::bigint) + COALESCE(sum(ttr.bullets_fired), 0::bigint))::numeric * 100::numeric, 2)
            ELSE 0::numeric
        END AS overall_accuracy_pct,
    t.title AS training_title,
    td.name AS drill_name,
    td.distance_m AS planned_distance,
    td.weapon_category,
    p.full_name AS user_name,
    p.email AS user_email,
    ow.name AS org_name,
    tm.name AS team_name,
    s.session_data
   FROM sessions s
     LEFT JOIN session_participants sp ON s.id = sp.session_id
     LEFT JOIN session_targets st ON s.id = st.session_id
     LEFT JOIN paper_target_results ptr ON st.id = ptr.session_target_id
     LEFT JOIN tactical_target_results ttr ON st.id = ttr.session_target_id
     LEFT JOIN trainings t ON s.training_id = t.id
     LEFT JOIN training_drills td ON s.drill_id = td.id
     LEFT JOIN profiles p ON sp.user_id = p.id
     LEFT JOIN org_workspaces ow ON s.org_workspace_id = ow.id
     LEFT JOIN teams tm ON s.team_id = tm.id
  WHERE sp.role = ANY (ARRAY['sniper'::text, 'pistol'::text])
  GROUP BY s.id, s.org_workspace_id, s.training_id, s.team_id, s.drill_id, s.session_mode, s.status, s.started_at, s.ended_at, sp.user_id, sp.role, sp.weapon_id, sp.sight_id, sp."position", sp.shots_fired, t.title, td.name, td.distance_m, td.weapon_category, p.full_name, p.email, ow.name, tm.name, s.session_data;;

-- HAS_UNTRACKABLE_DEPENDENCIES: This extension may be in use by tables, indexes, functions, triggers, etc. This statement will be ran last, so this may be OK.
DROP EXTENSION "pg_net";

