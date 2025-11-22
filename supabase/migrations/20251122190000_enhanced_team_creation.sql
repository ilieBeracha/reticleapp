-- Enhanced team creation with member assignment

-- Function to get available team members (not already in teams)
CREATE OR REPLACE FUNCTION get_available_team_members(p_org_id uuid)
RETURNS TABLE(
  profile_id uuid,
  display_name text,
  org_role text,
  experience_score integer,
  is_eligible_commander boolean,
  avatar_url text,
  session_count bigint,
  join_date timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles perm
    WHERE perm.user_id = auth.uid()
    AND perm.org_id = p_org_id
    AND perm.role IN ('owner', 'admin', 'instructor')
    AND perm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied - insufficient permissions';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    COALESCE(p.display_name, 'Member') as display_name,
    p.role as org_role,
    -- Calculate experience score based on sessions and tenure
    (
      COALESCE(
        (SELECT COUNT(*) FROM sessions s WHERE s.profile_id = p.id), 0
      ) * 10 + 
      EXTRACT(days FROM (now() - p.created_at))::integer
    )::integer as experience_score,
    -- Only members with some experience can be commanders
    (
      p.role = 'member' 
      AND COALESCE(
        (SELECT COUNT(*) FROM sessions s WHERE s.profile_id = p.id), 0
      ) >= 3
      AND EXTRACT(days FROM (now() - p.created_at)) >= 7
    )::boolean as is_eligible_commander,
    p.avatar_url,
    COALESCE(
      (SELECT COUNT(*) FROM sessions s WHERE s.profile_id = p.id), 0
    ) as session_count,
    p.created_at as join_date
  FROM profiles p
  WHERE p.org_id = p_org_id
  AND p.status = 'active'
  AND p.role = 'member'  -- Only members can be in teams
  AND p.team_id IS NULL  -- Not already in a team
  ORDER BY 
    (
      COALESCE(
        (SELECT COUNT(*) FROM sessions s WHERE s.profile_id = p.id), 0
      ) * 10 + 
      EXTRACT(days FROM (now() - p.created_at))::integer
    ) DESC,
    p.display_name;
END;
$$;

-- Function to create team with members atomically
CREATE OR REPLACE FUNCTION create_team_with_members(
  p_org_id uuid,
  p_name text,
  p_team_type text DEFAULT 'field',
  p_description text DEFAULT NULL,
  p_squads text[] DEFAULT '{}',
  p_members text DEFAULT '[]' -- JSON array of member assignments
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_member record;
  v_members jsonb;
  v_commander_count integer := 0;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles perm
    WHERE perm.user_id = auth.uid()
    AND perm.org_id = p_org_id
    AND perm.role IN ('owner', 'admin', 'instructor')
    AND perm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied - insufficient permissions to create teams';
  END IF;
  
  -- Parse members JSON
  BEGIN
    v_members := p_members::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Invalid member data format');
  END;
  
  -- Validate members before creating team
  FOR v_member IN 
    SELECT * FROM jsonb_array_elements(v_members)
  LOOP
    -- Check if member exists and is available
    IF NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (v_member.value->>'profile_id')::uuid
      AND p.org_id = p_org_id
      AND p.role = 'member'
      AND p.team_id IS NULL
      AND p.status = 'active'
    ) THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Member ' || (v_member.value->>'display_name') || ' is not available for team assignment'
      );
    END IF;
    
    -- Count commanders
    IF (v_member.value->>'role') = 'commander' THEN
      v_commander_count := v_commander_count + 1;
    END IF;
  END LOOP;
  
  -- Validate exactly one commander
  IF v_commander_count != 1 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Team must have exactly one commander'
    );
  END IF;
  
  -- Create the team
  INSERT INTO teams (
    org_id,
    name,
    team_type,
    description,
    squads
  ) VALUES (
    p_org_id,
    p_name,
    p_team_type,
    p_description,
    p_squads
  )
  RETURNING id INTO v_team_id;
  
  -- Assign members to team
  FOR v_member IN 
    SELECT * FROM jsonb_array_elements(v_members)
  LOOP
    UPDATE profiles
    SET 
      team_id = v_team_id,
      team_role = v_member.value->>'role',
      squad_id = v_member.value->>'squad_id',
      updated_at = now()
    WHERE id = (v_member.value->>'profile_id')::uuid;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'team_id', v_team_id,
    'members_assigned', jsonb_array_length(v_members),
    'message', 'Team "' || p_name || '" created successfully with ' || jsonb_array_length(v_members) || ' members'
  );
END;
$$;

-- Function to update team member assignments
CREATE OR REPLACE FUNCTION update_team_member_role(
  p_profile_id uuid,
  p_team_id uuid,
  p_new_role text,
  p_squad_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_current_commander_count integer;
  v_new_commander_count integer;
BEGIN
  -- Get team's org_id for permission check
  SELECT org_id INTO v_org_id FROM teams WHERE id = p_team_id;
  
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles perm
    WHERE perm.user_id = auth.uid()
    AND perm.org_id = v_org_id
    AND perm.role IN ('owner', 'admin', 'instructor')
    AND perm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied - insufficient permissions';
  END IF;
  
  -- Check current commander count
  SELECT COUNT(*) INTO v_current_commander_count
  FROM profiles
  WHERE team_id = p_team_id AND team_role = 'commander';
  
  -- Calculate new commander count after change
  SELECT COUNT(*) INTO v_new_commander_count
  FROM profiles
  WHERE team_id = p_team_id 
  AND team_role = 'commander'
  AND id != p_profile_id;  -- Exclude the profile being changed
  
  IF p_new_role = 'commander' THEN
    v_new_commander_count := v_new_commander_count + 1;
  END IF;
  
  -- Validate exactly one commander
  IF v_new_commander_count != 1 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Team must have exactly one commander'
    );
  END IF;
  
  -- Update the member
  UPDATE profiles
  SET 
    team_role = p_new_role,
    squad_id = p_squad_id,
    updated_at = now()
  WHERE id = p_profile_id AND team_id = p_team_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Member not found in team'
    );
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_team_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_team_with_members(uuid, text, text, text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_team_member_role(uuid, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION get_available_team_members(uuid) IS 'Get members available for team assignment with experience scores';
COMMENT ON FUNCTION create_team_with_members(uuid, text, text, text, text[], text) IS 'Create team and assign members atomically';
COMMENT ON FUNCTION update_team_member_role(uuid, uuid, text, text) IS 'Update team member role with validation';
