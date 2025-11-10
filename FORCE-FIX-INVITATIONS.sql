-- FORCE FIX: Drop ALL invitation policies and recreate clean
-- Run this if migrations didn't work

-- ============================================================================
-- Step 1: Drop ALL existing invitation policies
-- ============================================================================

DROP POLICY IF EXISTS "commanders_create_invitations" ON invitations;
DROP POLICY IF EXISTS "commanders_create_invitations_in_scope" ON invitations;
DROP POLICY IF EXISTS "inviters_delete_invitations" ON invitations;
DROP POLICY IF EXISTS "users_view_invitations" ON invitations;
DROP POLICY IF EXISTS "users_update_invitations" ON invitations;

-- ============================================================================
-- Step 2: Create clean policies
-- ============================================================================

-- INSERT: Commanders can invite to any org in their tree
CREATE POLICY "invitations_insert_commanders_scope"
ON invitations
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations o1 ON o1.id = om.org_id
    JOIN organizations o2 ON o2.id = invitations.organization_id
    WHERE om.user_id = auth.uid()
      AND om.role = 'commander'
      AND o1.root_id = o2.root_id
  )
);

-- SELECT: View invitations for orgs you're in
CREATE POLICY "invitations_select_own_orgs"
ON invitations
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT om.org_id 
    FROM org_memberships om 
    WHERE om.user_id = auth.uid()
  )
  OR code = (SELECT email FROM users WHERE id = auth.uid())
);

-- UPDATE: Inviters can update their invitations
CREATE POLICY "invitations_update_own"
ON invitations
FOR UPDATE
TO authenticated
USING (invited_by = auth.uid());

-- DELETE: Inviters can delete their invitations
CREATE POLICY "invitations_delete_own"
ON invitations
FOR DELETE
TO authenticated
USING (invited_by = auth.uid());

-- ============================================================================
-- Step 3: Verify policies
-- ============================================================================

SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'Should allow commanders to invite to tree'
    WHEN cmd = 'SELECT' THEN 'Should allow viewing own org invites'
    WHEN cmd = 'UPDATE' THEN 'Should allow updating own invites'
    WHEN cmd = 'DELETE' THEN 'Should allow deleting own invites'
  END as description
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY cmd, policyname;

-- Should show 4 policies (INSERT, SELECT, UPDATE, DELETE)

-- ============================================================================
-- Test invitation creation
-- ============================================================================

-- Try inserting (replace YOUR-ORG-ID with actual ID)
/*
INSERT INTO invitations (
  code, 
  organization_id, 
  role, 
  invited_by,
  max_uses,
  current_uses,
  status
)
VALUES (
  'TEST99',
  'YOUR-ORG-ID',  -- Replace with child org you're inviting to
  'member',
  auth.uid(),
  5,
  0,
  'pending'
)
RETURNING *;
*/

-- If this works, your app invitations will work too!

