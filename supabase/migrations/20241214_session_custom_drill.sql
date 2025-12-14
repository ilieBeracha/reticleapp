-- =====================================================
-- SESSION CUSTOM DRILL CONFIG
-- Allows sessions to have inline drill configuration
-- for quick practice without a template
-- =====================================================

-- Add custom_drill_config JSONB column
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS custom_drill_config JSONB;

-- Add comment
COMMENT ON COLUMN sessions.custom_drill_config IS 'Inline drill configuration for quick practice sessions (no template reference)';

-- Create index for queries that filter by drill goal
CREATE INDEX IF NOT EXISTS idx_sessions_custom_drill_goal 
  ON sessions ((custom_drill_config->>'drill_goal'));
