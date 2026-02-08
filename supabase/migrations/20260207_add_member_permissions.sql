-- Add permissions column to team_members for granular per-user permission overrides
-- Commanders can grant specific permissions to soldiers (e.g., canCreateTraining)

ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN team_members.permissions IS 'Per-user permission overrides granted by commander. Example: {"canCreateTraining": true}';

-- Create index for permission lookups
CREATE INDEX IF NOT EXISTS idx_team_members_permissions
ON team_members USING gin (permissions);

-- RLS: Members can read their own permissions, commanders can update
-- (Existing RLS policies on team_members should already cover this)
