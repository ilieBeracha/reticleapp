-- Migration: Optimized org members query with team context
-- This replaces the previous get_org_workspace_members function to include team memberships
-- in a single optimized query, eliminating N+1 problems.

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS get_org_workspace_members(uuid);

-- Create the enhanced function with team aggregation
CREATE OR REPLACE FUNCTION get_org_workspace_members(p_org_workspace_id uuid)
RETURNS TABLE (
  -- Workspace access fields
  id uuid,
  workspace_type text,
  workspace_owner_id uuid,
  org_workspace_id uuid,
  member_id uuid,
  role text,
  joined_at timestamptz,
  
  -- Profile fields (flattened for easier access)
  profile_id uuid,
  profile_email text,
  profile_full_name text,
  profile_avatar_url text,
  
  -- Team memberships (aggregated as JSONB array)
  teams jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: verify caller has access to this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_access wa_check
    WHERE wa_check.org_workspace_id = p_org_workspace_id
      AND wa_check.member_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to workspace';
  END IF;

  RETURN QUERY
  SELECT 
    wa.id,
    wa.workspace_type,
    wa.workspace_owner_id,
    wa.org_workspace_id,
    wa.member_id,
    wa.role,
    wa.joined_at,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_full_name,
    p.avatar_url as profile_avatar_url,
    
    -- Aggregate all teams for this member in this org
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'team_id', t.id,
            'team_name', t.name,
            'team_role', tm.role,
            'team_type', t.team_type,
            'squads', t.squads,
            'joined_team_at', tm.joined_at
          )
          ORDER BY t.name  -- Consistent ordering
        )
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = wa.member_id
          AND t.org_workspace_id = p_org_workspace_id  -- CRITICAL: scope to this org
      ),
      '[]'::jsonb  -- Empty array if no teams
    ) as teams
    
  FROM workspace_access wa
  INNER JOIN profiles p ON p.id = wa.member_id
  WHERE wa.org_workspace_id = p_org_workspace_id
    AND wa.workspace_type = 'org'
  ORDER BY wa.joined_at DESC;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION get_org_workspace_members(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_org_workspace_members IS 
  'Fetches all organization members with their team memberships in a single optimized query. '
  'Returns workspace access details, profile information, and an aggregated JSONB array of team memberships. '
  'Includes security check to ensure caller has access to the workspace.';

