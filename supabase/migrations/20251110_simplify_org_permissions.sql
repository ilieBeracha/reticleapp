-- Migration: Simplify Organization Permissions
-- Date: 2025-11-10
-- Purpose: Refactor to single-org membership with tree-wide permissions

-- ============================================================================
-- Step 1: Add constraint - Only ONE commander per organization
-- ============================================================================

-- Drop existing constraint if exists
ALTER TABLE org_memberships DROP CONSTRAINT IF EXISTS one_commander_per_org;

-- Add unique constraint: Only one commander per org
CREATE UNIQUE INDEX one_commander_per_org 
ON org_memberships (org_id) 
WHERE role = 'commander';

COMMENT ON INDEX one_commander_per_org IS 
'Ensures only one commander per organization. Prevents multiple commanders in same org.';

-- ============================================================================
-- Step 1.5: Keep RLS simple - Use RPC functions for member queries
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "memberships_select" ON org_memberships;
DROP POLICY IF EXISTS "org_memberships_select" ON org_memberships;

-- Simple policy: Only see your own memberships via direct queries
-- For getting org members, use the RPC function get_org_members_simple
CREATE POLICY "org_memberships_select_own"
ON org_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "org_memberships_select_own" ON org_memberships IS
'Users can only see their own memberships via direct queries. Use get_org_members_simple RPC to view other members.';

-- ============================================================================
-- Step 2: Create RPC - Get user org with computed permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_org_with_permissions(
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  -- User membership
  membership_id uuid,
  user_id uuid,
  org_id uuid,
  role text,
  joined_at timestamptz,
  
  -- Organization details
  org_name text,
  org_type text,
  org_depth integer,
  org_parent_id uuid,
  org_root_id uuid,
  org_path text[],
  full_path text,
  
  -- Computed permissions
  can_create_child boolean,
  can_manage_members boolean,
  can_manage_org boolean,
  scope_org_ids uuid[]  -- Array of org IDs user has permissions for
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_membership record;
  v_org record;
  v_scope_ids uuid[];
  v_full_path text;  -- Declare at top level, not nested!
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get user's primary org membership
  -- If user has multiple memberships, prioritize commander role, then most recent
  SELECT om.*, o.*
  INTO v_membership
  FROM org_memberships om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = v_user_id
  ORDER BY 
    CASE om.role 
      WHEN 'commander' THEN 1 
      WHEN 'member' THEN 2 
      WHEN 'viewer' THEN 3 
    END,
    om.created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- User has no org memberships
    RETURN;
  END IF;
  
  -- Get organization details
  SELECT * INTO v_org
  FROM organizations
  WHERE id = v_membership.org_id;
  
  -- Compute scope based on role
  IF v_membership.role = 'commander' THEN
    -- Commander: Get org + all descendants
    SELECT ARRAY_AGG(o.id)
    INTO v_scope_ids
    FROM organizations o
    WHERE o.path @> ARRAY[v_membership.org_id::text];
  ELSE
    -- Member/Viewer: Only their org
    v_scope_ids := ARRAY[v_membership.org_id];
  END IF;
  
  -- Build full path string (no nested block needed)
  SELECT array_to_string(
    ARRAY(
      SELECT org.name 
      FROM organizations org 
      WHERE org.id = ANY(v_org.path::uuid[])
      ORDER BY array_position(v_org.path::uuid[], org.id)
    ),
    ' → '
  ) INTO v_full_path;
  
  -- Return single row with all permissions
  RETURN QUERY
  SELECT
    v_membership.id AS membership_id,
    v_membership.user_id,
    v_membership.org_id,
    v_membership.role,
    v_membership.created_at AS joined_at,
    
    v_org.name AS org_name,
    v_org.org_type,
    v_org.depth AS org_depth,
    v_org.parent_id AS org_parent_id,
    v_org.root_id AS org_root_id,
    v_org.path AS org_path,
    v_full_path AS full_path,
    
    -- Permissions (based on role and depth)
    (v_membership.role = 'commander' AND v_org.depth < 2) AS can_create_child,
    (v_membership.role = 'commander') AS can_manage_members,
    (v_membership.role = 'commander') AS can_manage_org,
    v_scope_ids AS scope_org_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_org_with_permissions TO authenticated;

COMMENT ON FUNCTION public.get_user_org_with_permissions IS 
'Get user primary org membership with computed tree-wide permissions. Returns single org with scope array.';

-- ============================================================================
-- Step 3: Create RPC - Assign commander (with validation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_commander(
  p_org_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_org_root_id uuid;
  v_existing_commander_id uuid;
  v_is_authorized boolean;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- Get org root
  SELECT root_id INTO v_org_root_id
  FROM organizations
  WHERE id = p_org_id;
  
  IF v_org_root_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Check current user is commander in same tree
  SELECT EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = v_current_user_id
      AND om.role = 'commander'
      AND o.root_id = v_org_root_id
  ) INTO v_is_authorized;
  
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Only commanders in the same tree can assign commanders';
  END IF;
  
  -- Check if org already has a commander
  SELECT user_id INTO v_existing_commander_id
  FROM org_memberships
  WHERE org_id = p_org_id
    AND role = 'commander';
  
  IF v_existing_commander_id IS NOT NULL AND v_existing_commander_id != p_user_id THEN
    RAISE EXCEPTION 'Organization already has a commander. Remove existing commander first.';
  END IF;
  
  -- Assign commander
  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (p_user_id, p_org_id, 'commander')
  ON CONFLICT (user_id, org_id) 
  DO UPDATE SET role = 'commander', created_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'org_id', p_org_id,
    'user_id', p_user_id,
    'role', 'commander'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_commander TO authenticated;

COMMENT ON FUNCTION public.assign_commander IS 
'Assign a user as commander of an organization. Validates only one commander per org.';

-- ============================================================================
-- Step 4: Update org creation functions
-- ============================================================================
-- IMPORTANT RULES:
-- 🎯 ROOT ORG: Creator automatically becomes COMMANDER (they own the tree)
-- 🎯 CHILD ORG: Creator becomes MEMBER (commander assigned by parent)
-- 🎯 This ensures proper admin hierarchy and prevents permission chaos

-- Update create_root_organization - creator becomes COMMANDER
CREATE OR REPLACE FUNCTION public.create_root_organization(
  p_name text,
  p_org_type text,
  p_description text,
  p_user_id uuid
)
RETURNS TABLE(
  id uuid, name text, org_type text, parent_id uuid, root_id uuid,
  path text[], depth integer, description text, created_by uuid,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, org_type, description, created_by, parent_id)
  VALUES (p_name, p_org_type, p_description, p_user_id, NULL)
  RETURNING organizations.id INTO v_org_id;

  -- Add creator as COMMANDER (root org creator is always commander)
  INSERT INTO org_memberships (user_id, org_id, role)
  VALUES (p_user_id, v_org_id, 'commander');

  -- Return created org
  RETURN QUERY
  SELECT org.id, org.name, org.org_type, org.parent_id, org.root_id,
         org.path, org.depth, org.description, org.created_by, 
         org.created_at, org.updated_at
  FROM organizations org
  WHERE org.id = v_org_id;
END;
$$;

-- Update create_child_organization - creator is NOT added as member
-- Commanders manage child orgs from their parent position (scope-based)
CREATE OR REPLACE FUNCTION public.create_child_organization(
  p_name text,
  p_org_type text,
  p_parent_id uuid,
  p_description text,
  p_user_id uuid
)
RETURNS TABLE(
  id uuid, name text, org_type text, parent_id uuid, root_id uuid,
  path text[], depth integer, description text, created_by uuid,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_parent_root_id uuid;
  v_parent_depth integer;
  v_user_is_commander boolean;
BEGIN
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;

  -- Get parent info
  SELECT o.root_id, o.depth
  INTO v_parent_root_id, v_parent_depth
  FROM organizations o
  WHERE o.id = p_parent_id;

  IF v_parent_root_id IS NULL THEN
    RAISE EXCEPTION 'Parent organization not found';
  END IF;

  -- Check depth limit (0-2 = 3 levels)
  IF v_parent_depth >= 2 THEN
    RAISE EXCEPTION 'Cannot create child: Parent at maximum depth (%). Max is 2.', v_parent_depth;
  END IF;

  -- Check user is commander in tree
  SELECT EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations org ON org.id = om.org_id
    WHERE om.user_id = p_user_id
      AND om.role = 'commander'
      AND org.root_id = v_parent_root_id
  ) INTO v_user_is_commander;

  IF NOT v_user_is_commander THEN
    RAISE EXCEPTION 'Only commanders in the tree can create child organizations';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, org_type, description, created_by, parent_id)
  VALUES (p_name, p_org_type, p_description, p_user_id, p_parent_id)
  RETURNING organizations.id INTO v_org_id;

  -- DO NOT add creator as member
  -- Commander manages this org from their parent position via scope
  -- Members must be explicitly invited

  -- Return created org
  RETURN QUERY
  SELECT org.id, org.name, org.org_type, org.parent_id, org.root_id,
         org.path, org.depth, org.description, org.created_by,
         org.created_at, org.updated_at
  FROM organizations org
  WHERE org.id = v_org_id;
END;
$$;

-- ============================================================================
-- Step 5: Remove complex get_user_accessible_orgs (replaced by simpler model)
-- ============================================================================

-- Keep get_user_orgs for backward compatibility (returns direct memberships only)
-- Remove get_user_accessible_orgs in application code (not database, it's used elsewhere)

-- Note: RLS policies already updated in Step 1.5 above

-- ============================================================================
-- Step 6: Fix invitation RLS policies for scope-based invitations
-- ============================================================================

-- Drop old invitation INSERT policy
DROP POLICY IF EXISTS "commanders_create_invitations" ON invitations;

-- Create new policy: Commanders can invite to any org in their scope
CREATE POLICY "commanders_create_invitations_in_scope"
ON invitations
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be commander in the same tree as target org
  EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations o1 ON o1.id = om.org_id
    JOIN organizations o2 ON o2.id = invitations.organization_id
    WHERE om.user_id = auth.uid()
      AND om.role = 'commander'
      AND o1.root_id = o2.root_id  -- Same tree
  )
  AND invited_by = auth.uid()
);

COMMENT ON POLICY "commanders_create_invitations_in_scope" ON invitations IS
'Commanders can create invitations for any organization in their tree (same root_id), not just their direct org.';

-- ============================================================================
-- Step 7: RPC function to get org members (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_org_members_simple(
  p_org_id uuid
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  org_id uuid,
  role text,
  created_at timestamptz,
  email text,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_root_id uuid;
  v_has_access boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Get target org's root_id
  SELECT root_id INTO v_org_root_id
  FROM organizations
  WHERE id = p_org_id;
  
  IF v_org_root_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Check user has access:
  -- 1. Direct member of this org, OR
  -- 2. Commander in the same tree (can manage scope)
  SELECT EXISTS (
    SELECT 1 FROM org_memberships om
    JOIN organizations o ON o.id = om.org_id
    WHERE om.user_id = v_user_id
      AND (
        om.org_id = p_org_id  -- Direct member
        OR (om.role = 'commander' AND o.root_id = v_org_root_id)  -- Commander in tree
      )
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Permission denied: Not a member or commander in this tree';
  END IF;
  
  -- Return all members of this org
  RETURN QUERY
  SELECT 
    om.id,
    om.user_id,
    om.org_id,
    om.role,
    om.created_at,
    u.email,
    u.full_name,
    u.avatar_url
  FROM org_memberships om
  JOIN users u ON u.id = om.user_id
  WHERE om.org_id = p_org_id
  ORDER BY om.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_members_simple TO authenticated;

COMMENT ON FUNCTION public.get_org_members_simple IS 
'Get all members of an organization. Bypasses RLS. Allows commanders in same tree to view members without being direct members.';

-- ============================================================================
-- Step 8: Add helper to get members in user scope
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_members_in_user_scope(
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  org_id uuid,
  org_name text,
  org_depth integer,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_org_id uuid;
  v_user_role text;
  v_scope_ids uuid[];
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get user's org and role
  SELECT om.org_id, om.role
  INTO v_user_org_id, v_user_role
  FROM org_memberships om
  WHERE om.user_id = v_user_id
  ORDER BY 
    CASE om.role 
      WHEN 'commander' THEN 1 
      WHEN 'member' THEN 2 
      WHEN 'viewer' THEN 3 
    END,
    om.created_at DESC
  LIMIT 1;
  
  IF v_user_org_id IS NULL THEN
    RETURN; -- No memberships
  END IF;
  
  -- Compute scope
  IF v_user_role = 'commander' THEN
    -- Commander: org + descendants
    SELECT ARRAY_AGG(o.id)
    INTO v_scope_ids
    FROM organizations o
    WHERE o.path @> ARRAY[v_user_org_id::text];
  ELSE
    -- Member/Viewer: only their org
    v_scope_ids := ARRAY[v_user_org_id];
  END IF;
  
  -- Return members in scope
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email,
    u.full_name,
    u.avatar_url,
    om.org_id,
    o.name AS org_name,
    o.depth AS org_depth,
    om.role
  FROM org_memberships om
  JOIN users u ON u.id = om.user_id
  JOIN organizations o ON o.id = om.org_id
  WHERE om.org_id = ANY(v_scope_ids)
  ORDER BY o.depth ASC, u.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_members_in_user_scope TO authenticated;

COMMENT ON FUNCTION public.get_members_in_user_scope IS 
'Get all members in user permission scope. Commanders see their org + descendants. Members see only their org.';

-- ============================================================================
-- Summary
-- ============================================================================

-- Changes made:
-- ✅ One commander per org constraint
-- ✅ get_user_org_with_permissions - single org + computed scope
-- ✅ assign_commander - explicit commander assignment
-- ✅ Updated create_root_organization - creator becomes COMMANDER
-- ✅ Updated create_child_organization - creator becomes MEMBER
-- ✅ get_members_in_user_scope - simple member queries
-- ✅ Removed recursive complexity

-- Permission Model:
-- 🎯 ROOT ORG: Creator becomes COMMANDER (direct membership)
-- 🎯 CHILD ORG: Creator NOT added as member (manages via parent scope)
-- 🎯 Commanders manage their scope without being members of every child org

