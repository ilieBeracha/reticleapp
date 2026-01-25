-- ============================================================================
-- DRILL SIMPLIFICATION MIGRATION
-- ============================================================================
-- 
-- This migration implements the new drill architecture:
-- - Canonical drills (global, read-only execution patterns)
-- - Team drill presets (saved configurations referencing canonical drills)
-- 
-- Key principle: "Drills are verbs. Presets are shortcuts. Standards are judgment."
--
-- ============================================================================

-- ============================================================================
-- 1. CANONICAL DRILLS TABLE
-- ============================================================================
-- These are "verbs" - execution patterns, not templates.
-- Distance, expectations, pass/fail are NOT here - that's Standards territory.

CREATE TABLE IF NOT EXISTS drills (
  id TEXT PRIMARY KEY,                    -- e.g., 'grouping_5shot', 'bill_drill'
  name TEXT NOT NULL,                     -- Display name
  description TEXT,                       -- What this drill tests
  
  -- Execution mechanics only
  drill_goal TEXT NOT NULL CHECK (drill_goal IN ('grouping', 'engagement')),
  target_type TEXT NOT NULL CHECK (target_type IN ('paper', 'tactical')),
  default_shots INT NOT NULL DEFAULT 5,   -- Suggested default
  default_strings INT NOT NULL DEFAULT 1,
  
  -- What CAN be configured (capability flags)
  supports_time BOOLEAN NOT NULL DEFAULT false,
  supports_position BOOLEAN NOT NULL DEFAULT true,
  
  -- Distance configuration
  -- If allowed_distances is set, only those are valid
  -- If NULL, any distance is allowed
  allowed_distances INT[],
  
  -- If true, shots cannot be changed from default
  fixed_shots BOOLEAN NOT NULL DEFAULT false,
  
  -- Categorization
  category TEXT CHECK (category IN ('zeroing', 'grouping', 'speed', 'qualification')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  
  -- Ordering for UI
  sort_order INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS - this is global read-only data
-- App code should never INSERT/UPDATE/DELETE from client

COMMENT ON TABLE drills IS 'Canonical drill definitions - global, read-only execution patterns';
COMMENT ON COLUMN drills.id IS 'Stable identifier, never changes';
COMMENT ON COLUMN drills.allowed_distances IS 'If set, only these distances are valid. NULL = any distance';
COMMENT ON COLUMN drills.fixed_shots IS 'If true, default_shots cannot be overridden';


-- ============================================================================
-- 2. SEED CANONICAL DRILLS
-- ============================================================================

INSERT INTO drills (id, name, description, drill_goal, target_type, default_shots, default_strings, supports_time, supports_position, allowed_distances, fixed_shots, category, difficulty, sort_order) VALUES

-- ZEROING (category for zero confirmation)
('cold_bore', 'Cold Bore', 'First shot of the day from a cold, unfired barrel. Tests true zero and first-round hit capability - critical for precision applications where the first shot matters most.', 'grouping', 'paper', 1, 1, false, true, NULL, true, 'zeroing', 'intermediate', 10),
('zero_check_3', 'Zero Check (3-Shot)', 'Quick 3-shot confirmation that your zero is still valid. Use after transport, between sessions, or when conditions change. Fast way to verify zero without wasting ammunition.', 'grouping', 'paper', 3, 1, false, true, NULL, true, 'zeroing', 'beginner', 11),

-- GROUPING (precision measurement)
('grouping_3shot', '3-Shot Group', 'Minimal precision check using 3 shots. Quick way to assess basic accuracy and consistency. Useful for initial warmup or rapid verification between drills.', 'grouping', 'paper', 3, 1, false, true, NULL, false, 'grouping', 'beginner', 20),
('grouping_5shot', '5-Shot Group', 'Industry-standard precision test. 5 shots provide statistically meaningful group size while conserving ammunition. The benchmark for measuring rifle accuracy.', 'grouping', 'paper', 5, 1, false, true, NULL, false, 'grouping', 'beginner', 21),
('grouping_10shot', '10-Shot Group', 'Extended precision analysis for thorough accuracy assessment. Reveals shooter consistency and true mechanical accuracy over more rounds. Best for serious evaluation.', 'grouping', 'paper', 10, 1, false, true, NULL, false, 'grouping', 'intermediate', 22),
('positional_group', 'Positional Grouping', 'Test precision from multiple shooting positions in 3 strings. Identifies positional weaknesses and builds real-world shooting skills across stance variations.', 'grouping', 'paper', 5, 3, false, true, NULL, false, 'grouping', 'advanced', 23),

-- SPEED / ENGAGEMENT (timed drills)
('engagement_basic', 'Basic Engagement', 'Fundamental timed target engagement. Develops balance between speed and accuracy. Adjustable shot count and time to match skill level.', 'engagement', 'tactical', 6, 1, true, true, NULL, false, 'speed', 'beginner', 30),
('engagement_extended', 'Extended Engagement', 'Longer timed engagement building sustained accuracy under time pressure. Tests endurance and focus over more rounds.', 'engagement', 'tactical', 10, 1, true, true, NULL, false, 'speed', 'intermediate', 31),
('bill_drill', 'Bill Drill', 'Classic speed drill: 6 shots on 1 target from holster, par time 2 seconds. Tests draw speed, target acquisition, and rapid fire control. Named after Bill Wilson.', 'engagement', 'tactical', 6, 1, true, false, ARRAY[5, 7, 10], true, 'speed', 'intermediate', 32),
('el_presidente', 'El Presidente', 'Legendary competition drill: Start facing away, turn, engage 3 targets (2 each), reload, repeat. Par time 10 seconds. Tests every fundamental skill.', 'engagement', 'tactical', 12, 1, true, false, ARRAY[7, 10], true, 'speed', 'advanced', 33),
('failure_drill', 'Failure Drill', 'Also called "Mozambique Drill": 2 rapid shots to center mass, 1 precise shot to head. Trains shot placement transition and vital zone targeting.', 'engagement', 'tactical', 3, 1, true, true, ARRAY[5, 7, 10, 15], true, 'speed', 'intermediate', 34),

-- QUALIFICATION (standardized tests)
('qual_basic', 'Basic Qualification', 'Fundamental marksmanship qualification. Tests core accuracy and safety fundamentals. Starting point for skill certification.', 'engagement', 'paper', 10, 1, true, true, NULL, false, 'qualification', 'beginner', 40),
('qual_timed', 'Timed Qualification', 'Qualification course with time constraints. Adds pressure to accuracy requirements. Simulates real-world performance conditions.', 'engagement', 'paper', 20, 1, true, true, NULL, false, 'qualification', 'intermediate', 41),
('qual_advanced', 'Advanced Qualification', 'Multi-stage qualification course testing varied distances, positions, and timing. Comprehensive skill assessment for experienced shooters.', 'engagement', 'tactical', 30, 3, true, true, NULL, false, 'qualification', 'advanced', 42)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  drill_goal = EXCLUDED.drill_goal,
  target_type = EXCLUDED.target_type,
  default_shots = EXCLUDED.default_shots,
  default_strings = EXCLUDED.default_strings,
  supports_time = EXCLUDED.supports_time,
  supports_position = EXCLUDED.supports_position,
  allowed_distances = EXCLUDED.allowed_distances,
  fixed_shots = EXCLUDED.fixed_shots,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  sort_order = EXCLUDED.sort_order;


-- ============================================================================
-- 3. TEAM DRILL PRESETS TABLE
-- ============================================================================
-- Teams don't "own drills" - they own saved configurations.
-- Presets are shortcuts, not templates.

CREATE TABLE IF NOT EXISTS team_drill_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  drill_id TEXT NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
  
  -- Optional custom label (most won't need this)
  -- NULL = use canonical drill name
  label TEXT,
  
  -- Saved configuration
  distance_m INT,
  rounds INT,
  time_limit_seconds INT,
  position TEXT CHECK (position IN ('prone', 'kneeling', 'sitting', 'standing')),
  strings_count INT DEFAULT 1,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_presets_team ON team_drill_presets(team_id);
CREATE INDEX idx_team_presets_drill ON team_drill_presets(drill_id);

-- Prevent duplicate presets: same drill + label per team
-- Use unique index with COALESCE to handle NULL labels
CREATE UNIQUE INDEX idx_team_presets_unique 
  ON team_drill_presets(team_id, drill_id, COALESCE(label, ''));

COMMENT ON TABLE team_drill_presets IS 'Team saved configurations for canonical drills';
COMMENT ON COLUMN team_drill_presets.label IS 'Optional custom name. NULL = use drill name';


-- ============================================================================
-- 4. RLS FOR TEAM DRILL PRESETS
-- ============================================================================

ALTER TABLE team_drill_presets ENABLE ROW LEVEL SECURITY;

-- All team members can view presets
CREATE POLICY "Team members can view presets"
  ON team_drill_presets FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Only commanders/owners can create presets
CREATE POLICY "Commanders can create presets"
  ON team_drill_presets FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'commander')
  ));

-- Only commanders/owners can update presets
CREATE POLICY "Commanders can update presets"
  ON team_drill_presets FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'commander')
  ));

-- Only commanders/owners can delete presets
CREATE POLICY "Commanders can delete presets"
  ON team_drill_presets FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'commander')
  ));


-- ============================================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_team_drill_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_drill_presets_updated_at
  BEFORE UPDATE ON team_drill_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_team_drill_presets_updated_at();


-- ============================================================================
-- 6. MIGRATION: CONVERT EXISTING drill_templates TO team_drill_presets
-- ============================================================================
-- This is a BEST-EFFORT migration. Commanders should review presets after.

-- Only migrate team drills (not personal drills where team_id IS NULL)
INSERT INTO team_drill_presets (team_id, drill_id, label, distance_m, rounds, time_limit_seconds, strings_count, created_by, created_at)
SELECT 
  dt.team_id,
  -- Map to canonical drill based on goal + shots
  CASE 
    -- Grouping drills
    WHEN dt.drill_goal = 'grouping' AND dt.rounds_per_shooter = 1 THEN 'cold_bore'
    WHEN dt.drill_goal = 'grouping' AND dt.rounds_per_shooter <= 3 THEN 'grouping_3shot'
    WHEN dt.drill_goal = 'grouping' AND dt.rounds_per_shooter <= 5 THEN 'grouping_5shot'
    WHEN dt.drill_goal = 'grouping' THEN 'grouping_10shot'
    -- Engagement drills
    WHEN dt.drill_goal = 'engagement' AND dt.rounds_per_shooter <= 6 THEN 'engagement_basic'
    ELSE 'engagement_extended'
  END as drill_id,
  dt.name as label,  -- Preserve original name as label
  dt.distance_m,
  dt.rounds_per_shooter,
  dt.time_limit_seconds,
  COALESCE(dt.strings_count, 1),
  dt.created_by,
  dt.created_at
FROM drill_templates dt
WHERE dt.team_id IS NOT NULL
ON CONFLICT DO NOTHING;  -- Skip if already migrated

-- Note: Personal drills (team_id IS NULL) are intentionally NOT migrated.
-- The new architecture doesn't support personal drills - users should use solo sessions.


-- ============================================================================
-- 7. ADD MIGRATION FLAG TO OLD TABLE (for tracking)
-- ============================================================================
-- Don't drop drill_templates yet - keep for rollback safety

ALTER TABLE drill_templates 
ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

UPDATE drill_templates 
SET migrated_at = NOW() 
WHERE team_id IS NOT NULL AND migrated_at IS NULL;


-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- To rollback this migration:
-- 
-- DROP TABLE IF EXISTS team_drill_presets CASCADE;
-- DROP TABLE IF EXISTS drills CASCADE;
-- ALTER TABLE drill_templates DROP COLUMN IF EXISTS migrated_at;
--
-- ============================================================================
