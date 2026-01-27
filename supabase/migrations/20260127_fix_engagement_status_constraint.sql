-- Fix engagement status constraint to include all valid statuses
-- Previous constraint only allowed: 'completed', 'aborted'
-- New constraint allows: 'pending', 'active', 'completed', 'cancelled'

-- Drop the old constraint
ALTER TABLE engagements DROP CONSTRAINT IF EXISTS engagements_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE engagements
ADD CONSTRAINT engagements_status_check
CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));

-- Set default status to 'pending' for new engagements (lobby state)
ALTER TABLE engagements ALTER COLUMN status SET DEFAULT 'pending';

COMMENT ON COLUMN engagements.status IS 
'Engagement status: pending (lobby/waiting), active (in progress), completed (finished normally), cancelled (aborted by commander)';
