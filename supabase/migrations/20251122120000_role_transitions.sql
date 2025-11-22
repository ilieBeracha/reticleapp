-- Role transition system to handle team commander promotions
-- Ensures data integrity when promoting team members to management roles

-- Function to execute role transitions safely
CREATE OR REPLACE FUNCTION execute_role_transition(
  p_profile_id uuid,
  p_target_org_role text,
  p_new_commander_id uuid DEFAULT NULL,
  p_requires_commander_replacement boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current_profile profiles%ROWTYPE;
  v_team_id uuid;
BEGIN
  -- Get current profile
  SELECT * INTO v_current_profile
  FROM profiles 
  WHERE id = p_profile_id AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or inactive';
  END IF;
  
  -- Verify caller has permission (must be owner/admin of the org)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE org_id = v_current_profile.org_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied - insufficient permissions';
  END IF;
  
  v_team_id := v_current_profile.team_id;
  
  -- If commander replacement is required, assign new commander first
  IF p_requires_commander_replacement AND p_new_commander_id IS NOT NULL THEN
    -- Verify new commander is valid
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_new_commander_id
      AND team_id = v_team_id
      AND role = 'member'
      AND team_role IN ('squad_commander', 'soldier')
      AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Invalid commander replacement candidate';
    END IF;
    
    -- Promote new commander
    UPDATE profiles
    SET team_role = 'commander'
    WHERE id = p_new_commander_id;
  END IF;
  
  -- Remove current profile from team if promoting to non-member role
  IF p_target_org_role != 'member' AND v_team_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      team_id = NULL,
      team_role = NULL,
      squad_id = NULL
    WHERE id = p_profile_id;
  END IF;
  
  -- Update the org role
  UPDATE profiles
  SET role = p_target_org_role
  WHERE id = p_profile_id;
  
  -- Log the transition
  INSERT INTO audit_log (
    table_name, 
    record_id, 
    action, 
    old_values, 
    new_values,
    user_id
  ) VALUES (
    'profiles',
    p_profile_id,
    'role_transition',
    jsonb_build_object(
      'old_role', v_current_profile.role,
      'old_team_id', v_current_profile.team_id,
      'old_team_role', v_current_profile.team_role
    ),
    jsonb_build_object(
      'new_role', p_target_org_role,
      'new_commander_id', p_new_commander_id
    ),
    auth.uid()
  );
END;
$$;

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_role_transition(uuid, text, uuid, boolean) TO authenticated;

-- Function to get team commander replacement candidates
CREATE OR REPLACE FUNCTION get_commander_replacement_candidates(p_team_id uuid)
RETURNS TABLE(
  profile_id uuid,
  display_name text,
  team_role text,
  org_role text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verify caller has access to this team's org
  IF NOT EXISTS (
    SELECT 1 FROM teams t
    JOIN profiles p ON p.org_id = t.org_id
    WHERE t.id = p_team_id
    AND p.user_id = auth.uid()
    AND p.role IN ('owner', 'admin', 'commander')
    AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.team_role,
    p.role
  FROM profiles p
  WHERE p.team_id = p_team_id
  AND p.role = 'member'
  AND p.team_role IN ('squad_commander', 'soldier')
  AND p.status = 'active'
  ORDER BY 
    CASE p.team_role 
      WHEN 'squad_commander' THEN 1 
      WHEN 'soldier' THEN 2 
    END,
    p.display_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_commander_replacement_candidates(uuid) TO authenticated;

COMMENT ON FUNCTION execute_role_transition(uuid, text, uuid, boolean) IS 'Safely transition user roles while handling team membership conflicts';
COMMENT ON FUNCTION get_commander_replacement_candidates(uuid) IS 'Get eligible candidates to replace a team commander';
