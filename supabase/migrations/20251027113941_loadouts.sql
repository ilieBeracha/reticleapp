-- ============================================================
-- FULL SCHEMA FOR WEAPON SYSTEM (CLERK-AWARE RLS)
-- ============================================================

-- ============================================================
-- 1. TABLE: weapon_models
-- ============================================================
CREATE TABLE IF NOT EXISTS weapon_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name text NOT NULL,
  weapon_name text,
  manufacturer text,
  weapon_type text,

  -- Ballistics
  caliber text,
  cartridge_raw text,
  effective_range_m int,
  barrel_length_cm numeric,
  twist_rate text,

  -- Metadata
  origin text,
  year int,
  metadata jsonb DEFAULT '{}'::jsonb,

  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (name, caliber)
);

-- ============================================================
-- 2. TABLE: sight_models
-- ============================================================
CREATE TABLE IF NOT EXISTS sight_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer text,
  kind text NOT NULL,              -- e.g. "scope", "optic", "thermal"
  mount_type text,                 -- optional: Picatinny, Dovetail, etc.
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. TABLE: weapons (ORG INVENTORY)
-- ============================================================
CREATE TABLE IF NOT EXISTS weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_model_id uuid NOT NULL REFERENCES weapon_models(id) ON DELETE CASCADE,
  serial_number text NOT NULL UNIQUE,
  organization_id text NOT NULL,          -- organization that owns the weapon

  last_maintenance_date date,
  round_count int DEFAULT 0,
  condition text,
  notes text,

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. TABLE: sights (ORG INVENTORY)
-- ============================================================
CREATE TABLE IF NOT EXISTS sights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sight_model_id uuid NOT NULL REFERENCES sight_models(id) ON DELETE CASCADE,
  serial_number text NOT NULL UNIQUE,
  organization_id text NOT NULL,          -- organization that owns the sight

  last_calibration_date date,
  condition text,
  notes text,

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. TABLE: user_loadouts
-- ============================================================
CREATE TABLE IF NOT EXISTS user_loadouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,                  -- Clerk user id (jwt->>'sub')
  organization_id text,                   -- Clerk org id (jwt->>'org_id')
  name text NOT NULL,                     -- e.g. "Competition Setup"
  weapon_id uuid REFERENCES weapons(id),
  sight_id uuid REFERENCES sights(id),

  -- Loadout configuration
  zero_distance_m int,
  zero_conditions jsonb,

  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, name)
);

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_weapons_org ON weapons(organization_id);
CREATE INDEX IF NOT EXISTS idx_weapons_model ON weapons(weapon_model_id);
CREATE INDEX IF NOT EXISTS idx_weapons_serial ON weapons(serial_number);

CREATE INDEX IF NOT EXISTS idx_sights_org ON sights(organization_id);
CREATE INDEX IF NOT EXISTS idx_sights_model ON sights(sight_model_id);
CREATE INDEX IF NOT EXISTS idx_sights_serial ON sights(serial_number);

CREATE INDEX IF NOT EXISTS idx_user_loadouts_user ON user_loadouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_loadouts_org ON user_loadouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_loadouts_weapon ON user_loadouts(weapon_id);
CREATE INDEX IF NOT EXISTS idx_user_loadouts_sight ON user_loadouts(sight_id);

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- ============================================================
-- weapon_models (Public Reference Data)
-- ============================================================
ALTER TABLE weapon_models ENABLE ROW LEVEL SECURITY;

-- Public read (anyone, even anon)
CREATE POLICY weapon_models_select
ON weapon_models FOR SELECT
USING (true);

-- Only authenticated users (via Clerk JWT) can suggest or insert models
CREATE POLICY  weapon_models_insert
ON weapon_models FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' IS NOT NULL);

-- ============================================================
-- sight_models (Public Reference Data)
-- ============================================================
ALTER TABLE sight_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY  sight_models_select
ON sight_models FOR SELECT
USING (true);

CREATE POLICY  sight_models_insert
ON sight_models FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' IS NOT NULL);

-- ============================================================
-- weapons (ORG INVENTORY)
-- ============================================================
ALTER TABLE weapons ENABLE ROW LEVEL SECURITY;

-- Read: anyone from the same org
CREATE POLICY  weapons_select
ON weapons FOR SELECT
USING (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

-- Insert: user must belong to org
CREATE POLICY  weapons_insert
ON weapons FOR INSERT
WITH CHECK (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

-- Update: same org only
CREATE POLICY  weapons_update
ON weapons FOR UPDATE
USING (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

-- Delete: same org only
CREATE POLICY  weapons_delete
ON weapons FOR DELETE
USING (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

-- ============================================================
-- sights (ORG INVENTORY)
-- ============================================================
ALTER TABLE sights ENABLE ROW LEVEL SECURITY;

CREATE POLICY  sights_select
ON sights FOR SELECT
USING (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

CREATE POLICY  sights_insert
ON sights FOR INSERT
WITH CHECK (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

CREATE POLICY  sights_update
ON sights FOR UPDATE
USING (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

CREATE POLICY  sights_delete
ON sights FOR DELETE
USING (
  organization_id = auth.jwt() ->> 'org_id'
  AND auth.jwt() ->> 'org_id' IS NOT NULL
);

-- ============================================================
-- user_loadouts (Per-user or org-level access)
-- ============================================================
ALTER TABLE user_loadouts ENABLE ROW LEVEL SECURITY;

-- Read: own loadouts or same org
CREATE POLICY  user_loadouts_select
ON user_loadouts FOR SELECT
USING (
  user_id = auth.jwt() ->> 'sub'
  OR (
    organization_id = auth.jwt() ->> 'org_id'
    AND auth.jwt() ->> 'org_id' IS NOT NULL
  )
);

-- Insert: user can only create their own loadouts
CREATE POLICY  user_loadouts_insert
ON user_loadouts FOR INSERT
WITH CHECK (
  user_id = auth.jwt() ->> 'sub'
);

-- Update: user can update their own loadouts
CREATE POLICY  user_loadouts_update
ON user_loadouts FOR UPDATE
USING (
  user_id = auth.jwt() ->> 'sub'
);

-- Delete: user can delete their own loadouts
CREATE POLICY  user_loadouts_delete
ON user_loadouts FOR DELETE
USING (
  user_id = auth.jwt() ->> 'sub'
);

-- ============================================================
-- 8. TRIGGERS FOR updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weapon_models_updated_at
  BEFORE UPDATE ON weapon_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sight_models_updated_at
  BEFORE UPDATE ON sight_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

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

-- ============================================================
-- END OF SCHEMA
-- ============================================================
