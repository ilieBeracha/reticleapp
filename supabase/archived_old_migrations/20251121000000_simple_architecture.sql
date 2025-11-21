-- =====================================================
-- SIMPLE ARCHITECTURE
-- =====================================================
-- Personal page: See ALL your sessions (across all orgs)
-- Org page: Manage that specific org
-- Teams: Organizational structure only

-- =====================================================
-- 1. HELPER VIEW: My All Sessions
-- =====================================================
-- One simple query to get everything for personal page

CREATE OR REPLACE VIEW my_all_sessions AS
SELECT 
  s.*,
  COALESCE(ow.name, p.workspace_name, 'Personal') as context_name,
  t.name as team_name,
  'session' as activity_type
FROM sessions s
LEFT JOIN org_workspaces ow ON ow.id = s.org_workspace_id
LEFT JOIN profiles p ON p.id = s.workspace_owner_id
LEFT JOIN teams t ON t.id = s.team_id
WHERE s.user_id = auth.uid()
ORDER BY s.started_at DESC;

GRANT SELECT ON my_all_sessions TO authenticated;

COMMENT ON VIEW my_all_sessions IS 'User sees ALL their sessions across all orgs in one query';

-- =====================================================
-- 2. SIMPLE RLS POLICIES
-- =====================================================
-- Users can view their own sessions

CREATE POLICY "users_view_own_sessions" ON sessions
  FOR SELECT USING (user_id = auth.uid());

-- Users can view sessions in orgs they have access to
CREATE POLICY "users_view_org_sessions" ON sessions
  FOR SELECT USING (
    org_workspace_id IN (
      SELECT org_workspace_id 
      FROM workspace_access 
      WHERE member_id = auth.uid()
    )
  );

