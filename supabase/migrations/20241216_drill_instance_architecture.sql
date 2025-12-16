-- =====================================================
-- DRILL INSTANCE ARCHITECTURE
-- Separates drill definitions from training instances
-- =====================================================
-- 
-- ARCHITECTURE:
-- 
-- drills (or drill_templates) = The core drill definition
--   - Static properties that define WHAT the drill is
--   - Reusable across multiple trainings
--   - Contains default values as suggestions
--
-- training_drill_instances = Junction table with instance-specific values
--   - Links a drill to a training
--   - Contains HOW the drill is configured for that specific training
--   - Distance, shots, time limits, etc.
--
-- =====================================================

-- =====================================================
-- STEP 1: Enhance drill_templates with richer static fields
-- (We keep the name drill_templates for backwards compatibility)
-- =====================================================

-- Add emoji/icon for visual identification
ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;

-- Add default values (suggestions for instances)
-- These are copied to instances but can be overridden
ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_distance_m INTEGER DEFAULT 25;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_rounds_per_shooter INTEGER DEFAULT 5;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_time_limit_seconds INTEGER DEFAULT NULL;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_par_time_seconds INTEGER DEFAULT NULL;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_strings_count INTEGER DEFAULT 1;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_target_count INTEGER DEFAULT 1;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_min_accuracy_percent INTEGER DEFAULT NULL;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_shots_per_target INTEGER DEFAULT NULL;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_target_size TEXT DEFAULT NULL;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_target_exposure_seconds INTEGER DEFAULT NULL;

ALTER TABLE drill_templates
ADD COLUMN IF NOT EXISTS default_movement_distance_m INTEGER DEFAULT NULL;

-- Remove instance-specific fields from drill_templates
-- (Keep them for backwards compatibility but they become defaults)
-- Actually, let's rename them to default_ prefix via comments
COMMENT ON COLUMN drill_templates.distance_m IS 'DEPRECATED: Use default_distance_m. Kept for backwards compatibility.';
COMMENT ON COLUMN drill_templates.rounds_per_shooter IS 'DEPRECATED: Use default_rounds_per_shooter. Kept for backwards compatibility.';
COMMENT ON COLUMN drill_templates.time_limit_seconds IS 'DEPRECATED: Use default_time_limit_seconds. Kept for backwards compatibility.';
COMMENT ON COLUMN drill_templates.par_time_seconds IS 'DEPRECATED: Use default_par_time_seconds. Kept for backwards compatibility.';
COMMENT ON COLUMN drill_templates.strings_count IS 'DEPRECATED: Use default_strings_count. Kept for backwards compatibility.';
COMMENT ON COLUMN drill_templates.target_count IS 'DEPRECATED: Use default_target_count. Kept for backwards compatibility.';

-- =====================================================
-- STEP 2: Update training_drills to be instance-focused
-- Add drill_id reference for proper normalization
-- =====================================================

-- Add reference to source drill (nullable for backwards compatibility with inline drills)
ALTER TABLE training_drills
ADD COLUMN IF NOT EXISTS drill_id UUID REFERENCES drill_templates(id) ON DELETE SET NULL;

-- Add index for drill_id lookups
CREATE INDEX IF NOT EXISTS idx_training_drills_drill_id ON training_drills(drill_id);

-- Add instance-specific notes (different from drill's core description)
ALTER TABLE training_drills
ADD COLUMN IF NOT EXISTS instance_notes TEXT DEFAULT NULL;

-- =====================================================
-- COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE drill_templates IS 
  'Core drill definitions. Contains static properties that define WHAT a drill is. Reusable across trainings.';

COMMENT ON COLUMN drill_templates.icon IS 
  'Emoji or icon identifier for visual representation (e.g., 🎯, 🔥, ⚡)';

COMMENT ON COLUMN drill_templates.default_distance_m IS 
  'Suggested distance in meters. Copied to instance but can be overridden.';

COMMENT ON COLUMN drill_templates.default_rounds_per_shooter IS 
  'Suggested shots per entry. Copied to instance but can be overridden.';

COMMENT ON COLUMN drill_templates.default_time_limit_seconds IS 
  'Suggested time limit. Copied to instance but can be overridden.';

COMMENT ON COLUMN drill_templates.default_strings_count IS 
  'Suggested number of rounds/strings. Copied to instance but can be overridden.';

COMMENT ON COLUMN drill_templates.default_target_count IS 
  'Suggested targets per round. Copied to instance but can be overridden.';

COMMENT ON TABLE training_drills IS 
  'Drill instances within a training. Contains HOW a drill is configured for a specific training session.';

COMMENT ON COLUMN training_drills.drill_id IS 
  'Reference to the source drill definition. NULL for legacy inline drills.';

COMMENT ON COLUMN training_drills.instance_notes IS 
  'Training-specific notes for this drill instance. Different from the drill''s core description.';

-- =====================================================
-- MIGRATION HELPER: Copy existing values to new columns
-- =====================================================

-- For drill_templates: copy old column values to new default_ columns
UPDATE drill_templates SET
  default_distance_m = COALESCE(default_distance_m, distance_m),
  default_rounds_per_shooter = COALESCE(default_rounds_per_shooter, rounds_per_shooter),
  default_time_limit_seconds = COALESCE(default_time_limit_seconds, time_limit_seconds),
  default_par_time_seconds = COALESCE(default_par_time_seconds, par_time_seconds),
  default_strings_count = COALESCE(default_strings_count, strings_count, 1),
  default_target_count = COALESCE(default_target_count, target_count, 1),
  default_min_accuracy_percent = COALESCE(default_min_accuracy_percent, min_accuracy_percent),
  default_shots_per_target = COALESCE(default_shots_per_target, shots_per_target),
  default_target_size = COALESCE(default_target_size, target_size),
  default_target_exposure_seconds = COALESCE(default_target_exposure_seconds, target_exposure_seconds),
  default_movement_distance_m = COALESCE(default_movement_distance_m, movement_distance_m)
WHERE default_distance_m IS NULL;

-- For training_drills: set drill_id based on drill_template_id if exists
UPDATE training_drills SET
  drill_id = drill_template_id
WHERE drill_id IS NULL AND drill_template_id IS NOT NULL;

