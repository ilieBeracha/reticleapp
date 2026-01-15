-- =============================================================================
-- Migration: Add weapon_policy to teams table
-- Date: 2026-01-14
-- Description: Adds weapon policy configuration for teams
--
-- Policy values:
-- - 'personal': Members can bring/use their own personal weapons
-- - 'catalog': Members must choose from team's weapon catalog  
-- - 'assigned': Weapons are assigned by commanders (no participation without assignment)
-- =============================================================================

-- Add weapon_policy column with default 'personal'
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS weapon_policy TEXT DEFAULT 'personal';

-- Add constraint to ensure valid policy values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_weapon_policy_check'
  ) THEN
    ALTER TABLE public.teams 
    ADD CONSTRAINT teams_weapon_policy_check 
    CHECK (weapon_policy IN ('personal', 'catalog', 'assigned'));
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.teams.weapon_policy IS 
  'Weapon access policy: personal (bring own), catalog (team catalog), assigned (commander assigns)';

-- =============================================================================
-- Update create_team_with_owner RPC to accept weapon_policy parameter
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_squads TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_weapon_policy TEXT DEFAULT 'personal'
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
  -- Validate weapon policy
  IF p_weapon_policy NOT IN ('personal', 'catalog', 'assigned') THEN
    RAISE EXCEPTION 'Invalid weapon policy: %', p_weapon_policy;
  END IF;

  -- Create the team
  INSERT INTO public.teams (name, description, squads, created_by, weapon_policy)
  VALUES (p_name, p_description, p_squads, v_user_id, p_weapon_policy)
  RETURNING * INTO v_team;

  -- Add creator as owner
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team.id, v_user_id, 'owner');

  RETURN v_team;
END;
$$;
