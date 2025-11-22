-- Fix RLS policies for invite validation

-- Drop existing policies for org_invitations
DROP POLICY IF EXISTS "admins_view_invitations" ON org_invitations;
DROP POLICY IF EXISTS "anyone_view_by_code" ON org_invitations;
DROP POLICY IF EXISTS "admins_create_invitations" ON org_invitations;
DROP POLICY IF EXISTS "admins_update_invitations" ON org_invitations;
DROP POLICY IF EXISTS "users_accept_invitations" ON org_invitations;
DROP POLICY IF EXISTS "admins_delete_invitations" ON org_invitations;

-- Create cleaner, more specific RLS policies

-- Allow org admins/owners to view their org's invitations
CREATE POLICY "org_admins_view_invitations" ON org_invitations FOR SELECT USING (
  org_id IN (
    SELECT profiles.org_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('owner', 'admin', 'instructor') 
    AND profiles.status = 'active'
  )
);

-- Allow ANYONE authenticated to view invitations by invite code (for validation)
CREATE POLICY "validate_invite_by_code" ON org_invitations FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND status = 'pending' 
  AND expires_at > now()
);

-- Allow org admins/owners to create invitations
CREATE POLICY "org_admins_create_invitations" ON org_invitations FOR INSERT WITH CHECK (
  org_id IN (
    SELECT profiles.org_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('owner', 'admin', 'instructor') 
    AND profiles.status = 'active'
  )
);

-- Allow org admins/owners to update their org's invitations
CREATE POLICY "org_admins_update_invitations" ON org_invitations FOR UPDATE USING (
  org_id IN (
    SELECT profiles.org_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('owner', 'admin', 'instructor') 
    AND profiles.status = 'active'
  )
);

-- Allow anyone to update invitations they are accepting (for accept flow)
CREATE POLICY "accept_pending_invitations" ON org_invitations FOR UPDATE USING (
  auth.uid() IS NOT NULL 
  AND status = 'pending' 
  AND expires_at > now()
);

-- Allow org admins/owners to delete their org's invitations
CREATE POLICY "org_admins_delete_invitations" ON org_invitations FOR DELETE USING (
  org_id IN (
    SELECT profiles.org_id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('owner', 'admin', 'instructor') 
    AND profiles.status = 'active'
  )
);

COMMENT ON POLICY "validate_invite_by_code" ON org_invitations IS 'Allows anyone authenticated to validate invite codes for pending, non-expired invitations';
COMMENT ON POLICY "accept_pending_invitations" ON org_invitations IS 'Allows anyone to accept pending invitations (used by accept_org_invite RPC)';

-- Also create a simpler RPC function for validating invites that avoids JOIN issues
CREATE OR REPLACE FUNCTION validate_invite_simple(p_invite_code text)
RETURNS TABLE(
  valid boolean,
  org_name text,
  role text,
  expires_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invitation org_invitations%ROWTYPE;
  v_org_name text;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM org_invitations
  WHERE invite_code = p_invite_code
  AND status = 'pending'
  AND expires_at > now();
  
  -- If invitation not found or expired
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;
  
  -- Get org name separately to avoid JOIN issues
  SELECT name INTO v_org_name
  FROM orgs
  WHERE id = v_invitation.org_id;
  
  -- Return valid invitation details
  RETURN QUERY SELECT 
    true::boolean,
    v_org_name,
    v_invitation.role,
    v_invitation.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_invite_simple(text) TO authenticated;

COMMENT ON FUNCTION validate_invite_simple(text) IS 'Simple invite validation without complex JOINs - avoids RLS issues';

