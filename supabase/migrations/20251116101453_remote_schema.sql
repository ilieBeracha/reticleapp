-- =====================================================
-- SIMPLIFIED SCHEMA: User-as-Workspace Model
-- Every user IS a workspace, simple access control
-- =====================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

-- Check if user has access to a workspace (workspace_id = profile.id)
CREATE OR REPLACE FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") 
RETURNS boolean
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = auth.uid()
  );
END;
$$;

ALTER FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") OWNER TO "postgres";

-- Check if user is admin/owner of a workspace
CREATE OR REPLACE FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") 
RETURNS boolean
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$;

ALTER FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";

-- Check if user is a team leader
CREATE OR REPLACE FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") 
RETURNS boolean
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role IN ('manager', 'commander')
  );
END;
$$;

ALTER FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";

-- Get teams for a workspace
CREATE OR REPLACE FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") 
RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_type" "text", "member_count" bigint)
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  IF NOT has_workspace_access(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id;
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.team_type,
    COUNT(tm.user_id) AS member_count
  FROM teams t
  LEFT JOIN team_members tm ON tm.team_id = t.id
  WHERE t.workspace_owner_id = p_workspace_id
  GROUP BY t.id
  ORDER BY t.team_type, t.name;
END;
$$;

ALTER FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") OWNER TO "postgres";

-- Get members of a team
CREATE OR REPLACE FUNCTION "public"."get_team_members"("p_team_id" "uuid") 
RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "role" "text")
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Get workspace owner from team
  SELECT workspace_owner_id INTO v_workspace_id
  FROM teams WHERE id = p_team_id;
  
  IF NOT has_workspace_access(v_workspace_id) THEN
    RAISE EXCEPTION 'Access denied to team %', p_team_id;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    tm.role
  FROM team_members tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id
  ORDER BY tm.role, p.full_name;
END;
$$;

ALTER FUNCTION "public"."get_team_members"("p_team_id" "uuid") OWNER TO "postgres";

-- =====================================================
-- TABLES
-- =====================================================

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- PROFILES: User = Workspace Owner
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" "uuid" PRIMARY KEY,  -- matches auth.users.id (NO default)
  "email" "text" UNIQUE NOT NULL,
  "full_name" "text",
  "avatar_url" "text",
  
  -- Workspace info (each user IS a workspace)
  "workspace_name" "text" DEFAULT 'My Workspace',
  "workspace_slug" "text" UNIQUE,
  
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";
COMMENT ON TABLE "public"."profiles" IS 'Users (each user is also a workspace)';

-- WORKSPACE ACCESS: Who can access whose workspace
CREATE TABLE IF NOT EXISTS "public"."workspace_access" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_owner_id" "uuid" NOT NULL,  -- The profile.id of workspace owner
  "member_id" "uuid" NOT NULL,           -- The user who has access
  "role" "text" NOT NULL DEFAULT 'member',
  "joined_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "workspace_access_role_check" CHECK ("role" IN ('owner', 'admin', 'member')),
  CONSTRAINT "workspace_access_unique" UNIQUE ("workspace_owner_id", "member_id")
);

ALTER TABLE "public"."workspace_access" OWNER TO "postgres";
COMMENT ON TABLE "public"."workspace_access" IS 'Workspace membership (workspace_owner_id = profile.id)';

-- TEAMS: Sub-groups within a workspace
CREATE TABLE IF NOT EXISTS "public"."teams" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_owner_id" "uuid" NOT NULL,  -- References profiles(id)
  "name" "text" NOT NULL,
  "team_type" "text",
  "description" "text",
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "teams_team_type_check" CHECK ("team_type" IN ('field', 'back_office'))
);

ALTER TABLE "public"."teams" OWNER TO "postgres";
COMMENT ON TABLE "public"."teams" IS 'Teams within workspaces (optional sub-groups)';

-- TEAM MEMBERS: Team membership
CREATE TABLE IF NOT EXISTS "public"."team_members" (
  "team_id" "uuid" NOT NULL,
  "user_id" "uuid" NOT NULL,
  "role" "text" NOT NULL,
  "joined_at" timestamptz DEFAULT now() NOT NULL,

  PRIMARY KEY ("team_id", "user_id"),
  CONSTRAINT "team_members_role_check" CHECK ("role" IN ('sniper', 'pistol', 'manager', 'commander', 'instructor', 'staff'))
);

ALTER TABLE "public"."team_members" OWNER TO "postgres";
COMMENT ON TABLE "public"."team_members" IS 'Team membership';

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

-- Profiles references auth.users
ALTER TABLE ONLY "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Workspace access references profiles
ALTER TABLE ONLY "public"."workspace_access"
  ADD CONSTRAINT "workspace_access_owner_fkey"
  FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_access"
  ADD CONSTRAINT "workspace_access_member_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Teams reference workspace owners (profiles)
ALTER TABLE ONLY "public"."teams"
  ADD CONSTRAINT "teams_workspace_owner_fkey"
  FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Team members reference teams and profiles
ALTER TABLE ONLY "public"."team_members"
  ADD CONSTRAINT "team_members_team_fkey"
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_members"
  ADD CONSTRAINT "team_members_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_workspace_access_owner" ON "public"."workspace_access"("workspace_owner_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_access_member" ON "public"."workspace_access"("member_id");
CREATE INDEX IF NOT EXISTS "idx_teams_workspace_owner" ON "public"."teams"("workspace_owner_id");
CREATE INDEX IF NOT EXISTS "idx_team_members_team" ON "public"."team_members"("team_id");
CREATE INDEX IF NOT EXISTS "idx_team_members_user" ON "public"."team_members"("user_id");

-- =====================================================
-- TRIGGERS: Simple profile creation on signup
-- =====================================================

CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_slug text;
BEGIN
  -- Generate unique workspace slug
  v_workspace_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    '[^a-zA-Z0-9]',
    '-',
    'g'
  )) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  
  -- 1. Create profile (user IS a workspace)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    workspace_name,
    workspace_slug
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    CONCAT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), '''s Workspace'),
    v_workspace_slug
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Grant user access to their own workspace (they are the owner)
  INSERT INTO public.workspace_access (workspace_owner_id, member_id, role)
  VALUES (NEW.id, NEW.id, 'owner')
  ON CONFLICT (workspace_owner_id, member_id) DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

-- Update updated_at timestamp
CREATE OR REPLACE TRIGGER "update_profiles_updated_at"
  BEFORE UPDATE ON "public"."profiles"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_teams_updated_at"
  BEFORE UPDATE ON "public"."teams"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."update_updated_at_column"();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can view their own profile and profiles of workspaces they have access to
CREATE POLICY "profiles_select" ON "public"."profiles"
  FOR SELECT USING (
    auth.uid() = id OR  -- Own profile
    id IN (  -- Profiles of workspaces I have access to
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid()
    )
  );

CREATE POLICY "profiles_update_self" ON "public"."profiles"
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_self" ON "public"."profiles"
  FOR DELETE USING (auth.uid() = id);

-- WORKSPACE ACCESS: Can see memberships for workspaces they belong to
CREATE POLICY "workspace_access_select" ON "public"."workspace_access"
  FOR SELECT USING (
    member_id = auth.uid() OR  -- Own memberships
    workspace_owner_id IN (  -- Memberships of workspaces I own/admin
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- Owners/admins can insert new members
CREATE POLICY "workspace_access_insert" ON "public"."workspace_access"
  FOR INSERT WITH CHECK (
    workspace_owner_id IN (
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- Owners/admins can update/delete members
CREATE POLICY "workspace_access_update" ON "public"."workspace_access"
  FOR UPDATE USING (
    workspace_owner_id IN (
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_access_delete" ON "public"."workspace_access"
  FOR DELETE USING (
    member_id = auth.uid() OR  -- Can leave workspace
    workspace_owner_id IN (  -- Owners/admins can remove members
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- TEAMS: Can see teams in workspaces I have access to
CREATE POLICY "teams_select" ON "public"."teams"
  FOR SELECT USING (
    workspace_owner_id IN (
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid()
    )
  );

-- Owners/admins can manage teams
CREATE POLICY "teams_insert" ON "public"."teams"
  FOR INSERT WITH CHECK (
    workspace_owner_id IN (
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "teams_update" ON "public"."teams"
  FOR UPDATE USING (
    workspace_owner_id IN (
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "teams_delete" ON "public"."teams"
  FOR DELETE USING (
    workspace_owner_id IN (
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- TEAM MEMBERS: Can see team members if you're in the workspace
CREATE POLICY "team_members_select" ON "public"."team_members"
  FOR SELECT USING (
    user_id = auth.uid() OR  -- Own membership
    team_id IN (
      SELECT t.id 
      FROM public.teams t
      JOIN public.workspace_access wa ON wa.workspace_owner_id = t.workspace_owner_id
      WHERE wa.member_id = auth.uid()
    )
  );

-- Team managers/commanders can manage team members
CREATE POLICY "team_members_insert" ON "public"."team_members"
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT tm.team_id
      FROM public.team_members tm
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('manager', 'commander')
    ) OR
    team_id IN (  -- Workspace admins can also add
      SELECT t.id
      FROM public.teams t
      JOIN public.workspace_access wa ON wa.workspace_owner_id = t.workspace_owner_id
      WHERE wa.member_id = auth.uid() 
        AND wa.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_members_update" ON "public"."team_members"
  FOR UPDATE USING (
    user_id = auth.uid() OR  -- Can update own membership
    team_id IN (
      SELECT tm.team_id
      FROM public.team_members tm
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('manager', 'commander')
    )
  );

CREATE POLICY "team_members_delete" ON "public"."team_members"
  FOR DELETE USING (
    user_id = auth.uid() OR  -- Can leave team
    team_id IN (
      SELECT tm.team_id
      FROM public.team_members tm
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('manager', 'commander')
    )
  );

-- Attach trigger: when new user signs up → create profile + workspace access
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- Function grants
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_members"("p_team_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

-- Table grants
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."workspace_access" TO "anon";
GRANT ALL ON TABLE "public"."workspace_access" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_access" TO "service_role";

GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";

GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";

-- Default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
