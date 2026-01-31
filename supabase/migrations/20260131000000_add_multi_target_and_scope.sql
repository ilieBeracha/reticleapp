-- Multi-target engagement + collective measurement scope
-- Backward compatible: all new columns are nullable with defaults

-- 1. Add target_results JSONB to engagement_participants
-- Shape: [{"target_number": 1, "shots_fired": 10, "hits": 8}, ...]
ALTER TABLE public.engagement_participants
  ADD COLUMN IF NOT EXISTS target_results jsonb DEFAULT NULL;

-- 2. Add measurement_scope to training_drills
-- 'individual' = each participant records own results (default)
-- 'collective' = squad records one shared result
ALTER TABLE public.training_drills
  ADD COLUMN IF NOT EXISTS measurement_scope text DEFAULT NULL;

-- 3. Ensure target_count exists on training_drills (may already exist)
-- Used for multi-target drills (default 1)
-- Column already exists in schema, this is a safety check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'training_drills'
    AND column_name = 'target_count'
  ) THEN
    ALTER TABLE public.training_drills ADD COLUMN target_count integer DEFAULT 1;
  END IF;
END $$;

-- 4. Add comment for documentation
COMMENT ON COLUMN public.engagement_participants.target_results IS
  'Per-target results as JSONB array: [{"target_number": 1, "shots_fired": N, "hits": N}]. NULL when target_count=1.';
COMMENT ON COLUMN public.training_drills.measurement_scope IS
  'Measurement scope: individual (per-person results) or collective (shared squad results). NULL defaults to individual.';
