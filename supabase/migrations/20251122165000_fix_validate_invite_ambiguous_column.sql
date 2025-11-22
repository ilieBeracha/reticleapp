-- Fix ambiguous column reference in validate_invite_simple function

DROP FUNCTION IF EXISTS validate_invite_simple(text);

CREATE OR REPLACE FUNCTION validate_invite_simple(p_invite_code text)
RETURNS TABLE(
  is_valid boolean,
  organization_name text,
  invitation_role text,
  expiration_time timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invitation org_invitations%ROWTYPE;
  v_org_name text;
BEGIN
  -- Get the invitation with explicit table reference
  SELECT * INTO v_invitation
  FROM org_invitations inv
  WHERE inv.invite_code = p_invite_code
  AND inv.status = 'pending'
  AND inv.expires_at > now();
  
  -- If invitation not found or expired
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, ''::text, ''::text, NULL::timestamptz;
    RETURN;
  END IF;
  
  -- Get org name separately to avoid JOIN issues
  SELECT orgs.name INTO v_org_name
  FROM orgs
  WHERE orgs.id = v_invitation.org_id;
  
  -- Return valid invitation details
  RETURN QUERY SELECT 
    true::boolean,
    v_org_name,
    v_invitation.role,
    v_invitation.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_invite_simple(text) TO authenticated;

COMMENT ON FUNCTION validate_invite_simple(text) IS 'Simple invite validation without complex JOINs - fixed ambiguous column references';
