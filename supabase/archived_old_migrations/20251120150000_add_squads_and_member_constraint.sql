-- Add squads to teams as optional JSONB array
-- Squads are simple: just names that users can be assigned to
-- Example: squads: ["Alpha", "Bravo", "Charlie"]

ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS squads TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.teams.squads IS 'Optional array of squad names within this team. Users can create squads on-demand.';

-- Add constraint: Only 'member' role users can be added to teams
-- This prevents admins/owners/instructors from being assigned to teams

CREATE OR REPLACE FUNCTION check_team_member_is_workspace_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_workspace_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the org workspace id for this team
  SELECT org_workspace_id
  INTO v_org_workspace_id
  FROM teams
  WHERE id = NEW.team_id;

  -- Only check for org workspaces (personal workspaces won't have org_workspace_id)
  IF v_org_workspace_id IS NOT NULL THEN
    -- Check if user is a member of the organization and get their role
    SELECT role INTO v_user_role
    FROM workspace_access
    WHERE org_workspace_id = v_org_workspace_id
      AND member_id = NEW.user_id;

    -- User must exist in the org
    IF v_user_role IS NULL THEN
      RAISE EXCEPTION 'User must be a member of the organization before being added to a team';
    END IF;

    -- User must have 'member' role (not admin/owner/instructor)
    IF v_user_role != 'member' THEN
      RAISE EXCEPTION 'Only users with "member" role can be assigned to teams. Admins, owners, and instructors cannot be team members.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce this on INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_team_member_workspace_role ON team_members;

CREATE TRIGGER enforce_team_member_workspace_role
  BEFORE INSERT OR UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION check_team_member_is_workspace_member();

COMMENT ON FUNCTION check_team_member_is_workspace_member() IS 'Ensures only workspace members with "member" role can be added to teams';

-- Update the create_team RPC to accept squads parameter
DROP FUNCTION IF EXISTS public.create_team(TEXT, TEXT, UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.create_team(
  p_workspace_type TEXT,
  p_name TEXT,
  p_workspace_owner_id UUID DEFAULT NULL,
  p_org_workspace_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_squads TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(
  team_id UUID,
  team_workspace_type TEXT,
  team_workspace_owner_id UUID,
  team_org_workspace_id UUID,
  team_name TEXT,
  team_description TEXT,
  team_squads TEXT[],
  team_created_at TIMESTAMPTZ,
  team_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Validate workspace type
  IF p_workspace_type NOT IN ('personal', 'org') THEN
    RAISE EXCEPTION 'Invalid workspace type. Must be personal or org';
  END IF;

  -- Validate workspace references
  IF p_workspace_type = 'personal' AND p_workspace_owner_id IS NULL THEN
    RAISE EXCEPTION 'workspace_owner_id required for personal workspace';
  END IF;
  
  IF p_workspace_type = 'org' AND p_org_workspace_id IS NULL THEN
    RAISE EXCEPTION 'org_workspace_id required for org workspace';
  END IF;

  -- Check permissions using workspace_access table
  IF p_workspace_type = 'personal' THEN
    IF NOT EXISTS (
      SELECT 1 FROM workspace_access 
      WHERE workspace_type = 'personal'
        AND workspace_access.workspace_owner_id = p_workspace_owner_id 
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin', 'instructor')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to create team in personal workspace';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM workspace_access 
      WHERE workspace_type = 'org'
        AND workspace_access.org_workspace_id = p_org_workspace_id 
        AND member_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to create team in org workspace';
    END IF;
  END IF;

  -- Insert team with squads
  INSERT INTO teams (
    workspace_type,
    workspace_owner_id,
    org_workspace_id,
    name,
    description,
    squads
  )
  VALUES (
    p_workspace_type,
    p_workspace_owner_id,
    p_org_workspace_id,
    p_name,
    p_description,
    p_squads
  )
  RETURNING id INTO v_team_id;

  -- Return the created team with aliased column names
  RETURN QUERY
  SELECT 
    t.id AS team_id,
    t.workspace_type AS team_workspace_type,
    t.workspace_owner_id AS team_workspace_owner_id,
    t.org_workspace_id AS team_org_workspace_id,
    t.name AS team_name,
    t.description AS team_description,
    t.squads AS team_squads,
    t.created_at AS team_created_at,
    t.updated_at AS team_updated_at
  FROM teams t
  WHERE t.id = v_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team TO authenticated;

COMMENT ON FUNCTION public.create_team IS 'Create a new team in a workspace with optional squads';

