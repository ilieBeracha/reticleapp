-- Fix create_org_workspace to work without workspace_type column
-- This assumes workspace_type has been manually removed from workspace_access

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

  -- Grant owner access (WITHOUT workspace_type column)
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

COMMENT ON FUNCTION public.create_org_workspace IS 'Create organization workspace without workspace_type column';

