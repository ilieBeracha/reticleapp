-- ============================================================================
-- Session Timeline Storage
-- ============================================================================
-- Stores time-series biometric data from Garmin watch (Phase 3 sync).
-- Each session can have one timeline record with:
-- - points: Array of biometric samples (every 3 seconds)
-- - shot_details: Detailed biometrics at each shot moment
-- - summary: Aggregated stats for quick queries
-- ============================================================================

-- Create session_timelines table
CREATE TABLE IF NOT EXISTS public.session_timelines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    
    -- Timeline points: stored as JSONB array
    -- Each point: { timestamp, heartRate, breathRate, stress, eventType }
    points jsonb NOT NULL DEFAULT '[]'::jsonb,
    
    -- Shot details: detailed biometrics at shot moments
    -- Each: { shotNumber, timestamp, heartRate, breathRate, breathPhase, stress, steadiness, flinch }
    shot_details jsonb NOT NULL DEFAULT '[]'::jsonb,
    
    -- Pre-computed summary stats for quick queries
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadata
    total_chunks integer NOT NULL DEFAULT 1,
    received_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Ensure one timeline per session
    CONSTRAINT session_timelines_session_id_key UNIQUE (session_id)
);

-- Create indexes for common queries (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_session_timelines_session ON public.session_timelines(session_id);
CREATE INDEX IF NOT EXISTS idx_session_timelines_received ON public.session_timelines(received_at DESC);

-- RLS Policies (mirror session_targets pattern)
ALTER TABLE public.session_timelines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view timelines from own sessions" ON public.session_timelines;
DROP POLICY IF EXISTS "Users can insert timelines for own sessions" ON public.session_timelines;
DROP POLICY IF EXISTS "Users can update timelines for own sessions" ON public.session_timelines;
DROP POLICY IF EXISTS "Users can delete timelines for own sessions" ON public.session_timelines;
DROP POLICY IF EXISTS "Commanders can view timelines from team trainings" ON public.session_timelines;

-- Users can view timelines for their own sessions
CREATE POLICY "Users can view timelines from own sessions"
    ON public.session_timelines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_timelines.session_id
            AND s.user_id = auth.uid()
        )
    );

-- Users can insert timelines for their own sessions
CREATE POLICY "Users can insert timelines for own sessions"
    ON public.session_timelines
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_timelines.session_id
            AND s.user_id = auth.uid()
        )
    );

-- Users can update timelines for their own sessions
CREATE POLICY "Users can update timelines for own sessions"
    ON public.session_timelines
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_timelines.session_id
            AND s.user_id = auth.uid()
        )
    );

-- Users can delete timelines for their own sessions
CREATE POLICY "Users can delete timelines for own sessions"
    ON public.session_timelines
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            WHERE s.id = session_timelines.session_id
            AND s.user_id = auth.uid()
        )
    );

-- Commanders can view timelines from team trainings
CREATE POLICY "Commanders can view timelines from team trainings"
    ON public.session_timelines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.team_members tm ON tm.team_id = s.team_id
            WHERE s.id = session_timelines.session_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'commander', 'admin')
        )
    );

-- Grant permissions
GRANT ALL ON TABLE public.session_timelines TO anon;
GRANT ALL ON TABLE public.session_timelines TO authenticated;
GRANT ALL ON TABLE public.session_timelines TO service_role;

-- Add comment
COMMENT ON TABLE public.session_timelines IS 
'Stores time-series biometric data from Garmin watch sessions. 
Points are recorded every 3 seconds with HR, breath rate, stress, and event markers.
Shot details contain detailed biometrics at each shot moment.';

