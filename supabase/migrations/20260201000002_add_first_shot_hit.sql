-- Add first_shot_hit boolean column to tactical_target_results
-- Tracks whether the first shot of an engagement was a hit (for solo engagements)

ALTER TABLE tactical_target_results
  ADD COLUMN IF NOT EXISTS first_shot_hit boolean DEFAULT NULL;

COMMENT ON COLUMN tactical_target_results.first_shot_hit IS
  'Whether the first shot was a hit. NULL = not tracked, true = hit, false = miss';
