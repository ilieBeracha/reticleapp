-- =====================================================
-- RPC FUNCTION: Accept Invite Code
-- =====================================================
-- This function accepts an invite code and adds user to workspace
-- Performs atomic operations:
-- 1. Validates invite code (calls validate_invite_code)
-- 2. Adds user to workspace_access
-- 3. Updates invitation status to accepted
-- All in a single transaction

CREATE OR REPLACE FUNCTION accept_invite_code(
  p_invite_code text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_validation json;
  v_invitation json;
  v_org_workspace_id uuid;
  v_role text;
  v_invitation_id uuid;
BEGIN
  -- ============================================
  -- 1. VALIDATE THE INVITATION
  -- ============================================
  
  -- Call validate_invite_code to perform all security checks
  v_validation := validate_invite_code(p_invite_code, p_user_id);
  
  -- Check if validation passed
  IF NOT (v_validation->>'valid')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', v_validation->>'error'
    );
  END IF;
  
  -- Extract invitation details from validation result
  v_invitation := v_validation->'invitation';
  v_org_workspace_id := (v_invitation->>'org_workspace_id')::uuid;
  v_role := v_invitation->>'role';
  v_invitation_id := (v_invitation->>'id')::uuid;

  -- ============================================
  -- 2. ADD USER TO WORKSPACE (ATOMIC)
  -- ============================================
  
  -- Insert workspace access
  INSERT INTO workspace_access (
    workspace_type,
    org_workspace_id,
    member_id,
    role
  ) VALUES (
    'org',
    v_org_workspace_id,
    p_user_id,
    v_role
  );
  
  -- ============================================
  -- 3. UPDATE INVITATION STATUS (ATOMIC)
  -- ============================================
  
  -- Mark invitation as accepted
  UPDATE workspace_invitations
  SET 
    status = 'accepted',
    accepted_by = p_user_id,
    accepted_at = now(),
    updated_at = now()
  WHERE id = v_invitation_id
    AND status = 'pending'; -- Extra safety check
  
  -- ============================================
  -- RETURN SUCCESS
  -- ============================================
  
  RETURN json_build_object(
    'success', true,
    'workspace_id', v_org_workspace_id,
    'workspace_name', v_invitation->>'workspace_name',
    'role', v_role
  );

-- ============================================
-- EXCEPTION HANDLING
-- ============================================

EXCEPTION
  -- Handle duplicate membership (shouldn't happen due to validation, but safety check)
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already a member of this workspace'
    );
  
  -- Handle foreign key violations
  WHEN foreign_key_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid workspace or user reference'
    );
  
  -- Handle any other errors
  WHEN OTHERS THEN
    -- Log error for debugging (will show in Supabase logs)
    RAISE WARNING 'Error accepting invitation: %', SQLERRM;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to accept invitation. Please try again.'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_invite_code(text, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION accept_invite_code IS 
'Securely accepts an invite code and adds user to workspace.
Performs atomic validation and insertion in a single transaction.
Returns JSON with success flag and workspace details or error message.';