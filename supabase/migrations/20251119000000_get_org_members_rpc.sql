-- Create RPC function to get organization workspace members with profiles
CREATE OR REPLACE FUNCTION get_org_workspace_members(p_org_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  workspace_type text,
  workspace_owner_id uuid,
  org_workspace_id uuid,
  member_id uuid,
  role text,
  joined_at timestamptz,
  profile_id uuid,
  profile_email text,
  profile_full_name text,
  profile_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wa.id,
    wa.workspace_type,
    wa.workspace_owner_id,
    wa.org_workspace_id,
    wa.member_id,
    wa.role,
    wa.joined_at,
    p.id as profile_id,
    p.email as profile_email,
    p.full_name as profile_full_name,
    p.avatar_url as profile_avatar_url
  FROM workspace_access wa
  INNER JOIN profiles p ON p.id = wa.member_id
  WHERE wa.org_workspace_id = p_org_workspace_id
    AND wa.workspace_type = 'org'
  ORDER BY wa.joined_at DESC;
END;
$$;

