-- ============================================================================
-- ADD INPUT_METHOD TO TRAINING_DRILLS
-- Allows commanders to explicitly choose how soldiers enter results
-- ============================================================================

-- Add input_method column to training_drills
ALTER TABLE training_drills
ADD COLUMN IF NOT EXISTS input_method TEXT 
  DEFAULT NULL
  CHECK (input_method IS NULL OR input_method = ANY (ARRAY['scan', 'manual']));

-- Add comment explaining the field
COMMENT ON COLUMN training_drills.input_method IS 
  'Commander''s choice for how soldiers enter results: scan (camera) or manual (hit/miss entry). NULL = infer from target_type.';

-- ============================================================================
-- INDEX for common queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_training_drills_input_method ON training_drills(input_method);

