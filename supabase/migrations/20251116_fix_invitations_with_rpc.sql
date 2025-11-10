-- Migration: Fix Invitations Using RPC (No RLS Issues)
-- Date: 2025-11-16
-- Problem: RLS policies on invitations checking org_memberships causing issues
-- Solution: Use RPC function to create invitations (bypasses RLS)

-- ============================================================================
-- Step 1: Drop all invitation INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "commanders_create_invitations" ON invitations;
DROP POLICY IF EXISTS "commanders_create_invitations_in_scope" ON invitations;
DROP POLICY IF EXISTS "invitations_insert_commanders_scope" ON invitations;

-- ============================================================================
-- Step 2: Create RPC function to create invitations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invitation_rpc(
  p_code text,
  p_org_id uuid,
  p_role text,
  p_invited_by uuid,
  p_max_uses integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_root_id uuid;
  v_is_commander boolean;
  v_invitation_id uuid;
BEGIN
  -- Validate inputs
  IF p_code IS NULL OR LENGTH(TRIM(p_code)) = 0 THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;
  
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID is required';
  END IF;
  
  IF p_role NOT IN ('commander', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role. Must be commander, member, or viewer.';
  END IF;
  
  -- Commander invites must be single-use
  IF p_role = 'commander' AND p_max_uses != 1 THEN
    RAISE EXCEPTION 'Commander invitations must be single-use (max_uses = 1)';
  END IF;
  
  -- Get target org's root_id
  SELECT root_id INTO v_org_root_id
  FROM organizations
  WHERE id = p_org_id;
  
  IF v_org_root_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Check user is commander in same tree
  SELECT EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = p_invited_by
      AND om.role = 'commander'
      AND o.root_id = v_org_root_id
  ) INTO v_is_commander;
  
  IF NOT v_is_commander THEN
    RAISE EXCEPTION 'Only commanders in the organization tree can create invitations';
  END IF;
  
  -- Create invitation
  INSERT INTO invitations (
    code,
    organization_id,
    role,
    invited_by,
    status,
    max_uses,
    current_uses
  )
  VALUES (
    UPPER(p_code),
    p_org_id,
    p_role,
    p_invited_by,
    'pending',
    p_max_uses,
    0
  )
  RETURNING id INTO v_invitation_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'code', UPPER(p_code),
    'org_id', p_org_id,
    'role', p_role,
    'max_uses', p_max_uses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invitation_rpc TO authenticated;

COMMENT ON FUNCTION public.create_invitation_rpc IS 
'Create an invitation to join an organization. Bypasses RLS. Validates commander permissions and enforces rules.';

-- ============================================================================
-- Summary
-- ============================================================================

-- ✅ Removed INSERT RLS policy (was causing issues)
-- ✅ Created RPC function to handle invitation creation
-- ✅ Function checks permissions explicitly (no RLS recursion)
-- ✅ Validates commander in same tree
-- ✅ Enforces single-use for commanders
-- ✅ Use this RPC instead of direct INSERT
