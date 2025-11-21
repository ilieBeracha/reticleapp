-- Fix profiles RLS to allow viewing team members
DROP POLICY IF EXISTS "profiles_select" ON "public"."profiles";

CREATE POLICY "profiles_select" ON "public"."profiles"
  FOR SELECT USING (
    auth.uid() = id OR  -- Own profile
    id IN (  -- Profiles of workspace owners I have access to
      SELECT workspace_owner_id 
      FROM public.workspace_access 
      WHERE member_id = auth.uid()
    ) OR
    id IN (  -- Profiles of members in workspaces I have access to
      SELECT wa.member_id
      FROM public.workspace_access wa
      WHERE wa.workspace_owner_id IN (
        SELECT wa2.workspace_owner_id
        FROM public.workspace_access wa2
        WHERE wa2.member_id = auth.uid()
      )
      OR wa.org_workspace_id IN (
        SELECT wa3.org_workspace_id
        FROM public.workspace_access wa3
        WHERE wa3.member_id = auth.uid()
      )
    ) OR
    id IN (  -- Profiles of team members in teams I can see
      SELECT tm.user_id
      FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE EXISTS (
        SELECT 1 FROM public.workspace_access wa
        WHERE (wa.workspace_owner_id = t.workspace_owner_id OR wa.org_workspace_id = t.org_workspace_id)
          AND wa.member_id = auth.uid()
      )
    )
  );

