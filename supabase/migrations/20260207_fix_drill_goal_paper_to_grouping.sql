-- ============================================================================
-- Fix drill_goal: paper targets should be 'grouping', not 'engagement'
-- ============================================================================

-- session_features: paper targets with dispersion should be 'grouping'
UPDATE session_features
SET drill_goal = 'grouping'
WHERE target_type = 'paper'
  AND best_grouping_cm IS NOT NULL;

-- training_drills: paper targets should default to 'grouping'
UPDATE training_drills
SET drill_goal = 'grouping'
WHERE target_type = 'paper';

-- drill_templates: paper targets should default to 'grouping'
UPDATE drill_templates
SET drill_goal = 'grouping'
WHERE target_type = 'paper';
