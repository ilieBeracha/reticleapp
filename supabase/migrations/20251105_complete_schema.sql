-- ============================================
-- COMPLETE SCHEMA FOR SCOPES TRAINING APP
-- ============================================

-- ==========================================
-- SESSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session data
  training_id uuid REFERENCES trainings(id) ON DELETE SET NULL,
  name text NOT NULL,
  session_type text CHECK (session_type IN ('steel', 'paper', 'idpa', 'ipsc', 'other')),
  day_period text CHECK (day_period IN ('day', 'night')),
  range_distance numeric,
  notes text,
  
  -- Audit
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);
CREATE INDEX idx_sessions_training_id ON sessions(training_id);

-- RLS Policies for Sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR (
    organization_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "sessions_insert" ON sessions FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "sessions_update" ON sessions FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "sessions_delete" ON sessions FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- ==========================================
-- TRAININGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Training data
  name text NOT NULL,
  description text,
  scheduled_date timestamptz,
  location text,
  
  -- Audit
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_trainings_organization_id ON trainings(organization_id);
CREATE INDEX idx_trainings_created_by ON trainings(created_by);

-- RLS Policies for Trainings
CREATE POLICY "trainings_select" ON trainings FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR (
    organization_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "trainings_insert" ON trainings FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "trainings_update" ON trainings FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "trainings_delete" ON trainings FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- ==========================================
-- CHILD ORGANIZATION CREATION
-- ==========================================

-- Ensure commanders can create child organizations
-- Policy already exists in organizations table, but verify:

CREATE POLICY IF NOT EXISTS "commanders_create_child_orgs" ON organizations
FOR INSERT TO authenticated
WITH CHECK (
  -- For child orgs, user must be commander in parent
  parent_id IS NULL
  OR EXISTS (
    SELECT 1 FROM org_memberships
    WHERE org_id = parent_id
    AND user_id = auth.uid()
    AND role = 'commander'
  )
);

-- ==========================================
-- UPDATED AT TRIGGERS
-- ==========================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trainings_updated_at ON trainings;
CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON trainings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- GRANTS
-- ==========================================

GRANT ALL ON sessions TO authenticated;
GRANT ALL ON trainings TO authenticated;
GRANT ALL ON weapon_models TO authenticated;
GRANT ALL ON sight_models TO authenticated;
GRANT ALL ON weapons TO authenticated;
GRANT ALL ON sights TO authenticated;

-- ==========================================
-- HELPFUL VIEWS (Optional)
-- ==========================================

-- View to see all sessions with training names
CREATE OR REPLACE VIEW sessions_with_details AS
SELECT 
  s.*,
  t.name as training_name,
  u.full_name as created_by_name,
  o.name as organization_name
FROM sessions s
LEFT JOIN trainings t ON s.training_id = t.id
LEFT JOIN users u ON s.created_by = u.id
LEFT JOIN organizations o ON s.organization_id = o.id;

GRANT SELECT ON sessions_with_details TO authenticated;

