CREATE TABLE weapon_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer text,
  caliber text NOT NULL,
  weapon_name text NOT NULL,
  weapon_type text,
  effective_range_m int,
  barrel_length_cm numeric,
  twist_rate text,
  metadata jsonb,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (name, caliber)
);

CREATE TABLE sight_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer text,
  kind text NOT NULL,
  metadata jsonb,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_model_id uuid NOT NULL REFERENCES weapon_models(id),
  serial_number text NOT NULL UNIQUE,
  organization_id text NOT NULL,              -- Required: org owns the weapon
  
  last_maintenance_date date,
  round_count int DEFAULT 0,
  condition text,
  notes text,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE sights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sight_model_id uuid NOT NULL REFERENCES sight_models(id),
  serial_number text NOT NULL UNIQUE,
  organization_id text NOT NULL,              -- Required: org owns the sight
  
  last_calibration_date date,
  condition text,
  notes text,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_loadouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,                      -- Fixed: removed duplicate primary key
  organization_id text,
  name text NOT NULL,                         -- "Competition Setup", etc.
  weapon_id uuid REFERENCES weapons(id),
  sight_id uuid REFERENCES sights(id),
  
  -- Loadout-specific configs
  zero_distance_m int,
  zero_conditions jsonb,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, name)                       -- User can't have duplicate names
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Weapons indexes
CREATE INDEX IF NOT EXISTS idx_weapons_org ON weapons(organization_id);
CREATE INDEX IF NOT EXISTS idx_weapons_model ON weapons(weapon_model_id);
CREATE INDEX IF NOT EXISTS idx_weapons_serial ON weapons(serial_number);

-- Sights indexes
CREATE INDEX IF NOT EXISTS idx_sights_org ON sights(organization_id);
CREATE INDEX IF NOT EXISTS idx_sights_model ON sights(sight_model_id);
CREATE INDEX IF NOT EXISTS idx_sights_serial ON sights(serial_number);

-- User loadouts indexes
CREATE INDEX IF NOT EXISTS idx_user_loadouts_user ON user_loadouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loadouts_org ON user_loadouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_loadouts_weapon ON user_loadouts(weapon_id);
CREATE INDEX IF NOT EXISTS idx_user_loadouts_sight ON user_loadouts(sight_id);

-- ============================================================================
-- ROW LEVEL SECURITY - WEAPON_MODELS
-- ============================================================================
ALTER TABLE weapon_models ENABLE ROW LEVEL SECURITY;

-- Anyone can read weapon models (catalog/reference data)
CREATE POLICY "weapon_models_select"
ON weapon_models FOR SELECT TO anon
USING (true);

-- Only authenticated users can suggest new models (you can restrict further if needed)
CREATE POLICY "weapon_models_insert"
ON weapon_models FOR INSERT TO anon
WITH CHECK (auth.jwt()->>'sub' IS NOT NULL);

-- ============================================================================
-- ROW LEVEL SECURITY - SIGHT_MODELS
-- ============================================================================
ALTER TABLE sight_models ENABLE ROW LEVEL SECURITY;

-- Anyone can read sight models (catalog/reference data)
CREATE POLICY "sight_models_select"
ON sight_models FOR SELECT TO anon
USING (true);

-- Only authenticated users can suggest new models
CREATE POLICY "sight_models_insert"
ON sight_models FOR INSERT TO anon
WITH CHECK (auth.jwt()->>'sub' IS NOT NULL);

-- ============================================================================
-- ROW LEVEL SECURITY - WEAPONS (Physical Inventory)
-- ============================================================================
ALTER TABLE weapons ENABLE ROW LEVEL SECURITY;

-- Read: Users can see weapons in their org
CREATE POLICY "weapons_select"
ON weapons FOR SELECT TO anon
USING (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- Insert: Users can add weapons to their org
CREATE POLICY "weapons_insert"
ON weapons FOR INSERT TO anon
WITH CHECK (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- Update: Users can update weapons in their org
CREATE POLICY "weapons_update"
ON weapons FOR UPDATE TO anon
USING (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- Delete: Users can remove weapons from their org (soft delete recommended)
CREATE POLICY "weapons_delete"
ON weapons FOR DELETE TO anon
USING (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY - SIGHTS (Physical Inventory)
-- ============================================================================
ALTER TABLE sights ENABLE ROW LEVEL SECURITY;

-- Read: Users can see sights in their org
CREATE POLICY "sights_select"
ON sights FOR SELECT TO anon
USING (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- Insert: Users can add sights to their org
CREATE POLICY "sights_insert"
ON sights FOR INSERT TO anon
WITH CHECK (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- Update: Users can update sights in their org
CREATE POLICY "sights_update"
ON sights FOR UPDATE TO anon
USING (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- Delete: Users can remove sights from their org
CREATE POLICY "sights_delete"
ON sights FOR DELETE TO anon
USING (
  organization_id = auth.jwt()->>'org_id'
  AND auth.jwt()->>'org_id' IS NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY - USER_LOADOUTS
-- ============================================================================
ALTER TABLE user_loadouts ENABLE ROW LEVEL SECURITY;

-- Read: Users can see their own loadouts OR loadouts in their org
CREATE POLICY "user_loadouts_select"
ON user_loadouts FOR SELECT TO anon
USING (
  user_id = auth.jwt()->>'sub'
  OR (
    organization_id = auth.jwt()->>'org_id'
    AND auth.jwt()->>'org_id' IS NOT NULL
  )
);

-- Insert: Users can create their own loadouts
CREATE POLICY "user_loadouts_insert"
ON user_loadouts FOR INSERT TO anon
WITH CHECK (
  user_id = auth.jwt()->>'sub'
);

-- Update: Users can update their own loadouts
CREATE POLICY "user_loadouts_update"
ON user_loadouts FOR UPDATE TO anon
USING (
  user_id = auth.jwt()->>'sub'
);

-- Delete: Users can delete their own loadouts
CREATE POLICY "user_loadouts_delete"
ON user_loadouts FOR DELETE TO anon
USING (
  user_id = auth.jwt()->>'sub'
);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

-- Reuse existing function from previous migration
CREATE TRIGGER update_weapons_updated_at
  BEFORE UPDATE ON weapons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sights_updated_at
  BEFORE UPDATE ON sights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_loadouts_updated_at
  BEFORE UPDATE ON user_loadouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();