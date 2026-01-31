-- Add miss_points JSONB column to tactical_target_results
-- Allows storing normalized miss coordinates for tactical target engagements
-- Same structure as paper_target_results.miss_points

ALTER TABLE tactical_target_results 
  ADD COLUMN IF NOT EXISTS miss_points jsonb DEFAULT NULL;

-- Add index for queries that filter by miss_points presence
CREATE INDEX IF NOT EXISTS idx_tactical_target_results_miss_points_not_null 
  ON tactical_target_results ((miss_points IS NOT NULL));

COMMENT ON COLUMN tactical_target_results.miss_points IS 
  'Array of normalized miss coordinates from MissMarker. Format: [{x, y, distance, angle_deg}, ...]';
