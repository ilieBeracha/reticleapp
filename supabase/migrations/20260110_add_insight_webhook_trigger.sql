-- ============================================================================
-- INSIGHT WEBHOOK TRIGGER
-- ============================================================================
-- 
-- This migration adds a trigger to automatically call the generate-insights
-- Edge Function when session_features are computed.
--
-- The trigger uses pg_net to make an async HTTP call to the Edge Function.
-- This keeps the database fast while offloading insight generation.
--
-- Prerequisites:
--   1. Deploy the generate-insights Edge Function
--   2. Set PINECONE_API_KEY and PINECONE_INDEX_HOST in Supabase secrets
--
-- Apply this migration manually via Supabase Dashboard SQL Editor
-- ============================================================================


-- ============================================================================
-- FUNCTION: notify_insight_generation()
-- ============================================================================
-- Called by trigger, invokes the Edge Function via pg_net.

CREATE OR REPLACE FUNCTION public.notify_insight_generation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  v_url text;
  v_service_role_key text;
BEGIN
  -- Get the Edge Function URL from environment
  -- Format: https://<project-ref>.supabase.co/functions/v1/generate-insights
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-insights';
  
  -- Get service role key for authentication
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings not configured, skip silently
  IF v_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE 'Insight webhook not configured, skipping';
    RETURN NEW;
  END IF;
  
  -- Make async HTTP POST to Edge Function
  -- Using pg_net extension for non-blocking requests
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('session_id', NEW.session_id)
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to call insight webhook: %', SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_insight_generation IS 
'Trigger function that calls generate-insights Edge Function via pg_net when session_features are inserted.';


-- ============================================================================
-- TRIGGER: trigger_insight_generation
-- ============================================================================
-- Fires after INSERT on session_features to generate insights.

DROP TRIGGER IF EXISTS trigger_insight_generation ON public.session_features;

CREATE TRIGGER trigger_insight_generation
  AFTER INSERT ON public.session_features
  FOR EACH ROW
  EXECUTE FUNCTION notify_insight_generation();

COMMENT ON TRIGGER trigger_insight_generation ON public.session_features IS 
'Automatically generates insights when session_features are computed.';


-- ============================================================================
-- ALTERNATIVE: Manual invocation function
-- ============================================================================
-- Use this if you prefer to call insight generation manually instead of
-- using a trigger. Call from your app after session completion.

CREATE OR REPLACE FUNCTION public.generate_session_insights(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
DECLARE
  v_url text;
  v_service_role_key text;
  v_response_id bigint;
BEGIN
  -- Ensure session_features exist
  IF NOT EXISTS (SELECT 1 FROM session_features WHERE session_id = p_session_id) THEN
    -- Compute features first
    PERFORM compute_session_features(p_session_id);
  END IF;
  
  -- Get Edge Function URL
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-insights';
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF v_url IS NULL OR v_service_role_key IS NULL THEN
    RETURN jsonb_build_object('error', 'Webhook not configured');
  END IF;
  
  -- Call Edge Function
  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('session_id', p_session_id)
  ) INTO v_response_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_response_id,
    'message', 'Insight generation triggered'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.generate_session_insights IS 
'Manually trigger insight generation for a session. Computes features if needed, then calls Edge Function.';

GRANT EXECUTE ON FUNCTION public.generate_session_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_session_insights TO service_role;


-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- To configure the webhook, set these in your Supabase project:
--
-- 1. In SQL Editor, run:
--    ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
--
-- 2. Or in Edge Function secrets (recommended):
--    supabase secrets set PINECONE_API_KEY=your-pinecone-api-key
--    supabase secrets set PINECONE_INDEX_HOST=reticle-sessions-xxx.svc.aped-xxx.pinecone.io
--
-- 3. Deploy the Edge Function:
--    supabase functions deploy generate-insights
--
-- The pg_net extension must be enabled (it's enabled by default on Supabase).
