-- Fix the get_org_invitations function permission check

-- Drop and recreate with better error handling and logging
DROP FUNCTION IF EXISTS get_org_invitations(uuid);

CREATE OR REPLACE FUNCTION get_org_invitations(p_org_id uuid)
RETURNS TABLE(
  id uuid,
  invite_code text,
  role text,
  status text,
  expires_at timestamptz,
  team_id uuid,
  team_role text,
  created_at timestamptz,
  inviter_name text,
  team_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_has_permission boolean := false;
BEGIN
  -- Get current user ID
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user has permission to view invitations for this org
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = v_user_id
    AND p.org_id = p_org_id
    AND p.role IN ('owner', 'admin', 'instructor')
    AND p.status = 'active'
  ) INTO v_has_permission;
  
  -- Also check if the org is personal (personal orgs should not have invitations)
  IF EXISTS (SELECT 1 FROM orgs WHERE id = p_org_id AND org_type = 'personal') THEN
    RAISE EXCEPTION 'Personal organizations cannot have invitations';
  END IF;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Access denied - you must be an owner, admin, or instructor of this organization';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.invite_code,
    i.role::text,
    i.status,
    i.expires_at,
    i.team_id,
    i.team_role,
    i.created_at,
    p.display_name as inviter_name,
    t.name as team_name
  FROM org_invitations i
  LEFT JOIN profiles p ON p.id = i.invited_by
  LEFT JOIN teams t ON t.id = i.team_id
  WHERE i.org_id = p_org_id
  AND i.status = 'pending'
  AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_org_invitations(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_invitations(uuid) IS 'Get all pending invitations for an organization - with improved error handling';

