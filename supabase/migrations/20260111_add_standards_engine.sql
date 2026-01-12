-- ============================================================================
-- STANDARDS ENGINE
-- Commander-defined performance standards with condition modifiers
-- 
-- Core Principle: Rules decide outcomes. AI advises, never judges.
-- ============================================================================

-- ============================================================================
-- 1. BASE STANDARDS TABLE
-- What commanders expect under normal conditions
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Identity
  name text NOT NULL,
  description text,
  
  -- What this standard applies to
  drill_goal text NOT NULL CHECK (drill_goal IN ('grouping', 'engagement')),
  distance_m integer NOT NULL,
  weapon_category text, -- 'rifle' | 'pistol' | 'shotgun' | null (any)
  
  -- Primary metric (enforced alignment with drill_goal)
  -- This is THE metric that determines PASS/FAIL
  primary_metric text NOT NULL CHECK (primary_metric IN ('grouping_cm', 'accuracy_pct')),
  
  -- Expected Performance (based on drill_goal)
  expected_grouping_cm numeric,      -- For grouping drills: max group size
  expected_accuracy_pct numeric,     -- For engagement drills: min hit %
  expected_time_seconds integer,     -- Optional: secondary constraint (not primary metric)
  
  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  
  -- Constraints: primary_metric MUST match drill_goal
  CONSTRAINT primary_metric_matches_goal CHECK (
    (primary_metric = 'grouping_cm' AND drill_goal = 'grouping')
    OR
    (primary_metric = 'accuracy_pct' AND drill_goal = 'engagement')
  ),
  CONSTRAINT valid_grouping_standard CHECK (
    drill_goal != 'grouping' OR expected_grouping_cm IS NOT NULL
  ),
  CONSTRAINT valid_engagement_standard CHECK (
    drill_goal != 'engagement' OR expected_accuracy_pct IS NOT NULL
  ),
  CONSTRAINT positive_grouping CHECK (expected_grouping_cm IS NULL OR expected_grouping_cm > 0),
  CONSTRAINT valid_accuracy CHECK (expected_accuracy_pct IS NULL OR (expected_accuracy_pct >= 0 AND expected_accuracy_pct <= 100)),
  CONSTRAINT positive_time CHECK (expected_time_seconds IS NULL OR expected_time_seconds > 0)
);

-- ============================================================================
-- 2. CONDITION MODIFIERS TABLE
-- Adjustments for environmental/physical conditions
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_standard_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- What condition triggers this modifier
  condition_type text NOT NULL CHECK (condition_type IN (
    'weather_rain',
    'weather_wind',
    'weather_cold',
    'weather_hot',
    'fatigue_shots',
    'fatigue_time',
    'fatigue_hr',
    'night_conditions',
    'elevation_high',
    'manual'  -- Commander-marked condition
  )),
  
  -- Threshold for activation (JSON for flexibility)
  -- Examples:
  --   { "wind_kmh_gt": 15 }
  --   { "shots_gt": 50 }
  --   { "duration_minutes_gt": 30 }
  --   { "hr_bpm_gt": 140 }
  --   { "temp_c_lt": 5 }
  --   { "temp_c_gt": 35 }
  condition_threshold jsonb NOT NULL DEFAULT '{}',
  
  -- How this modifier affects the verdict (future-proofing)
  -- tolerance: adjusts expected values (default, v1)
  -- invalidate: marks drill as invalid (no verdict)
  -- override: forces FAIL regardless of performance
  modifier_effect_type text NOT NULL DEFAULT 'tolerance' CHECK (
    modifier_effect_type IN ('tolerance', 'invalidate', 'override')
  ),
  
  -- Penalty adjustments (additive - positive = more lenient)
  -- Only used when modifier_effect_type = 'tolerance'
  grouping_penalty_cm numeric DEFAULT 0,
  accuracy_penalty_pct numeric DEFAULT 0,  -- Subtracted from requirement
  time_penalty_seconds integer DEFAULT 0,
  
  -- Display
  name text NOT NULL,
  description text,
  icon text, -- emoji or icon name
  
  -- Metadata
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- ============================================================================
-- 3. SESSION VERDICTS TABLE
-- Stored results of standard evaluation (enforcements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_standards_verdicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Evaluation scope (future-proofing for per-drill or per-target verdicts)
  -- session: verdict applies to entire session (v1 default)
  -- drill: verdict applies to a specific drill within training
  -- target: verdict applies to a specific target
  evaluation_scope text NOT NULL DEFAULT 'session' CHECK (
    evaluation_scope IN ('session', 'drill', 'target')
  ),
  scope_ref_id uuid, -- Reference to drill_id or target_id when scope != 'session'
  
  -- What standard was applied (null if no matching standard)
  base_standard_id uuid REFERENCES team_standards(id) ON DELETE SET NULL,
  
  -- Which modifiers were triggered
  applied_modifiers jsonb DEFAULT '[]',
  -- Array of: { id, name, description, effect_type, grouping_penalty_cm, accuracy_penalty_pct, time_penalty_seconds }
  
  -- Calculated effective thresholds
  effective_grouping_cm numeric,
  effective_accuracy_pct numeric,
  effective_time_seconds integer,
  
  -- Actual results (copied for easy querying / audit trail)
  actual_grouping_cm numeric,
  actual_accuracy_pct numeric,
  actual_time_seconds integer,
  
  -- THE VERDICT (deterministic, rule-based, NEVER AI)
  passed boolean NOT NULL,
  
  -- Structured explanation (for UI display)
  verdict_breakdown jsonb NOT NULL DEFAULT '{}',
  -- { base: {...}, modifiers: [...], calculation: "5 + 2 + 1 = 8cm", comparison: "7cm <= 8cm" }
  
  created_at timestamptz DEFAULT now(),
  
  -- One verdict per session+scope combination
  UNIQUE(session_id, evaluation_scope, scope_ref_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_team_standards_team_active 
  ON team_standards(team_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_standards_lookup 
  ON team_standards(team_id, drill_goal, distance_m) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_modifiers_team 
  ON team_standard_modifiers(team_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_session_verdicts_session 
  ON session_standards_verdicts(session_id);

CREATE INDEX IF NOT EXISTS idx_session_verdicts_scope
  ON session_standards_verdicts(session_id, evaluation_scope);

CREATE INDEX IF NOT EXISTS idx_session_verdicts_failed 
  ON session_standards_verdicts(passed) WHERE passed = false;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE team_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_standard_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_standards_verdicts ENABLE ROW LEVEL SECURITY;

-- Team members can read standards
CREATE POLICY "Team members can read standards" ON team_standards
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Commanders can manage standards
CREATE POLICY "Commanders can manage standards" ON team_standards
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'commander')
    )
  );

-- Team members can read modifiers
CREATE POLICY "Team members can read modifiers" ON team_standard_modifiers
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Commanders can manage modifiers
CREATE POLICY "Commanders can manage modifiers" ON team_standard_modifiers
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'commander')
    )
  );

-- Users can read their own session verdicts
CREATE POLICY "Users can read own verdicts" ON session_standards_verdicts
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- Team members can read team session verdicts
CREATE POLICY "Team members can read team verdicts" ON session_standards_verdicts
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      WHERE s.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- System inserts verdicts (via service role or trigger)
CREATE POLICY "System can insert verdicts" ON session_standards_verdicts
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_team_standards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_standards_updated_at
  BEFORE UPDATE ON team_standards
  FOR EACH ROW
  EXECUTE FUNCTION update_team_standards_updated_at();
