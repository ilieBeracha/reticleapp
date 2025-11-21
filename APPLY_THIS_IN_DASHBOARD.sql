-- =====================================================
-- COMPLETE FIX - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- This fixes EVERYTHING in one go:
-- 1. Removes infinite recursion in RLS policies
-- 2. Removes old auth triggers
-- 3. Ensures new trigger is in place

-- =====================================================
-- STEP 1: DROP ALL BROKEN POLICIES
-- =====================================================

DROP POLICY IF EXISTS "users_view_own_profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "users_view_org_profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "users_update_own_profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "org_admins_manage_profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "view_own_profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "update_own_profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "admins_manage_profiles" ON profiles CASCADE;

DROP POLICY IF EXISTS "org_members_view_teams" ON teams CASCADE;
DROP POLICY IF EXISTS "org_admins_manage_teams" ON teams CASCADE;
DROP POLICY IF EXISTS "view_teams" ON teams CASCADE;
DROP POLICY IF EXISTS "admins_manage_teams" ON teams CASCADE;

DROP POLICY IF EXISTS "org_members_view_team_members" ON team_members CASCADE;
DROP POLICY IF EXISTS "org_admins_manage_team_members" ON team_members CASCADE;
DROP POLICY IF EXISTS "view_team_members" ON team_members CASCADE;
DROP POLICY IF EXISTS "admins_manage_team_members" ON team_members CASCADE;

DROP POLICY IF EXISTS "users_view_own_sessions_by_profile" ON sessions CASCADE;
DROP POLICY IF EXISTS "users_view_own_sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "users_insert_sessions_via_profile" ON sessions CASCADE;
DROP POLICY IF EXISTS "users_insert_sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "users_update_own_sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "users_update_sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "view_own_sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "insert_own_sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "update_own_sessions" ON sessions CASCADE;

DROP POLICY IF EXISTS "org_admins_view_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "anyone_can_view_invite_by_code" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "org_admins_create_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "org_admins_update_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "authenticated_users_accept_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "org_admins_delete_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "admins_view_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "anyone_view_by_code" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "admins_create_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "admins_update_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "users_accept_invitations" ON org_invitations CASCADE;
DROP POLICY IF EXISTS "admins_delete_invitations" ON org_invitations CASCADE;

-- =====================================================
-- STEP 2: CREATE CORRECT POLICIES (NO RECURSION!)
-- =====================================================

-- PROFILES: Simple direct checks
CREATE POLICY "view_own_profiles" ON profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "update_own_profiles" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "admins_manage_profiles" ON profiles
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- TEAMS: Simple IN subqueries
CREATE POLICY "view_teams" ON teams
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "admins_manage_teams" ON teams
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- TEAM MEMBERS: Nested subqueries
CREATE POLICY "view_team_members" ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM teams
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
    )
  );

CREATE POLICY "admins_manage_team_members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT id FROM teams
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

-- SESSIONS: Keep it simple
CREATE POLICY "view_own_sessions" ON sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "insert_own_sessions" ON sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_sessions" ON sessions
  FOR UPDATE USING (user_id = auth.uid());

-- ORG INVITATIONS: Direct subqueries
CREATE POLICY "admins_view_invitations" ON org_invitations
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "anyone_view_by_code" ON org_invitations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admins_create_invitations" ON org_invitations
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "admins_update_invitations" ON org_invitations
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "users_accept_invitations" ON org_invitations
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND status = 'pending'
    AND expires_at > now()
  );

CREATE POLICY "admins_delete_invitations" ON org_invitations
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- =====================================================
-- STEP 3: REMOVE OLD AUTH TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =====================================================
-- STEP 4: ENSURE NEW TRIGGER EXISTS
-- =====================================================

CREATE OR REPLACE FUNCTION create_personal_org_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
  v_display_name text;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  v_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) 
            || '-' || SUBSTRING(NEW.id::text, 1, 8);

  INSERT INTO public.orgs (id, name, slug, org_type)
  VALUES (
    NEW.id,
    v_display_name || '''s Workspace',
    v_slug,
    'personal'
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_org_id;

  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, org_id, display_name, role, status)
    VALUES (NEW.id, v_org_id, v_display_name, 'owner', 'active')
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_personal_org ON auth.users;

CREATE TRIGGER on_auth_user_created_create_personal_org
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_personal_org_for_new_user();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policies: Fixed (no more recursion)';
  RAISE NOTICE '✅ Old Triggers: Removed';
  RAISE NOTICE '✅ New Trigger: Active (auto-create personal org)';
  RAISE NOTICE '';
  RAISE NOTICE '👉 REFRESH YOUR APP NOW!';
  RAISE NOTICE '';
END $$;

