-- Drop and recreate with fixed column ambiguity
DROP FUNCTION IF EXISTS public.create_team(TEXT, TEXT, UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.create_team(
  p_workspace_type TEXT,
  p_name TEXT,
  p_workspace_owner_id UUID DEFAULT NULL,
  p_org_workspace_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
  team_id UUID,
  team_workspace_type TEXT,
  team_workspace_owner_id UUID,
  team_org_workspace_id UUID,
  team_name TEXT,
  team_description TEXT,
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
        AND role IN ('owner', 'admin', 'instructor')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to create team in org workspace';
    END IF;
  END IF;

  -- Insert team
  INSERT INTO teams (
    workspace_type,
    workspace_owner_id,
    org_workspace_id,
    name,
    description
  )
  VALUES (
    p_workspace_type,
    p_workspace_owner_id,
    p_org_workspace_id,
    p_name,
    p_description
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
    t.created_at AS team_created_at,
    t.updated_at AS team_updated_at
  FROM teams t
  WHERE t.id = v_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team TO authenticated;

COMMENT ON FUNCTION public.create_team IS 'Create a new team in a workspace with proper permission checks';

-- =====================================================
-- DROP OLD TEAM POLICIES (they only support personal workspaces)
-- =====================================================

DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

-- =====================================================
-- NEW TEAM POLICIES (support both personal AND org workspaces)
-- =====================================================

-- Users can see teams in workspaces they have access to
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (
    -- Personal workspace: I own it OR have access
    (workspace_type = 'personal' AND (
      workspace_owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM workspace_access wa
        WHERE wa.workspace_type = 'personal'
          AND wa.workspace_owner_id = teams.workspace_owner_id
          AND wa.member_id = auth.uid()
      )
    ))
    OR
    -- Org workspace: I have access
    (workspace_type = 'org' AND EXISTS (
      SELECT 1 FROM workspace_access wa
      WHERE wa.workspace_type = 'org'
        AND wa.org_workspace_id = teams.org_workspace_id
        AND wa.member_id = auth.uid()
    ))
  );

-- Admins/Instructors can create teams
CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT WITH CHECK (
    -- Personal workspace: I must be owner/admin/instructor
    (workspace_type = 'personal' AND EXISTS (
      SELECT 1 FROM workspace_access wa
      WHERE wa.workspace_type = 'personal'
        AND wa.workspace_owner_id = teams.workspace_owner_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin', 'instructor')
    ))
    OR
    -- Org workspace: I must be owner/admin/instructor
    (workspace_type = 'org' AND EXISTS (
      SELECT 1 FROM workspace_access wa
      WHERE wa.workspace_type = 'org'
        AND wa.org_workspace_id = teams.org_workspace_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin', 'instructor')
    ))
  );

-- Admins/Instructors can update teams
CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE USING (
    -- Personal workspace: I must be owner/admin/instructor
    (workspace_type = 'personal' AND EXISTS (
      SELECT 1 FROM workspace_access wa
      WHERE wa.workspace_type = 'personal'
        AND wa.workspace_owner_id = teams.workspace_owner_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin', 'instructor')
    ))
    OR
    -- Org workspace: I must be owner/admin/instructor
    (workspace_type = 'org' AND EXISTS (
      SELECT 1 FROM workspace_access wa
      WHERE wa.workspace_type = 'org'
        AND wa.org_workspace_id = teams.org_workspace_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin', 'instructor')
    ))
  );

-- Only admins can delete teams
CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE USING (
    -- Personal workspace: I must be owner/admin
    (workspace_type = 'personal' AND EXISTS (
      SELECT 1 FROM workspace_access wa
      WHERE wa.workspace_type = 'personal'
        AND wa.workspace_owner_id = teams.workspace_owner_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin')
    ))
    OR
    -- Org workspace: I must be owner/admin
    (workspace_type = 'org' AND EXISTS (
      SELECT 1 FROM workspace_access wa
      WHERE wa.workspace_type = 'org'
        AND wa.org_workspace_id = teams.org_workspace_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin')
    ))
  );

-- =====================================================
-- TEAM MEMBERS POLICIES (updated for both workspace types)
-- =====================================================

-- Users can see team members if they have workspace access
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND (
          -- Personal workspace access
          (t.workspace_type = 'personal' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'personal'
              AND wa.workspace_owner_id = t.workspace_owner_id
              AND wa.member_id = auth.uid()
          ))
          OR
          -- Org workspace access
          (t.workspace_type = 'org' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'org'
              AND wa.org_workspace_id = t.org_workspace_id
              AND wa.member_id = auth.uid()
          ))
        )
    )
  );

-- Team managers/commanders and workspace admins can add members
CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('manager', 'commander')
    ) OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND (
          -- Personal workspace: must be admin/instructor
          (t.workspace_type = 'personal' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'personal'
              AND wa.workspace_owner_id = t.workspace_owner_id
              AND wa.member_id = auth.uid()
              AND wa.role IN ('owner', 'admin', 'instructor')
          ))
          OR
          -- Org workspace: must be admin/instructor
          (t.workspace_type = 'org' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'org'
              AND wa.org_workspace_id = t.org_workspace_id
              AND wa.member_id = auth.uid()
              AND wa.role IN ('owner', 'admin', 'instructor')
          ))
        )
    )
  );

-- Update team member roles
CREATE POLICY "team_members_update" ON public.team_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('manager', 'commander')
    ) OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND (
          -- Personal workspace: must be admin/instructor
          (t.workspace_type = 'personal' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'personal'
              AND wa.workspace_owner_id = t.workspace_owner_id
              AND wa.member_id = auth.uid()
              AND wa.role IN ('owner', 'admin', 'instructor')
          ))
          OR
          -- Org workspace: must be admin/instructor
          (t.workspace_type = 'org' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'org'
              AND wa.org_workspace_id = t.org_workspace_id
              AND wa.member_id = auth.uid()
              AND wa.role IN ('owner', 'admin', 'instructor')
          ))
        )
    )
  );

-- Remove team members
CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('manager', 'commander')
    ) OR
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
        AND (
          -- Personal workspace: must be admin/instructor
          (t.workspace_type = 'personal' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'personal'
              AND wa.workspace_owner_id = t.workspace_owner_id
              AND wa.member_id = auth.uid()
              AND wa.role IN ('owner', 'admin', 'instructor')
          ))
          OR
          -- Org workspace: must be admin/instructor
          (t.workspace_type = 'org' AND EXISTS (
            SELECT 1 FROM workspace_access wa
            WHERE wa.workspace_type = 'org'
              AND wa.org_workspace_id = t.org_workspace_id
              AND wa.member_id = auth.uid()
              AND wa.role IN ('owner', 'admin', 'instructor')
          ))
        )
    )
  );