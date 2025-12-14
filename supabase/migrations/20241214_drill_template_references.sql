-- =====================================================
-- DRILL TEMPLATE REFERENCES
-- Links training_drills and sessions to drill_templates
-- =====================================================

-- 1. Add drill_template_id to training_drills
-- This allows drills in trainings to reference reusable templates
ALTER TABLE training_drills
  ADD COLUMN IF NOT EXISTS drill_template_id UUID REFERENCES drill_templates(id) ON DELETE SET NULL;

-- 2. Add drill_template_id to sessions
-- This enables "Quick Practice" - starting a session directly from a template
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS drill_template_id UUID REFERENCES drill_templates(id) ON DELETE SET NULL;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_training_drills_template ON training_drills(drill_template_id);
CREATE INDEX IF NOT EXISTS idx_sessions_drill_template ON sessions(drill_template_id);

-- 4. Comment the columns
COMMENT ON COLUMN training_drills.drill_template_id IS 'Reference to source drill template. If set, template values are used as defaults.';
COMMENT ON COLUMN sessions.drill_template_id IS 'For quick practice sessions started directly from a drill template.';
