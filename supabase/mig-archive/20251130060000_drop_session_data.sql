-- ============================================================================
-- Migration: Drop session_data column from sessions
-- ============================================================================
-- session_data was storing redundant information:
--   - target type/distance → already in session_targets
--   - shooter role/position → already in session_participants
--   - environment data → rarely used, removing for simplicity
-- ============================================================================

-- Step 1: Drop the dependent view
DROP VIEW IF EXISTS "public"."session_stats_sniper";

-- Step 2: Drop the session_data column
ALTER TABLE "public"."sessions" DROP COLUMN IF EXISTS "session_data";

-- Step 3: Recreate the view WITHOUT session_data
CREATE OR REPLACE VIEW "public"."session_stats_sniper" AS
SELECT 
    s.id AS session_id,
    s.org_workspace_id,
    s.training_id,
    s.team_id,
    s.drill_id,
    s.session_mode,
    s.status,
    s.started_at,
    s.ended_at,
    EXTRACT(epoch FROM s.ended_at - s.started_at)::integer AS session_duration_seconds,
    sp.user_id,
    sp.role,
    sp.weapon_id,
    sp.sight_id,
    sp."position",
    sp.shots_fired AS total_shots_fired,
    count(st.id) AS targets_engaged,
    count(CASE WHEN st.target_type = 'paper' THEN 1 ELSE NULL END) AS paper_targets,
    count(CASE WHEN st.target_type = 'tactical' THEN 1 ELSE NULL END) AS tactical_targets,
    COALESCE(avg(ptr.hits_total::numeric / NULLIF(ptr.bullets_fired, 0)::numeric * 100), 0) AS avg_paper_accuracy_pct,
    avg(ptr.dispersion_cm) AS avg_grouping_cm,
    min(ptr.dispersion_cm) AS best_grouping_cm,
    sum(ptr.hits_inside_scoring) AS total_scoring_hits,
    sum(ptr.bullets_fired) AS total_paper_rounds,
    sum(ttr.hits) AS total_tactical_hits,
    sum(ttr.bullets_fired) AS total_tactical_rounds,
    COALESCE(avg(ttr.hits::numeric / NULLIF(ttr.bullets_fired, 0)::numeric * 100), 0) AS avg_tactical_accuracy_pct,
    count(CASE WHEN ttr.is_stage_cleared = true THEN 1 ELSE NULL END) AS stages_cleared,
    avg(ttr.time_seconds) AS avg_engagement_time_sec,
    min(ttr.time_seconds) AS fastest_engagement_time_sec,
    COALESCE(sum(ptr.hits_total), 0) + COALESCE(sum(ttr.hits), 0) AS total_hits,
    COALESCE(sum(ptr.bullets_fired), 0) + COALESCE(sum(ttr.bullets_fired), 0) AS total_rounds_on_target,
    CASE
        WHEN (COALESCE(sum(ptr.bullets_fired), 0) + COALESCE(sum(ttr.bullets_fired), 0)) > 0 
        THEN round(
            (COALESCE(sum(ptr.hits_total), 0) + COALESCE(sum(ttr.hits), 0))::numeric / 
            (COALESCE(sum(ptr.bullets_fired), 0) + COALESCE(sum(ttr.bullets_fired), 0))::numeric * 100, 2
        )
        ELSE 0
    END AS overall_accuracy_pct,
    t.title AS training_title,
    td.name AS drill_name,
    td.distance_m AS planned_distance,
    td.weapon_category,
    p.full_name AS user_name,
    p.email AS user_email,
    ow.name AS org_name,
    tm.name AS team_name
FROM sessions s
LEFT JOIN session_participants sp ON s.id = sp.session_id
LEFT JOIN session_targets st ON s.id = st.session_id
LEFT JOIN paper_target_results ptr ON st.id = ptr.session_target_id
LEFT JOIN tactical_target_results ttr ON st.id = ttr.session_target_id
LEFT JOIN trainings t ON s.training_id = t.id
LEFT JOIN training_drills td ON s.drill_id = td.id
LEFT JOIN profiles p ON sp.user_id = p.id
LEFT JOIN org_workspaces ow ON s.org_workspace_id = ow.id
LEFT JOIN teams tm ON s.team_id = tm.id
WHERE sp.role = ANY (ARRAY['sniper', 'pistol'])
GROUP BY 
    s.id, s.org_workspace_id, s.training_id, s.team_id, s.drill_id, 
    s.session_mode, s.status, s.started_at, s.ended_at,
    sp.user_id, sp.role, sp.weapon_id, sp.sight_id, sp."position", sp.shots_fired,
    t.title, td.name, td.distance_m, td.weapon_category,
    p.full_name, p.email, ow.name, tm.name;

