-- Fix engagement UPDATE policy to allow training commanders
-- Problem: Only session owner can update engagements, but training commanders
-- should also be able to end/manage squad sessions in their training.

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can update their own engagements" ON engagements;

-- Create more permissive update policy
CREATE POLICY "Users can update engagements"
ON engagements
FOR UPDATE
USING (
  -- Session owner can always update
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Training commanders can update engagements in their training
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN trainings t ON t.id = s.training_id
    JOIN team_members tm ON tm.team_id = t.team_id
    WHERE s.id = session_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'commander', 'squad_commander')
  )
  OR
  -- Team commanders can update engagements in team sessions (even without training)
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = session_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'commander', 'squad_commander')
  )
);

COMMENT ON POLICY "Users can update engagements" ON engagements IS 
'Session owners and team commanders can update engagements';
