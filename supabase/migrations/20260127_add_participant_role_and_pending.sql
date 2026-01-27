-- Add participant role (shooter/spotter) and update state to support pending invites
-- 
-- Changes:
-- 1. Add 'role' column to engagement_participants (shooter | spotter)
-- 2. Update state constraint to include 'pending' and 'declined'
-- 3. Change default state from 'joined' to 'pending' for invite flow

-- 1. Add role column
ALTER TABLE engagement_participants 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'shooter';

-- Add check constraint for role
ALTER TABLE engagement_participants 
DROP CONSTRAINT IF EXISTS engagement_participants_role_check;

ALTER TABLE engagement_participants 
ADD CONSTRAINT engagement_participants_role_check 
CHECK (role IN ('shooter', 'spotter'));

COMMENT ON COLUMN engagement_participants.role IS 
'Participant role: shooter (fires weapon, records results) or spotter (observer, assists shooter)';

-- 2. Update state constraint to include pending and declined
ALTER TABLE engagement_participants 
DROP CONSTRAINT IF EXISTS engagement_participants_state_check;

ALTER TABLE engagement_participants 
ADD CONSTRAINT engagement_participants_state_check 
CHECK (state IN ('pending', 'joined', 'declined', 'left'));

-- 3. Change default state to 'pending' for invite flow
-- New participants start as pending until they accept
ALTER TABLE engagement_participants 
ALTER COLUMN state SET DEFAULT 'pending';

COMMENT ON COLUMN engagement_participants.state IS 
'Participant state: pending (invited, awaiting response), joined (accepted), declined (rejected invite), left (removed/left after joining)';

-- Add index for role queries
CREATE INDEX IF NOT EXISTS engagement_participants_role_idx ON engagement_participants(role);
