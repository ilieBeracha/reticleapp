-- Migration: Add Multi-Use Invites
-- Date: 2025-11-10
-- Purpose: Allow invitation links to be used multiple times (for member invites only)

-- ============================================================================
-- Step 1: Add max_uses and current_uses columns to invitations table
-- ============================================================================

ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_uses integer DEFAULT 0;

COMMENT ON COLUMN invitations.max_uses IS 
'Maximum number of times this invite can be used. NULL = unlimited. Only for member invites.';

COMMENT ON COLUMN invitations.current_uses IS 
'Current number of times this invite has been used.';

-- ============================================================================
-- Step 2: Update accept_org_invite to handle multi-use invites
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation record;
  v_user_id uuid;
  v_user_email text;
  v_org record;
BEGIN
  -- Get authenticated user ID from JWT
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- Get user email from auth.users
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = v_user_id;
  
  -- Find invitation by code
  SELECT * INTO v_invitation
  FROM invitations
  WHERE code = UPPER(p_token)
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;
  
  -- Check if max uses reached
  IF v_invitation.max_uses IS NOT NULL 
     AND v_invitation.current_uses >= v_invitation.max_uses THEN
    RAISE EXCEPTION 'This invitation has reached its maximum uses';
  END IF;
  
  -- Check if already a member of this org
  IF EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = v_user_id 
      AND org_id = v_invitation.organization_id
  ) THEN
    RAISE EXCEPTION 'Already a member of this organization';
  END IF;
  
  -- Create org membership
  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (v_user_id, v_invitation.organization_id, v_invitation.role);
  
  -- Increment current_uses
  UPDATE invitations
  SET 
    current_uses = current_uses + 1,
    accepted_at = now(),
    updated_at = now(),
    -- If max uses reached, mark as accepted (consumed)
    status = CASE 
      WHEN max_uses IS NOT NULL AND current_uses + 1 >= max_uses THEN 'accepted'
      ELSE status
    END
  WHERE id = v_invitation.id;
  
  -- Get organization details
  SELECT * INTO v_org 
  FROM organizations 
  WHERE id = v_invitation.organization_id;
  
  -- Return success with org details
  RETURN jsonb_build_object(
    'success', true,
    'invitation', row_to_json(v_invitation),
    'org_id', v_org.id,
    'org_name', v_org.name,
    'role', v_invitation.role
  );
END;
$$;

COMMENT ON FUNCTION public.accept_org_invite IS 
'Accept an organization invitation. Supports multi-use invites - increments use count and marks as accepted when max uses reached.';

-- ============================================================================
-- Step 3: Add constraint - Commander invites can only be single use
-- ============================================================================

ALTER TABLE invitations
ADD CONSTRAINT commander_invites_single_use 
CHECK (
  role != 'commander' OR max_uses = 1
);

COMMENT ON CONSTRAINT commander_invites_single_use ON invitations IS 
'Commander invitations must be single-use (max_uses = 1). Only member/viewer invites can be multi-use.';

-- ============================================================================
-- Summary
-- ============================================================================

-- Changes made:
-- ✅ Added max_uses column (default 1, NULL = unlimited)
-- ✅ Added current_uses column (tracks usage)
-- ✅ Updated accept_org_invite to increment uses
-- ✅ Auto-marks invite as accepted when max uses reached
-- ✅ Constraint: Commander invites must be single-use
-- ✅ Multi-use only for member/viewer invites

-- Examples:
-- Single-use (commander): max_uses = 1
-- Multi-use (5 people): max_uses = 5
-- Unlimited (open link): max_uses = NULL

