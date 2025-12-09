-- ============================================================================
-- Migration: Drop deprecated org-based functions and triggers
-- ============================================================================
-- This migration removes all functions that reference org_workspaces or 
-- workspace_access tables, which are no longer used in team-first architecture.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop triggers that use deprecated functions
-- ============================================================================

-- This trigger checks workspace_access - no longer valid
DROP TRIGGER IF EXISTS enforce_team_member_workspace_role ON public.team_members;

-- ============================================================================
-- STEP 2: Drop deprecated org-based functions
-- ============================================================================

-- Old invitation functions (use accept_team_invitation instead)
DROP FUNCTION IF EXISTS public.accept_invite_code(text, uuid);
DROP FUNCTION IF EXISTS public.validate_invite_code(text, uuid);

-- Old workspace creation (teams are created directly now)
DROP FUNCTION IF EXISTS public.create_org_workspace(text, text);

-- Old session creation (use direct INSERT or service layer)
DROP FUNCTION IF EXISTS public.create_session(text, uuid, uuid, uuid, text, jsonb);

-- Old team creation (use create_team_with_owner instead)
DROP FUNCTION IF EXISTS public.create_team(text, text, uuid, uuid, text, text[]);

-- Old member fetching functions
DROP FUNCTION IF EXISTS public.get_org_workspace_members(uuid);

-- Old session fetching (use service layer queries)
DROP FUNCTION IF EXISTS public.get_my_sessions(integer, integer);
DROP FUNCTION IF EXISTS public.get_workspace_sessions(uuid);

-- Old team fetching (use get_my_teams instead)
DROP FUNCTION IF EXISTS public.get_workspace_teams(uuid);

-- Old permission checks (use is_team_member, is_team_admin instead)
DROP FUNCTION IF EXISTS public.has_workspace_access(uuid);
DROP FUNCTION IF EXISTS public.is_workspace_admin(uuid, uuid);

-- Old trigger function (was used by enforce_team_member_workspace_role)
DROP FUNCTION IF EXISTS public.check_team_member_is_workspace_member();

-- ============================================================================
-- STEP 3: Clean up any remaining org references in other functions
-- ============================================================================

-- Update add_team_member to not check workspace membership
CREATE OR REPLACE FUNCTION public.add_team_member(
    p_team_id uuid,
    p_user_id uuid,
    p_role text DEFAULT 'soldier',
    p_squad_id text DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- Check if caller has permission (is team admin)
    IF NOT public.is_team_admin(p_team_id) THEN
        RAISE EXCEPTION 'Permission denied: must be team owner or commander';
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already a team member';
    END IF;
    
    -- Add the member
    INSERT INTO team_members (team_id, user_id, role, squad_id, details)
    VALUES (p_team_id, p_user_id, p_role, p_squad_id, p_details);
    
    -- Return member info
    SELECT jsonb_build_object(
        'success', true,
        'team_id', p_team_id,
        'user_id', p_user_id,
        'role', p_role
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Update remove_team_member to use team-first logic
CREATE OR REPLACE FUNCTION public.remove_team_member(
    p_team_id uuid,
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_role text;
BEGIN
    -- Get member's current role
    SELECT role INTO v_member_role
    FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id;
    
    IF v_member_role IS NULL THEN
        RAISE EXCEPTION 'User is not a team member';
    END IF;
    
    -- Check permissions: must be admin OR removing self
    IF NOT (public.is_team_admin(p_team_id) OR p_user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;
    
    -- Cannot remove owner unless you are the owner removing yourself
    IF v_member_role = 'owner' AND p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot remove team owner';
    END IF;
    
    -- Remove the member
    DELETE FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- Update update_team_member_role
CREATE OR REPLACE FUNCTION public.update_team_member_role(
    p_team_id uuid,
    p_user_id uuid,
    p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_role text;
BEGIN
    -- Validate role
    IF p_new_role NOT IN ('owner', 'commander', 'squad_commander', 'soldier') THEN
        RAISE EXCEPTION 'Invalid role: %', p_new_role;
    END IF;
    
    -- Check permissions
    IF NOT public.is_team_admin(p_team_id) THEN
        RAISE EXCEPTION 'Permission denied: must be team owner or commander';
    END IF;
    
    -- Get current role
    SELECT role INTO v_current_role
    FROM team_members
    WHERE team_id = p_team_id AND user_id = p_user_id;
    
    IF v_current_role IS NULL THEN
        RAISE EXCEPTION 'User is not a team member';
    END IF;
    
    -- Cannot change owner's role (owner must transfer ownership first)
    IF v_current_role = 'owner' AND p_new_role != 'owner' THEN
        RAISE EXCEPTION 'Cannot demote owner. Transfer ownership first.';
    END IF;
    
    -- Update role
    UPDATE team_members
    SET role = p_new_role, updated_at = now()
    WHERE team_id = p_team_id AND user_id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'old_role', v_current_role,
        'new_role', p_new_role
    );
END;
$$;

-- ============================================================================
-- STEP 4: Drop workspace_access table (data no longer needed)
-- ============================================================================

-- Note: Only run this if you're sure no data needs to be preserved
-- The table should already be dropped by previous migrations, but just in case:
DROP TABLE IF EXISTS public.workspace_access CASCADE;

-- ============================================================================
-- STEP 5: Mark org_workspaces as deprecated (keep for reference)
-- ============================================================================

-- Keep the table but add deprecation notice
COMMENT ON TABLE public.org_workspaces IS 'DEPRECATED: Legacy table - not used in team-first architecture. Safe to drop after data review.';

-- ============================================================================
-- DONE
-- ============================================================================

