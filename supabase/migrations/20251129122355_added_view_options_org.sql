alter table "public"."org_workspaces" add column "show_attached_tab" boolean not null default true;

alter table "public"."org_workspaces" add column "show_teams_tab" boolean not null default true;


  create policy "Only admin/owner can update org settings"
  on "public"."org_workspaces"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = org_workspaces.id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = org_workspaces.id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



