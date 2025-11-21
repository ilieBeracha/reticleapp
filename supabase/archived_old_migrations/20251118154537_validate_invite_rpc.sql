-- =====================================================
-- RPC FUNCTION: Validate Invite Code
-- =====================================================
-- This function bypasses RLS to validate invite codes
-- Includes comprehensive security checks:
-- 1. Input validation (code format, authentication)
-- 2. Code existence check
-- 3. Self-invitation prevention
-- 4. Status validation
-- 5. Expiration check with auto-expiration
-- 6. Duplicate membership prevention

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
  v_is_member boolean;
BEGIN
  -- ============================================
  -- 1. INPUT VALIDATION
  -- ============================================
  
  -- Validate invite code format
  IF p_invite_code IS NULL OR length(trim(p_invite_code)) != 8 THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Invalid invite code format'
    );
  END IF;

  -- Validate user authentication
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'You must be logged in to validate an invitation'
    );
  END IF;

  -- ============================================
  -- 2. CODE EXISTENCE CHECK
  -- ============================================
  
  -- Get invitation details with related data
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

  -- ============================================
  -- 3. SELF-INVITATION PREVENTION
  -- ============================================
  
  -- Check if user is trying to use their own invitation
  IF v_invitation.invited_by = p_user_id THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'You cannot use your own invitation code'
    );
  END IF;

  -- ============================================
  -- 4. STATUS VALIDATION
  -- ============================================
  
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

  -- ============================================
  -- 5. EXPIRATION CHECK WITH AUTO-EXPIRATION
  -- ============================================
  
  -- Check if invitation has expired
  IF v_invitation.expires_at <= now() THEN
    -- Auto-expire the invitation
    UPDATE workspace_invitations
    SET 
      status = 'expired',
      updated_at = now()
    WHERE id = v_invitation.id;
    
    RETURN json_build_object(
      'valid', false,
      'error', 'This invitation has expired'
    );
  END IF;

  -- ============================================
  -- 6. DUPLICATE MEMBERSHIP PREVENTION
  -- ============================================
  
  -- Check if user is already a member of this workspace
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

  -- ============================================
  -- ALL CHECKS PASSED - RETURN VALID INVITATION
  -- ============================================
  
  RETURN json_build_object(
    'valid', true,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'org_workspace_id', v_invitation.org_workspace_id,
      'invite_code', v_invitation.invite_code,
      'role', v_invitation.role,
      'status', v_invitation.status,
      'workspace_name', v_invitation.workspace_name,
      'invited_by', v_invitation.invited_by,
      'invited_by_name', COALESCE(v_invitation.inviter_name, v_invitation.inviter_email),
      'expires_at', v_invitation.expires_at,
      'created_at', v_invitation.created_at,
      'updated_at', v_invitation.updated_at
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_invite_code(text, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION validate_invite_code IS 
'Securely validates an invite code with comprehensive security checks. 
Returns JSON with valid flag and invitation details or error message.
Bypasses RLS for consistent validation across all users.';