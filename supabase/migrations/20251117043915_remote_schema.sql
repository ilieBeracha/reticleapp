drop extension if exists "pg_net";

drop policy "teams_delete" on "public"."teams";

drop policy "teams_insert" on "public"."teams";

drop policy "teams_select" on "public"."teams";

drop policy "teams_update" on "public"."teams";

alter table "public"."team_members" drop constraint "team_members_role_check";

alter table "public"."workspace_access" drop constraint "workspace_access_role_check";


  create table "public"."sessions" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_type" text not null default 'personal'::text,
    "workspace_owner_id" uuid,
    "org_workspace_id" uuid,
    "user_id" uuid not null,
    "training_id" uuid,
    "team_id" uuid,
    "drill_id" uuid,
    "session_mode" text not null default 'solo'::text,
    "status" text not null default 'active'::text,
    "started_at" timestamp with time zone not null default now(),
    "ended_at" timestamp with time zone,
    "environment" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."sessions" enable row level security;


  create table "public"."training_drills" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_type" text not null default 'personal'::text,
    "workspace_owner_id" uuid,
    "org_workspace_id" uuid,
    "name" text not null,
    "description" text,
    "drill_type" text,
    "difficulty" text,
    "estimated_duration_minutes" integer,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."training_drills" enable row level security;


  create table "public"."trainings" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_type" text not null default 'personal'::text,
    "workspace_owner_id" uuid,
    "org_workspace_id" uuid,
    "team_id" uuid,
    "title" text not null,
    "description" text,
    "scheduled_at" timestamp with time zone not null,
    "status" text not null default 'planned'::text,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."trainings" enable row level security;

CREATE INDEX idx_sessions_drill ON public.sessions USING btree (drill_id);

CREATE INDEX idx_sessions_org_workspace ON public.sessions USING btree (org_workspace_id);

CREATE INDEX idx_sessions_started_at ON public.sessions USING btree (started_at);

CREATE INDEX idx_sessions_status ON public.sessions USING btree (status);

CREATE INDEX idx_sessions_team ON public.sessions USING btree (team_id);

CREATE INDEX idx_sessions_training ON public.sessions USING btree (training_id);

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id);

CREATE INDEX idx_sessions_workspace_owner ON public.sessions USING btree (workspace_owner_id);

CREATE INDEX idx_sessions_workspace_status ON public.sessions USING btree (workspace_owner_id, status);

CREATE INDEX idx_training_drills_created_by ON public.training_drills USING btree (created_by);

CREATE INDEX idx_training_drills_drill_type ON public.training_drills USING btree (drill_type);

CREATE INDEX idx_training_drills_org_workspace ON public.training_drills USING btree (org_workspace_id);

CREATE INDEX idx_training_drills_workspace_owner ON public.training_drills USING btree (workspace_owner_id);

CREATE INDEX idx_trainings_created_by ON public.trainings USING btree (created_by);

CREATE INDEX idx_trainings_org_workspace ON public.trainings USING btree (org_workspace_id);

CREATE INDEX idx_trainings_scheduled_at ON public.trainings USING btree (scheduled_at);

CREATE INDEX idx_trainings_status ON public.trainings USING btree (status);

CREATE INDEX idx_trainings_team ON public.trainings USING btree (team_id);

CREATE INDEX idx_trainings_workspace_owner ON public.trainings USING btree (workspace_owner_id);

CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id);

CREATE UNIQUE INDEX training_drills_pkey ON public.training_drills USING btree (id);

CREATE UNIQUE INDEX trainings_pkey ON public.trainings USING btree (id);

alter table "public"."sessions" add constraint "sessions_pkey" PRIMARY KEY using index "sessions_pkey";

alter table "public"."training_drills" add constraint "training_drills_pkey" PRIMARY KEY using index "training_drills_pkey";

alter table "public"."trainings" add constraint "trainings_pkey" PRIMARY KEY using index "trainings_pkey";

alter table "public"."sessions" add constraint "sessions_drill_fkey" FOREIGN KEY (drill_id) REFERENCES public.training_drills(id) ON DELETE SET NULL not valid;

alter table "public"."sessions" validate constraint "sessions_drill_fkey";

alter table "public"."sessions" add constraint "sessions_has_training_or_drill" CHECK (((training_id IS NOT NULL) OR (drill_id IS NOT NULL))) not valid;

alter table "public"."sessions" validate constraint "sessions_has_training_or_drill";

alter table "public"."sessions" add constraint "sessions_org_workspace_fkey" FOREIGN KEY (org_workspace_id) REFERENCES public.org_workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_org_workspace_fkey";

alter table "public"."sessions" add constraint "sessions_session_mode_check" CHECK ((session_mode = ANY (ARRAY['solo'::text, 'group'::text]))) not valid;

alter table "public"."sessions" validate constraint "sessions_session_mode_check";

alter table "public"."sessions" add constraint "sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."sessions" validate constraint "sessions_status_check";

alter table "public"."sessions" add constraint "sessions_team_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."sessions" validate constraint "sessions_team_fkey";

alter table "public"."sessions" add constraint "sessions_training_fkey" FOREIGN KEY (training_id) REFERENCES public.trainings(id) ON DELETE SET NULL not valid;

alter table "public"."sessions" validate constraint "sessions_training_fkey";

alter table "public"."sessions" add constraint "sessions_user_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_user_fkey";

alter table "public"."sessions" add constraint "sessions_valid_workspace_refs" CHECK ((((workspace_type = 'personal'::text) AND (workspace_owner_id IS NOT NULL) AND (org_workspace_id IS NULL)) OR ((workspace_type = 'org'::text) AND (org_workspace_id IS NOT NULL) AND (workspace_owner_id IS NULL)))) not valid;

alter table "public"."sessions" validate constraint "sessions_valid_workspace_refs";

alter table "public"."sessions" add constraint "sessions_workspace_owner_fkey" FOREIGN KEY (workspace_owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_workspace_owner_fkey";

alter table "public"."sessions" add constraint "sessions_workspace_type_check" CHECK ((workspace_type = ANY (ARRAY['personal'::text, 'org'::text]))) not valid;

alter table "public"."sessions" validate constraint "sessions_workspace_type_check";

alter table "public"."training_drills" add constraint "training_drills_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."training_drills" validate constraint "training_drills_created_by_fkey";

alter table "public"."training_drills" add constraint "training_drills_difficulty_check" CHECK ((difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))) not valid;

alter table "public"."training_drills" validate constraint "training_drills_difficulty_check";

alter table "public"."training_drills" add constraint "training_drills_org_workspace_fkey" FOREIGN KEY (org_workspace_id) REFERENCES public.org_workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."training_drills" validate constraint "training_drills_org_workspace_fkey";

alter table "public"."training_drills" add constraint "training_drills_valid_workspace_refs" CHECK ((((workspace_type = 'personal'::text) AND (workspace_owner_id IS NOT NULL) AND (org_workspace_id IS NULL)) OR ((workspace_type = 'org'::text) AND (org_workspace_id IS NOT NULL) AND (workspace_owner_id IS NULL)))) not valid;

alter table "public"."training_drills" validate constraint "training_drills_valid_workspace_refs";

alter table "public"."training_drills" add constraint "training_drills_workspace_owner_fkey" FOREIGN KEY (workspace_owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."training_drills" validate constraint "training_drills_workspace_owner_fkey";

alter table "public"."training_drills" add constraint "training_drills_workspace_type_check" CHECK ((workspace_type = ANY (ARRAY['personal'::text, 'org'::text]))) not valid;

alter table "public"."training_drills" validate constraint "training_drills_workspace_type_check";

alter table "public"."trainings" add constraint "trainings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."trainings" validate constraint "trainings_created_by_fkey";

alter table "public"."trainings" add constraint "trainings_org_workspace_fkey" FOREIGN KEY (org_workspace_id) REFERENCES public.org_workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."trainings" validate constraint "trainings_org_workspace_fkey";

alter table "public"."trainings" add constraint "trainings_status_check" CHECK ((status = ANY (ARRAY['planned'::text, 'ongoing'::text, 'finished'::text, 'cancelled'::text]))) not valid;

alter table "public"."trainings" validate constraint "trainings_status_check";

alter table "public"."trainings" add constraint "trainings_team_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL not valid;

alter table "public"."trainings" validate constraint "trainings_team_fkey";

alter table "public"."trainings" add constraint "trainings_valid_workspace_refs" CHECK ((((workspace_type = 'personal'::text) AND (workspace_owner_id IS NOT NULL) AND (org_workspace_id IS NULL)) OR ((workspace_type = 'org'::text) AND (org_workspace_id IS NOT NULL) AND (workspace_owner_id IS NULL)))) not valid;

alter table "public"."trainings" validate constraint "trainings_valid_workspace_refs";

alter table "public"."trainings" add constraint "trainings_workspace_owner_fkey" FOREIGN KEY (workspace_owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."trainings" validate constraint "trainings_workspace_owner_fkey";

alter table "public"."trainings" add constraint "trainings_workspace_type_check" CHECK ((workspace_type = ANY (ARRAY['personal'::text, 'org'::text]))) not valid;

alter table "public"."trainings" validate constraint "trainings_workspace_type_check";

alter table "public"."team_members" add constraint "team_members_role_check" CHECK ((role = ANY (ARRAY['lead'::text, 'member'::text]))) not valid;

alter table "public"."team_members" validate constraint "team_members_role_check";

alter table "public"."workspace_access" add constraint "workspace_access_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'instructor'::text, 'member'::text]))) not valid;

alter table "public"."workspace_access" validate constraint "workspace_access_role_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_manage_training(p_workspace_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_access
    WHERE workspace_owner_id = p_workspace_id
      AND member_id = p_user_id
      AND role IN ('owner', 'admin', 'instructor')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_team(p_workspace_type text, p_name text, p_workspace_owner_id uuid DEFAULT NULL::uuid, p_org_workspace_id uuid DEFAULT NULL::uuid, p_team_type text DEFAULT 'field'::text, p_description text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, workspace_type text, workspace_owner_id uuid, org_workspace_id uuid, name text, team_type text, description text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_team_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate team_type
  IF p_team_type NOT IN ('field', 'back_office') THEN
    RAISE EXCEPTION 'Invalid team_type. Must be field or back_office';
  END IF;

  -- Check permissions based on workspace type
  IF p_workspace_type = 'personal' THEN
    -- Personal workspace: must be the owner
    IF p_workspace_owner_id != v_user_id THEN
      RAISE EXCEPTION 'Access denied: You can only create teams in your own workspace';
    END IF;
  ELSIF p_workspace_type = 'org' THEN
    -- Org workspace: must be owner or admin
    SELECT wa.role INTO v_user_role
    FROM workspace_access wa
    WHERE wa.org_workspace_id = p_org_workspace_id
      AND wa.member_id = v_user_id;
    
    IF v_user_role IS NULL THEN
      RAISE EXCEPTION 'Access denied: You do not have access to this workspace';
    END IF;
    
    IF v_user_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Access denied: Only workspace owners and admins can create teams';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid workspace_type';
  END IF;

  -- Create the team
  INSERT INTO teams (
    workspace_type,
    workspace_owner_id,
    org_workspace_id,
    name,
    team_type,
    description
  )
  VALUES (
    p_workspace_type,
    p_workspace_owner_id,
    p_org_workspace_id,
    p_name,
    p_team_type,
    p_description
  )
  RETURNING teams.id INTO v_team_id;

  -- Return the created team (with qualified column names)
  RETURN QUERY
  SELECT 
    t.id,
    t.workspace_type,
    t.workspace_owner_id,
    t.org_workspace_id,
    t.name,
    t.team_type,
    t.description,
    t.created_at,
    t.updated_at
  FROM teams t
  WHERE t.id = v_team_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_workspace_members(p_workspace_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, workspace_id uuid, workspace_role text, joined_at timestamp with time zone, full_name text, email text, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to workspace %', p_workspace_id;
  END IF;

  RETURN QUERY
  SELECT
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.workspace_role,
    wm.joined_at,
    p.full_name,
    p.email,
    p.avatar_url
  FROM public.workspace_members wm
  LEFT JOIN public.profiles p ON p.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id
  ORDER BY wm.joined_at ASC;
END;
$function$
;

grant delete on table "public"."sessions" to "anon";

grant insert on table "public"."sessions" to "anon";

grant references on table "public"."sessions" to "anon";

grant select on table "public"."sessions" to "anon";

grant trigger on table "public"."sessions" to "anon";

grant truncate on table "public"."sessions" to "anon";

grant update on table "public"."sessions" to "anon";

grant delete on table "public"."sessions" to "authenticated";

grant insert on table "public"."sessions" to "authenticated";

grant references on table "public"."sessions" to "authenticated";

grant select on table "public"."sessions" to "authenticated";

grant trigger on table "public"."sessions" to "authenticated";

grant truncate on table "public"."sessions" to "authenticated";

grant update on table "public"."sessions" to "authenticated";

grant delete on table "public"."sessions" to "service_role";

grant insert on table "public"."sessions" to "service_role";

grant references on table "public"."sessions" to "service_role";

grant select on table "public"."sessions" to "service_role";

grant trigger on table "public"."sessions" to "service_role";

grant truncate on table "public"."sessions" to "service_role";

grant update on table "public"."sessions" to "service_role";

grant delete on table "public"."training_drills" to "anon";

grant insert on table "public"."training_drills" to "anon";

grant references on table "public"."training_drills" to "anon";

grant select on table "public"."training_drills" to "anon";

grant trigger on table "public"."training_drills" to "anon";

grant truncate on table "public"."training_drills" to "anon";

grant update on table "public"."training_drills" to "anon";

grant delete on table "public"."training_drills" to "authenticated";

grant insert on table "public"."training_drills" to "authenticated";

grant references on table "public"."training_drills" to "authenticated";

grant select on table "public"."training_drills" to "authenticated";

grant trigger on table "public"."training_drills" to "authenticated";

grant truncate on table "public"."training_drills" to "authenticated";

grant update on table "public"."training_drills" to "authenticated";

grant delete on table "public"."training_drills" to "service_role";

grant insert on table "public"."training_drills" to "service_role";

grant references on table "public"."training_drills" to "service_role";

grant select on table "public"."training_drills" to "service_role";

grant trigger on table "public"."training_drills" to "service_role";

grant truncate on table "public"."training_drills" to "service_role";

grant update on table "public"."training_drills" to "service_role";

grant delete on table "public"."trainings" to "anon";

grant insert on table "public"."trainings" to "anon";

grant references on table "public"."trainings" to "anon";

grant select on table "public"."trainings" to "anon";

grant trigger on table "public"."trainings" to "anon";

grant truncate on table "public"."trainings" to "anon";

grant update on table "public"."trainings" to "anon";

grant delete on table "public"."trainings" to "authenticated";

grant insert on table "public"."trainings" to "authenticated";

grant references on table "public"."trainings" to "authenticated";

grant select on table "public"."trainings" to "authenticated";

grant trigger on table "public"."trainings" to "authenticated";

grant truncate on table "public"."trainings" to "authenticated";

grant update on table "public"."trainings" to "authenticated";

grant delete on table "public"."trainings" to "service_role";

grant insert on table "public"."trainings" to "service_role";

grant references on table "public"."trainings" to "service_role";

grant select on table "public"."trainings" to "service_role";

grant trigger on table "public"."trainings" to "service_role";

grant truncate on table "public"."trainings" to "service_role";

grant update on table "public"."trainings" to "service_role";


  create policy "sessions_delete"
  on "public"."sessions"
  as permissive
  for delete
  to public
using (((user_id = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = sessions.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "sessions_insert"
  on "public"."sessions"
  as permissive
  for insert
  to public
with check (((user_id = auth.uid()) AND ((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE (((wa.workspace_owner_id = sessions.workspace_owner_id) OR (wa.org_workspace_id = sessions.org_workspace_id)) AND (wa.member_id = auth.uid())))))));



  create policy "sessions_select"
  on "public"."sessions"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE (((wa.workspace_owner_id = sessions.workspace_owner_id) OR (wa.org_workspace_id = sessions.org_workspace_id)) AND (wa.member_id = auth.uid()))))));



  create policy "sessions_update"
  on "public"."sessions"
  as permissive
  for update
  to public
using (((user_id = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = sessions.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "training_drills_delete"
  on "public"."training_drills"
  as permissive
  for delete
  to public
using (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = training_drills.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "training_drills_insert"
  on "public"."training_drills"
  as permissive
  for insert
  to public
with check (((created_by = auth.uid()) AND ((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE (((wa.workspace_owner_id = training_drills.workspace_owner_id) OR (wa.org_workspace_id = training_drills.org_workspace_id)) AND (wa.member_id = auth.uid())))))));



  create policy "training_drills_select"
  on "public"."training_drills"
  as permissive
  for select
  to public
using (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE (((wa.workspace_owner_id = training_drills.workspace_owner_id) OR (wa.org_workspace_id = training_drills.org_workspace_id)) AND (wa.member_id = auth.uid()))))));



  create policy "training_drills_update"
  on "public"."training_drills"
  as permissive
  for update
  to public
using (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = training_drills.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "trainings_delete"
  on "public"."trainings"
  as permissive
  for delete
  to public
using (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = trainings.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "trainings_insert"
  on "public"."trainings"
  as permissive
  for insert
  to public
with check (((created_by = auth.uid()) AND ((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE (((wa.workspace_owner_id = trainings.workspace_owner_id) OR (wa.org_workspace_id = trainings.org_workspace_id)) AND (wa.member_id = auth.uid())))))));



  create policy "trainings_select"
  on "public"."trainings"
  as permissive
  for select
  to public
using (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE (((wa.workspace_owner_id = trainings.workspace_owner_id) OR (wa.org_workspace_id = trainings.org_workspace_id)) AND (wa.member_id = auth.uid()))))));



  create policy "trainings_update"
  on "public"."trainings"
  as permissive
  for update
  to public
using (((created_by = auth.uid()) OR (workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = trainings.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "teams_delete"
  on "public"."teams"
  as permissive
  for delete
  to public
using (((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = teams.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "teams_insert"
  on "public"."teams"
  as permissive
  for insert
  to public
with check (((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = teams.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "teams_select"
  on "public"."teams"
  as permissive
  for select
  to public
using (((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.workspace_owner_id = teams.workspace_owner_id) AND (wa.member_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = teams.org_workspace_id) AND (wa.member_id = auth.uid()))))));



  create policy "teams_update"
  on "public"."teams"
  as permissive
  for update
  to public
using (((workspace_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.workspace_access wa
  WHERE ((wa.org_workspace_id = teams.org_workspace_id) AND (wa.member_id = auth.uid()) AND (wa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));


CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_drills_updated_at BEFORE UPDATE ON public.training_drills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


