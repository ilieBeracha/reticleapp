-- Rollback: Remove training report fields that were added for Hebrew military format
-- These fields are being moved to session level instead of training level

-- Drop columns from trainings table (if they exist)
ALTER TABLE public.trainings 
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS training_type,
  DROP COLUMN IF EXISTS sub_type,
  DROP COLUMN IF EXISTS training_flow_notes,
  DROP COLUMN IF EXISTS improvement_points,
  DROP COLUMN IF EXISTS preservation_points,
  DROP COLUMN IF EXISTS lessons_learned,
  DROP COLUMN IF EXISTS next_training_focus;
