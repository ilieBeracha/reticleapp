-- Fix accept_org_invite to work with simplified team membership (no team_members table)

CREATE OR REPLACE FUNCTION accept_org_invite(p_invite_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv org_invitations%ROWTYPE; 
  v_user_id uuid; 
  v_profile_id uuid; 
  v_org orgs%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN 
    RETURN json_build_object('success', false, 'error', 'Not authenticated'); 
  END IF;
  
  -- Get the invitation
  SELECT * INTO v_inv 
  FROM org_invitations 
  WHERE invite_code = p_invite_code 
  AND status = 'pending' 
  AND expires_at > now();
  
  IF NOT FOUND THEN 
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation'); 
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id 
    AND org_id = v_inv.org_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member');
  END IF;
  
  SELECT * INTO v_org FROM orgs WHERE id = v_inv.org_id;
  
  -- Create profile with team assignment if specified (simplified structure)
  INSERT INTO profiles (
    user_id, 
    org_id, 
    role, 
    status,
    team_id,
    team_role,
    squad_id,
    display_name
  ) VALUES (
    v_user_id, 
    v_inv.org_id, 
    v_inv.role, 
    'active',
    v_inv.team_id,  -- Direct assignment to team
    v_inv.team_role,  -- Direct team role assignment
    NULL,  -- squad_id will be assigned later if needed
    COALESCE(
      (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id),
      (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = v_user_id),
      'New Member'
    )  -- Try to get display name from auth metadata
  )
  RETURNING id INTO v_profile_id;
  
  -- Mark invitation as accepted
  UPDATE org_invitations 
  SET 
    status = 'accepted', 
    accepted_by = v_profile_id, 
    accepted_at = now(), 
    updated_at = now() 
  WHERE id = v_inv.id;
  
  RETURN json_build_object(
    'success', true, 
    'profile_id', v_profile_id, 
    'org_id', v_inv.org_id, 
    'org_name', v_org.name, 
    'role', v_inv.role,
    'message', 'Successfully joined ' || v_org.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_org_invite(text) TO authenticated;

COMMENT ON FUNCTION accept_org_invite(text) IS 'Accept organization invitation - fixed for simplified team membership structure';

