-- QUICK FIX: Apply this RIGHT NOW to fix invitations
-- Copy and paste into Supabase SQL Editor

-- ============================================================================
-- Drop old restrictive invitation policy
-- ============================================================================

DROP POLICY IF EXISTS "commanders_create_invitations" ON invitations;

-- ============================================================================
-- Create new scope-based invitation policy
-- ============================================================================

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

-- ============================================================================
-- Verify it worked
-- ============================================================================

-- Check policy exists
SELECT 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'invitations' 
  AND policyname = 'commanders_create_invitations_in_scope';

-- Should return 1 row showing the new policy

-- ============================================================================
-- Test it
-- ============================================================================

-- Try creating an invitation (replace with your values)
-- This should work now if you're a commander
/*
INSERT INTO invitations (code, organization_id, role, invited_by, status)
VALUES ('TEST01', 'your-org-id', 'member', auth.uid(), 'pending');
*/

