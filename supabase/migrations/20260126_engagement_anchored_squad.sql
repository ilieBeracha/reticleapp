-- ============================================================================
-- Engagement-Anchored Squad Migration
--
-- GOAL: Engagement is the atomic execution unit. Squad logic MUST live here.
-- Training and Session must remain passive context.
--
-- This migration:
-- 1. Creates the `engagements` table (execution unit, separate from session setup)
-- 2. Adds `engagement_mode` to engagements (solo | squad)
-- 3. Renames engagement_participants.session_id to engagement_id
-- 4. Updates RLS policies
--
-- Data Model After:
-- - Session = setup container (weapon, team, training context)
-- - Engagement = execution (solo | squad, participants, results)
-- ============================================================================

-- ============================================================================
-- 1. CREATE ENGAGEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Engagement mode: solo or squad
  engagement_mode TEXT NOT NULL DEFAULT 'solo'
    CHECK (engagement_mode IN ('solo', 'squad')),
  
  -- Engagement state
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each session has at most one engagement
  UNIQUE(session_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS engagements_session_id_idx ON engagements(session_id);
CREATE INDEX IF NOT EXISTS engagements_status_idx ON engagements(status);

COMMENT ON TABLE engagements IS 'Execution unit. Squad logic lives here. Session is passive setup context.';
COMMENT ON COLUMN engagements.engagement_mode IS 'solo = individual execution, squad = team members participating together';
COMMENT ON COLUMN engagements.session_id IS 'Reference to session setup (weapon, team, drill config)';

-- ============================================================================
-- 2. UPDATE engagement_participants: session_id → engagement_id
-- ============================================================================

-- Step 2a: Add new engagement_id column
ALTER TABLE engagement_participants
ADD COLUMN IF NOT EXISTS engagement_id UUID;

-- Step 2b: For any existing participants, we need to find/create engagements for their sessions
-- First, create engagements for sessions that have participants
INSERT INTO engagements (session_id, engagement_mode, status, created_at)
SELECT DISTINCT 
  ep.session_id,
  COALESCE(s.engagement_mode, 'solo'),
  COALESCE(s.status, 'pending'),
  ep.created_at
FROM engagement_participants ep
JOIN sessions s ON s.id = ep.session_id
WHERE NOT EXISTS (
  SELECT 1 FROM engagements e WHERE e.session_id = ep.session_id
)
ON CONFLICT (session_id) DO NOTHING;

-- Step 2c: Populate engagement_id from session_id
UPDATE engagement_participants ep
SET engagement_id = (
  SELECT e.id FROM engagements e WHERE e.session_id = ep.session_id
)
WHERE engagement_id IS NULL AND session_id IS NOT NULL;

-- Step 2d: Make engagement_id NOT NULL and add FK (after data migration)
-- Only do this if there are no orphan records
DO $$
BEGIN
  -- Check for any participants without matching engagements
  IF NOT EXISTS (
    SELECT 1 FROM engagement_participants WHERE engagement_id IS NULL
  ) THEN
    -- Safe to add constraint
    ALTER TABLE engagement_participants
    ALTER COLUMN engagement_id SET NOT NULL;
    
    -- Add FK if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'engagement_participants_engagement_id_fkey'
    ) THEN
      ALTER TABLE engagement_participants
      ADD CONSTRAINT engagement_participants_engagement_id_fkey
      FOREIGN KEY (engagement_id) REFERENCES engagements(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Step 2e: Create index on engagement_id
CREATE INDEX IF NOT EXISTS engagement_participants_engagement_id_idx
ON engagement_participants(engagement_id);

-- Step 2f: Update unique constraint (drop old, add new)
ALTER TABLE engagement_participants
DROP CONSTRAINT IF EXISTS engagement_participants_session_id_user_id_key;

-- Add new unique constraint on (engagement_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'engagement_participants_engagement_id_user_id_key'
  ) THEN
    ALTER TABLE engagement_participants
    ADD CONSTRAINT engagement_participants_engagement_id_user_id_key
    UNIQUE (engagement_id, user_id);
  END IF;
END $$;

-- ============================================================================
-- 3. RLS FOR ENGAGEMENTS TABLE
-- ============================================================================

ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view engagements for their sessions" ON engagements;
DROP POLICY IF EXISTS "Users can create engagements for their sessions" ON engagements;
DROP POLICY IF EXISTS "Users can update their own engagements" ON engagements;

-- Policy: Users can view engagements for sessions they own or participate in
CREATE POLICY "Users can view engagements for their sessions"
ON engagements
FOR SELECT
USING (
  -- Session owner
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Participant
  EXISTS (
    SELECT 1 FROM engagement_participants ep
    WHERE ep.engagement_id = id
    AND ep.user_id = auth.uid()
  )
  OR
  -- Team member (for team sessions)
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE s.id = session_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can create engagements for their own sessions
CREATE POLICY "Users can create engagements for their sessions"
ON engagements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
  )
);

-- Policy: Session owner can update their engagements
CREATE POLICY "Users can update their own engagements"
ON engagements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_id
    AND s.user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. UPDATE engagement_participants RLS (reference engagement instead of session)
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view session participants" ON engagement_participants;
DROP POLICY IF EXISTS "Session owner can add participants" ON engagement_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON engagement_participants;
DROP POLICY IF EXISTS "Session owner can delete participants" ON engagement_participants;

-- New policies using engagement_id
CREATE POLICY "Users can view engagement participants"
ON engagement_participants
FOR SELECT
USING (
  -- The participant can see their own record
  user_id = auth.uid()
  OR
  -- Engagement owner can see all participants
  EXISTS (
    SELECT 1 FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.id = engagement_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Team members can see participants for team engagements
  EXISTS (
    SELECT 1 FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    JOIN team_members tm ON tm.team_id = s.team_id
    WHERE e.id = engagement_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Engagement owner can add participants (only for squad mode)
CREATE POLICY "Engagement owner can add participants"
ON engagement_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.id = engagement_id
    AND s.user_id = auth.uid()
    AND e.engagement_mode = 'squad'
  )
);

-- Policy: Users can update their own participant record (join/leave)
CREATE POLICY "Users can update own participant record"
ON engagement_participants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Engagement owner can remove participants
CREATE POLICY "Engagement owner can delete participants"
ON engagement_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM engagements e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.id = engagement_id
    AND s.user_id = auth.uid()
  )
);

-- ============================================================================
-- 5. UPDATED_AT TRIGGER FOR ENGAGEMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_engagements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS engagements_updated_at ON engagements;

CREATE TRIGGER engagements_updated_at
BEFORE UPDATE ON engagements
FOR EACH ROW
EXECUTE FUNCTION update_engagements_updated_at();

-- ============================================================================
-- 6. REALTIME FOR ENGAGEMENTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'engagements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE engagements;
  END IF;
END $$;

-- ============================================================================
-- 7. DEPRECATION COMMENTS (for future cleanup)
-- ============================================================================

-- These columns are deprecated and should be removed in a future migration
-- after all code references have been updated:
-- - sessions.engagement_mode (use engagements.engagement_mode)
-- - training_drills.engagement_mode (remove entirely)
-- - engagement_participants.session_id (use engagement_id)

COMMENT ON COLUMN sessions.engagement_mode IS 'DEPRECATED: Use engagements.engagement_mode instead';
COMMENT ON COLUMN engagement_participants.session_id IS 'DEPRECATED: Use engagement_id instead. Will be dropped after code migration.';
