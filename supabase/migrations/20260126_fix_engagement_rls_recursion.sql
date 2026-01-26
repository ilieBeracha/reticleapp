-- ============================================================================
-- Fix Infinite Recursion in Engagement RLS Policies
--
-- Problem: engagements policy checks engagement_participants, which checks
-- engagements, creating infinite recursion.
--
-- Solution: Use SECURITY DEFINER functions that bypass RLS for ownership checks.
-- ============================================================================

-- ============================================================================
-- 1. DROP RECURSIVE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view engagements for their sessions" ON engagements;
DROP POLICY IF EXISTS "Users can view engagement participants" ON engagement_participants;
DROP POLICY IF EXISTS "Engagement owner can add participants" ON engagement_participants;
DROP POLICY IF EXISTS "Engagement owner can delete participants" ON engagement_participants;

-- ============================================================================
-- 2. CREATE SECURITY DEFINER HELPER FUNCTIONS
-- These bypass RLS to check ownership without triggering policy recursion
-- ============================================================================

-- Check if user owns the session for an engagement
CREATE OR REPLACE FUNCTION is_engagement_owner(eng_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.id = eng_id
    AND s.user_id = check_user_id
  );
$$;

-- Check if user is a participant in an engagement
CREATE OR REPLACE FUNCTION is_engagement_participant(eng_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagement_participants ep
    WHERE ep.engagement_id = eng_id
    AND ep.user_id = check_user_id
  );
$$;

-- Check if user is a team member for the engagement's session
CREATE OR REPLACE FUNCTION is_engagement_team_member(eng_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE e.id = eng_id
    AND tm.user_id = check_user_id
  );
$$;

-- Check if engagement is in squad mode
CREATE OR REPLACE FUNCTION is_squad_engagement(eng_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM engagements e
    WHERE e.id = eng_id
    AND e.engagement_mode = 'squad'
  );
$$;

-- Get session owner for an engagement (for insert checks)
CREATE OR REPLACE FUNCTION get_engagement_session_owner(eng_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT s.user_id
  FROM engagements e
  JOIN sessions s ON s.id = e.session_id
  WHERE e.id = eng_id;
$$;

-- ============================================================================
-- 3. RECREATE ENGAGEMENTS POLICIES (non-recursive)
-- ============================================================================

-- Users can view engagements they own, participate in, or are team members for
CREATE POLICY "Users can view engagements"
ON engagements
FOR SELECT
USING (
  -- Session owner (direct check, no subquery to participants)
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Participant (use security definer function)
  is_engagement_participant(id, auth.uid())
  OR
  -- Team member (direct check through sessions only)
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = session_id
    AND tm.user_id = auth.uid()
  )
);

-- Users can create engagements for their own sessions (unchanged, no recursion risk)
-- Policy already exists and is fine

-- Users can update their own engagements (unchanged, no recursion risk)
-- Policy already exists and is fine

-- ============================================================================
-- 4. RECREATE engagement_participants POLICIES (non-recursive)
-- ============================================================================

-- Users can view participants (use security definer functions)
CREATE POLICY "Users can view engagement participants"
ON engagement_participants
FOR SELECT
USING (
  -- Own record
  user_id = auth.uid()
  OR
  -- Engagement owner (use function to avoid recursion)
  get_engagement_session_owner(engagement_id) = auth.uid()
  OR
  -- Team member (use function to avoid recursion)  
  is_engagement_team_member(engagement_id, auth.uid())
);

-- Engagement owner can add participants (only for squad mode)
CREATE POLICY "Engagement owner can add participants"
ON engagement_participants
FOR INSERT
WITH CHECK (
  -- Must be engagement owner
  get_engagement_session_owner(engagement_id) = auth.uid()
  AND
  -- Must be squad mode
  is_squad_engagement(engagement_id)
);

-- Users can update their own participant record (unchanged, no recursion risk)
-- Policy already exists and is fine

-- Engagement owner can delete participants
CREATE POLICY "Engagement owner can delete participants"
ON engagement_participants
FOR DELETE
USING (
  get_engagement_session_owner(engagement_id) = auth.uid()
);

-- ============================================================================
-- 5. GRANT EXECUTE ON FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_engagement_owner TO authenticated;
GRANT EXECUTE ON FUNCTION is_engagement_participant TO authenticated;
GRANT EXECUTE ON FUNCTION is_engagement_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION is_squad_engagement TO authenticated;
GRANT EXECUTE ON FUNCTION get_engagement_session_owner TO authenticated;
