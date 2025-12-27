-- ============================================================================
-- UNIFIED SESSION ARCHITECTURE MIGRATION
-- 
-- Adds support for:
-- 1. Personal drill templates (user_id on drill_templates)
-- 2. Per-session watch control (watch_controlled on sessions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD user_id TO drill_templates FOR PERSONAL TEMPLATES
-- Personal templates have team_id = NULL and user_id = owner
-- ----------------------------------------------------------------------------
ALTER TABLE drill_templates 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Index for efficient personal templates lookup
CREATE INDEX IF NOT EXISTS idx_drill_templates_user_id 
ON drill_templates(user_id) 
WHERE user_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. ADD watch_controlled TO sessions
-- Tracks whether user chose to let Garmin watch control the session
-- ----------------------------------------------------------------------------
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS watch_controlled boolean DEFAULT false;

-- ----------------------------------------------------------------------------
-- 3. RLS POLICY UPDATES FOR PERSONAL DRILL TEMPLATES
-- Allow users to read/write their own personal templates
-- ----------------------------------------------------------------------------

-- Policy: Users can view their own personal templates
CREATE POLICY IF NOT EXISTS "Users can view own personal drill templates"
ON drill_templates
FOR SELECT
USING (
  user_id = auth.uid() 
  AND team_id IS NULL
);

-- Policy: Users can create personal templates
CREATE POLICY IF NOT EXISTS "Users can create personal drill templates"
ON drill_templates
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND team_id IS NULL
);

-- Policy: Users can update their own personal templates
CREATE POLICY IF NOT EXISTS "Users can update own personal drill templates"
ON drill_templates
FOR UPDATE
USING (
  user_id = auth.uid() 
  AND team_id IS NULL
)
WITH CHECK (
  user_id = auth.uid() 
  AND team_id IS NULL
);

-- Policy: Users can delete their own personal templates
CREATE POLICY IF NOT EXISTS "Users can delete own personal drill templates"
ON drill_templates
FOR DELETE
USING (
  user_id = auth.uid() 
  AND team_id IS NULL
);

