-- Add participant invitation fields to trainings table
-- Allows commanders to restrict training to specific team members

ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS invite_all boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS invited_member_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.trainings.invite_all IS 'true = entire team is invited (default), false = only invited_member_ids may participate';
COMMENT ON COLUMN public.trainings.invited_member_ids IS 'Array of user UUIDs invited when invite_all is false. NULL when invite_all is true.';
