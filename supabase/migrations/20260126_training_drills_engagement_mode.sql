-- Add engagement_mode column to training_drills table
-- This allows commanders to specify whether a drill should be executed solo or as a squad

ALTER TABLE training_drills
ADD COLUMN IF NOT EXISTS engagement_mode TEXT DEFAULT 'solo';

-- Add check constraint for valid engagement_mode values
ALTER TABLE training_drills
DROP CONSTRAINT IF EXISTS training_drills_engagement_mode_check;

ALTER TABLE training_drills
ADD CONSTRAINT training_drills_engagement_mode_check
CHECK (engagement_mode IN ('solo', 'squad'));

-- Add comment explaining the column
COMMENT ON COLUMN training_drills.engagement_mode IS
'How the drill should be executed: solo (individual) or squad (team participation). Grouping drills must always be solo.';
