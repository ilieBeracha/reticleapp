-- =============================================================================
-- Migration: ROLLBACK - Remove weapon_policy from teams table
-- Date: 2026-01-15
-- Description: Reverts the weapon_policy feature added in 20260114
-- =============================================================================

-- Drop the constraint first
ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS teams_weapon_policy_check;

-- Remove the column
ALTER TABLE public.teams 
DROP COLUMN IF EXISTS weapon_policy;

-- =============================================================================
-- Drop BOTH function overloads and recreate only the one without weapon_policy
-- =============================================================================

-- Drop the version WITH weapon_policy parameter
DROP FUNCTION IF EXISTS public.create_team_with_owner(TEXT, TEXT, TEXT[], TEXT);

-- Drop the version WITHOUT weapon_policy parameter (to avoid conflicts)
DROP FUNCTION IF EXISTS public.create_team_with_owner(TEXT, TEXT, TEXT[]);

-- Recreate the function WITHOUT weapon_policy
CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_squads TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS public.teams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_team public.teams;
BEGIN
  -- Create the team
  INSERT INTO public.teams (name, description, squads, created_by)
  VALUES (p_name, p_description, p_squads, v_user_id)
  RETURNING * INTO v_team;

  -- Add creator as owner
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team.id, v_user_id, 'owner');

  RETURN v_team;
END;
$$;
