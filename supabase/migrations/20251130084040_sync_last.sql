
alter table "public"."team_members" drop constraint "team_members_squad_requirement";

drop view if exists "public"."session_stats_sniper";


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "body" text,
    "data" jsonb,
    "read" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notifications" enable row level security;

alter table "public"."org_workspaces" add column "show_attached_tab" boolean not null default true;

alter table "public"."org_workspaces" add column "show_teams_tab" boolean not null default true;

alter table "public"."session_targets" add column "planned_shots" integer;

alter table "public"."session_targets" add column "target_data" jsonb;

alter table "public"."sessions" drop column "session_data";

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at DESC);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);

CREATE INDEX notifications_user_unread_idx ON public.notifications USING btree (user_id, read) WHERE (read = false);

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."team_members" add constraint "team_members_squad_requirement" CHECK (((role = 'commander'::text) OR (role = 'soldier'::text) OR ((role = 'squad_commander'::text) AND (details ? 'squad_id'::text) AND ((details ->> 'squad_id'::text) IS NOT NULL) AND ((details ->> 'squad_id'::text) <> ''::text)))) not valid;

alter table "public"."team_members" validate constraint "team_members_squad_requirement";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.notify_team_on_training_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
            SELECT DISTINCT tm.member_id 
            FROM public.team_members tm
            WHERE tm.team_id = NEW.team_id
            AND tm.member_id != NEW.created_by
        LOOP
            INSERT INTO public.notifications (user_id, type, title, body, data)
            VALUES (
                team_member.member_id,
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
$function$
;

CREATE OR REPLACE FUNCTION public.notify_team_on_training_started()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    team_member RECORD;
    training_title TEXT;
BEGIN
    -- Only trigger when status changes to 'ongoing'
    IF OLD.status != 'ongoing' AND NEW.status = 'ongoing' THEN
        training_title := NEW.title;
        
        -- If there's a team, notify all team members
        IF NEW.team_id IS NOT NULL THEN
            FOR team_member IN 
                SELECT DISTINCT tm.member_id 
                FROM public.team_members tm
                WHERE tm.team_id = NEW.team_id
            LOOP
                INSERT INTO public.notifications (user_id, type, title, body, data)
                VALUES (
                    team_member.member_id,
                    'training_started',
                    'Training Started!',
                    '"' || training_title || '" is now live. Join now!',
                    jsonb_build_object(
                        'training_id', NEW.id,
                        'team_id', NEW.team_id
                    )
                );
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
;

create or replace view "public"."session_stats_sniper" as  SELECT s.id AS session_id,
    s.org_workspace_id,
    s.training_id,
    s.team_id,
    s.drill_id,
    s.session_mode,
    s.status,
    s.started_at,
    s.ended_at,
    (EXTRACT(epoch FROM (s.ended_at - s.started_at)))::integer AS session_duration_seconds,
    sp.user_id,
    sp.role,
    sp.weapon_id,
    sp.sight_id,
    sp."position",
    sp.shots_fired AS total_shots_fired,
    count(st.id) AS targets_engaged,
    count(
        CASE
            WHEN (st.target_type = 'paper'::text) THEN 1
            ELSE NULL::integer
        END) AS paper_targets,
    count(
        CASE
            WHEN (st.target_type = 'tactical'::text) THEN 1
            ELSE NULL::integer
        END) AS tactical_targets,
    COALESCE(avg((((ptr.hits_total)::numeric / (NULLIF(ptr.bullets_fired, 0))::numeric) * (100)::numeric)), (0)::numeric) AS avg_paper_accuracy_pct,
    avg(ptr.dispersion_cm) AS avg_grouping_cm,
    min(ptr.dispersion_cm) AS best_grouping_cm,
    sum(ptr.hits_inside_scoring) AS total_scoring_hits,
    sum(ptr.bullets_fired) AS total_paper_rounds,
    sum(ttr.hits) AS total_tactical_hits,
    sum(ttr.bullets_fired) AS total_tactical_rounds,
    COALESCE(avg((((ttr.hits)::numeric / (NULLIF(ttr.bullets_fired, 0))::numeric) * (100)::numeric)), (0)::numeric) AS avg_tactical_accuracy_pct,
    count(
        CASE
            WHEN (ttr.is_stage_cleared = true) THEN 1
            ELSE NULL::integer
        END) AS stages_cleared,
    avg(ttr.time_seconds) AS avg_engagement_time_sec,
    min(ttr.time_seconds) AS fastest_engagement_time_sec,
    (COALESCE(sum(ptr.hits_total), (0)::bigint) + COALESCE(sum(ttr.hits), (0)::bigint)) AS total_hits,
    (COALESCE(sum(ptr.bullets_fired), (0)::bigint) + COALESCE(sum(ttr.bullets_fired), (0)::bigint)) AS total_rounds_on_target,
        CASE
            WHEN ((COALESCE(sum(ptr.bullets_fired), (0)::bigint) + COALESCE(sum(ttr.bullets_fired), (0)::bigint)) > 0) THEN round(((((COALESCE(sum(ptr.hits_total), (0)::bigint) + COALESCE(sum(ttr.hits), (0)::bigint)))::numeric / ((COALESCE(sum(ptr.bullets_fired), (0)::bigint) + COALESCE(sum(ttr.bullets_fired), (0)::bigint)))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS overall_accuracy_pct,
    t.title AS training_title,
    td.name AS drill_name,
    td.distance_m AS planned_distance,
    td.weapon_category,
    p.full_name AS user_name,
    p.email AS user_email,
    ow.name AS org_name,
    tm.name AS team_name
   FROM (((((((((public.sessions s
     LEFT JOIN public.session_participants sp ON ((s.id = sp.session_id)))
     LEFT JOIN public.session_targets st ON ((s.id = st.session_id)))
     LEFT JOIN public.paper_target_results ptr ON ((st.id = ptr.session_target_id)))
     LEFT JOIN public.tactical_target_results ttr ON ((st.id = ttr.session_target_id)))
     LEFT JOIN public.trainings t ON ((s.training_id = t.id)))
     LEFT JOIN public.training_drills td ON ((s.drill_id = td.id)))
     LEFT JOIN public.profiles p ON ((sp.user_id = p.id)))
     LEFT JOIN public.org_workspaces ow ON ((s.org_workspace_id = ow.id)))
     LEFT JOIN public.teams tm ON ((s.team_id = tm.id)))
  WHERE (sp.role = ANY (ARRAY['sniper'::text, 'pistol'::text]))
  GROUP BY s.id, s.org_workspace_id, s.training_id, s.team_id, s.drill_id, s.session_mode, s.status, s.started_at, s.ended_at, sp.user_id, sp.role, sp.weapon_id, sp.sight_id, sp."position", sp.shots_fired, t.title, td.name, td.distance_m, td.weapon_category, p.full_name, p.email, ow.name, tm.name;


grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";


  create policy "System can insert notifications"
  on "public"."notifications"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can delete own notifications"
  on "public"."notifications"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



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



  create policy "Users can insert targets for own sessions"
  on "public"."session_targets"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_targets.session_id) AND (s.user_id = auth.uid())))));



  create policy "Users can view targets from own sessions"
  on "public"."session_targets"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_targets.session_id) AND (s.user_id = auth.uid())))));


CREATE TRIGGER on_training_created AFTER INSERT ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.notify_team_on_training_created();

CREATE TRIGGER on_training_started AFTER UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.notify_team_on_training_started();
