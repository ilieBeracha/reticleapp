-- Migration: Training Auto-Complete Logic
-- Adds functions to check and auto-close trainings when all members complete all drills

-- ============================================================================
-- ADD expires_at COLUMN TO TRAININGS
-- ============================================================================

ALTER TABLE public.trainings 
ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN public.trainings.expires_at IS 'Deadline for training completion. Training auto-closes when this time passes.';

-- ============================================================================
-- FUNCTION: check_training_completion
-- Returns TRUE if training should be auto-closed (all members done OR expired)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_training_completion(p_training_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_expires_at timestamptz;
  v_has_drills boolean;
  v_has_participants boolean;
  v_missing_count integer;
BEGIN
  -- Get training info
  SELECT t.team_id, t.expires_at
  INTO v_team_id, v_expires_at
  FROM trainings t
  WHERE t.id = p_training_id;
  
  -- Training not found
  IF v_team_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if deadline passed (if expires_at is set)
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Check if training has drills
  SELECT EXISTS (
    SELECT 1 FROM training_drills WHERE training_id = p_training_id
  ) INTO v_has_drills;
  
  -- No drills = nothing to complete
  IF NOT v_has_drills THEN
    RETURN FALSE;
  END IF;
  
  -- Check if team has participants
  SELECT EXISTS (
    SELECT 1 FROM team_members WHERE team_id = v_team_id
  ) INTO v_has_participants;
  
  -- No participants = nothing to complete
  IF NOT v_has_participants THEN
    RETURN FALSE;
  END IF;
  
  -- Count missing completions (participants × drills that are NOT in user_drill_completions)
  SELECT COUNT(*)
  INTO v_missing_count
  FROM (
    -- Required: every participant × every drill
    SELECT tm.user_id, td.id as drill_id
    FROM team_members tm
    CROSS JOIN training_drills td
    WHERE tm.team_id = v_team_id
      AND td.training_id = p_training_id
  ) required
  LEFT JOIN user_drill_completions udc
    ON udc.user_id = required.user_id 
    AND udc.drill_id = required.drill_id
    AND udc.training_id = p_training_id
  WHERE udc.id IS NULL;
  
  -- All done if no missing completions
  RETURN v_missing_count = 0;
END;
$$;

-- ============================================================================
-- FUNCTION: auto_close_training_if_complete
-- Checks completion and updates status if should close
-- Returns the updated training status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_close_training_if_complete(p_training_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_should_close boolean;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM trainings
  WHERE id = p_training_id;
  
  -- Only check active trainings (planned or ongoing)
  IF v_current_status NOT IN ('planned', 'ongoing', 'in_progress') THEN
    RETURN v_current_status;
  END IF;
  
  -- Check if should close
  v_should_close := check_training_completion(p_training_id);
  
  IF v_should_close THEN
    UPDATE trainings
    SET 
      status = 'finished',
      ended_at = NOW(),
      updated_at = NOW()
    WHERE id = p_training_id;
    
    RETURN 'finished';
  END IF;
  
  RETURN v_current_status;
END;
$$;

-- ============================================================================
-- FUNCTION: get_training_completion_status
-- Returns detailed completion stats for commander dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_training_completion_status(p_training_id uuid)
RETURNS TABLE (
  total_participants integer,
  participants_complete integer,
  total_drills integer,
  total_required_completions integer,
  total_actual_completions integer,
  completion_pct numeric,
  expires_at timestamptz,
  is_expired boolean,
  should_auto_close boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Get training info
  SELECT t.team_id, t.expires_at
  INTO v_team_id, v_expires_at
  FROM trainings t
  WHERE t.id = p_training_id;
  
  RETURN QUERY
  WITH participants AS (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.team_id = v_team_id
  ),
  drills AS (
    SELECT td.id as drill_id
    FROM training_drills td
    WHERE td.training_id = p_training_id
  ),
  required AS (
    SELECT p.user_id, d.drill_id
    FROM participants p
    CROSS JOIN drills d
  ),
  completions AS (
    SELECT udc.user_id, udc.drill_id
    FROM user_drill_completions udc
    WHERE udc.training_id = p_training_id
  ),
  participant_stats AS (
    SELECT 
      p.user_id,
      COUNT(c.drill_id) as drills_done,
      (SELECT COUNT(*) FROM drills) as total_drills
    FROM participants p
    LEFT JOIN completions c ON c.user_id = p.user_id
    GROUP BY p.user_id
  )
  SELECT
    (SELECT COUNT(*)::integer FROM participants),
    (SELECT COUNT(*)::integer FROM participant_stats WHERE drills_done = total_drills),
    (SELECT COUNT(*)::integer FROM drills),
    (SELECT COUNT(*)::integer FROM required),
    (SELECT COUNT(*)::integer FROM completions),
    CASE 
      WHEN (SELECT COUNT(*) FROM required) = 0 THEN 0
      ELSE ROUND((SELECT COUNT(*) FROM completions)::numeric / (SELECT COUNT(*) FROM required) * 100, 1)
    END,
    v_expires_at,
    v_expires_at IS NOT NULL AND v_expires_at < NOW(),
    check_training_completion(p_training_id);
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.check_training_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_training_if_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_training_completion_status(uuid) TO authenticated;

