-- Add details column to workspace_invitations for storing squad assignments etc.
ALTER TABLE public.workspace_invitations 
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;

-- Update validate_invite_code to return details
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_invite_code text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_is_member boolean;
  v_team_name text;
BEGIN
  -- 1. INPUT VALIDATION
  IF p_invite_code IS NULL OR length(trim(p_invite_code)) != 8 THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid invite code format');
  END IF;

  IF p_user_id IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'You must be logged in to validate an invitation');
  END IF;

  -- 2. CODE EXISTENCE CHECK
  SELECT 
    inv.*,
    org.name as workspace_name,
    t.name as team_name,
    prof.full_name as inviter_name,
    prof.email as inviter_email
  INTO v_invitation
  FROM workspace_invitations inv
  LEFT JOIN org_workspaces org ON org.id = inv.org_workspace_id
  LEFT JOIN teams t ON t.id = inv.team_id
  LEFT JOIN profiles prof ON prof.id = inv.invited_by
  WHERE inv.invite_code = upper(trim(p_invite_code));

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid invitation code');
  END IF;

  -- 3. SELF-INVITATION PREVENTION
  IF v_invitation.invited_by = p_user_id THEN
    RETURN json_build_object('valid', false, 'error', 'You cannot use your own invitation code');
  END IF;

  -- 4. STATUS VALIDATION
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

  -- 5. EXPIRATION CHECK
  IF v_invitation.expires_at <= now() THEN
    UPDATE workspace_invitations SET status = 'expired', updated_at = now() WHERE id = v_invitation.id;
    RETURN json_build_object('valid', false, 'error', 'This invitation has expired');
  END IF;

  -- 6. DUPLICATE MEMBERSHIP PREVENTION
  -- Check if user is already a member of this workspace
  SELECT EXISTS (
    SELECT 1 FROM workspace_access
    WHERE org_workspace_id = v_invitation.org_workspace_id AND member_id = p_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    -- We might want to allow invites for existing members to join teams, 
    -- but for now we stick to the original logic of blocking it.
    -- If we wanted to support it, we'd check if they are in the TEAM, not just workspace.
    RETURN json_build_object('valid', false, 'error', 'You are already a member of this workspace');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'org_workspace_id', v_invitation.org_workspace_id,
      'team_id', v_invitation.team_id,
      'team_role', v_invitation.team_role,
      'team_name', v_invitation.team_name,
      'details', v_invitation.details,
      'invite_code', v_invitation.invite_code,
      'role', v_invitation.role,
      'status', v_invitation.status,
      'workspace_name', v_invitation.workspace_name,
      'invited_by', v_invitation.invited_by,
      'invited_by_name', COALESCE(v_invitation.inviter_name, v_invitation.inviter_email),
      'expires_at', v_invitation.expires_at,
      'created_at', v_invitation.created_at
    )
  );
END;
$$;

-- Update accept_invite_code to copy details to team_members
CREATE OR REPLACE FUNCTION accept_invite_code(
  p_invite_code text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation json;
  v_invitation json;
  v_org_workspace_id uuid;
  v_role text;
  v_invitation_id uuid;
  v_team_id uuid;
  v_team_role text;
  v_details jsonb;
BEGIN
  -- 1. VALIDATE
  v_validation := validate_invite_code(p_invite_code, p_user_id);
  
  IF NOT (v_validation->>'valid')::boolean THEN
    RETURN json_build_object('success', false, 'error', v_validation->>'error');
  END IF;
  
  v_invitation := v_validation->'invitation';
  v_org_workspace_id := (v_invitation->>'org_workspace_id')::uuid;
  v_role := v_invitation->>'role';
  v_invitation_id := (v_invitation->>'id')::uuid;
  
  -- Extract team info (handle nulls safely)
  IF (v_invitation->>'team_id') IS NOT NULL THEN
    v_team_id := (v_invitation->>'team_id')::uuid;
    v_team_role := v_invitation->>'team_role';
    -- Extract details safely
    IF (v_invitation->>'details') IS NOT NULL THEN
        v_details := (v_invitation->'details');
    ELSE 
        v_details := '{}'::jsonb;
    END IF;
  END IF;

  -- 2. ADD TO WORKSPACE
  INSERT INTO workspace_access (workspace_type, org_workspace_id, member_id, role)
  VALUES ('org', v_org_workspace_id, p_user_id, v_role)
  ON CONFLICT (org_workspace_id, member_id) DO NOTHING;
  
  -- 3. ADD TO TEAM (if applicable)
  IF v_team_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, user_id, role, details)
    VALUES (v_team_id, p_user_id, v_team_role, COALESCE(v_details, '{}'::jsonb))
    ON CONFLICT (team_id, user_id) DO UPDATE 
    SET role = v_team_role,
        details = COALESCE(v_details, team_members.details); -- Update details if provided
  END IF;
  
  -- 4. UPDATE INVITATION
  UPDATE workspace_invitations
  SET status = 'accepted', accepted_by = p_user_id, accepted_at = now(), updated_at = now()
  WHERE id = v_invitation_id AND status = 'pending';
  
  RETURN json_build_object(
    'success', true,
    'workspace_id', v_org_workspace_id,
    'workspace_name', v_invitation->>'workspace_name',
    'role', v_role,
    'team_id', v_team_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error accepting invitation: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', 'Failed to accept invitation.');
END;
$$;

