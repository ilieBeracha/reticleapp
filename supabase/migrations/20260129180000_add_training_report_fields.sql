-- Migration: Add training report fields for Hebrew military debrief format
-- This adds fields needed for:
-- 1. Training metadata (location, type, sub-type) - set during creation
-- 2. Debrief notes (improvement points, lessons, etc.) - filled after training

-- New fields for training creation
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS training_type TEXT;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS sub_type TEXT[];

-- Debrief fields (filled after training ends)
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS training_flow_notes TEXT;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS improvement_points TEXT;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS preservation_points TEXT;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS lessons_learned TEXT;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS next_training_focus TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.trainings.location IS 'Training location/venue (מיקום)';
COMMENT ON COLUMN public.trainings.training_type IS 'Training type: M4, צלף בודד, צלף מאתר, יבש, רוגר, atk (סוג אימון)';
COMMENT ON COLUMN public.trainings.sub_type IS 'Sub-types array: קלעים, טרור, סריקה, etc. (תת סוג)';
COMMENT ON COLUMN public.trainings.training_flow_notes IS 'Training flow and segments notes (מהלך האימון ומקצים)';
COMMENT ON COLUMN public.trainings.improvement_points IS 'Professional improvement points (דגשים מקצועיים לשיפור)';
COMMENT ON COLUMN public.trainings.preservation_points IS 'Professional preservation points (דגשים מקצועיים לשימור)';
COMMENT ON COLUMN public.trainings.lessons_learned IS 'Lessons learned from training (לקחים מהאימון)';
COMMENT ON COLUMN public.trainings.next_training_focus IS 'Focus areas for next training (על מה לעבוד באימון הבא)';
