-- ============================================================================
-- FIX: RLS Policy Recursion on team_members
-- 
-- The previous migration created policies that query team_members FROM team_members
-- causing infinite recursion. This migration fixes it by using simpler conditions.
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Team members can view teammates" ON "public"."team_members";
DROP POLICY IF EXISTS "Owners and commanders can add members" ON "public"."team_members";
DROP POLICY IF EXISTS "Owners and commanders can update members" ON "public"."team_members";
DROP POLICY IF EXISTS "Owners and commanders can remove members" ON "public"."team_members";

-- Create a helper function to check team membership (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = p_team_id AND user_id = p_user_id
    );
$$;

-- Create a helper function to check if user is team owner/commander
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = p_team_id 
        AND user_id = p_user_id
        AND role IN ('owner', 'commander')
    )
    OR EXISTS (
        SELECT 1 FROM teams
        WHERE id = p_team_id AND created_by = p_user_id
    );
$$;

-- Create a helper function to check if two users share a team
CREATE OR REPLACE FUNCTION public.shares_team_with(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = auth.uid()
        AND tm2.user_id = p_other_user_id
    );
$$;

-- ============================================================================
-- NEW POLICIES FOR team_members (simple, no recursion)
-- ============================================================================

-- Users can view their own team memberships
CREATE POLICY "Users can view own memberships"
ON "public"."team_members"
FOR SELECT
USING (
    -- User can see their own memberships
    user_id = auth.uid()
    -- Or user is the team creator
    OR EXISTS (
        SELECT 1 FROM "public"."teams" t
        WHERE t.id = team_id AND t.created_by = auth.uid()
    )
);

-- Owner/commander can add members
CREATE POLICY "Owners and commanders can add members"
ON "public"."team_members"
FOR INSERT
WITH CHECK (
    public.is_team_admin(team_id)
);

-- Owner/commander can update members
CREATE POLICY "Owners and commanders can update members"
ON "public"."team_members"
FOR UPDATE
USING (
    public.is_team_admin(team_id)
);

-- Owner/commander can remove members, or members can leave
CREATE POLICY "Owners and commanders can remove members"
ON "public"."team_members"
FOR DELETE
USING (
    public.is_team_admin(team_id)
    OR user_id = auth.uid()  -- Members can leave
);

-- ============================================================================
-- Update profiles policy too (simpler approach)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view profiles of teammates" ON "public"."profiles";

-- Users can view profiles of people they share a team with
CREATE POLICY "Users can view profiles of teammates"
ON "public"."profiles"
FOR SELECT
USING (
    -- Own profile
    id = auth.uid()
    -- Or shares a team with the user
    OR public.shares_team_with(id)
);

-- ============================================================================
-- FIX 2: Make org_workspace_id nullable for team-first architecture
-- Teams can exist independently without belonging to an organization
-- ============================================================================

ALTER TABLE "public"."teams" 
ALTER COLUMN "org_workspace_id" DROP NOT NULL;

COMMENT ON COLUMN "public"."teams"."org_workspace_id" IS 'DEPRECATED: Legacy org reference - nullable in team-first architecture';

-- ============================================================================
-- FIX 3: Fix RLS recursion on teams/sessions/trainings tables
-- These policies were directly querying team_members, causing recursion.
-- Now they use SECURITY DEFINER helper functions instead.
-- ============================================================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view own teams" ON "public"."teams";
DROP POLICY IF EXISTS "Owners and commanders can update teams" ON "public"."teams";
DROP POLICY IF EXISTS "Users can view own and team sessions" ON "public"."sessions";
DROP POLICY IF EXISTS "Users can view team trainings" ON "public"."trainings";
DROP POLICY IF EXISTS "Owners and commanders can update trainings" ON "public"."trainings";

-- Teams: Users can view teams they created or are members of
CREATE POLICY "Users can view own teams"
ON "public"."teams"
FOR SELECT
USING (
    created_by = auth.uid()
    OR public.is_team_member(id)
);

-- Teams: Owners and commanders can update
CREATE POLICY "Owners and commanders can update teams"
ON "public"."teams"
FOR UPDATE
USING (
    created_by = auth.uid()
    OR public.is_team_admin(id)
);

-- Sessions: Users can view their own sessions or team sessions they're part of
CREATE POLICY "Users can view own and team sessions"
ON "public"."sessions"
FOR SELECT
USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_member(team_id))
);

-- Trainings: Users can view trainings for teams they're in
CREATE POLICY "Users can view team trainings"
ON "public"."trainings"
FOR SELECT
USING (
    created_by = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_member(team_id))
);

-- Trainings: Owners and commanders can update
CREATE POLICY "Owners and commanders can update trainings"
ON "public"."trainings"
FOR UPDATE
USING (
    created_by = auth.uid()
    OR (team_id IS NOT NULL AND public.is_team_admin(team_id))
);
