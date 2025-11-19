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

-- Create new organization workspace
CREATE OR REPLACE FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text" DEFAULT NULL)
RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "workspace_slug" "text", "created_by" "uuid", "created_at" timestamptz)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_slug text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate slug
  v_slug := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

  -- Create workspace
  INSERT INTO org_workspaces (name, description, workspace_slug, created_by)
  VALUES (p_name, p_description, v_slug, v_user_id)
  RETURNING org_workspaces.id INTO v_workspace_id;

  -- Grant owner access
  INSERT INTO workspace_access (workspace_type, org_workspace_id, member_id, role)
  VALUES ('org', v_workspace_id, v_user_id, 'owner');

  -- Return created workspace
  RETURN QUERY
  SELECT ow.id, ow.name, ow.description, ow.workspace_slug, ow.created_by, ow.created_at
  FROM org_workspaces ow
  WHERE ow.id = v_workspace_id;
END;
$$;

ALTER FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") OWNER TO "postgres";

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

-- WORKSPACE ACCESS: Who can access whose workspace (personal OR org)
CREATE TABLE IF NOT EXISTS "public"."workspace_access" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_type" "text" NOT NULL DEFAULT 'personal',  -- 'personal' or 'org'
  "workspace_owner_id" "uuid",           -- For personal: profile.id, for org: null
  "org_workspace_id" "uuid",             -- For org: org_workspaces.id, for personal: null
  "member_id" "uuid" NOT NULL,           -- The user who has access
  "role" "text" NOT NULL DEFAULT 'member',
  "joined_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "workspace_access_role_check" CHECK ("role" IN ('owner', 'admin', 'member')),
  CONSTRAINT "workspace_access_type_check" CHECK ("workspace_type" IN ('personal', 'org')),
  CONSTRAINT "workspace_access_valid_refs" CHECK (
    (workspace_type = 'personal' AND workspace_owner_id IS NOT NULL AND org_workspace_id IS NULL) OR
    (workspace_type = 'org' AND org_workspace_id IS NOT NULL AND workspace_owner_id IS NULL)
  ),
  CONSTRAINT "workspace_access_unique_personal" UNIQUE ("workspace_owner_id", "member_id"),
  CONSTRAINT "workspace_access_unique_org" UNIQUE ("org_workspace_id", "member_id")
);

ALTER TABLE "public"."workspace_access" OWNER TO "postgres";
COMMENT ON TABLE "public"."workspace_access" IS 'Workspace membership (supports personal and org workspaces)';

-- TEAMS: Sub-groups within a workspace (personal OR org)
CREATE TABLE IF NOT EXISTS "public"."teams" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_type" "text" NOT NULL DEFAULT 'personal',
  "workspace_owner_id" "uuid",           -- For personal workspace (profile.id)
  "org_workspace_id" "uuid",             -- For org workspace
  "name" "text" NOT NULL,
  "team_type" "text",
  "description" "text",
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "teams_team_type_check" CHECK ("team_type" IN ('field', 'back_office')),
  CONSTRAINT "teams_workspace_type_check" CHECK ("workspace_type" IN ('personal', 'org')),
  CONSTRAINT "teams_valid_refs" CHECK (
    (workspace_type = 'personal' AND workspace_owner_id IS NOT NULL AND org_workspace_id IS NULL) OR
    (workspace_type = 'org' AND org_workspace_id IS NOT NULL AND workspace_owner_id IS NULL)
  )
);

ALTER TABLE "public"."teams" OWNER TO "postgres";
COMMENT ON TABLE "public"."teams" IS 'Teams within workspaces (supports personal and org workspaces)';

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

-- ORG WORKSPACES: User-created organization workspaces
CREATE TABLE IF NOT EXISTS "public"."org_workspaces" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" "text" NOT NULL,
  "description" "text",
  "workspace_slug" "text" UNIQUE,
  "created_by" "uuid" NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."org_workspaces" OWNER TO "postgres";
COMMENT ON TABLE "public"."org_workspaces" IS 'User-created organization workspaces (multiple per user allowed)';

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

-- Profiles references auth.users
ALTER TABLE ONLY "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Workspace access references profiles and org workspaces
ALTER TABLE ONLY "public"."workspace_access"
  ADD CONSTRAINT "workspace_access_owner_fkey"
  FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_access"
  ADD CONSTRAINT "workspace_access_org_fkey"
  FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_access"
  ADD CONSTRAINT "workspace_access_member_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Org workspaces reference creator
ALTER TABLE ONLY "public"."org_workspaces"
  ADD CONSTRAINT "org_workspaces_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Teams reference workspace owners (profiles) or org workspaces
ALTER TABLE ONLY "public"."teams"
  ADD CONSTRAINT "teams_workspace_owner_fkey"
  FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."teams"
  ADD CONSTRAINT "teams_org_workspace_fkey"
  FOREIGN KEY ("org_workspace_id") REFERENCES "public"."org_workspaces"("id") ON DELETE CASCADE;

-- Team members reference teams and profiles
ALTER TABLE ONLY "public"."team_members"
  ADD CONSTRAINT "team_members_team_fkey"
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_members"
  ADD CONSTRAINT "team_members_user_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_workspace_access_owner" ON "public"."workspace_access"("workspace_owner_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_access_org" ON "public"."workspace_access"("org_workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_access_member" ON "public"."workspace_access"("member_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_access_type" ON "public"."workspace_access"("workspace_type");
CREATE INDEX IF NOT EXISTS "idx_org_workspaces_created_by" ON "public"."org_workspaces"("created_by");
CREATE INDEX IF NOT EXISTS "idx_teams_workspace_owner" ON "public"."teams"("workspace_owner_id");
CREATE INDEX IF NOT EXISTS "idx_teams_org_workspace" ON "public"."teams"("org_workspace_id");
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

  -- 2. Grant user access to their own workspace (personal workspace)
  INSERT INTO public.workspace_access (workspace_type, workspace_owner_id, member_id, role)
  VALUES ('personal', NEW.id, NEW.id, 'owner')
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

CREATE OR REPLACE TRIGGER "update_org_workspaces_updated_at"
  BEFORE UPDATE ON "public"."org_workspaces"
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
ALTER TABLE "public"."org_workspaces" ENABLE ROW LEVEL SECURITY;
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

-- WORKSPACE ACCESS: Can see own memberships or memberships in workspaces they own
CREATE POLICY "workspace_access_select" ON "public"."workspace_access"
  FOR SELECT USING (
    member_id = auth.uid() OR           -- Can see own memberships
    workspace_owner_id = auth.uid()     -- Can see memberships in my workspace
  );

-- Only workspace owners can insert new members
CREATE POLICY "workspace_access_insert" ON "public"."workspace_access"
  FOR INSERT WITH CHECK (
    workspace_owner_id = auth.uid()  -- Only workspace owner can add members
  );

-- Workspace owners can update member roles
CREATE POLICY "workspace_access_update" ON "public"."workspace_access"
  FOR UPDATE USING (
    workspace_owner_id = auth.uid()  -- Only workspace owner can update
  );

-- Users can leave workspaces, owners can remove members
CREATE POLICY "workspace_access_delete" ON "public"."workspace_access"
  FOR DELETE USING (
    member_id = auth.uid() OR        -- Can leave any workspace
    workspace_owner_id = auth.uid() OR  -- Personal workspace owner can remove
    EXISTS (  -- Org workspace owner can remove
      SELECT 1 FROM public.org_workspaces ow
      WHERE ow.id = workspace_access.org_workspace_id
        AND ow.created_by = auth.uid()
    )
  );

-- ORG WORKSPACES: Can see workspaces I created or have access to
CREATE POLICY "org_workspaces_select" ON "public"."org_workspaces"
  FOR SELECT USING (
    created_by = auth.uid() OR  -- Own workspaces
    EXISTS (  -- Workspaces I have access to
      SELECT 1 FROM public.workspace_access wa
      WHERE wa.org_workspace_id = org_workspaces.id
        AND wa.member_id = auth.uid()
    )
  );

-- Anyone can create org workspaces
CREATE POLICY "org_workspaces_insert" ON "public"."org_workspaces"
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- Only creators can update their org workspaces
CREATE POLICY "org_workspaces_update" ON "public"."org_workspaces"
  FOR UPDATE USING (
    created_by = auth.uid()
  );

-- Only creators can delete their org workspaces
CREATE POLICY "org_workspaces_delete" ON "public"."org_workspaces"
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- TEAMS: Can see teams in own workspace or workspaces with access
CREATE POLICY "teams_select" ON "public"."teams"
  FOR SELECT USING (
    workspace_owner_id = auth.uid() OR  -- Own workspace teams
    EXISTS (  -- Teams in workspaces I have access to
      SELECT 1 FROM public.workspace_access
      WHERE workspace_access.workspace_owner_id = teams.workspace_owner_id
        AND workspace_access.member_id = auth.uid()
    )
  );

-- Only workspace owners can manage teams
CREATE POLICY "teams_insert" ON "public"."teams"
  FOR INSERT WITH CHECK (
    workspace_owner_id = auth.uid()
  );

CREATE POLICY "teams_update" ON "public"."teams"
  FOR UPDATE USING (
    workspace_owner_id = auth.uid()
  );

CREATE POLICY "teams_delete" ON "public"."teams"
  FOR DELETE USING (
    workspace_owner_id = auth.uid()
  );

-- TEAM MEMBERS: Can see team members if you're in the workspace
CREATE POLICY "team_members_select" ON "public"."team_members"
  FOR SELECT USING (
    user_id = auth.uid() OR  -- Own membership
    EXISTS (  -- Member of a team in a workspace I have access to
      SELECT 1 FROM public.teams t
      LEFT JOIN public.workspace_access wa 
        ON wa.workspace_owner_id = t.workspace_owner_id 
        AND wa.member_id = auth.uid()
      WHERE t.id = team_members.team_id
        AND (t.workspace_owner_id = auth.uid() OR wa.id IS NOT NULL)
    )
  );

-- Team managers/commanders and workspace owners can manage team members
CREATE POLICY "team_members_insert" ON "public"."team_members"
  FOR INSERT WITH CHECK (
    EXISTS (  -- I'm a manager/commander of this team
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role IN ('manager', 'commander')
    ) OR
    EXISTS (  -- I'm the workspace owner
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.workspace_owner_id = auth.uid()
    )
  );

CREATE POLICY "team_members_update" ON "public"."team_members"
  FOR UPDATE USING (
    user_id = auth.uid() OR  -- Can update own membership
    EXISTS (  -- I'm a manager/commander of this team
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role IN ('manager', 'commander')
    ) OR
    EXISTS (  -- I'm the workspace owner
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.workspace_owner_id = auth.uid()
    )
  );

CREATE POLICY "team_members_delete" ON "public"."team_members"
  FOR DELETE USING (
    user_id = auth.uid() OR  -- Can leave team
    EXISTS (  -- I'm a manager/commander of this team
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role IN ('manager', 'commander')
    ) OR
    EXISTS (  -- I'm the workspace owner
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.workspace_owner_id = auth.uid()
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

GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_workspace"("p_name" "text", "p_description" "text") TO "service_role";

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

GRANT ALL ON TABLE "public"."org_workspaces" TO "anon";
GRANT ALL ON TABLE "public"."org_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."org_workspaces" TO "service_role";

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

-- =====================================================
-- SIMPLIFIED SESSIONS TABLE
-- Remove drill/training complexity for now
-- =====================================================

-- Drop the existing sessions table constraints/policies first
DROP TABLE IF EXISTS public.sessions CASCADE;

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace reference (simplified)
  workspace_type text NOT NULL DEFAULT 'personal',
  workspace_owner_id uuid,  -- For personal: user's profile.id
  org_workspace_id uuid,    -- For org: org_workspaces.id
  
  -- Session ownership
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Optional: Team context
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  
  -- Session details
  session_mode text NOT NULL DEFAULT 'solo',  -- 'solo' or 'group'
  status text NOT NULL DEFAULT 'active',      -- 'active', 'completed', 'cancelled'
  
  -- Timing
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  
  -- Session data (flexible JSONB for any session-specific data)
  session_data jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sessions_workspace_type_check 
    CHECK (workspace_type IN ('personal', 'org')),
  CONSTRAINT sessions_session_mode_check 
    CHECK (session_mode IN ('solo', 'group')),
  CONSTRAINT sessions_status_check 
    CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT sessions_valid_workspace_refs CHECK (
    (workspace_type = 'personal' AND workspace_owner_id IS NOT NULL AND org_workspace_id IS NULL) OR
    (workspace_type = 'org' AND org_workspace_id IS NOT NULL AND workspace_owner_id IS NULL)
  )
);

-- Foreign keys
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_workspace_owner_fkey
  FOREIGN KEY (workspace_owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_org_workspace_fkey
  FOREIGN KEY (org_workspace_id) REFERENCES public.org_workspaces(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX idx_sessions_user ON public.sessions(user_id);
CREATE INDEX idx_sessions_workspace_owner ON public.sessions(workspace_owner_id);
CREATE INDEX idx_sessions_org_workspace ON public.sessions(org_workspace_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX idx_sessions_team ON public.sessions(team_id);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Create Session
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_session(
  p_workspace_type text,
  p_workspace_owner_id uuid DEFAULT NULL,
  p_org_workspace_id uuid DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_session_mode text DEFAULT 'solo',
  p_session_data jsonb DEFAULT NULL
)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.sessions;
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate workspace type
  IF p_workspace_type NOT IN ('personal', 'org') THEN
    RAISE EXCEPTION 'Invalid workspace_type. Must be "personal" or "org"';
  END IF;

  -- Personal workspace session
  IF p_workspace_type = 'personal' THEN
    -- Must be in your own workspace
    IF p_workspace_owner_id != auth.uid() THEN
      RAISE EXCEPTION 'Can only create personal sessions in your own workspace';
    END IF;
    
    IF p_org_workspace_id IS NOT NULL THEN
      RAISE EXCEPTION 'Personal sessions cannot have org_workspace_id';
    END IF;
  
  -- Org workspace session
  ELSE
    IF p_org_workspace_id IS NULL THEN
      RAISE EXCEPTION 'Org sessions require org_workspace_id';
    END IF;
    
    IF p_workspace_owner_id IS NOT NULL THEN
      RAISE EXCEPTION 'Org sessions cannot have workspace_owner_id';
    END IF;
    
    -- Verify access to org workspace
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_access
      WHERE org_workspace_id = p_org_workspace_id
        AND member_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied to workspace';
    END IF;
  END IF;

  -- Create the session
  INSERT INTO public.sessions (
    workspace_type,
    workspace_owner_id,
    org_workspace_id,
    user_id,
    team_id,
    session_mode,
    session_data
  ) VALUES (
    p_workspace_type,
    p_workspace_owner_id,
    p_org_workspace_id,
    auth.uid(),
    p_team_id,
    p_session_mode,
    COALESCE(p_session_data, '{}'::jsonb)
  )
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Get User's Sessions
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_sessions(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  workspace_type text,
  workspace_owner_id uuid,
  org_workspace_id uuid,
  workspace_name text,
  user_id uuid,
  team_id uuid,
  team_name text,
  session_mode text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  session_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.workspace_type,
    s.workspace_owner_id,
    s.org_workspace_id,
    CASE 
      WHEN s.workspace_type = 'personal' THEN p.workspace_name
      WHEN s.workspace_type = 'org' THEN ow.name
      ELSE 'Unknown'
    END as workspace_name,
    s.user_id,
    s.team_id,
    t.name as team_name,
    s.session_mode,
    s.status,
    s.started_at,
    s.ended_at,
    s.session_data,
    s.created_at,
    s.updated_at
  FROM public.sessions s
  LEFT JOIN public.profiles p ON p.id = s.workspace_owner_id
  LEFT JOIN public.org_workspaces ow ON ow.id = s.org_workspace_id
  LEFT JOIN public.teams t ON t.id = s.team_id
  WHERE s.user_id = auth.uid()
  ORDER BY s.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Get Workspace Sessions
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_workspace_sessions(
  p_workspace_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  workspace_type text,
  user_id uuid,
  user_full_name text,
  team_id uuid,
  team_name text,
  session_mode text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  session_data jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify access (could be personal or org workspace)
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_access wa
    WHERE (wa.workspace_owner_id = p_workspace_id OR wa.org_workspace_id = p_workspace_id)
      AND wa.member_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to workspace';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.workspace_type,
    s.user_id,
    p.full_name as user_full_name,
    s.team_id,
    t.name as team_name,
    s.session_mode,
    s.status,
    s.started_at,
    s.ended_at,
    s.session_data,
    s.created_at
  FROM public.sessions s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.teams t ON t.id = s.team_id
  WHERE (s.workspace_owner_id = p_workspace_id OR s.org_workspace_id = p_workspace_id)
  ORDER BY s.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: End Session
-- =====================================================

CREATE OR REPLACE FUNCTION public.end_session(
  p_session_id uuid,
  p_status text DEFAULT 'completed'
)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.sessions;
BEGIN
  -- Verify authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate status
  IF p_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Status must be "completed" or "cancelled"';
  END IF;

  -- Update and return
  UPDATE public.sessions
  SET 
    status = p_status,
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
  WHERE id = p_session_id
    AND user_id = auth.uid()
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;

  RETURN v_session;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Users can see their own sessions OR sessions in workspaces they have access to
CREATE POLICY sessions_select ON public.sessions
  FOR SELECT USING (
    user_id = auth.uid() OR
    workspace_owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_access wa
      WHERE (wa.workspace_owner_id = sessions.workspace_owner_id 
         OR wa.org_workspace_id = sessions.org_workspace_id)
        AND wa.member_id = auth.uid()
    )
  );

-- Users can create sessions in their workspace or workspaces they have access to
CREATE POLICY sessions_insert ON public.sessions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      workspace_owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.workspace_access wa
        WHERE wa.org_workspace_id = sessions.org_workspace_id
          AND wa.member_id = auth.uid()
      )
    )
  );

-- Users can update their own sessions
CREATE POLICY sessions_update ON public.sessions
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Users can delete their own sessions OR workspace owners/admins can delete
CREATE POLICY sessions_delete ON public.sessions
  FOR DELETE USING (
    user_id = auth.uid() OR
    workspace_owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_access wa
      WHERE wa.org_workspace_id = sessions.org_workspace_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grants
GRANT ALL ON TABLE public.sessions TO anon;
GRANT ALL ON TABLE public.sessions TO authenticated;
GRANT ALL ON TABLE public.sessions TO service_role;