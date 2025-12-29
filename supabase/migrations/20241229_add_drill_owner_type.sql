-- ============================================================================
-- Migration: Add owner_type to drill_templates for personal presets
-- ============================================================================
-- This enables the unified drill model where drills can be owned by:
-- - 'team': Traditional team drills (owner_id = team_id)
-- - 'user': Personal presets (owner_id = user_id)
-- ============================================================================

-- 1. Add owner_type column with CHECK constraint
ALTER TABLE drill_templates
ADD COLUMN owner_type text NOT NULL DEFAULT 'team'
CHECK (owner_type IN ('user', 'team'));

-- 2. Add owner_id column (will store either team_id or user_id)
ALTER TABLE drill_templates
ADD COLUMN owner_id uuid;

-- 3. Add is_default flag for Quick Start default drill
ALTER TABLE drill_templates
ADD COLUMN is_default boolean DEFAULT false;

-- 4. Migrate existing data: copy team_id to owner_id for existing team drills
UPDATE drill_templates
SET owner_id = team_id
WHERE team_id IS NOT NULL;

-- 5. Make team_id nullable (for personal drills that won't have team_id)
ALTER TABLE drill_templates
ALTER COLUMN team_id DROP NOT NULL;

-- 6. Add composite index for efficient queries by owner
CREATE INDEX idx_drill_templates_owner 
ON drill_templates(owner_type, owner_id);

-- 7. Add index for is_default lookups
CREATE INDEX idx_drill_templates_is_default 
ON drill_templates(is_default) 
WHERE is_default = true;

-- 8. Add RLS policy for users to access their own personal drills
-- (Assumes RLS is enabled on drill_templates)
CREATE POLICY "Users can view their own personal drills"
ON drill_templates
FOR SELECT
USING (
  owner_type = 'user' AND owner_id = auth.uid()
);

CREATE POLICY "Users can insert their own personal drills"
ON drill_templates
FOR INSERT
WITH CHECK (
  owner_type = 'user' AND owner_id = auth.uid()
);

CREATE POLICY "Users can update their own personal drills"
ON drill_templates
FOR UPDATE
USING (
  owner_type = 'user' AND owner_id = auth.uid()
)
WITH CHECK (
  owner_type = 'user' AND owner_id = auth.uid()
);

CREATE POLICY "Users can delete their own personal drills"
ON drill_templates
FOR DELETE
USING (
  owner_type = 'user' AND owner_id = auth.uid()
);

-- 9. Comment on new columns
COMMENT ON COLUMN drill_templates.owner_type IS 'Ownership type: ''user'' for personal presets, ''team'' for team drills';
COMMENT ON COLUMN drill_templates.owner_id IS 'Owner ID: user_id when owner_type=''user'', team_id when owner_type=''team''';
COMMENT ON COLUMN drill_templates.is_default IS 'True for system/default drills used by Quick Start';

