-- Fix ambiguous column reference in get_org_members function
-- Also fix accept_org_invite to work with the new simplified team membership

DROP FUNCTION IF EXISTS get_org_members(uuid);

-- First, fix the accept_org_invite function to work with new team structure
CREATE OR REPLACE FUNCTION accept_org_invite(p_invite_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv org_invitations%ROWTYPE; 
  v_user_id uuid; 
  v_profile_id uuid; 
  v_org orgs%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN 
    RETURN json_build_object('success', false, 'error', 'Not authenticated'); 
  END IF;
  
  SELECT * INTO v_inv 
  FROM org_invitations 
  WHERE invite_code = p_invite_code 
  AND status = 'pending' 
  AND expires_at > now();
  
  IF NOT FOUND THEN 
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation'); 
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id 
    AND org_id = v_inv.org_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member');
  END IF;
  
  SELECT * INTO v_org FROM orgs WHERE id = v_inv.org_id;
  
  -- Create profile with team assignment if specified
  INSERT INTO profiles (
    user_id, 
    org_id, 
    role, 
    status,
    team_id,
    team_role,
    squad_id
  ) VALUES (
    v_user_id, 
    v_inv.org_id, 
    v_inv.role, 
    'active',
    v_inv.team_id,
    v_inv.team_role,
    NULL  -- squad_id will be assigned later if needed
  )
  RETURNING id INTO v_profile_id;
  
  -- Mark invitation as accepted
  UPDATE org_invitations 
  SET 
    status = 'accepted', 
    accepted_by = v_profile_id, 
    accepted_at = now(), 
    updated_at = now() 
  WHERE id = v_inv.id;
  
  RETURN json_build_object(
    'success', true, 
    'profile_id', v_profile_id, 
    'org_id', v_inv.org_id, 
    'org_name', v_org.name, 
    'role', v_inv.role
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_org_members(p_org_id uuid)
RETURNS TABLE(
  profile_id uuid, 
  user_id uuid, 
  display_name text, 
  avatar_url text, 
  role text, 
  status text, 
  joined_at timestamptz,
  team_id uuid,
  team_role text,
  squad_id text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check permissions with explicit table references
  IF NOT EXISTS (
    SELECT 1 FROM profiles perm_check
    WHERE perm_check.org_id = p_org_id 
    AND perm_check.user_id = auth.uid() 
    AND perm_check.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied - you must be a member of this organization';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as profile_id, 
    p.user_id, 
    p.display_name, 
    p.avatar_url, 
    p.role, 
    p.status, 
    p.created_at as joined_at,
    p.team_id,
    p.team_role,
    p.squad_id
  FROM profiles p 
  WHERE p.org_id = p_org_id 
  AND p.status = 'active'
  ORDER BY 
    CASE p.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'instructor' THEN 3 
      ELSE 4 
    END, 
    p.display_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_members(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_members(uuid) IS 'Get all active members of an organization - fixed ambiguous column references';
