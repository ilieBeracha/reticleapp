-- =====================================================
-- REMOVE PERSONAL WORKSPACES - SINGLE ORG TYPE SYSTEM
-- =====================================================
-- This migration simplifies the system:
-- 1. Removes automatic personal workspace creation
-- 2. All workspaces are now "org" type
-- 3. Users must explicitly create or join an organization
-- =====================================================

-- Step 1: Update handle_new_user to ONLY create profile (no auto workspace)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_slug text;
BEGIN
  -- Generate unique workspace slug (for future use when they create org)
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Create user profile only - no automatic workspace. Users must create or join an org.';

-- Step 2: Simplify workspace_access to remove workspace_type distinction
-- We'll keep the columns for now but deprecate the 'personal' type
COMMENT ON COLUMN public.workspace_access.workspace_type IS 'DEPRECATED: All workspaces are now org type';
COMMENT ON COLUMN public.workspace_access.workspace_owner_id IS 'DEPRECATED: Only org_workspace_id is used';

-- Step 3: Simplify teams table
COMMENT ON COLUMN public.teams.workspace_type IS 'DEPRECATED: All workspaces are now org type';
COMMENT ON COLUMN public.teams.workspace_owner_id IS 'DEPRECATED: Only org_workspace_id is used';

-- Step 4: Simplify sessions table
COMMENT ON COLUMN public.sessions.workspace_type IS 'DEPRECATED: All workspaces are now org type';
COMMENT ON COLUMN public.sessions.workspace_owner_id IS 'DEPRECATED: Only org_workspace_id is used';

-- Step 5: Update create_team function to always use 'org' type
CREATE OR REPLACE FUNCTION public.create_team(
  p_workspace_type text,  -- Keep for backwards compatibility but ignore
  p_name text,
  p_workspace_owner_id uuid DEFAULT NULL,  -- Deprecated
  p_org_workspace_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS TABLE(
  team_id uuid,
  team_workspace_type text,
  team_workspace_owner_id uuid,
  team_org_workspace_id uuid,
  team_name text,
  team_description text,
  team_created_at timestamptz,
  team_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
BEGIN
  v_user_id := auth.uid();

  -- Must provide org_workspace_id
  IF p_org_workspace_id IS NULL THEN
    RAISE EXCEPTION 'org_workspace_id is required';
  END IF;

  -- Check if user has admin/owner role in this org workspace
  SELECT EXISTS (
    SELECT 1 FROM workspace_access
    WHERE org_workspace_id = p_org_workspace_id
      AND member_id = v_user_id
      AND role IN ('owner', 'admin')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'No permission to create teams in this workspace';
  END IF;

  -- Create team (always 'org' type)
  RETURN QUERY
  INSERT INTO teams (
    workspace_type,
    org_workspace_id,
    name,
    description
  )
  VALUES (
    'org',  -- Always 'org' now
    p_org_workspace_id,
    p_name,
    p_description
  )
  RETURNING
    t.id AS team_id,
    t.workspace_type AS team_workspace_type,
    t.workspace_owner_id AS team_workspace_owner_id,
    t.org_workspace_id AS team_org_workspace_id,
    t.name AS team_name,
    t.description AS team_description,
    t.created_at AS team_created_at,
    t.updated_at AS team_updated_at
  FROM teams t
  WHERE t.id = (SELECT id FROM teams ORDER BY created_at DESC LIMIT 1);
END;
$$;

COMMENT ON FUNCTION public.create_team IS 'Create a new team - always in org workspace context';

-- Step 6: Update create_session function to always use 'org' type
CREATE OR REPLACE FUNCTION public.create_session(
  p_workspace_type text,  -- Keep for backwards compatibility but ignore
  p_workspace_owner_id uuid DEFAULT NULL,  -- Deprecated
  p_org_workspace_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_session_mode text DEFAULT 'solo',
  p_session_data jsonb DEFAULT NULL
)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_session public.sessions;
  v_has_access boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Must provide org_workspace_id
  IF p_org_workspace_id IS NULL THEN
    RAISE EXCEPTION 'org_workspace_id is required';
  END IF;

  -- Check if user has access to this org workspace
  SELECT EXISTS (
    SELECT 1 FROM workspace_access wa
    WHERE wa.org_workspace_id = p_org_workspace_id
      AND wa.member_id = v_user_id
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'No access to this workspace';
  END IF;

  -- If team_id provided, verify user has access to that team
  IF p_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = p_team_id
        AND tm.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'User is not a member of the specified team';
    END IF;
  END IF;

  -- Create session (always 'org' type)
  INSERT INTO public.sessions (
    workspace_type,
    org_workspace_id,
    user_id,
    team_id,
    session_mode,
    session_data,
    status,
    started_at
  )
  VALUES (
    'org',  -- Always 'org' now
    p_org_workspace_id,
    v_user_id,
    p_team_id,
    p_session_mode,
    p_session_data,
    'active',
    NOW()
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

COMMENT ON FUNCTION public.create_session IS 'Create a new session - always in org workspace context';

-- Step 7: Add helper function to check if user needs onboarding
CREATE OR REPLACE FUNCTION public.user_needs_onboarding()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM workspace_access
    WHERE member_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.user_needs_onboarding() IS 'Check if user has no workspace access and needs onboarding';

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.user_needs_onboarding() TO authenticated;

