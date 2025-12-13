-- Add manual_start column to trainings table
-- This indicates whether the training should auto-start at scheduled_at time
-- or if the commander will manually start it

ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS manual_start boolean DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.trainings.manual_start IS 
'If true, commander starts training manually. If false, training auto-starts at scheduled_at time.';







