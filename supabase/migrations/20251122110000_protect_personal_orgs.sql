-- Protect personal orgs from deletion
-- Personal workspaces are core to user accounts and should NEVER be deletable

-- Add constraint: personal orgs cannot be deleted
CREATE OR REPLACE FUNCTION prevent_personal_org_deletion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.org_type = 'personal' THEN
    RAISE EXCEPTION 'Cannot delete personal organizations. They are tied to user accounts.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_personal_org_deletion_trigger
  BEFORE DELETE ON orgs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_personal_org_deletion();

COMMENT ON FUNCTION prevent_personal_org_deletion() IS 'Prevents deletion of personal organizations which are core to user accounts';

-- Also add RLS policy to prevent deletion through SQL
DROP POLICY IF EXISTS "orgs_delete" ON orgs;

CREATE POLICY "orgs_delete" ON orgs
  FOR DELETE USING (
    org_type = 'organization'  -- Only organization type can be deleted
    AND id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'owner'
        AND status = 'active'
    )
  );

COMMENT ON POLICY "orgs_delete" ON orgs IS 'Only owners can delete organizations, and personal orgs cannot be deleted at all';


