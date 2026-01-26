-- Allow NULL values for distance_m and rounds_per_shooter in training_drills
-- NULL = soldier chooses at execution time (guided/free execution policy)

-- Make distance_m nullable
ALTER TABLE training_drills 
ALTER COLUMN distance_m DROP NOT NULL;

-- Make rounds_per_shooter nullable  
ALTER TABLE training_drills 
ALTER COLUMN rounds_per_shooter DROP NOT NULL;

-- Add execution_policy column
-- 'locked' = soldier must execute exactly as defined
-- 'guided' = defaults pre-filled, soldier may adjust
-- 'free' = drill is a label only, soldier has full freedom
ALTER TABLE training_drills 
ADD COLUMN IF NOT EXISTS execution_policy TEXT DEFAULT 'locked';

-- Add check constraint for valid execution_policy values
ALTER TABLE training_drills 
DROP CONSTRAINT IF EXISTS training_drills_execution_policy_check;

ALTER TABLE training_drills 
ADD CONSTRAINT training_drills_execution_policy_check 
CHECK (execution_policy IN ('locked', 'guided', 'free'));

-- Add comment explaining the nullable columns
COMMENT ON COLUMN training_drills.distance_m IS 
'Distance in meters. NULL means soldier chooses at execution time (guided/free policy).';

COMMENT ON COLUMN training_drills.rounds_per_shooter IS 
'Number of rounds. NULL means soldier chooses at execution time (guided/free policy).';

COMMENT ON COLUMN training_drills.execution_policy IS 
'How strictly soldiers must follow this drill config: locked (exact), guided (defaults), free (label only).';
