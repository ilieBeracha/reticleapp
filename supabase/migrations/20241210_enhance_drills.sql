-- ============================================================================
-- ENHANCED DRILLS: Add comprehensive configuration options
-- ============================================================================

-- Add new columns to training_drills table
ALTER TABLE training_drills
  -- Description
  ADD COLUMN IF NOT EXISTS description text,
  
  -- Timing
  ADD COLUMN IF NOT EXISTS par_time_seconds integer,
  
  -- Scoring
  ADD COLUMN IF NOT EXISTS scoring_mode text CHECK (scoring_mode IS NULL OR scoring_mode = ANY (ARRAY['accuracy', 'speed', 'combined', 'pass_fail', 'points'])),
  ADD COLUMN IF NOT EXISTS min_accuracy_percent integer CHECK (min_accuracy_percent IS NULL OR (min_accuracy_percent >= 0 AND min_accuracy_percent <= 100)),
  ADD COLUMN IF NOT EXISTS points_per_hit integer,
  ADD COLUMN IF NOT EXISTS penalty_per_miss integer,
  
  -- Target Configuration
  ADD COLUMN IF NOT EXISTS target_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_size text CHECK (target_size IS NULL OR target_size = ANY (ARRAY['full', 'half', 'head', 'a_zone', 'c_zone', 'steel_8in', 'steel_10in', 'custom'])),
  ADD COLUMN IF NOT EXISTS shots_per_target integer,
  ADD COLUMN IF NOT EXISTS target_exposure_seconds integer,
  
  -- Start Position
  ADD COLUMN IF NOT EXISTS start_position text CHECK (start_position IS NULL OR start_position = ANY (ARRAY['holstered', 'low_ready', 'high_ready', 'table_start', 'surrender', 'compressed_ready'])),
  
  -- Stage Setup
  ADD COLUMN IF NOT EXISTS strings_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reload_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS movement_type text CHECK (movement_type IS NULL OR movement_type = ANY (ARRAY['none', 'advance', 'retreat', 'lateral', 'diagonal', 'freestyle'])),
  ADD COLUMN IF NOT EXISTS movement_distance_m integer,
  
  -- Difficulty & Category
  ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IS NULL OR difficulty = ANY (ARRAY['beginner', 'intermediate', 'advanced', 'expert'])),
  ADD COLUMN IF NOT EXISTS category text CHECK (category IS NULL OR category = ANY (ARRAY['fundamentals', 'speed', 'accuracy', 'stress', 'tactical', 'competition', 'qualification'])),
  ADD COLUMN IF NOT EXISTS tags text[],
  
  -- Rich Content
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS diagram_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS safety_notes text;

-- Update position column constraint for training_drills
ALTER TABLE training_drills DROP CONSTRAINT IF EXISTS training_drills_position_check;
ALTER TABLE training_drills ADD CONSTRAINT training_drills_position_check 
  CHECK (position IS NULL OR position = ANY (ARRAY['standing', 'kneeling', 'prone', 'sitting', 'barricade', 'transition', 'freestyle']));

-- Update weapon_category column constraint for training_drills
ALTER TABLE training_drills DROP CONSTRAINT IF EXISTS training_drills_weapon_category_check;
ALTER TABLE training_drills ADD CONSTRAINT training_drills_weapon_category_check 
  CHECK (weapon_category IS NULL OR weapon_category = ANY (ARRAY['rifle', 'pistol', 'shotgun', 'carbine', 'precision_rifle', 'any']));


-- ============================================================================
-- Add same columns to drill_templates table
-- ============================================================================

ALTER TABLE drill_templates
  -- Timing
  ADD COLUMN IF NOT EXISTS par_time_seconds integer,
  
  -- Scoring
  ADD COLUMN IF NOT EXISTS scoring_mode text CHECK (scoring_mode IS NULL OR scoring_mode = ANY (ARRAY['accuracy', 'speed', 'combined', 'pass_fail', 'points'])),
  ADD COLUMN IF NOT EXISTS min_accuracy_percent integer CHECK (min_accuracy_percent IS NULL OR (min_accuracy_percent >= 0 AND min_accuracy_percent <= 100)),
  ADD COLUMN IF NOT EXISTS points_per_hit integer,
  ADD COLUMN IF NOT EXISTS penalty_per_miss integer,
  
  -- Target Configuration
  ADD COLUMN IF NOT EXISTS target_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS target_size text CHECK (target_size IS NULL OR target_size = ANY (ARRAY['full', 'half', 'head', 'a_zone', 'c_zone', 'steel_8in', 'steel_10in', 'custom'])),
  ADD COLUMN IF NOT EXISTS shots_per_target integer,
  ADD COLUMN IF NOT EXISTS target_exposure_seconds integer,
  
  -- Start Position
  ADD COLUMN IF NOT EXISTS start_position text CHECK (start_position IS NULL OR start_position = ANY (ARRAY['holstered', 'low_ready', 'high_ready', 'table_start', 'surrender', 'compressed_ready'])),
  
  -- Stage Setup
  ADD COLUMN IF NOT EXISTS strings_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reload_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS movement_type text CHECK (movement_type IS NULL OR movement_type = ANY (ARRAY['none', 'advance', 'retreat', 'lateral', 'diagonal', 'freestyle'])),
  ADD COLUMN IF NOT EXISTS movement_distance_m integer,
  
  -- Difficulty & Category
  ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IS NULL OR difficulty = ANY (ARRAY['beginner', 'intermediate', 'advanced', 'expert'])),
  ADD COLUMN IF NOT EXISTS category text CHECK (category IS NULL OR category = ANY (ARRAY['fundamentals', 'speed', 'accuracy', 'stress', 'tactical', 'competition', 'qualification'])),
  ADD COLUMN IF NOT EXISTS tags text[],
  
  -- Rich Content
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS diagram_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS safety_notes text;

-- Update position column constraint for drill_templates
ALTER TABLE drill_templates DROP CONSTRAINT IF EXISTS drill_templates_position_check;
ALTER TABLE drill_templates ADD CONSTRAINT drill_templates_position_check 
  CHECK (position IS NULL OR position = ANY (ARRAY['standing', 'kneeling', 'prone', 'sitting', 'barricade', 'transition', 'freestyle']));

-- Update weapon_category column constraint for drill_templates
ALTER TABLE drill_templates DROP CONSTRAINT IF EXISTS drill_templates_weapon_category_check;
ALTER TABLE drill_templates ADD CONSTRAINT drill_templates_weapon_category_check 
  CHECK (weapon_category IS NULL OR weapon_category = ANY (ARRAY['rifle', 'pistol', 'shotgun', 'carbine', 'precision_rifle', 'any']));
