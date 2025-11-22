-- Simplify team membership by adding team info directly to profiles
-- Since each person is only in ONE team at a time, we don't need a junction table

-- Add team columns to profiles
ALTER TABLE profiles 
ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN team_role text,
ADD COLUMN squad_id text;

-- Add constraints
ALTER TABLE profiles
ADD CONSTRAINT profiles_team_role_check 
CHECK (
  (team_id IS NULL AND team_role IS NULL) OR  -- Not in a team
  (team_id IS NOT NULL AND team_role IN ('commander', 'squad_commander', 'soldier'))  -- In a team with role
);

-- Squad requirement constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_squad_requirement 
CHECK (
  (team_role = 'commander') OR  -- Commanders don't need squad
  (team_role IN ('soldier', 'squad_commander') AND squad_id IS NOT NULL) OR  -- Need squad
  (team_role IS NULL)  -- Not in team
);

-- Only one commander per team
CREATE UNIQUE INDEX profiles_one_commander_per_team 
ON profiles(team_id) 
WHERE team_role = 'commander';

-- Only members can be in teams (not owner/admin/instructor)
ALTER TABLE profiles
ADD CONSTRAINT profiles_team_membership_role_check
CHECK (
  (team_id IS NULL) OR  -- Not in team, any role OK
  (team_id IS NOT NULL AND role = 'member')  -- In team, must be member
);

COMMENT ON COLUMN profiles.team_id IS 'The team this profile belongs to (only one team per profile)';
COMMENT ON COLUMN profiles.team_role IS 'Role within the team: commander, squad_commander, or soldier';
COMMENT ON COLUMN profiles.squad_id IS 'Squad assignment within the team';

-- Migrate data from team_members to profiles (if any exists)
-- WARNING: This will LOSE data if a profile is in multiple teams!
-- Only migrates the FIRST team membership found for each profile
UPDATE profiles p
SET 
  team_id = tm.team_id,
  team_role = tm.role,
  squad_id = tm.details->>'squad_id'
FROM team_members tm
WHERE p.id = tm.profile_id
AND p.team_id IS NULL  -- Only update if not already set
AND tm.team_id = (
  SELECT team_id 
  FROM team_members 
  WHERE profile_id = p.id 
  LIMIT 1
);

-- Drop old team_members table
DROP TABLE IF EXISTS team_members CASCADE;

-- Drop and recreate get_org_members function with new signature
DROP FUNCTION IF EXISTS get_org_members(uuid);

-- Update get_org_members function to include team info
CREATE OR REPLACE FUNCTION get_org_members(p_org_id uuid)
RETURNS TABLE(
  profile_id uuid, 
  user_id uuid, 
  display_name text, 
  avatar_url text, 
  role text, 
  status text, 
  joined_at timestamptz,
  team_id uuid,
  team_role text,
  squad_id text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id, 
    p.user_id, 
    p.display_name, 
    p.avatar_url, 
    p.role, 
    p.status, 
    p.created_at,
    p.team_id,
    p.team_role,
    p.squad_id
  FROM profiles p 
  WHERE p.org_id = p_org_id AND p.status = 'active'
  ORDER BY CASE p.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'instructor' THEN 3 ELSE 4 END, p.display_name;
END;
$$;

-- Drop and recreate get_org_teams function
DROP FUNCTION IF EXISTS get_org_teams(uuid);

-- Update get_org_teams function to include team members directly from profiles
CREATE OR REPLACE FUNCTION get_org_teams(p_org_id uuid)
RETURNS TABLE(
  team_id uuid,
  team_name text,
  team_type text,
  description text,
  squads text[],
  member_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.team_type,
    t.description,
    t.squads,
    COUNT(p.id) as member_count
  FROM teams t
  LEFT JOIN profiles p ON p.team_id = t.id AND p.status = 'active'
  WHERE t.org_id = p_org_id
  GROUP BY t.id, t.name, t.team_type, t.description, t.squads
  ORDER BY t.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_teams(uuid) TO authenticated;

