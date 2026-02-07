-- ============================================================================
-- Fix drill_goal defaults from legacy 'achievement' to 'engagement'
-- ============================================================================

-- Update column defaults to use 'engagement' instead of legacy 'achievement'
ALTER TABLE drill_templates ALTER COLUMN drill_goal SET DEFAULT 'engagement';
ALTER TABLE training_drills ALTER COLUMN drill_goal SET DEFAULT 'engagement';

-- Optionally: Normalize existing 'achievement' values to 'engagement'
-- This keeps data consistent with the new standard
UPDATE drill_templates SET drill_goal = 'engagement' WHERE drill_goal = 'achievement';
UPDATE training_drills SET drill_goal = 'engagement' WHERE drill_goal = 'achievement';
UPDATE session_features SET drill_goal = 'engagement' WHERE drill_goal = 'achievement';

-- Note: 'grouping' values remain unchanged as they are valid
