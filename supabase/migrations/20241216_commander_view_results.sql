-- Allow commanders to view paper_target_results for sessions in their team's trainings
CREATE POLICY "Commanders can view paper results from team trainings"
ON "public"."paper_target_results"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "public"."session_targets" st
    JOIN "public"."sessions" s ON s.id = st.session_id
    JOIN "public"."trainings" t ON t.id = s.training_id
    JOIN "public"."team_members" tm ON tm.team_id = t.team_id
    WHERE st.id = paper_target_results.session_target_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('commander', 'admin')
  )
);

-- Allow commanders to view tactical_target_results for sessions in their team's trainings
CREATE POLICY "Commanders can view tactical results from team trainings"
ON "public"."tactical_target_results"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "public"."session_targets" st
    JOIN "public"."sessions" s ON s.id = st.session_id
    JOIN "public"."trainings" t ON t.id = s.training_id
    JOIN "public"."team_members" tm ON tm.team_id = t.team_id
    WHERE st.id = tactical_target_results.session_target_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('commander', 'admin')
  )
);

-- Allow commanders to view session_targets for sessions in their team's trainings
CREATE POLICY "Commanders can view targets from team trainings"
ON "public"."session_targets"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "public"."sessions" s
    JOIN "public"."trainings" t ON t.id = s.training_id
    JOIN "public"."team_members" tm ON tm.team_id = t.team_id
    WHERE s.id = session_targets.session_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('commander', 'admin')
  )
);
