-- Simplify session drill configuration
-- 
-- ARCHITECTURE CHANGE:
-- Before: session.custom_drill_config (JSONB) duplicated drill rules
-- After: session.drill_id (FK) is source of truth, soldier choices are explicit columns
--
-- training_drills = Commander's rules (the contract)
-- sessions = Soldier's execution (following the contract)

-- ============================================================================
-- 1. ADD SOLDIER CHOICE COLUMNS TO SESSIONS
-- ============================================================================

-- Soldier's actual distance (when commander allows choice via distance_category or NULL distance_m)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS soldier_distance_m integer;

COMMENT ON COLUMN public.sessions.soldier_distance_m IS
'Actual distance soldier shot at. Used when commander set distance_category (range constraint) instead of exact distance_m.';

-- Soldier's actual bullet count (when commander allows choice via NULL rounds_per_shooter)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS soldier_bullets integer;

COMMENT ON COLUMN public.sessions.soldier_bullets IS
'Actual bullets soldier used. Used when commander left rounds_per_shooter NULL (soldier chooses).';

-- Soldier's actual position (when commander allows choice via NULL position)
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS soldier_position text;

COMMENT ON COLUMN public.sessions.soldier_position IS
'Actual position soldier used. Used when commander left position NULL (soldier chooses).';


-- ============================================================================
-- 2. ADD COMMANDER RULES TO TRAINING_DRILLS
-- ============================================================================

-- Max executions per soldier (e.g., "this drill can only be done once")
ALTER TABLE public.training_drills
ADD COLUMN IF NOT EXISTS max_executions integer DEFAULT 1;

COMMENT ON COLUMN public.training_drills.max_executions IS
'Maximum times a soldier can execute this drill. Default 1 = one attempt only. NULL = unlimited.';

-- Distance category (short/medium/long) - soldier picks exact distance within range
ALTER TABLE public.training_drills
ADD COLUMN IF NOT EXISTS distance_category text;

COMMENT ON COLUMN public.training_drills.distance_category IS
'Range category (short/medium/long). If set, soldier picks exact distance within this range.';


-- ============================================================================
-- 3. ADD CONSTRAINT FOR soldier_position (match training_drills positions)
-- ============================================================================

ALTER TABLE public.sessions
ADD CONSTRAINT sessions_soldier_position_check 
CHECK ((soldier_position IS NULL) OR (soldier_position = ANY (ARRAY['standing', 'kneeling', 'prone', 'seated', 'sitting', 'barricade', 'transition', 'freestyle'])));


-- ============================================================================
-- 4. NOTE: custom_drill_config is NOT removed for backward compatibility
--    New code should use drill_id FK + soldier_* columns instead
-- ============================================================================
