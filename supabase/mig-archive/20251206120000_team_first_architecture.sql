-- ============================================================================
-- Migration: Team-First Architecture
-- ============================================================================
-- This migration removes the organization layer and makes Team the primary entity.
-- Users create and manage teams directly. Organizations are removed entirely.
-- ============================================================================

-- ============================================================================
-- STEP 0: Drop ALL policies that depend on workspace_access
-- ============================================================================

-- Sessions policies
DROP POLICY IF EXISTS "Users can view sessions" ON "public"."sessions";
DROP POLICY IF EXISTS "sessions_select" ON "public"."sessions";
DROP POLICY IF EXISTS "sessions_insert" ON "public"."sessions";
DROP POLICY IF EXISTS "sessions_delete" ON "public"."sessions";
DROP POLICY IF EXISTS "sessions_update" ON "public"."sessions";

-- Trainings policies
DROP POLICY IF EXISTS "Users can view trainings" ON "public"."trainings";
DROP POLICY IF EXISTS "trainings_select" ON "public"."trainings";
DROP POLICY IF EXISTS "trainings_insert" ON "public"."trainings";
DROP POLICY IF EXISTS "trainings_delete" ON "public"."trainings";
DROP POLICY IF EXISTS "trainings_update" ON "public"."trainings";
DROP POLICY IF EXISTS "Admins can manage trainings" ON "public"."trainings";

-- Training drills policies
DROP POLICY IF EXISTS "training_drills_select" ON "public"."training_drills";
DROP POLICY IF EXISTS "training_drills_insert" ON "public"."training_drills";
DROP POLICY IF EXISTS "training_drills_delete" ON "public"."training_drills";
DROP POLICY IF EXISTS "training_drills_update" ON "public"."training_drills";

-- Teams policies
DROP POLICY IF EXISTS "teams_select" ON "public"."teams";
DROP POLICY IF EXISTS "teams_insert" ON "public"."teams";
DROP POLICY IF EXISTS "teams_delete" ON "public"."teams";
DROP POLICY IF EXISTS "teams_update" ON "public"."teams";
DROP POLICY IF EXISTS "Users can view teams in their org" ON "public"."teams";
DROP POLICY IF EXISTS "Admins can manage teams" ON "public"."teams";

-- Team members policies
DROP POLICY IF EXISTS "team_members_select" ON "public"."team_members";
DROP POLICY IF EXISTS "team_members_insert" ON "public"."team_members";
DROP POLICY IF EXISTS "team_members_delete" ON "public"."team_members";
DROP POLICY IF EXISTS "team_members_update" ON "public"."team_members";
DROP POLICY IF EXISTS "Users can view team members" ON "public"."team_members";
DROP POLICY IF EXISTS "Admins can manage team members" ON "public"."team_members";

-- Org workspaces policies
DROP POLICY IF EXISTS "org_workspaces_select" ON "public"."org_workspaces";
DROP POLICY IF EXISTS "org_workspaces_insert" ON "public"."org_workspaces";
DROP POLICY IF EXISTS "org_workspaces_delete" ON "public"."org_workspaces";
DROP POLICY IF EXISTS "org_workspaces_update" ON "public"."org_workspaces";
DROP POLICY IF EXISTS "Only admin/owner can update org settings" ON "public"."org_workspaces";

-- Profiles policies that depend on workspace_access
DROP POLICY IF EXISTS "profiles_select" ON "public"."profiles";

-- User drill completions
DROP POLICY IF EXISTS "Admins can view all completions in their org" ON "public"."user_drill_completions";

-- ============================================================================
-- STEP 0.5: Handle workspace_invitations table (may or may not exist)
-- ============================================================================

-- Drop policies from workspace_invitations if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invitations') THEN
        DROP POLICY IF EXISTS "workspace_invitations_select" ON "public"."workspace_invitations";
        DROP POLICY IF EXISTS "workspace_invitations_insert" ON "public"."workspace_invitations";
        DROP POLICY IF EXISTS "workspace_invitations_delete" ON "public"."workspace_invitations";
        DROP POLICY IF EXISTS "workspace_invitations_update" ON "public"."workspace_invitations";
        DROP POLICY IF EXISTS "Users can view invitations" ON "public"."workspace_invitations";
        DROP POLICY IF EXISTS "Admins can create invitations" ON "public"."workspace_invitations";
    END IF;
END $$;

-- Drop policies from team_invitations if it exists (in case already renamed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_invitations') THEN
        DROP POLICY IF EXISTS "workspace_invitations_select" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "workspace_invitations_insert" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "workspace_invitations_delete" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "workspace_invitations_update" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "Users can view invitations" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "Admins can create invitations" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "Anyone can view pending invitations" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "Owners and commanders can create invitations" ON "public"."team_invitations";
        DROP POLICY IF EXISTS "Owners and commanders can update invitations" ON "public"."team_invitations";
    END IF;
END $$;

-- ============================================================================
-- STEP 1: Add created_by to teams (before removing org reference)
-- ============================================================================

-- Add created_by column to teams
ALTER TABLE "public"."teams" 
ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "public"."profiles"("id");

-- Populate created_by from org_workspaces.created_by for existing teams
UPDATE "public"."teams" t
SET created_by = ow.created_by
FROM "public"."org_workspaces" ow
WHERE t.org_workspace_id = ow.id
AND t.created_by IS NULL;

-- For any teams without org_workspace, set created_by to first team member
UPDATE "public"."teams" t
SET created_by = (
    SELECT user_id FROM "public"."team_members" 
    WHERE team_id = t.id 
    ORDER BY joined_at ASC 
    LIMIT 1
)
WHERE t.created_by IS NULL;

-- ============================================================================
-- STEP 2: Update sessions - remove org_workspace_id requirement
-- ============================================================================

-- Drop the FK constraint to org_workspaces
ALTER TABLE "public"."sessions" 
DROP CONSTRAINT IF EXISTS "sessions_org_workspace_fkey";

-- Make org_workspace_id nullable (will be deprecated)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'org_workspace_id'
    ) THEN
        ALTER TABLE "public"."sessions" ALTER COLUMN "org_workspace_id" DROP NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Update trainings - remove org_workspace_id requirement
-- ============================================================================

-- Drop the FK constraint to org_workspaces
ALTER TABLE "public"."trainings" 
DROP CONSTRAINT IF EXISTS "trainings_org_workspace_id_fkey";

-- Make org_workspace_id nullable (will be deprecated)  
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'trainings' AND column_name = 'org_workspace_id'
    ) THEN
        ALTER TABLE "public"."trainings" ALTER COLUMN "org_workspace_id" DROP NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Update workspace_invitations -> team_invitations
-- ============================================================================

-- Rename table to team_invitations (only if workspace_invitations exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invitations') THEN
        ALTER TABLE "public"."workspace_invitations" RENAME TO "team_invitations";
    END IF;
END $$;

-- Drop FK to org_workspaces (handle if table is workspace_invitations or team_invitations)
ALTER TABLE IF EXISTS "public"."team_invitations"
DROP CONSTRAINT IF EXISTS "workspace_invitations_org_workspace_fkey";

-- Make org_workspace_id nullable (deprecated)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'team_invitations' AND column_name = 'org_workspace_id'
    ) THEN
        ALTER TABLE "public"."team_invitations" ALTER COLUMN "org_workspace_id" DROP NOT NULL;
    END IF;
END $$;

-- Rename role column to be clearer (org role -> deprecated) - only if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'team_invitations' AND column_name = 'role'
    ) THEN
        ALTER TABLE "public"."team_invitations" RENAME COLUMN "role" TO "legacy_org_role";
    END IF;
END $$;

-- Update constraint for team_role to allow all values
ALTER TABLE "public"."team_invitations"
DROP CONSTRAINT IF EXISTS "workspace_invitations_team_role_check";

ALTER TABLE "public"."team_invitations"
DROP CONSTRAINT IF EXISTS "team_invitations_team_role_check";

ALTER TABLE "public"."team_invitations"
ADD CONSTRAINT "team_invitations_team_role_check"
CHECK (team_role IS NULL OR team_role = ANY (ARRAY['owner'::text, 'commander'::text, 'squad_commander'::text, 'soldier'::text]));

-- ============================================================================
-- STEP 5: Update teams - remove org_workspace_id requirement
-- ============================================================================

-- Drop the FK constraint to org_workspaces
ALTER TABLE "public"."teams"
DROP CONSTRAINT IF EXISTS "teams_org_workspace_fkey";

-- Make org_workspace_id nullable (deprecated)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'org_workspace_id'
    ) THEN
        ALTER TABLE "public"."teams" ALTER COLUMN "org_workspace_id" DROP NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Update team_members role to include 'owner'
-- ============================================================================

ALTER TABLE "public"."team_members"
DROP CONSTRAINT IF EXISTS "team_members_role_check";

ALTER TABLE "public"."team_members"
ADD CONSTRAINT "team_members_role_check"
CHECK (role = ANY (ARRAY['owner'::text, 'commander'::text, 'squad_commander'::text, 'soldier'::text]));

-- ============================================================================
-- STEP 7: Drop workspace_access table (if it exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_access') THEN
        -- Drop all remaining policies on workspace_access
        DROP POLICY IF EXISTS "Users can view workspace access" ON "public"."workspace_access";
        DROP POLICY IF EXISTS "Admins can manage workspace access" ON "public"."workspace_access";
        DROP POLICY IF EXISTS "workspace_access_select" ON "public"."workspace_access";
        DROP POLICY IF EXISTS "workspace_access_insert" ON "public"."workspace_access";
        DROP POLICY IF EXISTS "workspace_access_update" ON "public"."workspace_access";
        DROP POLICY IF EXISTS "workspace_access_delete" ON "public"."workspace_access";
        
        -- Now drop the table
        DROP TABLE "public"."workspace_access" CASCADE;
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Create new RLS policies for teams (team-based access)
-- ============================================================================

-- Drop existing policies first (clean slate)
DROP POLICY IF EXISTS "Users can view own teams" ON "public"."teams";
DROP POLICY IF EXISTS "Users can create teams" ON "public"."teams";
DROP POLICY IF EXISTS "Owners and commanders can update teams" ON "public"."teams";
DROP POLICY IF EXISTS "Owners can delete teams" ON "public"."teams";

-- Anyone can view teams they're a member of OR created
CREATE POLICY "Users can view own teams"
ON "public"."teams"
FOR SELECT
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM "public"."team_members"
        WHERE team_id = teams.id AND user_id = auth.uid()
    )
);

-- Users can create teams
CREATE POLICY "Users can create teams"
ON "public"."teams"
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Only owner or commander can update teams
CREATE POLICY "Owners and commanders can update teams"
ON "public"."teams"
FOR UPDATE
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM "public"."team_members"
        WHERE team_id = teams.id 
        AND user_id = auth.uid()
        AND role IN ('owner', 'commander')
    )
);

-- Only owner can delete teams
CREATE POLICY "Owners can delete teams"
ON "public"."teams"
FOR DELETE
USING (created_by = auth.uid());

-- ============================================================================
-- STEP 9: Create new RLS policies for team_members
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Team members can view teammates" ON "public"."team_members";
DROP POLICY IF EXISTS "Owners and commanders can add members" ON "public"."team_members";
DROP POLICY IF EXISTS "Owners and commanders can update members" ON "public"."team_members";
DROP POLICY IF EXISTS "Owners and commanders can remove members" ON "public"."team_members";

-- Team members can view their teammates
CREATE POLICY "Team members can view teammates"
ON "public"."team_members"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."team_members" tm
        WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM "public"."teams" t
        WHERE t.id = team_members.team_id AND t.created_by = auth.uid()
    )
);

-- Owner/commander can add members
CREATE POLICY "Owners and commanders can add members"
ON "public"."team_members"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."teams" t
        WHERE t.id = team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM "public"."team_members" tm
        WHERE tm.team_id = team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'commander')
    )
);

-- Owner/commander can update members
CREATE POLICY "Owners and commanders can update members"
ON "public"."team_members"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."teams" t
        WHERE t.id = team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM "public"."team_members" tm
        WHERE tm.team_id = team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'commander')
    )
);

-- Owner/commander can remove members, or members can leave
CREATE POLICY "Owners and commanders can remove members"
ON "public"."team_members"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."teams" t
        WHERE t.id = team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM "public"."team_members" tm
        WHERE tm.team_id = team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'commander')
    )
    OR user_id = auth.uid()
);

-- ============================================================================
-- STEP 10: Create new RLS for team_invitations
-- ============================================================================

-- Anyone can view pending invitations (for accepting via code)
CREATE POLICY "Anyone can view pending invitations"
ON "public"."team_invitations"
FOR SELECT
USING (true);

-- Owner/commander can create invitations
CREATE POLICY "Owners and commanders can create invitations"
ON "public"."team_invitations"
FOR INSERT
WITH CHECK (
    team_id IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM "public"."teams" t
            WHERE t.id = team_id AND t.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM "public"."team_members" tm
            WHERE tm.team_id = team_invitations.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'commander')
        )
    )
);

-- Owner/commander can update invitations (cancel, etc)
CREATE POLICY "Owners and commanders can update invitations"
ON "public"."team_invitations"
FOR UPDATE
USING (
    team_id IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM "public"."teams" t
            WHERE t.id = team_id AND t.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM "public"."team_members" tm
            WHERE tm.team_id = team_invitations.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'commander')
        )
    )
);

-- ============================================================================
-- STEP 11: Create new RLS for sessions (team-based access)
-- ============================================================================

-- Drop existing first
DROP POLICY IF EXISTS "Users can view own and team sessions" ON "public"."sessions";
DROP POLICY IF EXISTS "Users can create sessions" ON "public"."sessions";
DROP POLICY IF EXISTS "Users can update own sessions" ON "public"."sessions";
DROP POLICY IF EXISTS "Users can delete own sessions" ON "public"."sessions";

-- Users can view their own sessions or team sessions
CREATE POLICY "Users can view own and team sessions"
ON "public"."sessions"
FOR SELECT
USING (
    user_id = auth.uid()
    OR (
        team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM "public"."team_members" tm
            WHERE tm.team_id = sessions.team_id AND tm.user_id = auth.uid()
        )
    )
);

-- Users can create sessions
CREATE POLICY "Users can create sessions"
ON "public"."sessions"
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON "public"."sessions"
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON "public"."sessions"
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- STEP 12: Create new RLS for trainings (team-based access)
-- ============================================================================

-- Drop existing first
DROP POLICY IF EXISTS "Users can view team trainings" ON "public"."trainings";
DROP POLICY IF EXISTS "Owners and commanders can create trainings" ON "public"."trainings";
DROP POLICY IF EXISTS "Owners and commanders can update trainings" ON "public"."trainings";
DROP POLICY IF EXISTS "Owners can delete trainings" ON "public"."trainings";

-- Users can view trainings for their teams
CREATE POLICY "Users can view team trainings"
ON "public"."trainings"
FOR SELECT
USING (
    created_by = auth.uid()
    OR (
        team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM "public"."team_members" tm
            WHERE tm.team_id = trainings.team_id AND tm.user_id = auth.uid()
        )
    )
);

-- Team owner/commander can create trainings
CREATE POLICY "Owners and commanders can create trainings"
ON "public"."trainings"
FOR INSERT
WITH CHECK (
    created_by = auth.uid()
    AND (
        team_id IS NULL
        OR EXISTS (
            SELECT 1 FROM "public"."teams" t
            WHERE t.id = team_id AND t.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM "public"."team_members" tm
            WHERE tm.team_id = trainings.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'commander')
        )
    )
);

-- Owner/commander can update trainings
CREATE POLICY "Owners and commanders can update trainings"
ON "public"."trainings"
FOR UPDATE
USING (
    created_by = auth.uid()
    OR (
        team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM "public"."team_members" tm
            WHERE tm.team_id = trainings.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'commander')
        )
    )
);

-- Owner can delete trainings
CREATE POLICY "Owners can delete trainings"
ON "public"."trainings"
FOR DELETE
USING (created_by = auth.uid());

-- ============================================================================
-- STEP 13: Create new RLS for training_drills
-- ============================================================================

-- Drop existing first
DROP POLICY IF EXISTS "Users can view training drills" ON "public"."training_drills";
DROP POLICY IF EXISTS "Owners and commanders can create drills" ON "public"."training_drills";
DROP POLICY IF EXISTS "Owners and commanders can update drills" ON "public"."training_drills";
DROP POLICY IF EXISTS "Owners and commanders can delete drills" ON "public"."training_drills";

-- Users can view drills for trainings they can see
CREATE POLICY "Users can view training drills"
ON "public"."training_drills"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."trainings" t
        WHERE t.id = training_id
        AND (
            t.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM "public"."team_members" tm
                WHERE tm.team_id = t.team_id AND tm.user_id = auth.uid()
            )
        )
    )
);

-- Owner/commander can create drills
CREATE POLICY "Owners and commanders can create drills"
ON "public"."training_drills"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."trainings" t
        WHERE t.id = training_id
        AND (
            t.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM "public"."team_members" tm
                WHERE tm.team_id = t.team_id 
                AND tm.user_id = auth.uid()
                AND tm.role IN ('owner', 'commander')
            )
        )
    )
);

-- Owner/commander can update drills
CREATE POLICY "Owners and commanders can update drills"
ON "public"."training_drills"
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM "public"."trainings" t
        WHERE t.id = training_id
        AND (
            t.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM "public"."team_members" tm
                WHERE tm.team_id = t.team_id 
                AND tm.user_id = auth.uid()
                AND tm.role IN ('owner', 'commander')
            )
        )
    )
);

-- Owner/commander can delete drills
CREATE POLICY "Owners and commanders can delete drills"
ON "public"."training_drills"
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM "public"."trainings" t
        WHERE t.id = training_id
        AND (
            t.created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM "public"."team_members" tm
                WHERE tm.team_id = t.team_id 
                AND tm.user_id = auth.uid()
                AND tm.role IN ('owner', 'commander')
            )
        )
    )
);

-- ============================================================================
-- STEP 14: Create new RLS for profiles
-- ============================================================================

-- Drop existing first
DROP POLICY IF EXISTS "Users can view profiles" ON "public"."profiles";

-- Users can view profiles of their teammates
CREATE POLICY "Users can view profiles"
ON "public"."profiles"
FOR SELECT
USING (
    id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM "public"."team_members" tm1
        JOIN "public"."team_members" tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
    )
);

-- ============================================================================
-- STEP 15: Create new RLS for user_drill_completions
-- ============================================================================

-- Drop existing first
DROP POLICY IF EXISTS "Users can view drill completions" ON "public"."user_drill_completions";

-- Users can view their own completions and completions of teammates
CREATE POLICY "Users can view drill completions"
ON "public"."user_drill_completions"
FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM "public"."trainings" t
        WHERE t.id = training_id
        AND EXISTS (
            SELECT 1 FROM "public"."team_members" tm
            WHERE tm.team_id = t.team_id AND tm.user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- STEP 16: Create new RLS for org_workspaces (deprecated but keep readable)
-- ============================================================================

-- Drop existing first
DROP POLICY IF EXISTS "Anyone can view org_workspaces" ON "public"."org_workspaces";

-- Allow reading for migration purposes
CREATE POLICY "Anyone can view org_workspaces"
ON "public"."org_workspaces"
FOR SELECT
USING (true);

-- ============================================================================
-- STEP 17: Create RPC function to create team (with owner membership)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
    p_name text,
    p_description text DEFAULT NULL,
    p_squads text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_team_id uuid;
    v_team jsonb;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Create team
    INSERT INTO public.teams (name, description, squads, created_by)
    VALUES (p_name, p_description, p_squads, v_user_id)
    RETURNING id INTO v_team_id;
    
    -- Add creator as owner
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, v_user_id, 'owner');
    
    -- Return team data
    SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'squads', t.squads,
        'created_by', t.created_by,
        'created_at', t.created_at
    ) INTO v_team
    FROM public.teams t
    WHERE t.id = v_team_id;
    
    RETURN v_team;
END;
$$;

-- ============================================================================
-- STEP 18: Create RPC to accept team invitation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_team_invitation(
    p_invite_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_invitation RECORD;
    v_result jsonb;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Find invitation
    SELECT * INTO v_invitation
    FROM public.team_invitations
    WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND expires_at > now()
    AND team_id IS NOT NULL;
    
    IF v_invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Check if already a member
    IF EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = v_invitation.team_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Already a member of this team';
    END IF;
    
    -- Add as team member
    INSERT INTO public.team_members (team_id, user_id, role, details)
    VALUES (
        v_invitation.team_id,
        v_user_id,
        COALESCE(v_invitation.team_role, 'soldier'),
        COALESCE(v_invitation.details, '{}'::jsonb)
    );
    
    -- Update invitation
    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_by = v_user_id,
        accepted_at = now(),
        updated_at = now()
    WHERE id = v_invitation.id;
    
    -- Return result
    SELECT jsonb_build_object(
        'success', true,
        'team_id', v_invitation.team_id,
        'team_name', t.name,
        'role', COALESCE(v_invitation.team_role, 'soldier')
    ) INTO v_result
    FROM public.teams t
    WHERE t.id = v_invitation.team_id;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- STEP 19: Update notifications trigger to use team_members.user_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_team_on_training_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    team_member RECORD;
    training_title TEXT;
    team_name TEXT;
    creator_name TEXT;
BEGIN
    -- Get training title
    training_title := NEW.title;
    
    -- Get team name if available
    IF NEW.team_id IS NOT NULL THEN
        SELECT name INTO team_name FROM public.teams WHERE id = NEW.team_id;
    END IF;
    
    -- Get creator name
    SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.created_by;
    
    -- If there's a team, notify all team members (except creator)
    IF NEW.team_id IS NOT NULL THEN
        FOR team_member IN 
            SELECT DISTINCT tm.user_id 
            FROM public.team_members tm
            WHERE tm.team_id = NEW.team_id
            AND tm.user_id != NEW.created_by
        LOOP
            INSERT INTO public.notifications (user_id, type, title, body, data)
            VALUES (
                team_member.user_id,
                'training_created',
                'New Training Scheduled',
                COALESCE(creator_name, 'Someone') || ' created "' || training_title || '"' || 
                    CASE WHEN team_name IS NOT NULL THEN ' for ' || team_name ELSE '' END,
                jsonb_build_object(
                    'training_id', NEW.id,
                    'team_id', NEW.team_id,
                    'scheduled_at', NEW.scheduled_at
                )
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 20: Create helper function to get user's teams
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_teams()
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    squads text[],
    team_type text,
    created_by uuid,
    created_at timestamptz,
    my_role text,
    member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.description,
        t.squads,
        t.team_type,
        t.created_by,
        t.created_at,
        tm.role,
        (SELECT COUNT(*) FROM public.team_members WHERE team_id = t.id)
    FROM public.teams t
    JOIN public.team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = auth.uid()
    ORDER BY t.created_at DESC;
END;
$$;

-- ============================================================================
-- STEP 21: Create helper function to get team with members
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_team_with_members(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_result jsonb;
BEGIN
    v_user_id := auth.uid();
    
    -- Check access
    IF NOT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = p_team_id AND user_id = v_user_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = p_team_id AND created_by = v_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Build result
    SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'squads', t.squads,
        'team_type', t.team_type,
        'created_by', t.created_by,
        'created_at', t.created_at,
        'members', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'user_id', tm.user_id,
                    'role', tm.role,
                    'details', tm.details,
                    'joined_at', tm.joined_at,
                    'profile', jsonb_build_object(
                        'id', p.id,
                        'email', p.email,
                        'full_name', p.full_name,
                        'avatar_url', p.avatar_url
                    )
                )
            )
            FROM public.team_members tm
            JOIN public.profiles p ON p.id = tm.user_id
            WHERE tm.team_id = t.id
        )
    ) INTO v_result
    FROM public.teams t
    WHERE t.id = p_team_id;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- DONE: org_workspaces table is now orphaned and can be dropped in future
-- We keep it for now to preserve data, but it's no longer referenced
-- ============================================================================

-- Add comment to mark deprecated tables
COMMENT ON TABLE "public"."org_workspaces" IS 'DEPRECATED: Organization workspaces - no longer used in team-first architecture';
