-- ============================================================================
-- Fix: create_team_with_owner fails with teams_created_by_fkey violation
-- ----------------------------------------------------------------------------
-- teams.created_by -> profiles(id) FK requires a profile row to exist for the
-- authenticated user. In practice some users hit this path without a matching
-- profiles row (e.g. created before on_auth_user_created trigger existed, or
-- the trigger failed silently at signup). The RPC now self-heals by creating
-- the missing profile from auth.users before inserting the team, mirroring
-- what handle_new_user() does at signup.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name text,
  p_description text DEFAULT NULL,
  p_squads text[] DEFAULT ARRAY[]::text[]
)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_auth_user auth.users%ROWTYPE;
  v_workspace_slug text;
  v_team public.teams;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Self-heal: ensure a profile row exists for this user before the FK insert.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    SELECT * INTO v_auth_user FROM auth.users WHERE id = v_user_id;

    IF v_auth_user.id IS NULL THEN
      RAISE EXCEPTION 'Authenticated user % not found in auth.users', v_user_id
        USING ERRCODE = '23503';
    END IF;

    v_workspace_slug := LOWER(REGEXP_REPLACE(
      COALESCE(v_auth_user.raw_user_meta_data->>'full_name', v_auth_user.email),
      '[^a-zA-Z0-9]',
      '-',
      'g'
    )) || '-' || SUBSTRING(v_auth_user.id::text, 1, 8);

    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      avatar_url,
      workspace_name,
      workspace_slug
    )
    VALUES (
      v_auth_user.id,
      v_auth_user.email,
      COALESCE(v_auth_user.raw_user_meta_data->>'full_name', v_auth_user.email),
      v_auth_user.raw_user_meta_data->>'avatar_url',
      CONCAT(COALESCE(v_auth_user.raw_user_meta_data->>'full_name', v_auth_user.email), '''s Workspace'),
      v_workspace_slug
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

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
