-- Fix ambiguous column reference in get_org_invitations function

-- Drop and recreate the function with explicit column references
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
BEGIN
  -- Check if user has permission to view invitations
  IF NOT EXISTS (
    SELECT 1 FROM profiles p_check
    WHERE p_check.user_id = auth.uid() 
    AND p_check.org_id = p_org_id 
    AND p_check.role IN ('owner', 'admin', 'instructor')
    AND p_check.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.invite_code,
    i.role::text,  -- explicitly cast invitation role to avoid ambiguity
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

COMMENT ON FUNCTION get_org_invitations(uuid) IS 'Get all pending invitations for an organization - fixed ambiguous column reference';

