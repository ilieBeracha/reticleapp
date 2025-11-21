-- Enforce squad requirements:
-- 1. Soldiers MUST have a squad_id in their details
-- 2. Squad commanders MUST have a squad_id in their details (the squad they command)
-- 3. Team commanders do NOT need a squad_id (they command the whole team)

-- Add a check constraint to ensure soldiers and squad_commanders have a squad_id
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_squad_requirement;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_squad_requirement
CHECK (
  (role = 'commander') OR  -- Commanders don't need squad
  (role IN ('soldier', 'squad_commander') AND details ? 'squad_id' AND details->>'squad_id' IS NOT NULL AND details->>'squad_id' != '')
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT team_members_squad_requirement ON public.team_members IS 
'Ensures that soldiers and squad_commanders must have a non-empty squad_id in their details. Commanders do not need a squad_id.';

