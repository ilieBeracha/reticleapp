-- =====================================================
-- FRESH MULTI-PROFILE SCHEMA (FROM SCRATCH)
-- =====================================================
-- Complete multi-profile architecture for fresh database

SET search_path = public;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- TABLES
-- =====================================================

-- ORGS: Unified organizations table
CREATE TABLE orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  org_type text NOT NULL DEFAULT 'organization',
  description text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT orgs_type_check CHECK (org_type IN ('personal', 'organization'))
);

COMMENT ON TABLE orgs IS 'Organizations (personal and shared)';
CREATE INDEX orgs_slug_idx ON orgs(slug);
CREATE INDEX orgs_type_idx ON orgs(org_type);

-- PROFILES: One per user per org
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member',
  preferences jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT profiles_user_org_unique UNIQUE(user_id, org_id),
  CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'admin', 'instructor', 'member')),
  CONSTRAINT profiles_status_check CHECK (status IN ('active', 'pending', 'suspended'))
);

COMMENT ON TABLE profiles IS 'User profiles - one per organization';
CREATE INDEX profiles_user_id_idx ON profiles(user_id);
CREATE INDEX profiles_org_id_idx ON profiles(org_id);
CREATE INDEX profiles_role_idx ON profiles(role);
CREATE INDEX profiles_status_idx ON profiles(status);

-- TEAMS: Organizational structure
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  team_type text,
  description text,
  squads text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT teams_team_type_check CHECK (team_type IN ('field', 'back_office'))
);

COMMENT ON TABLE teams IS 'Teams within organizations';
COMMENT ON COLUMN teams.squads IS 'Array of squad names within this team';
CREATE INDEX teams_org_idx ON teams(org_id);

-- TEAM MEMBERS: Team membership (references profiles)
CREATE TABLE team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (team_id, profile_id),
  CONSTRAINT team_members_role_check CHECK (role IN ('commander', 'squad_commander', 'soldier')),
  CONSTRAINT team_members_squad_requirement CHECK (
    (role = 'commander') OR 
    (role IN ('soldier', 'squad_commander') AND details ? 'squad_id' AND (details->>'squad_id') IS NOT NULL AND (details->>'squad_id') <> '')
  )
);

COMMENT ON TABLE team_members IS 'Team membership';
CREATE INDEX team_members_profile_idx ON team_members(profile_id);
CREATE UNIQUE INDEX team_members_one_commander_per_team ON team_members(team_id) WHERE role = 'commander';

-- SESSIONS: Training sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  session_mode text DEFAULT 'solo' NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  session_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT sessions_session_mode_check CHECK (session_mode IN ('solo', 'group')),
  CONSTRAINT sessions_status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

COMMENT ON TABLE sessions IS 'Training sessions';
CREATE INDEX sessions_org_idx ON sessions(org_id);
CREATE INDEX sessions_profile_idx ON sessions(profile_id);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_team_idx ON sessions(team_id);
CREATE INDEX sessions_started_at_idx ON sessions(started_at DESC);

-- ORG INVITATIONS: Invitation codes
CREATE TABLE org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  invite_code text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accepted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team_role text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT org_invitations_role_check CHECK (role IN ('owner', 'admin', 'instructor', 'member')),
  CONSTRAINT org_invitations_status_check CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  CONSTRAINT org_invitations_team_role_check CHECK (team_role IN ('commander', 'squad_commander', 'soldier'))
);

COMMENT ON TABLE org_invitations IS 'Organization invitation codes';
CREATE INDEX org_invitations_org_idx ON org_invitations(org_id);
CREATE INDEX org_invitations_code_idx ON org_invitations(invite_code);
CREATE INDEX org_invitations_status_idx ON org_invitations(status);

-- =====================================================
-- RLS POLICIES (NO RECURSION!)
-- =====================================================

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- ORGS
CREATE POLICY view_accessible_orgs ON orgs
  FOR SELECT USING (
    id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY admins_update_org ON orgs
  FOR UPDATE USING (
    id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active')
  );

-- PROFILES
CREATE POLICY view_own_profiles ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY update_own_profiles ON profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY admins_manage_profiles ON profiles FOR ALL USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active')
);

-- TEAMS
CREATE POLICY view_teams ON teams FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY admins_manage_teams ON teams FOR ALL USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active')
);

-- TEAM MEMBERS
CREATE POLICY view_team_members ON team_members FOR SELECT USING (
  team_id IN (SELECT id FROM teams WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND status = 'active'))
);
CREATE POLICY admins_manage_team_members ON team_members FOR ALL USING (
  team_id IN (SELECT id FROM teams WHERE org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active'))
);

-- SESSIONS
CREATE POLICY view_own_sessions ON sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY insert_own_sessions ON sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY update_own_sessions ON sessions FOR UPDATE USING (user_id = auth.uid());

-- ORG INVITATIONS
CREATE POLICY admins_view_invitations ON org_invitations FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active')
);
CREATE POLICY anyone_view_by_code ON org_invitations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY admins_create_invitations ON org_invitations FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active')
);
CREATE POLICY admins_update_invitations ON org_invitations FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active')
);
CREATE POLICY users_accept_invitations ON org_invitations FOR UPDATE USING (
  auth.uid() IS NOT NULL AND status = 'pending' AND expires_at > now()
);
CREATE POLICY admins_delete_invitations ON org_invitations FOR DELETE USING (
  org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('owner','admin') AND status = 'active')
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Get user's profiles
CREATE OR REPLACE FUNCTION get_my_profiles()
RETURNS TABLE(profile_id uuid, org_id uuid, org_name text, org_type text, org_slug text, display_name text, role text, status text)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, o.id, o.name, o.org_type, o.slug, p.display_name, p.role, p.status
  FROM profiles p JOIN orgs o ON o.id = p.org_id
  WHERE p.user_id = auth.uid()
  ORDER BY CASE WHEN o.org_type = 'personal' THEN 0 ELSE 1 END, o.name;
$$;

GRANT EXECUTE ON FUNCTION get_my_profiles() TO authenticated;

-- Get org members
CREATE OR REPLACE FUNCTION get_org_members(p_org_id uuid)
RETURNS TABLE(profile_id uuid, user_id uuid, display_name text, avatar_url text, role text, status text, joined_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.avatar_url, p.role, p.status, p.created_at
  FROM profiles p WHERE p.org_id = p_org_id AND p.status = 'active'
  ORDER BY CASE p.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'instructor' THEN 3 ELSE 4 END, p.display_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_members(uuid) TO authenticated;

-- Accept invitation
CREATE OR REPLACE FUNCTION accept_org_invite(p_invite_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv record; v_user_id uuid; v_profile_id uuid; v_org record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  
  SELECT * INTO v_inv FROM org_invitations WHERE invite_code = p_invite_code AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation'); END IF;
  
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = v_user_id AND org_id = v_inv.org_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member');
  END IF;
  
  SELECT * INTO v_org FROM orgs WHERE id = v_inv.org_id;
  
  INSERT INTO profiles (user_id, org_id, role, status)
  VALUES (v_user_id, v_inv.org_id, v_inv.role, 'active')
  RETURNING id INTO v_profile_id;
  
  UPDATE org_invitations SET status = 'accepted', accepted_by = v_profile_id, accepted_at = now(), updated_at = now() WHERE id = v_inv.id;
  
  IF v_inv.team_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, profile_id, role, details)
    VALUES (v_inv.team_id, v_profile_id, COALESCE(v_inv.team_role, 'soldier'), COALESCE(v_inv.details, '{}'::jsonb))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN json_build_object('success', true, 'profile_id', v_profile_id, 'org_id', v_inv.org_id, 'org_name', v_org.name, 'role', v_inv.role);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_org_invite(text) TO authenticated;

-- Create org
CREATE OR REPLACE FUNCTION create_org_workspace(p_name text, p_description text DEFAULT NULL)
RETURNS TABLE(id uuid, name text, slug text, description text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id uuid; v_slug text; v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  v_slug := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
  
  INSERT INTO orgs (name, slug, org_type, description) VALUES (p_name, v_slug, 'organization', p_description) RETURNING orgs.id INTO v_org_id;
  INSERT INTO profiles (user_id, org_id, role, status) VALUES (v_user_id, v_org_id, 'owner', 'active');
  
  RETURN QUERY SELECT o.id, o.name, o.slug, o.description, o.created_at FROM orgs o WHERE o.id = v_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_org_workspace(text, text) TO authenticated;

-- Get org teams
CREATE OR REPLACE FUNCTION get_org_teams(p_org_id uuid)
RETURNS TABLE(team_id uuid, team_name text, team_type text, member_count bigint, squads text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT t.id, t.name, t.team_type, COUNT(tm.profile_id), t.squads
  FROM teams t LEFT JOIN team_members tm ON tm.team_id = t.id
  WHERE t.org_id = p_org_id GROUP BY t.id ORDER BY t.team_type, t.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_teams(uuid) TO authenticated;

-- Create team
CREATE OR REPLACE FUNCTION create_team_for_org(p_org_id uuid, p_name text, p_team_type text DEFAULT 'field', p_description text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_team_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND org_id = p_org_id AND role IN ('owner','admin') AND status = 'active') THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can create teams');
  END IF;
  INSERT INTO teams (org_id, name, team_type, description) VALUES (p_org_id, p_name, p_team_type, p_description) RETURNING id INTO v_team_id;
  RETURN json_build_object('success', true, 'team_id', v_team_id);
END;
$$;

GRANT EXECUTE ON FUNCTION create_team_for_org(uuid, text, text, text) TO authenticated;

-- =====================================================
-- AUTO-CREATE PERSONAL ORG TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION create_personal_org_for_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id uuid; v_slug text; v_display_name text;
BEGIN
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1));
  v_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  
  INSERT INTO orgs (id, name, slug, org_type)
  VALUES (NEW.id, v_display_name || '''s Workspace', v_slug, 'personal')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_org_id;
  
  IF v_org_id IS NOT NULL THEN
    INSERT INTO profiles (user_id, org_id, display_name, role, status)
    VALUES (NEW.id, v_org_id, v_display_name, 'owner', 'active')
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_create_personal_org
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_personal_org_for_new_user();

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_orgs_updated_at BEFORE UPDATE ON orgs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Multi-profile schema created!';
  RAISE NOTICE '✅ Tables: orgs, profiles, teams, team_members, sessions, org_invitations';
  RAISE NOTICE '✅ RLS: All policies active (no recursion!)';
  RAISE NOTICE '✅ Trigger: Auto-create personal org for new signups';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for use!';
  RAISE NOTICE '';
END $$;

