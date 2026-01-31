-- Add miss_points JSONB column to paper_target_results
-- Stores an array of normalized miss coordinates for the Miss Analyzer feature.
--
-- Each entry: { x: -1..1, y: -1..1, distance: 0..1, angle_deg: 0..360 }
--   x: horizontal offset from center (-1 = far left, +1 = far right)
--   y: vertical offset from center (-1 = far below, +1 = far above)
--   distance: normalized radial distance from center (0 = center, 1 = edge)
--   angle_deg: compass bearing (0 = up/12-o'clock, 90 = right, 180 = down, 270 = left)
--
-- NULL means no miss data recorded. Empty array [] means "analyzed, no misses".
-- This is additive only — no existing data is modified.

ALTER TABLE paper_target_results
  ADD COLUMN IF NOT EXISTS miss_points jsonb DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN paper_target_results.miss_points IS
  'Array of normalized miss point coordinates [{x, y, distance, angle_deg}]. NULL = not analyzed.';
