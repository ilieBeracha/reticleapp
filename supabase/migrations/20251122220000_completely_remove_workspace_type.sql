-- =====================================================
-- COMPLETE REMOVAL OF WORKSPACE_TYPE SYSTEM
-- This migration removes all workspace_type columns and simplifies to org-only
-- =====================================================

-- Step 1: Drop workspace_type column from workspace_access if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workspace_access' 
    AND column_name = 'workspace_type'
  ) THEN
    ALTER TABLE public.workspace_access DROP COLUMN workspace_type CASCADE;
  END IF;
END $$;

-- Step 2: Drop workspace_owner_id column from workspace_access if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workspace_access' 
    AND column_name = 'workspace_owner_id'
  ) THEN
    ALTER TABLE public.workspace_access DROP COLUMN workspace_owner_id CASCADE;
  END IF;
END $$;

-- Step 3: Update create_org_workspace function to work without workspace_type
CREATE OR REPLACE FUNCTION public.create_org_workspace(
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  workspace_slug text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_slug text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate unique slug
  v_slug := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]', '-', 'g')) 
            || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

  -- Create org workspace
  INSERT INTO org_workspaces (name, description, workspace_slug, created_by)
  VALUES (p_name, p_description, v_slug, v_user_id)
  RETURNING org_workspaces.id INTO v_workspace_id;

  -- Grant owner access (simplified - no workspace_type needed)
  INSERT INTO workspace_access (org_workspace_id, member_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  -- Return the created workspace
  RETURN QUERY
  SELECT 
    ow.id,
    ow.name,
    ow.description,
    ow.workspace_slug,
    ow.created_by,
    ow.created_at,
    ow.updated_at
  FROM org_workspaces ow
  WHERE ow.id = v_workspace_id;
END;
$$;

COMMENT ON FUNCTION public.create_org_workspace IS 'Create organization workspace (simplified for org-only system)';

-- Step 4: Update handle_new_user to not reference workspace_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_slug text;
BEGIN
  -- Generate unique workspace slug
  v_workspace_slug := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    '[^a-zA-Z0-9]',
    '-',
    'g'
  )) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  
  -- Create profile ONLY (no workspace access)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    workspace_name,
    workspace_slug
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    CONCAT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), '''s Workspace'),
    v_workspace_slug
  )
  ON CONFLICT (id) DO NOTHING;

  -- NO automatic workspace creation!
  -- User must create or join an organization

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Create user profile only - no automatic workspace';

