-- Check what invitation policies are currently active

-- 1. Check all policies on invitations table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'invitations'
ORDER BY policyname;

-- Should show:
-- commanders_create_invitations_in_scope (INSERT)
-- Other policies for SELECT, UPDATE, DELETE

-- 2. Check if old policy still exists (should NOT)
SELECT COUNT(*) as old_policy_count
FROM pg_policies 
WHERE tablename = 'invitations' 
  AND policyname = 'commanders_create_invitations';

-- Should return 0 (not exist)

-- 3. Test the policy check manually (replace with your IDs)
SELECT 
  auth.uid() as current_user,
  EXISTS (
    SELECT 1
    FROM org_memberships om
    JOIN organizations o1 ON o1.id = om.org_id
    JOIN organizations o2 ON o2.id = 'YOUR-TARGET-ORG-ID'  -- Replace with child org ID
    WHERE om.user_id = auth.uid()
      AND om.role = 'commander'
      AND o1.root_id = o2.root_id
  ) as should_allow_invite;

-- Should return TRUE if you're a commander in same tree

-- 4. Check your current memberships
SELECT 
  om.user_id,
  om.org_id,
  om.role,
  o.name as org_name,
  o.root_id,
  o.depth
FROM org_memberships om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();

-- Shows your memberships and which trees you're commander in

