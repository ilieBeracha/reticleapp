-- ============================================================================
-- Squad Engagement Mode Migration
--
-- Adds support for squad-based engagement drills where participants from the
-- same team can be invited to participate together.
--
-- Data Model:
-- - engagement_mode: Added to sessions table (solo | squad)
-- - engagement_participants: Tracks invited team members and their state
-- ============================================================================

-- ============================================================================
-- 1. ADD engagement_mode TO SESSIONS
-- ============================================================================

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS engagement_mode TEXT NOT NULL DEFAULT 'solo';

-- Add check constraint for valid values (drop first if exists for idempotency)
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_engagement_mode_check;

ALTER TABLE sessions
ADD CONSTRAINT sessions_engagement_mode_check
CHECK (engagement_mode IN ('solo', 'squad'));

COMMENT ON COLUMN sessions.engagement_mode IS 'solo = individual session, squad = team members participating together';

-- ============================================================================
-- 1b. ADD engagement_mode TO TRAINING_DRILLS
-- ============================================================================

ALTER TABLE training_drills
ADD COLUMN IF NOT EXISTS engagement_mode TEXT DEFAULT NULL;

COMMENT ON COLUMN training_drills.engagement_mode IS 'For engagement drills: solo (default) or squad';

-- ============================================================================
-- 2. CREATE engagement_participants TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'pending',
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only be invited once per session
  UNIQUE(session_id, user_id),

  -- Valid state values
  CONSTRAINT engagement_participants_state_check
  CHECK (state IN ('pending', 'joined', 'left'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS engagement_participants_session_id_idx
ON engagement_participants(session_id);

CREATE INDEX IF NOT EXISTS engagement_participants_user_id_idx
ON engagement_participants(user_id);

CREATE INDEX IF NOT EXISTS engagement_participants_state_idx
ON engagement_participants(state);

COMMENT ON TABLE engagement_participants IS 'Tracks participants invited to squad engagement sessions';
COMMENT ON COLUMN engagement_participants.state IS 'pending = invited but not responded, joined = actively participating, left = declined or left';
COMMENT ON COLUMN engagement_participants.joined_at IS 'Timestamp when user joined (state changed to joined)';

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE engagement_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first for idempotency
DROP POLICY IF EXISTS "Users can view session participants" ON engagement_participants;
DROP POLICY IF EXISTS "Session owner can add participants" ON engagement_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON engagement_participants;
DROP POLICY IF EXISTS "Session owner can delete participants" ON engagement_participants;

-- Policy: Users can view participants for sessions they have access to
-- (they are the session owner OR the participant themselves OR a team member)
CREATE POLICY "Users can view session participants"
ON engagement_participants
FOR SELECT
USING (
  -- The participant can see their own record
  user_id = auth.uid()
  OR
  -- Session owner can see all participants
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Team members can see participants for team sessions
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = session_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Session owner can add participants
CREATE POLICY "Session owner can add participants"
ON engagement_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
    AND s.engagement_mode = 'squad'
  )
);

-- Policy: Users can update their own participant record (join/leave)
CREATE POLICY "Users can update own participant record"
ON engagement_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Session owner can remove participants
CREATE POLICY "Session owner can delete participants"
ON engagement_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_engagement_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-set joined_at when state changes to 'joined'
  IF NEW.state = 'joined' AND (OLD.state IS NULL OR OLD.state != 'joined') THEN
    NEW.joined_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS engagement_participants_updated_at ON engagement_participants;

CREATE TRIGGER engagement_participants_updated_at
BEFORE UPDATE ON engagement_participants
FOR EACH ROW
EXECUTE FUNCTION update_engagement_participants_updated_at();

-- ============================================================================
-- 5. REALTIME ENABLED
-- ============================================================================

-- Add to realtime publication (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'engagement_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE engagement_participants;
  END IF;
END $$;
