-- Fix infinite recursion in team_members RLS policies
-- by creating safe SECURITY DEFINER RPC functions for team member management

-- =====================================================
-- Add Team Member (bypasses RLS safely)
-- =====================================================
CREATE OR REPLACE FUNCTION add_team_member(
  p_team_id uuid,
  p_user_id uuid,
  p_role text,
  p_details jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION add_team_member TO authenticated;

COMMENT ON FUNCTION add_team_member IS 
  'Safely adds a team member with permission checks, bypassing RLS recursion. '
  'Can be called by workspace admins or team commanders.';

-- =====================================================
-- Update Team Member Role (bypasses RLS safely)
-- =====================================================
CREATE OR REPLACE FUNCTION update_team_member_role(
  p_team_id uuid,
  p_user_id uuid,
  p_role text,
  p_details jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION update_team_member_role TO authenticated;

COMMENT ON FUNCTION update_team_member_role IS 
  'Safely updates a team member role with permission checks, bypassing RLS recursion.';

-- =====================================================
-- Remove Team Member (bypasses RLS safely)
-- =====================================================
CREATE OR REPLACE FUNCTION remove_team_member(
  p_team_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION remove_team_member TO authenticated;

COMMENT ON FUNCTION remove_team_member IS 
  'Safely removes a team member with permission checks, bypassing RLS recursion.';

