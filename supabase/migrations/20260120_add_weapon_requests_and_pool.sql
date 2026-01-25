-- =============================================================================
-- Migration: Add weapon_requests table and pool_available column
-- Date: 2026-01-20
-- Description: Supports Team Armory system with:
--   - weapon_requests: Soldiers can request weapons from commanders
--   - pool_available: Team weapons can be marked as available in shared pool
-- =============================================================================

-- =============================================================================
-- 1. Add pool_available column to team_weapons
-- =============================================================================

ALTER TABLE public.team_weapons
ADD COLUMN IF NOT EXISTS pool_available BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.team_weapons.pool_available IS
  'When true, weapon is available in shared pool for all team members to use';

-- =============================================================================
-- 2. Create weapon_requests table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.weapon_requests (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_weapon_id UUID REFERENCES public.team_weapons(id) ON DELETE SET NULL,
    weapon_category TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    CONSTRAINT weapon_requests_status_check CHECK (
        status IN ('pending', 'approved', 'rejected', 'cancelled')
    )
);

-- Ensure only one pending request per user per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_weapon_requests_unique_pending
ON public.weapon_requests(team_id, user_id) WHERE status = 'pending';

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_weapon_requests_team_status
ON public.weapon_requests(team_id, status);

CREATE INDEX IF NOT EXISTS idx_weapon_requests_user
ON public.weapon_requests(user_id);

-- Comments for documentation
COMMENT ON TABLE public.weapon_requests IS
  'Weapon assignment requests from team members to commanders';

COMMENT ON COLUMN public.weapon_requests.weapon_category IS
  'Preferred weapon category (rifle, pistol, etc.) - optional';

COMMENT ON COLUMN public.weapon_requests.notes IS
  'Additional notes from the requester';

COMMENT ON COLUMN public.weapon_requests.status IS
  'Request status: pending, approved, rejected, cancelled';

-- =============================================================================
-- 3. Enable RLS on weapon_requests
-- =============================================================================

ALTER TABLE public.weapon_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.weapon_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Team commanders/owners can view all team requests
CREATE POLICY "Commanders can view team requests"
ON public.weapon_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = weapon_requests.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'commander')
    )
);

-- Users can create requests for themselves
CREATE POLICY "Users can create own requests"
ON public.weapon_requests
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = weapon_requests.team_id
        AND tm.user_id = auth.uid()
    )
);

-- Users can cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
ON public.weapon_requests
FOR UPDATE
USING (
    auth.uid() = user_id
    AND status = 'pending'
)
WITH CHECK (
    status = 'cancelled'
);

-- Commanders can update (approve/reject) requests
CREATE POLICY "Commanders can review requests"
ON public.weapon_requests
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = weapon_requests.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'commander')
    )
)
WITH CHECK (
    status IN ('approved', 'rejected')
);

-- =============================================================================
-- 4. Index for pool weapons query
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_team_weapons_pool
ON public.team_weapons(team_id, pool_available) WHERE pool_available = true AND is_active = true;
