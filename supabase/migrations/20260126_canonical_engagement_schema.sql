-- ============================================================================
-- Canonical Engagement Schema Migration
--
-- GOAL: Engagement is the atomic execution unit.
-- Squad logic MUST live here. Training and Session are passive context.
--
-- This migration aligns the database schema with the canonical domain model:
--
-- 1. DROP deprecated columns:
--    - sessions.engagement_mode (squad logic now lives in engagements)
--    - training_drills.engagement_mode (removed entirely)
--    - engagement_participants.session_id (use engagement_id only)
--
-- 2. UPDATE engagements table to canonical schema:
--    - Add shooter_id, training_id, drill_goal
--    - Update status constraint (completed | aborted only)
--    - Remove started_at, ended_at (single point in time, not a duration)
--
-- 3. UPDATE engagement_participants:
--    - Remove updated_at column (not needed)
--
-- IMPORTANT: Database has been fully reset. No backfill required.
-- ============================================================================

-- ============================================================================
-- 1. DROP DEPRECATED COLUMNS
-- ============================================================================

-- 1a. Drop sessions.engagement_mode (squad logic now lives in engagements)
ALTER TABLE sessions DROP COLUMN IF EXISTS engagement_mode;

-- 1b. Drop training_drills.engagement_mode (removed entirely)
ALTER TABLE training_drills DROP COLUMN IF EXISTS engagement_mode;

-- 1c. Drop engagement_participants.session_id (use engagement_id only)
-- First drop any constraints that reference it
ALTER TABLE engagement_participants DROP CONSTRAINT IF EXISTS engagement_participants_session_id_fkey;
ALTER TABLE engagement_participants DROP CONSTRAINT IF EXISTS engagement_participants_session_id_user_id_key;
DROP INDEX IF EXISTS engagement_participants_session_id_idx;

-- Now drop the column
ALTER TABLE engagement_participants DROP COLUMN IF EXISTS session_id;

-- Also drop updated_at from engagement_participants (not in canonical schema)
ALTER TABLE engagement_participants DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- 2. UPDATE ENGAGEMENTS TABLE TO CANONICAL SCHEMA
-- ============================================================================

-- 2a. Add shooter_id column (the user who executed this engagement)
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS shooter_id UUID;

-- 2b. Add training_id column (optional link to training context)
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS training_id UUID;

-- 2c. Add drill_goal column (grouping is ALWAYS solo)
ALTER TABLE engagements ADD COLUMN IF NOT EXISTS drill_goal TEXT;

-- 2d. Add foreign key for shooter_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'engagements_shooter_id_fkey'
  ) THEN
    ALTER TABLE engagements
    ADD CONSTRAINT engagements_shooter_id_fkey
    FOREIGN KEY (shooter_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2e. Add foreign key for training_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'engagements_training_id_fkey'
  ) THEN
    ALTER TABLE engagements
    ADD CONSTRAINT engagements_training_id_fkey
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2f. Add check constraint for drill_goal
ALTER TABLE engagements DROP CONSTRAINT IF EXISTS engagements_drill_goal_check;
ALTER TABLE engagements 
ADD CONSTRAINT engagements_drill_goal_check
CHECK (drill_goal IN ('grouping', 'engagement'));

-- 2g. Update status constraint to canonical values (completed | aborted)
ALTER TABLE engagements DROP CONSTRAINT IF EXISTS engagements_status_check;
ALTER TABLE engagements
ADD CONSTRAINT engagements_status_check
CHECK (status IN ('completed', 'aborted'));

-- 2h. Drop deprecated timestamp columns
ALTER TABLE engagements DROP COLUMN IF EXISTS started_at;
ALTER TABLE engagements DROP COLUMN IF EXISTS ended_at;
ALTER TABLE engagements DROP COLUMN IF EXISTS updated_at;

-- 2i. Create index on shooter_id for quick lookups
CREATE INDEX IF NOT EXISTS engagements_shooter_id_idx ON engagements(shooter_id);

-- 2j. Create index on training_id for training-scoped queries
CREATE INDEX IF NOT EXISTS engagements_training_id_idx ON engagements(training_id);

-- 2k. Create index on drill_goal for filtering
CREATE INDEX IF NOT EXISTS engagements_drill_goal_idx ON engagements(drill_goal);

-- ============================================================================
-- 3. UPDATE COMMENTS
-- ============================================================================

COMMENT ON TABLE engagements IS 'Atomic execution unit. Squad logic lives here. Training and Session are passive context.';
COMMENT ON COLUMN engagements.shooter_id IS 'The user who executed this engagement';
COMMENT ON COLUMN engagements.training_id IS 'Optional link to training context';
COMMENT ON COLUMN engagements.drill_goal IS 'Primary classification: grouping (ALWAYS solo) or engagement (can be squad)';
COMMENT ON COLUMN engagements.engagement_mode IS 'solo = individual, squad = async team participation. Grouping is ALWAYS solo.';
COMMENT ON COLUMN engagements.status IS 'completed = finished successfully, aborted = cancelled/incomplete';

COMMENT ON TABLE engagement_participants IS 'Participants in squad engagements. Async consent model.';
COMMENT ON COLUMN engagement_participants.engagement_id IS 'Reference to the engagement (execution unit) - ONLY reference, never session_id';
COMMENT ON COLUMN engagement_participants.state IS 'pending = invited, joined = acknowledged/participated, left = declined';

-- ============================================================================
-- 4. CLEAN UP OLD RLS POLICIES (if any reference deprecated columns)
-- ============================================================================

-- Drop any old policies that might reference session-level engagement_mode
DROP POLICY IF EXISTS "Session owner can add participants" ON engagement_participants;

-- The new policy is already defined in the engagement_anchored_squad migration

-- ============================================================================
-- DONE
-- ============================================================================
