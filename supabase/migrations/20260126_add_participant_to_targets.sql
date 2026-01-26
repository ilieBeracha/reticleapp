-- Migration: Add participant_id to session_targets
-- This allows squad sessions to track which participant submitted each target result

-- Add participant_id column (nullable for solo sessions)
ALTER TABLE session_targets
ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster queries by participant
CREATE INDEX IF NOT EXISTS idx_session_targets_participant 
ON session_targets(participant_id) WHERE participant_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN session_targets.participant_id IS 
'For squad sessions: links target result to specific participant. NULL for solo sessions.';
