-- Fix RLS policies for commander/owner to view team weapon stats
-- This allows commanders to see all user_weapons linked to their team's team_weapons
-- and all session data for those weapons

-- 1. Allow commanders/owners to see user_weapons linked to their team's team_weapons
DROP POLICY IF EXISTS "Commanders can view team linked user_weapons" ON "public"."user_weapons";
CREATE POLICY "Commanders can view team linked user_weapons" ON "public"."user_weapons"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."team_weapons" tw
    JOIN "public"."team_members" tm ON tm.team_id = tw.team_id
    WHERE "user_weapons"."team_weapon_id" = tw.id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);

-- 2. Allow commanders/owners to see session_targets from team sessions
DROP POLICY IF EXISTS "Commanders can view team session targets" ON "public"."session_targets";
CREATE POLICY "Commanders can view team session targets" ON "public"."session_targets"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."sessions" s
    JOIN "public"."team_members" tm ON tm.team_id = s.team_id
    WHERE s.id = "session_targets"."session_id"
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);

-- 3. Allow commanders/owners to see paper_target_results from team sessions (via session, not just training)
DROP POLICY IF EXISTS "Commanders can view team session paper results" ON "public"."paper_target_results";
CREATE POLICY "Commanders can view team session paper results" ON "public"."paper_target_results"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."session_targets" st
    JOIN "public"."sessions" s ON s.id = st.session_id
    JOIN "public"."team_members" tm ON tm.team_id = s.team_id
    WHERE st.id = "paper_target_results"."session_target_id"
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);

-- 4. Allow commanders/owners to see tactical_target_results from team sessions
DROP POLICY IF EXISTS "Commanders can view team session tactical results" ON "public"."tactical_target_results";
CREATE POLICY "Commanders can view team session tactical results" ON "public"."tactical_target_results"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."session_targets" st
    JOIN "public"."sessions" s ON s.id = st.session_id
    JOIN "public"."team_members" tm ON tm.team_id = s.team_id
    WHERE st.id = "tactical_target_results"."session_target_id"
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);

-- 5. Allow commanders/owners to see engagements from team sessions
DROP POLICY IF EXISTS "Commanders can view team session engagements" ON "public"."engagements";
CREATE POLICY "Commanders can view team session engagements" ON "public"."engagements"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."sessions" s
    JOIN "public"."team_members" tm ON tm.team_id = s.team_id
    WHERE s.id = "engagements"."session_id"
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);

-- 6. Allow commanders/owners to see session_timelines from team sessions
DROP POLICY IF EXISTS "Commanders can view team session timelines" ON "public"."session_timelines";
CREATE POLICY "Commanders can view team session timelines" ON "public"."session_timelines"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."sessions" s
    JOIN "public"."team_members" tm ON tm.team_id = s.team_id
    WHERE s.id = "session_timelines"."session_id"
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);

-- 7. Allow commanders/owners to see session_features from team sessions
DROP POLICY IF EXISTS "Commanders can view team session features" ON "public"."session_features";
CREATE POLICY "Commanders can view team session features" ON "public"."session_features"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."sessions" s
    JOIN "public"."team_members" tm ON tm.team_id = s.team_id
    WHERE s.id = "session_features"."session_id"
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);

-- 8. Allow commanders/owners to see session_standards_verdicts from team sessions
DROP POLICY IF EXISTS "Commanders can view team session verdicts" ON "public"."session_standards_verdicts";
CREATE POLICY "Commanders can view team session verdicts" ON "public"."session_standards_verdicts"
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM "public"."sessions" s
    JOIN "public"."team_members" tm ON tm.team_id = s.team_id
    WHERE s.id = "session_standards_verdicts"."session_id"
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'commander')
  )
);
