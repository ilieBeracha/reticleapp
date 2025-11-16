-- =====================================================
-- CLEAN SCHEMA: Profile + Workspaces + Teams
-- Single trigger, correct IDs, proper RLS
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

CREATE OR REPLACE FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") 
RETURNS boolean
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  );
END;
$$;

ALTER FUNCTION "public"."has_workspace_access"("p_workspace_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") 
RETURNS boolean
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND workspace_role IN ('owner', 'admin')
  );
END;
$$;

ALTER FUNCTION "public"."is_workspace_admin"("p_workspace_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") 
RETURNS boolean
LANGUAGE "plpgsql" 
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role IN ('manager', 'commander')
      AND is_active = true
  );
END;
$$;

ALTER FUNCTION "public"."is_team_leader"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") 
RETURNS TABLE("team_id" "uuid", "team_name" "text", "team_type" "text", "member_count" bigint)
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id;
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.team_type,
    COUNT(tm.user_id) AS member_count
  FROM teams t
  LEFT JOIN team_memberships tm
    ON tm.team_id = t.id
   AND tm.is_active = true
  WHERE t.workspace_id = p_workspace_id
  GROUP BY t.id
  ORDER BY t.team_type, t.name;
END;
$$;

ALTER FUNCTION "public"."get_workspace_teams"("p_workspace_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_team_members"("p_team_id" "uuid") 
RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "role" "text", "joined_at" timestamp with time zone)
LANGUAGE "plpgsql" 
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM teams t
    JOIN workspace_members wm
      ON wm.workspace_id = t.workspace_id
     AND wm.user_id = auth.uid()
    WHERE t.id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Access denied to team %', p_team_id;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    tm.role,
    tm.joined_at
  FROM team_memberships tm
  JOIN profiles p ON p.id = tm.user_id
  WHERE tm.team_id = p_team_id
    AND tm.is_active = true
  ORDER BY tm.role, p.full_name;
END;
$$;

ALTER FUNCTION "public"."get_team_members"("p_team_id" "uuid") OWNER TO "postgres";

-- =====================================================
-- TABLES
-- =====================================================

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- PROFILES (id = auth.users.id, NO DEFAULT!)
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" "uuid" PRIMARY KEY,  -- NO DEFAULT - must match auth.users.id
  "email" "text" UNIQUE,
  "username" "text" UNIQUE,
  "display_name" "text",
  "full_name" "text",
  "avatar_url" "text",
  "bio" "text",
  "location" "text",
  "website" "text",

  "personal_workspace_id" "uuid",
  "active_workspace_id" "uuid",
  "active_view_mode" "text" DEFAULT 'personal',

  "auth_provider" "text",
  "external_provider_id" "text",
  "oauth_sub" "text",
  "last_login_at" timestamptz,
  "is_email_verified" boolean DEFAULT false,
  "is_phone_verified" boolean DEFAULT false,

  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "profiles_active_view_mode_check" CHECK ("active_view_mode" IN ('personal', 'org'))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";
COMMENT ON TABLE "public"."profiles" IS 'User profiles (id = auth.users.id)';

-- WORKSPACES
CREATE TABLE IF NOT EXISTS "public"."workspaces" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" "text" NOT NULL,
  "workspace_type" "text" NOT NULL,
  "description" "text",
  "created_by" "uuid",
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "workspaces_workspace_type_check" CHECK ("workspace_type" IN ('personal', 'organization'))
);

ALTER TABLE "public"."workspaces" OWNER TO "postgres";

-- WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" "uuid" NOT NULL,
  "workspace_id" "uuid" NOT NULL,
  "workspace_role" "text" NOT NULL DEFAULT 'member',
  "joined_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "workspace_members_workspace_role_check" CHECK ("workspace_role" IN ('owner', 'admin', 'member')),
  CONSTRAINT "workspace_members_user_id_workspace_id_key" UNIQUE ("user_id", "workspace_id")
);

ALTER TABLE "public"."workspace_members" OWNER TO "postgres";

-- TEAMS
CREATE TABLE IF NOT EXISTS "public"."teams" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" "uuid" NOT NULL,
  "name" "text" NOT NULL,
  "team_type" "text" NOT NULL,
  "description" "text",
  "created_by" "uuid",
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "teams_team_type_check" CHECK ("team_type" IN ('field', 'back_office'))
);

ALTER TABLE "public"."teams" OWNER TO "postgres";

-- TEAM MEMBERSHIPS
CREATE TABLE IF NOT EXISTS "public"."team_memberships" (
  "id" "uuid" PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" "uuid" NOT NULL,
  "team_id" "uuid" NOT NULL,
  "role" "text" NOT NULL,
  "is_active" boolean DEFAULT true,
  "joined_at" timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT "team_memberships_role_check" CHECK ("role" IN ('sniper', 'pistol', 'manager', 'commander', 'instructor', 'staff')),
  CONSTRAINT "team_memberships_user_id_team_id_key" UNIQUE ("user_id", "team_id")
);

ALTER TABLE "public"."team_memberships" OWNER TO "postgres";

-- =====================================================
-- FOREIGN KEYS
-- =====================================================

ALTER TABLE ONLY "public"."workspaces"
  ADD CONSTRAINT "workspaces_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."workspace_members"
  ADD CONSTRAINT "workspace_members_user_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_members"
  ADD CONSTRAINT "workspace_members_workspace_fkey" 
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."teams"
  ADD CONSTRAINT "teams_workspace_id_fkey" 
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."teams"
  ADD CONSTRAINT "teams_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."team_memberships"
  ADD CONSTRAINT "team_memberships_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_memberships"
  ADD CONSTRAINT "team_memberships_team_id_fkey" 
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

-- =====================================================
-- SINGLE TRIGGER: Create profile + workspace on signup
-- =====================================================

CREATE OR REPLACE FUNCTION "public"."handle_new_user_full"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  personal_ws_id uuid;
BEGIN
  -- 1. Create profile (id = auth.users.id)
  INSERT INTO public.profiles (
    id,
    email,
    username,
    display_name,
    full_name,
    avatar_url,
    auth_provider,
    external_provider_id,
    oauth_sub,
    is_email_verified,
    is_phone_verified,
    last_login_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider',
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'sub',
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, false),
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create personal workspace
  INSERT INTO public.workspaces (name, workspace_type, description, created_by)
  VALUES (
    CONCAT('Personal - ', COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)),
    'personal',
    'Personal workspace',
    NEW.id
  )
  RETURNING id INTO personal_ws_id;

  -- 3. Update profile with workspace IDs
  UPDATE public.profiles
  SET 
    personal_workspace_id = personal_ws_id,
    active_workspace_id = personal_ws_id,
    active_view_mode = 'personal'
  WHERE id = NEW.id;

  -- 4. Create membership
  INSERT INTO public.workspace_members (user_id, workspace_id, workspace_role)
  VALUES (NEW.id, personal_ws_id, 'owner');

  -- 5. ✨ UPDATE auth.users.raw_user_meta_data with workspace ID
  -- This ensures auth.getUser() returns active_workspace_id in user_metadata
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('active_workspace_id', personal_ws_id::text)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."handle_new_user_full"() OWNER TO "postgres";

-- =====================================================
-- SYNC: Keep auth.users.raw_user_meta_data in sync with profiles
-- =====================================================

CREATE OR REPLACE FUNCTION "public"."sync_profile_to_auth_metadata"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if values actually changed (prevent infinite recursion)
  IF (OLD.active_workspace_id IS DISTINCT FROM NEW.active_workspace_id) OR
     (OLD.full_name IS DISTINCT FROM NEW.full_name) OR
     (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) THEN
    
    -- Sync to auth.users.raw_user_meta_data
    UPDATE auth.users
    SET raw_user_meta_data = 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'active_workspace_id', NEW.active_workspace_id::text,
        'full_name', NEW.full_name,
        'avatar_url', NEW.avatar_url
      )
    WHERE id = NEW.id
      -- Only update if value actually changed
      AND (
        COALESCE(raw_user_meta_data->>'active_workspace_id', '') != COALESCE(NEW.active_workspace_id::text, '')
        OR COALESCE(raw_user_meta_data->>'full_name', '') != COALESCE(NEW.full_name, '')
        OR COALESCE(raw_user_meta_data->>'avatar_url', '') != COALESCE(NEW.avatar_url, '')
      );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."sync_profile_to_auth_metadata"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."sync_auth_metadata_to_profile"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
  new_full_name text;
  new_avatar_url text;
BEGIN
  -- Extract values from metadata
  new_workspace_id := (NEW.raw_user_meta_data->>'active_workspace_id')::uuid;
  new_full_name := NEW.raw_user_meta_data->>'full_name';
  new_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  
  -- Only sync if values actually changed (prevent infinite recursion)
  UPDATE public.profiles
  SET 
    active_workspace_id = new_workspace_id,
    full_name = new_full_name,
    avatar_url = new_avatar_url,
    updated_at = now()
  WHERE id = NEW.id
    -- Only update if value actually changed
    AND (
      COALESCE(active_workspace_id::text, '') != COALESCE(new_workspace_id::text, '')
      OR COALESCE(full_name, '') != COALESCE(new_full_name, '')
      OR COALESCE(avatar_url, '') != COALESCE(new_avatar_url, '')
    );

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."sync_auth_metadata_to_profile"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."delete_auth_user_on_profile_delete"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When profile is deleted, also delete the auth.users record
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

ALTER FUNCTION "public"."delete_auth_user_on_profile_delete"() OWNER TO "postgres";

-- =====================================================
-- ROW LEVEL SECURITY (Enable first, policies after)
-- =====================================================

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_memberships" ENABLE ROW LEVEL SECURITY;

-- Create policies AFTER all tables are set up
CREATE POLICY "profiles_select_self" ON "public"."profiles"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_self" ON "public"."profiles"
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_self" ON "public"."profiles"
  FOR DELETE USING (auth.uid() = id);

CREATE POLICY "workspaces_select_member" ON "public"."workspaces"
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "workspace_members_select_own" ON "public"."workspace_members"
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "teams_select_workspace_member" ON "public"."teams"
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "team_memberships_select" ON "public"."team_memberships"
  FOR SELECT USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.workspace_members wm ON wm.workspace_id = t.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "team_memberships_update_self" ON "public"."team_memberships"
  FOR UPDATE USING (user_id = auth.uid());

-- Attach triggers (AFTER all tables + policies are ready)

-- When new user signs up → create profile + workspace
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_full();

-- When auth.users.raw_user_meta_data is updated → sync to profiles
CREATE TRIGGER on_auth_metadata_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_metadata_to_profile();

-- When profiles table is updated → sync back to auth.users
CREATE TRIGGER on_profile_updated
  AFTER UPDATE OF active_workspace_id, full_name, avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth_metadata();

-- When profile is deleted → delete auth.users record
CREATE TRIGGER on_profile_deleted
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_auth_user_on_profile_delete();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

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

GRANT ALL ON FUNCTION "public"."handle_new_user_full"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_full"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_full"() TO "service_role";

GRANT ALL ON FUNCTION "public"."sync_profile_to_auth_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_to_auth_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_to_auth_metadata"() TO "service_role";

GRANT ALL ON FUNCTION "public"."sync_auth_metadata_to_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_auth_metadata_to_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_auth_metadata_to_profile"() TO "service_role";

GRANT ALL ON FUNCTION "public"."delete_auth_user_on_profile_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_user_on_profile_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_user_on_profile_delete"() TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";

GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";

GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";

GRANT ALL ON TABLE "public"."team_memberships" TO "anon";
GRANT ALL ON TABLE "public"."team_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."team_memberships" TO "service_role";

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
