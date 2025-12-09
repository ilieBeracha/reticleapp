--
-- PostgreSQL database dump
--

\restrict wwRwp0BErho2cZxd60n0wo2RAXr3oZpmzROyhHMeM896WezBU5GXYreCVVj27il

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: accept_invite_code(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_invite_code(p_invite_code text, p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION accept_invite_code(p_invite_code text, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accept_invite_code(p_invite_code text, p_user_id uuid) IS 'Securely accepts an invite code and adds user to workspace.
Performs atomic validation and insertion in a single transaction.
Returns JSON with success flag and workspace details or error message.';


--
-- Name: accept_team_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_team_invitation(p_invite_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
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
    
    -- Add as team member
    INSERT INTO public.team_members (team_id, user_id, role, details)
    VALUES (
        v_invitation.team_id,
        v_user_id,
        COALESCE(v_invitation.team_role, 'soldier'),
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
END;
$$;


--
-- Name: add_team_member(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_team_member(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION add_team_member(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.add_team_member(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb) IS 'Safely adds a team member with permission checks, bypassing RLS recursion. Can be called by workspace admins or team commanders.';


--
-- Name: auto_start_trainings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_start_trainings() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION auto_start_trainings(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_start_trainings() IS 'Automatically starts trainings when their scheduled time arrives. 
Call this periodically via pg_cron or an edge function.';


--
-- Name: check_commander_constraints(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_commander_constraints() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: check_invitation_commander_constraints(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_invitation_commander_constraints() RETURNS trigger
    LANGUAGE plpgsql
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


--
-- Name: check_team_member_is_workspace_member(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_team_member_is_workspace_member() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION check_team_member_is_workspace_member(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_team_member_is_workspace_member() IS 'Ensures only workspace members with "member" role can be added to teams';


--
-- Name: create_org_workspace(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_org_workspace(p_name text, p_description text DEFAULT NULL::text) RETURNS TABLE(id uuid, name text, description text, workspace_slug text, created_by uuid, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    team_id uuid,
    session_mode text DEFAULT 'solo'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    training_id uuid,
    drill_id uuid,
    CONSTRAINT sessions_session_mode_check CHECK ((session_mode = ANY (ARRAY['solo'::text, 'group'::text]))),
    CONSTRAINT sessions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: create_session(text, uuid, uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_session(p_workspace_type text, p_workspace_owner_id uuid DEFAULT NULL::uuid, p_org_workspace_id uuid DEFAULT NULL::uuid, p_team_id uuid DEFAULT NULL::uuid, p_session_mode text DEFAULT 'solo'::text, p_session_data jsonb DEFAULT NULL::jsonb) RETURNS public.sessions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: create_team(text, text, uuid, uuid, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_team(p_workspace_type text, p_name text, p_workspace_owner_id uuid DEFAULT NULL::uuid, p_org_workspace_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_squads text[] DEFAULT ARRAY[]::text[]) RETURNS TABLE(team_id uuid, team_workspace_type text, team_workspace_owner_id uuid, team_org_workspace_id uuid, team_name text, team_description text, team_squads text[], team_created_at timestamp with time zone, team_updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION create_team(p_workspace_type text, p_name text, p_workspace_owner_id uuid, p_org_workspace_id uuid, p_description text, p_squads text[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_team(p_workspace_type text, p_name text, p_workspace_owner_id uuid, p_org_workspace_id uuid, p_description text, p_squads text[]) IS 'Create a new team in a workspace with optional squads';


--
-- Name: create_team_with_owner(text, text, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_team_with_owner(p_name text, p_description text DEFAULT NULL::text, p_squads text[] DEFAULT ARRAY[]::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: end_session(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.end_session(p_session_id uuid, p_status text DEFAULT 'completed'::text) RETURNS public.sessions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: expire_old_invitations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_old_invitations() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE "public"."workspace_invitations"
  SET "status" = 'expired', "updated_at" = now()
  WHERE "status" = 'pending'
    AND "expires_at" < now();
END;
$$;


--
-- Name: generate_invite_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invite_code() RETURNS text
    LANGUAGE plpgsql
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


--
-- Name: get_my_sessions(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_sessions(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, workspace_type text, workspace_owner_id uuid, org_workspace_id uuid, workspace_name text, user_id uuid, team_id uuid, team_name text, session_mode text, status text, started_at timestamp with time zone, ended_at timestamp with time zone, session_data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_my_teams(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_teams() RETURNS TABLE(id uuid, name text, description text, squads text[], team_type text, created_by uuid, created_at timestamp with time zone, my_role text, member_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_org_workspace_members(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_workspace_members(p_org_workspace_id uuid) RETURNS TABLE(id uuid, org_workspace_id uuid, member_id uuid, role text, joined_at timestamp with time zone, profile_id uuid, profile_email text, profile_full_name text, profile_avatar_url text, teams jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_sniper_best_performance(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sniper_best_performance(p_user_id uuid, p_org_workspace_id uuid DEFAULT NULL::uuid) RETURNS TABLE(best_paper_accuracy numeric, best_tactical_accuracy numeric, best_overall_accuracy numeric, tightest_grouping_cm numeric, fastest_engagement_sec numeric, most_targets_cleared integer, longest_session_minutes integer, total_sessions bigint)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_sniper_progression(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sniper_progression(p_user_id uuid, p_org_workspace_id uuid DEFAULT NULL::uuid, p_days_back integer DEFAULT 30) RETURNS TABLE(session_date date, avg_accuracy numeric, avg_grouping numeric, sessions_count bigint, total_rounds integer, improvement_trend text)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_team_commander_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_commander_status(p_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_team_leaderboard(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_leaderboard(p_team_id uuid, p_days_back integer DEFAULT 30) RETURNS TABLE(user_id uuid, user_name text, sessions_completed bigint, avg_accuracy numeric, best_accuracy numeric, avg_grouping numeric, total_rounds integer, rank_position integer)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: get_team_members(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_members(p_team_id uuid) RETURNS TABLE(user_id uuid, email text, full_name text, role text, details jsonb, joined_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_team_with_members(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_team_with_members(p_team_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_workspace_sessions(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_workspace_sessions(p_workspace_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, workspace_type text, user_id uuid, user_full_name text, team_id uuid, team_name text, session_mode text, status text, started_at timestamp with time zone, ended_at timestamp with time zone, session_data jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_workspace_teams(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_workspace_teams(p_workspace_id uuid) RETURNS TABLE(team_id uuid, team_name text, team_type text, member_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_workspace_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_workspace_access(p_workspace_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = auth.uid()
  );
END;
$$;


--
-- Name: insert_sample_session_data(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_sample_session_data(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: FUNCTION insert_sample_session_data(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.insert_sample_session_data(p_user_id uuid) IS 'Creates sample session data for testing purposes';


--
-- Name: is_team_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_admin(p_team_id uuid, p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: is_team_leader(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_leader(p_team_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: is_team_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_member(p_team_id uuid, p_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = p_team_id AND user_id = p_user_id
    );
$$;


--
-- Name: is_workspace_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_workspace_admin(p_workspace_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notify_team_on_training_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_team_on_training_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notify_team_on_training_started(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_team_on_training_started() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: remove_team_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_team_member(p_team_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION remove_team_member(p_team_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.remove_team_member(p_team_id uuid, p_user_id uuid) IS 'Safely removes a team member with permission checks, bypassing RLS recursion.';


--
-- Name: shares_team_with(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shares_team_with(p_other_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = auth.uid()
        AND tm2.user_id = p_other_user_id
    );
$$;


--
-- Name: update_team_member_role(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_member_role(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION update_team_member_role(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_team_member_role(p_team_id uuid, p_user_id uuid, p_role text, p_details jsonb) IS 'Safely updates a team member role with permission checks, bypassing RLS recursion.';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: validate_invite_code(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_invite_code(p_invite_code text, p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION validate_invite_code(p_invite_code text, p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_invite_code(p_invite_code text, p_user_id uuid) IS 'Securely validates an invite code with comprehensive security checks. 
Returns JSON with valid flag and invitation details or error message.
Bypasses RLS for consistent validation across all users.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    data jsonb,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: paper_target_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paper_target_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_target_id uuid NOT NULL,
    paper_type text NOT NULL,
    bullets_fired integer NOT NULL,
    hits_total integer,
    hits_inside_scoring integer,
    dispersion_cm numeric,
    offset_right_cm numeric,
    offset_up_cm numeric,
    scanned_image_url text,
    notes text,
    CONSTRAINT paper_target_results_paper_type_check CHECK ((paper_type = ANY (ARRAY['achievement'::text, 'grouping'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    workspace_name text DEFAULT 'My Workspace'::text,
    workspace_slug text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'Users (each user is also a workspace)';


--
-- Name: session_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    weapon_id uuid,
    sight_id uuid,
    "position" text,
    shots_fired integer DEFAULT 0,
    notes text,
    CONSTRAINT session_participants_role_check CHECK ((role = ANY (ARRAY['sniper'::text, 'spotter'::text, 'pistol'::text, 'observer'::text, 'instructor'::text])))
);


--
-- Name: session_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    shots_fired integer DEFAULT 0,
    hits integer DEFAULT 0,
    accuracy_pct numeric(5,2),
    headshots integer DEFAULT 0,
    long_range_hits integer DEFAULT 0,
    grouping_cm numeric(8,2),
    weapon_used text,
    "position" text,
    distance_m integer,
    target_type text,
    engagement_time_sec numeric(8,2),
    score integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE session_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.session_stats IS 'Simple session statistics table for quick sniper performance tracking';


--
-- Name: session_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    target_type text NOT NULL,
    sequence_in_session integer,
    distance_m integer,
    lane_number integer,
    notes text,
    planned_shots integer,
    target_data jsonb,
    CONSTRAINT session_targets_target_type_check CHECK ((target_type = ANY (ARRAY['paper'::text, 'tactical'::text])))
);


--
-- Name: tactical_target_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tactical_target_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_target_id uuid NOT NULL,
    bullets_fired integer NOT NULL,
    hits integer NOT NULL,
    is_stage_cleared boolean DEFAULT false,
    time_seconds numeric,
    notes text
);


--
-- Name: team_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invite_code text NOT NULL,
    legacy_org_role text DEFAULT 'member'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_by uuid NOT NULL,
    accepted_by uuid,
    accepted_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    team_id uuid,
    team_role text,
    details jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT team_invitations_team_role_check CHECK (((team_role IS NULL) OR (team_role = ANY (ARRAY['owner'::text, 'commander'::text, 'squad_commander'::text, 'soldier'::text])))),
    CONSTRAINT workspace_invitations_role_check CHECK ((legacy_org_role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text, 'member'::text, 'attached'::text]))),
    CONSTRAINT workspace_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'cancelled'::text, 'expired'::text])))
);


--
-- Name: TABLE team_invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_invitations IS 'Shareable invite codes for organization workspaces';


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT team_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'commander'::text, 'squad_commander'::text, 'soldier'::text])))
);


--
-- Name: TABLE team_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.team_members IS 'Team membership';


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    team_type text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    squads text[] DEFAULT ARRAY[]::text[],
    created_by uuid NOT NULL,
    CONSTRAINT teams_team_type_check CHECK ((team_type = ANY (ARRAY['field'::text, 'back_office'::text])))
);


--
-- Name: TABLE teams; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.teams IS 'Teams within organizations';


--
-- Name: COLUMN teams.squads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams.squads IS 'Optional array of squad names within this team. Users can create squads on-demand.';


--
-- Name: training_drills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_drills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    training_id uuid NOT NULL,
    order_index integer NOT NULL,
    name text NOT NULL,
    target_type text NOT NULL,
    distance_m integer NOT NULL,
    rounds_per_shooter integer NOT NULL,
    time_limit_seconds integer,
    "position" text,
    weapon_category text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT training_drills_target_type_check CHECK ((target_type = ANY (ARRAY['paper'::text, 'tactical'::text])))
);


--
-- Name: trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid,
    title text NOT NULL,
    description text,
    scheduled_at timestamp with time zone NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trainings_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'ongoing'::text, 'finished'::text, 'cancelled'::text])))
);


--
-- Name: user_drill_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_drill_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    training_id uuid NOT NULL,
    drill_id uuid NOT NULL,
    session_id uuid,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    shots_fired integer,
    hits integer,
    accuracy_pct numeric,
    time_seconds numeric
);


--
-- Name: TABLE user_drill_completions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_drill_completions IS 'Tracks which drills each user has completed within a training';


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: paper_target_results paper_target_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paper_target_results
    ADD CONSTRAINT paper_target_results_pkey PRIMARY KEY (id);


--
-- Name: paper_target_results paper_target_results_session_target_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paper_target_results
    ADD CONSTRAINT paper_target_results_session_target_id_key UNIQUE (session_target_id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_workspace_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_workspace_slug_key UNIQUE (workspace_slug);


--
-- Name: session_participants session_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_pkey PRIMARY KEY (id);


--
-- Name: session_participants session_participants_session_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_session_id_user_id_key UNIQUE (session_id, user_id);


--
-- Name: session_stats session_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_stats
    ADD CONSTRAINT session_stats_pkey PRIMARY KEY (id);


--
-- Name: session_stats session_stats_session_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_stats
    ADD CONSTRAINT session_stats_session_id_user_id_key UNIQUE (session_id, user_id);


--
-- Name: session_targets session_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_targets
    ADD CONSTRAINT session_targets_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: tactical_target_results tactical_target_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tactical_target_results
    ADD CONSTRAINT tactical_target_results_pkey PRIMARY KEY (id);


--
-- Name: tactical_target_results tactical_target_results_session_target_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tactical_target_results
    ADD CONSTRAINT tactical_target_results_session_target_id_key UNIQUE (session_target_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: training_drills training_drills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_drills
    ADD CONSTRAINT training_drills_pkey PRIMARY KEY (id);


--
-- Name: trainings trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_pkey PRIMARY KEY (id);


--
-- Name: user_drill_completions user_drill_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_drill_completions
    ADD CONSTRAINT user_drill_completions_pkey PRIMARY KEY (id);


--
-- Name: user_drill_completions user_drill_completions_user_id_training_id_drill_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_drill_completions
    ADD CONSTRAINT user_drill_completions_user_id_training_id_drill_id_key UNIQUE (user_id, training_id, drill_id);


--
-- Name: team_invitations workspace_invitations_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT workspace_invitations_invite_code_key UNIQUE (invite_code);


--
-- Name: team_invitations workspace_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT workspace_invitations_pkey PRIMARY KEY (id);


--
-- Name: idx_drill_completions_drill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drill_completions_drill ON public.user_drill_completions USING btree (drill_id);


--
-- Name: idx_drill_completions_user_training; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drill_completions_user_training ON public.user_drill_completions USING btree (user_id, training_id);


--
-- Name: idx_session_participants_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_participants_role ON public.session_participants USING btree (role);


--
-- Name: idx_session_participants_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_participants_session ON public.session_participants USING btree (session_id);


--
-- Name: idx_session_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_participants_user ON public.session_participants USING btree (user_id);


--
-- Name: idx_session_targets_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_targets_session ON public.session_targets USING btree (session_id);


--
-- Name: idx_session_targets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_targets_type ON public.session_targets USING btree (target_type);


--
-- Name: idx_sessions_drill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_drill ON public.sessions USING btree (drill_id);


--
-- Name: idx_sessions_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_started ON public.sessions USING btree (started_at);


--
-- Name: idx_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_started_at ON public.sessions USING btree (started_at DESC);


--
-- Name: idx_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_status ON public.sessions USING btree (status);


--
-- Name: idx_sessions_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_team ON public.sessions USING btree (team_id);


--
-- Name: idx_sessions_training; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_training ON public.sessions USING btree (training_id);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id);


--
-- Name: idx_team_members_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id);


--
-- Name: idx_training_drills_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_drills_order ON public.training_drills USING btree (training_id, order_index);


--
-- Name: idx_training_drills_training; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_drills_training ON public.training_drills USING btree (training_id);


--
-- Name: idx_trainings_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainings_created_by ON public.trainings USING btree (created_by);


--
-- Name: idx_trainings_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainings_scheduled ON public.trainings USING btree (scheduled_at);


--
-- Name: idx_trainings_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainings_team ON public.trainings USING btree (team_id);


--
-- Name: idx_workspace_invitations_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_invitations_team ON public.team_invitations USING btree (team_id);


--
-- Name: notifications_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at DESC);


--
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);


--
-- Name: notifications_user_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_unread_idx ON public.notifications USING btree (user_id, read) WHERE (read = false);


--
-- Name: team_members_one_commander_per_team; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_members_one_commander_per_team ON public.team_members USING btree (team_id) WHERE (role = 'commander'::text);


--
-- Name: unique_squad_commander; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_squad_commander ON public.team_members USING btree (team_id, ((details ->> 'squad_id'::text))) WHERE ((role = 'squad_commander'::text) AND ((details ->> 'squad_id'::text) IS NOT NULL));


--
-- Name: unique_team_commander; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_team_commander ON public.team_members USING btree (team_id) WHERE (role = 'commander'::text);


--
-- Name: workspace_invitations_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspace_invitations_expires_at_idx ON public.team_invitations USING btree (expires_at);


--
-- Name: workspace_invitations_invite_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspace_invitations_invite_code_idx ON public.team_invitations USING btree (invite_code);


--
-- Name: workspace_invitations_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspace_invitations_status_idx ON public.team_invitations USING btree (status);


--
-- Name: team_members enforce_commander_constraints; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_commander_constraints BEFORE INSERT OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.check_commander_constraints();


--
-- Name: team_invitations enforce_invitation_commander_constraints; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_invitation_commander_constraints BEFORE INSERT OR UPDATE ON public.team_invitations FOR EACH ROW EXECUTE FUNCTION public.check_invitation_commander_constraints();


--
-- Name: team_members enforce_team_member_workspace_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_team_member_workspace_role BEFORE INSERT OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.check_team_member_is_workspace_member();


--
-- Name: trainings on_training_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_training_created AFTER INSERT ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.notify_team_on_training_created();


--
-- Name: trainings on_training_started; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_training_started AFTER UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.notify_team_on_training_started();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: session_stats update_session_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_session_stats_updated_at BEFORE UPDATE ON public.session_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions update_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trainings update_trainings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: paper_target_results paper_target_results_session_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paper_target_results
    ADD CONSTRAINT paper_target_results_session_target_id_fkey FOREIGN KEY (session_target_id) REFERENCES public.session_targets(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: session_participants session_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: session_participants session_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: session_stats session_stats_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_stats
    ADD CONSTRAINT session_stats_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: session_stats session_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_stats
    ADD CONSTRAINT session_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: session_targets session_targets_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_targets
    ADD CONSTRAINT session_targets_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_drill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES public.training_drills(id);


--
-- Name: sessions sessions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_training_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tactical_target_results tactical_target_results_session_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tactical_target_results
    ADD CONSTRAINT tactical_target_results_session_target_id_fkey FOREIGN KEY (session_target_id) REFERENCES public.session_targets(id);


--
-- Name: team_members team_members_team_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: teams teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: training_drills training_drills_training_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_drills
    ADD CONSTRAINT training_drills_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id);


--
-- Name: trainings trainings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: trainings trainings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainings
    ADD CONSTRAINT trainings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: user_drill_completions user_drill_completions_drill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_drill_completions
    ADD CONSTRAINT user_drill_completions_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES public.training_drills(id) ON DELETE CASCADE;


--
-- Name: user_drill_completions user_drill_completions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_drill_completions
    ADD CONSTRAINT user_drill_completions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: user_drill_completions user_drill_completions_training_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_drill_completions
    ADD CONSTRAINT user_drill_completions_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id) ON DELETE CASCADE;


--
-- Name: user_drill_completions user_drill_completions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_drill_completions
    ADD CONSTRAINT user_drill_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_invitations workspace_invitations_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT workspace_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: team_invitations workspace_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT workspace_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_invitations workspace_invitations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT workspace_invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: team_invitations Anyone can view pending invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view pending invitations" ON public.team_invitations FOR SELECT USING (true);


--
-- Name: team_members Owners and commanders can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can add members" ON public.team_members FOR INSERT WITH CHECK (public.is_team_admin(team_id));


--
-- Name: training_drills Owners and commanders can create drills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can create drills" ON public.training_drills FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.trainings t
  WHERE ((t.id = training_drills.training_id) AND ((t.created_by = auth.uid()) OR ((t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'commander'::text])))))))))));


--
-- Name: team_invitations Owners and commanders can create invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can create invitations" ON public.team_invitations FOR INSERT WITH CHECK (((team_id IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = team_invitations.team_id) AND (t.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_invitations.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'commander'::text]))))))));


--
-- Name: trainings Owners and commanders can create trainings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can create trainings" ON public.trainings FOR INSERT WITH CHECK (((created_by = auth.uid()) AND ((team_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = trainings.team_id) AND (t.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = trainings.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'commander'::text]))))))));


--
-- Name: training_drills Owners and commanders can delete drills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can delete drills" ON public.training_drills FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.trainings t
  WHERE ((t.id = training_drills.training_id) AND ((t.created_by = auth.uid()) OR ((t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'commander'::text])))))))))));


--
-- Name: team_invitations Owners and commanders can delete invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can delete invitations" ON public.team_invitations FOR DELETE USING (((team_id IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = team_invitations.team_id) AND (t.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_invitations.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'commander'::text]))))))));


--
-- Name: team_members Owners and commanders can remove members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can remove members" ON public.team_members FOR DELETE USING ((public.is_team_admin(team_id) OR (user_id = auth.uid())));


--
-- Name: training_drills Owners and commanders can update drills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can update drills" ON public.training_drills FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.trainings t
  WHERE ((t.id = training_drills.training_id) AND ((t.created_by = auth.uid()) OR ((t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'commander'::text])))))))))));


--
-- Name: team_invitations Owners and commanders can update invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can update invitations" ON public.team_invitations FOR UPDATE USING (((team_id IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = team_invitations.team_id) AND (t.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.team_id = team_invitations.team_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'commander'::text]))))))));


--
-- Name: team_members Owners and commanders can update members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can update members" ON public.team_members FOR UPDATE USING (public.is_team_admin(team_id));


--
-- Name: teams Owners and commanders can update teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can update teams" ON public.teams FOR UPDATE USING (((created_by = auth.uid()) OR public.is_team_admin(id)));


--
-- Name: trainings Owners and commanders can update trainings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and commanders can update trainings" ON public.trainings FOR UPDATE USING (((created_by = auth.uid()) OR ((team_id IS NOT NULL) AND public.is_team_admin(team_id))));


--
-- Name: teams Owners can delete teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete teams" ON public.teams FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: trainings Owners can delete trainings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete trainings" ON public.trainings FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: sessions Users can create sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create sessions" ON public.sessions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: teams Users can create teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK ((created_by = auth.uid()));


--
-- Name: notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sessions Users can delete own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: user_drill_completions Users can insert own drill completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own drill completions" ON public.user_drill_completions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: session_stats Users can insert own session stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own session stats" ON public.session_stats FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: paper_target_results Users can insert paper results for own session targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert paper results for own session targets" ON public.paper_target_results FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid())))));


--
-- Name: tactical_target_results Users can insert tactical results for own session targets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert tactical results for own session targets" ON public.tactical_target_results FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid())))));


--
-- Name: session_targets Users can insert targets for own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert targets for own sessions" ON public.session_targets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_targets.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: session_stats Users can update own session stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own session stats" ON public.session_stats FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: sessions Users can update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: paper_target_results Users can update paper results from own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update paper results from own sessions" ON public.paper_target_results FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid())))));


--
-- Name: tactical_target_results Users can update tactical results from own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update tactical results from own sessions" ON public.tactical_target_results FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid())))));


--
-- Name: user_drill_completions Users can view own and team drill completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own and team drill completions" ON public.user_drill_completions FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.trainings t
  WHERE ((t.id = user_drill_completions.training_id) AND (t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid())))))))));


--
-- Name: sessions Users can view own and team sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own and team sessions" ON public.sessions FOR SELECT USING (((user_id = auth.uid()) OR ((team_id IS NOT NULL) AND public.is_team_member(team_id))));


--
-- Name: team_members Users can view own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own memberships" ON public.team_members FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.teams t
  WHERE ((t.id = team_members.team_id) AND (t.created_by = auth.uid()))))));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: session_stats Users can view own session stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own session stats" ON public.session_stats FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: teams Users can view own teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own teams" ON public.teams FOR SELECT USING (((created_by = auth.uid()) OR public.is_team_member(id)));


--
-- Name: paper_target_results Users can view paper results from own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view paper results from own sessions" ON public.paper_target_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = paper_target_results.session_target_id) AND (s.user_id = auth.uid())))));


--
-- Name: profiles Users can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: profiles Users can view profiles of teammates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles of teammates" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR public.shares_team_with(id)));


--
-- Name: tactical_target_results Users can view tactical results from own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tactical results from own sessions" ON public.tactical_target_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.session_targets st
     JOIN public.sessions s ON ((s.id = st.session_id)))
  WHERE ((st.id = tactical_target_results.session_target_id) AND (s.user_id = auth.uid())))));


--
-- Name: session_targets Users can view targets from own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view targets from own sessions" ON public.session_targets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_targets.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: trainings Users can view team trainings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view team trainings" ON public.trainings FOR SELECT USING (((created_by = auth.uid()) OR ((team_id IS NOT NULL) AND public.is_team_member(team_id))));


--
-- Name: training_drills Users can view training drills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view training drills" ON public.training_drills FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.trainings t
  WHERE ((t.id = training_drills.training_id) AND ((t.created_by = auth.uid()) OR ((t.team_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.team_members tm
          WHERE ((tm.team_id = t.team_id) AND (tm.user_id = auth.uid()))))))))));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: paper_target_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.paper_target_results ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_delete_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_delete_self ON public.profiles FOR DELETE USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: session_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: session_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: session_targets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: tactical_target_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tactical_target_results ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: training_drills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_drills ENABLE ROW LEVEL SECURITY;

--
-- Name: trainings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_drill_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_drill_completions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict wwRwp0BErho2cZxd60n0wo2RAXr3oZpmzROyhHMeM896WezBU5GXYreCVVj27il

