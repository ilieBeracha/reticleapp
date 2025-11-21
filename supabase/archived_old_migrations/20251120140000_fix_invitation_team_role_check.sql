-- Fix the team_role check constraint on workspace_invitations table
-- to match the new role hierarchy: commander, squad_commander, soldier

-- Drop the old constraint
ALTER TABLE public.workspace_invitations
DROP CONSTRAINT IF EXISTS workspace_invitations_team_role_check;

-- Add the new constraint with updated roles
ALTER TABLE public.workspace_invitations
ADD CONSTRAINT workspace_invitations_team_role_check
CHECK (team_role IN ('commander', 'squad_commander', 'soldier'));

