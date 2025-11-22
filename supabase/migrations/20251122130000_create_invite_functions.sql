-- Create invitation management functions

-- Function to generate a unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code_chars text := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; -- No O, 0 for clarity
  code text := '';
  i integer;
BEGIN
  -- Generate 8-character code
  FOR i IN 1..8 LOOP
    code := code || substr(code_chars, floor(random() * length(code_chars)) + 1, 1);
  END LOOP;
  
  RETURN code;
END;
$$;

-- Function to create an organization invitation
CREATE OR REPLACE FUNCTION create_org_invite(
  p_org_id uuid,
  p_role text DEFAULT 'member',
  p_team_id uuid DEFAULT NULL,
  p_team_role text DEFAULT NULL,
  p_expires_hours integer DEFAULT 168 -- 7 days
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite_code text;
  v_inviter_profile_id uuid;
  v_invitation org_invitations%ROWTYPE;
  max_attempts integer := 10;
  attempt integer := 0;
BEGIN
  -- Get the inviter's profile ID for this org
  SELECT id INTO v_inviter_profile_id
  FROM profiles
  WHERE user_id = auth.uid()
  AND org_id = p_org_id
  AND status = 'active'
  AND role IN ('owner', 'admin', 'instructor');
  
  IF v_inviter_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied - insufficient permissions'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('member', 'instructor', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role specified'
    );
  END IF;
  
  -- If team assignment is specified, validate it
  IF p_team_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM teams 
      WHERE id = p_team_id AND org_id = p_org_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Team not found'
      );
    END IF;
    
    IF p_team_role NOT IN ('commander', 'squad_commander', 'soldier') THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Invalid team role specified'
      );
    END IF;
    
    -- Only members can be assigned to teams
    IF p_role != 'member' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Only members can be assigned to teams'
      );
    END IF;
  END IF;
  
  -- Generate unique invite code
  WHILE attempt < max_attempts LOOP
    v_invite_code := generate_invite_code();
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM org_invitations WHERE invite_code = v_invite_code) THEN
      EXIT;
    END IF;
    
    attempt := attempt + 1;
  END LOOP;
  
  IF attempt >= max_attempts THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to generate unique invite code'
    );
  END IF;
  
  -- Create the invitation
  INSERT INTO org_invitations (
    org_id,
    invite_code,
    role,
    invited_by,
    expires_at,
    team_id,
    team_role
  ) VALUES (
    p_org_id,
    v_invite_code,
    p_role,
    v_inviter_profile_id,
    now() + (p_expires_hours || ' hours')::interval,
    p_team_id,
    p_team_role
  )
  RETURNING * INTO v_invitation;
  
  -- Return success with invitation details
  RETURN json_build_object(
    'success', true,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'invite_code', v_invitation.invite_code,
      'role', v_invitation.role,
      'expires_at', v_invitation.expires_at,
      'team_id', v_invitation.team_id,
      'team_role', v_invitation.team_role
    )
  );
END;
$$;

-- Function to get pending invitations for an org
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
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.org_id = p_org_id 
    AND p.role IN ('owner', 'admin', 'instructor')
    AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.invite_code,
    i.role::text,  -- explicitly cast invitation role
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

-- Function to cancel an invitation
CREATE OR REPLACE FUNCTION cancel_org_invite(p_invite_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invitation org_invitations%ROWTYPE;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM org_invitations
  WHERE id = p_invite_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation not found'
    );
  END IF;
  
  -- Check if user has permission to cancel
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND org_id = v_invitation.org_id 
    AND role IN ('owner', 'admin', 'instructor')
    AND status = 'active'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied'
    );
  END IF;
  
  -- Update invitation status
  UPDATE org_invitations
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_invite_id;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_org_invite(uuid, text, uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_invitations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_org_invite(uuid) TO authenticated;

COMMENT ON FUNCTION create_org_invite(uuid, text, uuid, text, integer) IS 'Create an organization invitation with role and optional team assignment';
COMMENT ON FUNCTION get_org_invitations(uuid) IS 'Get all pending invitations for an organization';
COMMENT ON FUNCTION cancel_org_invite(uuid) IS 'Cancel a pending invitation';
