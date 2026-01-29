-- ============================================================================
-- RESET ALL USER / EXECUTION DATA
-- Keep constants: weapons, drills, drill_templates, profiles
-- Engagement-anchored architecture
-- ============================================================================

BEGIN;

-- ─── ENGAGEMENT RESULTS / LEAF TABLES ───────────────────────────────────────
TRUNCATE TABLE paper_target_results CASCADE;
TRUNCATE TABLE tactical_target_results CASCADE;

-- ─── ENGAGEMENT EXECUTION DATA ──────────────────────────────────────────────
TRUNCATE TABLE engagement_participants CASCADE;
TRUNCATE TABLE engagements CASCADE;

-- Optional engagement artifacts (safe cleanup)
DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE engagement_events CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE engagement_results CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE engagement_features CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE engagement_timelines CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── SESSION CHILDREN ───────────────────────────────────────────────────────
TRUNCATE TABLE session_targets CASCADE;
TRUNCATE TABLE session_features CASCADE;
TRUNCATE TABLE session_insights CASCADE;
TRUNCATE TABLE session_timelines CASCADE;
TRUNCATE TABLE session_standards_verdicts CASCADE;

-- ─── TRAINING DATA ──────────────────────────────────────────────────────────
TRUNCATE TABLE user_drill_completions CASCADE;
TRUNCATE TABLE training_drills CASCADE;
TRUNCATE TABLE trainings CASCADE;

-- Training goals (if present)
DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE training_goals CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── SESSIONS ───────────────────────────────────────────────────────────────
TRUNCATE TABLE sessions CASCADE;

-- ─── TEAM DATA ──────────────────────────────────────────────────────────────
TRUNCATE TABLE weapon_requests CASCADE;
TRUNCATE TABLE team_weapons CASCADE;
TRUNCATE TABLE team_drill_presets CASCADE;
TRUNCATE TABLE team_standard_modifiers CASCADE;
TRUNCATE TABLE team_standards CASCADE;
TRUNCATE TABLE team_invitations CASCADE;
TRUNCATE TABLE team_members CASCADE;
TRUNCATE TABLE teams CASCADE;

-- ─── USER DATA ──────────────────────────────────────────────────────────────
TRUNCATE TABLE user_weapons CASCADE;
TRUNCATE TABLE user_baselines CASCADE;
TRUNCATE TABLE user_insight_triggers CASCADE;

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
TRUNCATE TABLE notification_history CASCADE;
TRUNCATE TABLE push_tokens CASCADE;

-- ─── OPTIONAL / LEGACY TABLES ───────────────────────────────────────────────
DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE session_stats CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE session_participants CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'TRUNCATE TABLE notifications CASCADE';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

COMMIT;

-- ============================================================================
-- PRESERVED TABLES (CONSTANTS)
--   • weapons
--   • drills
--   • drill_templates
--   • profiles (auth-bound)
-- ============================================================================
