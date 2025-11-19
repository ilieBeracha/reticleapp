-- =====================================================
-- RPC FUNCTION: Validate Invite Code
-- =====================================================
-- This function bypasses RLS to validate invite codes
-- Includes security checks:
-- 1. Code exists and is pending
-- 2. Not expired
-- 3. User isn't inviting themselves
-- 4. User isn't already a member

CREATE OR REPLACE FUNCTION validate_invite_code(
  p_invite_code text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_workspace_name text;
  v_inviter_name text;
  v_is_member boolean;
BEGIN
  -- Validate input
  IF p_invite_code IS NULL OR length(trim(p_invite_code)) != 8 THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Invalid invite code format'
    );
  END IF;

  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'User must be authenticated'
    );
  END IF;

  -- Get invitation details
  SELECT 
    inv.*,
    org.name as workspace_name,
    prof.full_name as inviter_name,
    prof.email as inviter_email
  INTO v_invitation
  FROM workspace_invitations inv
  LEFT JOIN org_workspaces org ON org.id = inv.org_workspace_id
  LEFT JOIN profiles prof ON prof.id = inv.invited_by
  WHERE inv.invite_code = upper(trim(p_invite_code));

  -- Check if invitation exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Invalid invitation code'
    );
  END IF;

  -- Check if user is trying to use their own invitation
  IF v_invitation.invited_by = p_user_id THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'You cannot use your own invitation code'
    );
  END IF;

  -- Check invitation status
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

  -- Check expiration
  IF v_invitation.expires_at <= now() THEN
    -- Auto-expire the invitation
    UPDATE workspace_invitations
    SET status = 'expired', updated_at = now()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object(
      'valid', false,
      'error', 'This invitation has expired'
    );
  END IF;

  -- Check if user is already a member
  SELECT EXISTS (
    SELECT 1 
    FROM workspace_access
    WHERE org_workspace_id = v_invitation.org_workspace_id
      AND member_id = p_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'You are already a member of this workspace'
    );
  END IF;

  -- All checks passed - return valid invitation
  RETURN json_build_object(
    'valid', true,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'org_workspace_id', v_invitation.org_workspace_id,
      'invite_code', v_invitation.invite_code,
      'role', v_invitation.role,
      'workspace_name', v_invitation.workspace_name,
      'invited_by', v_invitation.invited_by,
      'invited_by_name', COALESCE(v_invitation.inviter_name, v_invitation.inviter_email),
      'expires_at', v_invitation.expires_at,
      'created_at', v_invitation.created_at
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_invite_code(text, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION validate_invite_code IS 
'Validates an invite code with security checks. Returns JSON with valid flag and invitation details or error message.';