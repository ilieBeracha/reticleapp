drop view if exists "public"."session_stats_sniper";

alter table "public"."session_targets" add column "target_data" jsonb;

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
    tm.name AS team_name,
    s.session_data
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
  GROUP BY s.id, s.org_workspace_id, s.training_id, s.team_id, s.drill_id, s.session_mode, s.status, s.started_at, s.ended_at, sp.user_id, sp.role, sp.weapon_id, sp.sight_id, sp."position", sp.shots_fired, t.title, td.name, td.distance_m, td.weapon_category, p.full_name, p.email, ow.name, tm.name, s.session_data;



