-- Fix ambiguous column references in get_org_invitations function

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
    SELECT 1 FROM profiles prof
    WHERE prof.user_id = v_user_id
    AND prof.org_id = p_org_id
    AND prof.role IN ('owner', 'admin', 'instructor')
    AND prof.status = 'active'
  ) INTO v_has_permission;
  
  -- Also check if the org is personal (personal orgs should not have invitations)
  IF EXISTS (SELECT 1 FROM orgs WHERE orgs.id = p_org_id AND orgs.org_type = 'personal') THEN
    RAISE EXCEPTION 'Personal organizations cannot have invitations';
  END IF;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Access denied - you must be an owner, admin, or instructor of this organization';
  END IF;
  
  RETURN QUERY
  SELECT 
    inv.id,
    inv.invite_code,
    inv.role::text,
    inv.status,
    inv.expires_at,
    inv.team_id,
    inv.team_role,
    inv.created_at,
    inviter.display_name as inviter_name,
    team.name as team_name
  FROM org_invitations inv
  LEFT JOIN profiles inviter ON inviter.id = inv.invited_by
  LEFT JOIN teams team ON team.id = inv.team_id
  WHERE inv.org_id = p_org_id
  AND inv.status = 'pending'
  AND inv.expires_at > now()
  ORDER BY inv.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_org_invitations(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_invitations(uuid) IS 'Get all pending invitations for an organization - fixed ambiguous column references';

