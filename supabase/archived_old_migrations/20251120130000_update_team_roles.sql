-- Update team roles to new hierarchy
-- commander: One per team - full control
-- squad_commander: Manages a squad
-- soldier: Regular team member

-- First, update any existing roles to the new system
-- Map old roles to new ones:
-- 'manager' -> 'squad_commander'
-- 'sniper', 'pistol', 'staff', 'instructor' -> 'soldier'
-- 'commander' stays as 'commander'

UPDATE public.team_members
SET role = CASE
  WHEN role = 'manager' THEN 'squad_commander'
  WHEN role IN ('sniper', 'pistol', 'staff', 'instructor') THEN 'soldier'
  ELSE role
END
WHERE role IN ('manager', 'sniper', 'pistol', 'staff', 'instructor');

-- Add a unique constraint to ensure only one commander per team
-- First drop the constraint if it exists
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_one_commander_per_team;

-- Create a unique partial index to enforce one commander per team
CREATE UNIQUE INDEX IF NOT EXISTS team_members_one_commander_per_team 
ON public.team_members (team_id) 
WHERE role = 'commander';

-- Add a check constraint to validate role values
ALTER TABLE public.team_members 
DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_role_check 
CHECK (role IN ('commander', 'squad_commander', 'soldier'));

-- Update the RLS policies to reflect new roles
-- Team commanders have full control, squad_commanders can manage their squad members

-- Drop and recreate the team_members_insert policy
DROP POLICY IF EXISTS "team_members_insert" ON "public"."team_members";

CREATE POLICY "team_members_insert" ON "public"."team_members"
  FOR INSERT WITH CHECK (
    EXISTS (  -- I'm a commander or squad_commander of this team
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role IN ('commander', 'squad_commander')
    ) OR
    EXISTS (  -- I'm the workspace owner or admin
      SELECT 1 FROM public.teams t
      LEFT JOIN public.workspace_access wa ON (
        (t.workspace_owner_id IS NOT NULL AND wa.workspace_owner_id = t.workspace_owner_id) OR
        (t.org_workspace_id IS NOT NULL AND wa.org_workspace_id = t.org_workspace_id)
      )
      WHERE t.id = team_members.team_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin')
    )
  );

-- Drop and recreate the team_members_update policy
DROP POLICY IF EXISTS "team_members_update" ON "public"."team_members";

CREATE POLICY "team_members_update" ON "public"."team_members"
  FOR UPDATE USING (
    user_id = auth.uid() OR  -- Can update own membership (e.g., leave team)
    EXISTS (  -- I'm a commander of this team
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role = 'commander'
    ) OR
    EXISTS (  -- I'm a squad_commander and updating someone in my squad
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role = 'squad_commander'
        AND tm.details->>'squad_id' = team_members.details->>'squad_id'
    ) OR
    EXISTS (  -- I'm the workspace owner or admin
      SELECT 1 FROM public.teams t
      LEFT JOIN public.workspace_access wa ON (
        (t.workspace_owner_id IS NOT NULL AND wa.workspace_owner_id = t.workspace_owner_id) OR
        (t.org_workspace_id IS NOT NULL AND wa.org_workspace_id = t.org_workspace_id)
      )
      WHERE t.id = team_members.team_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin')
    )
  );

-- Drop and recreate the team_members_delete policy
DROP POLICY IF EXISTS "team_members_delete" ON "public"."team_members";

CREATE POLICY "team_members_delete" ON "public"."team_members"
  FOR DELETE USING (
    user_id = auth.uid() OR  -- Can leave team
    EXISTS (  -- I'm a commander of this team
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role = 'commander'
    ) OR
    EXISTS (  -- I'm a squad_commander and removing someone from my squad
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid() 
        AND tm.role = 'squad_commander'
        AND tm.details->>'squad_id' = team_members.details->>'squad_id'
    ) OR
    EXISTS (  -- I'm the workspace owner or admin
      SELECT 1 FROM public.teams t
      LEFT JOIN public.workspace_access wa ON (
        (t.workspace_owner_id IS NOT NULL AND wa.workspace_owner_id = t.workspace_owner_id) OR
        (t.org_workspace_id IS NOT NULL AND wa.org_workspace_id = t.org_workspace_id)
      )
      WHERE t.id = team_members.team_id
        AND wa.member_id = auth.uid()
        AND wa.role IN ('owner', 'admin')
    )
  );

