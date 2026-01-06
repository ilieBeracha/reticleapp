-- Migration: Rename 'achievement' to 'engagement' in drill_goal
-- This updates the CHECK constraints and existing data

-- 1. Update drill_templates table
-- First, update existing data
UPDATE drill_templates SET drill_goal = 'engagement' WHERE drill_goal = 'achievement';

-- Drop old constraint and add new one
ALTER TABLE drill_templates DROP CONSTRAINT IF EXISTS drill_templates_drill_goal_check;
ALTER TABLE drill_templates ADD CONSTRAINT drill_templates_drill_goal_check 
  CHECK (drill_goal = ANY (ARRAY['grouping'::text, 'engagement'::text]));

-- 2. Update training_drills table
UPDATE training_drills SET drill_goal = 'engagement' WHERE drill_goal = 'achievement';

ALTER TABLE training_drills DROP CONSTRAINT IF EXISTS training_drills_drill_goal_check;
ALTER TABLE training_drills ADD CONSTRAINT training_drills_drill_goal_check 
  CHECK (drill_goal = ANY (ARRAY['grouping'::text, 'engagement'::text]));

-- 3. Update paper_target_results table (paper_type column)
UPDATE paper_target_results SET paper_type = 'engagement' WHERE paper_type = 'achievement';

ALTER TABLE paper_target_results DROP CONSTRAINT IF EXISTS paper_target_results_paper_type_check;
ALTER TABLE paper_target_results ADD CONSTRAINT paper_target_results_paper_type_check 
  CHECK (paper_type = ANY (ARRAY['grouping'::text, 'engagement'::text]));

-- 4. Update sessions custom_drill_config JSONB (optional - for historical data)
UPDATE sessions 
SET custom_drill_config = jsonb_set(custom_drill_config, '{drill_goal}', '"engagement"')
WHERE custom_drill_config->>'drill_goal' = 'achievement';

