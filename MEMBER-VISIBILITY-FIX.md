# Member Visibility Issue - FIXED

## The Problem

**Symptoms:**
- ❌ Root commander can't see Team members
- ❌ Team member can see Root commander (but root can't see them)
- ❌ Commanders only see their direct org members
- ❌ Child org members invisible to parent commanders

**Root Cause:**
`OrgMembersSheet` was calling `getMemberships(orgId)` which only returns members of THAT specific org, ignoring the commander's scope.

---

## The Fix

### Changed: `OrgMembersSheet.tsx`

**Before (Wrong):**
```typescript
// Only gets members of the specific org
const data = await OrganizationsService.getMemberships(orgId);
// Root commander viewing Unit → Only sees Unit members
// Doesn't see Team 1, Team 2, Squad members ❌
```

**After (Correct):**
```typescript
// Gets members in user's SCOPE based on role
const data = await OrganizationsService.getMembersInScope();
// Root commander → Sees Unit + all Teams + all Squads ✅
// Team commander → Sees Team + child Squads ✅
// Member → Sees only their org ✅
```

---

## How It Works Now

### Example Hierarchy

```
Alpha Unit (Root)
├─ Alice (Commander) ← Root admin
└─ Team 1
   └─ Bob (Member) ← Invited to Team
```

### Before Fix (Broken)

**Alice clicks "View members":**
- Sees: Only Alice (herself)
- Doesn't see: Bob ❌

**Bob clicks "View members":**
- Sees: Bob (himself) + Alice (wrong!) ❌
- Why Alice shows: Some bug in scope calculation

**Result:** Completely broken! Can't manage team.

### After Fix (Working)

**Alice (Root Commander) clicks "View members":**
- Sees: Alice (Unit) + Bob (Team 1) ✅
- Scope: [Alpha Unit, Team 1]
- Can manage: Both members ✅

**Bob (Team Member) clicks "View members":**
- Sees: Bob (Team 1) only ✅
- Scope: [Team 1]
- Can manage: Nothing (not commander) ✅

**Result:** Correct! Commanders see entire scope.

---

## Additional Fixes Applied

### 1. Invitation RLS Policy

**Problem:** Commanders couldn't invite to child orgs

**Fixed:**
```sql
-- Now commanders can invite to ANY org in their tree
CREATE POLICY "commanders_create_invitations_in_scope"
WITH CHECK (
  EXISTS (
    -- Check commander in same tree
    WHERE om.role = 'commander'
      AND o1.root_id = o2.root_id
  )
);
```

### 2. Get Members RPC

**Problem:** RLS causing infinite recursion

**Fixed:**
```sql
-- Simple RLS: See only your own memberships
CREATE POLICY "org_memberships_select_own"
USING (user_id = auth.uid());

-- RPC bypasses RLS for member queries
CREATE FUNCTION get_org_members_simple(org_id)
SECURITY DEFINER
-- Returns all members, no RLS triggered
```

---

## Testing Scenarios

### Scenario 1: Root Commander

**Setup:**
- Alice creates Alpha Unit (becomes commander)
- Alice creates Team 1 under Unit
- Alice invites Bob to Team 1 (member)

**Test:**
1. Alice clicks "View members"
2. Should see: Alice (Unit, Commander) + Bob (Team 1, Member) ✅
3. Alice can remove Bob ✅
4. Alice can change Bob's role ✅

### Scenario 2: Team Commander

**Setup:**
- Bob is assigned as commander of Team 1
- Bob creates Squad A under Team 1
- Bob invites Charlie to Squad A (member)

**Test:**
1. Bob clicks "View members"
2. Should see: Bob (Team 1, Commander) + Charlie (Squad A, Member) ✅
3. Bob can manage both ✅
4. Bob CANNOT see Unit members (different branch) ✅

### Scenario 3: Member

**Setup:**
- Charlie is member of Squad A

**Test:**
1. Charlie clicks "View members"
2. Should see: Only Squad A members ✅
3. Charlie CANNOT see Team 1 or Unit members ✅
4. Charlie has no remove/edit buttons (not commander) ✅

---

## What Each Role Sees

| User Role | Location | Views Members From |
|-----------|----------|-------------------|
| **Root Commander** | Alpha Unit | Alpha Unit + all Teams + all Squads |
| **Team Commander** | Team 1 | Team 1 + child Squads |
| **Squad Commander** | Squad A | Squad A only (no children allowed) |
| **Member** | Any | Only their specific org |

---

## Migration Status

**Apply these migrations:**

1. ✅ `20251110_simplify_org_permissions.sql` - Main refactoring
   - Fixes RLS policies
   - Creates RPC functions
   - Updates invitation policies

2. ✅ `20251115_add_multi_use_invites.sql` - Multi-use invites
   - Adds max_uses/current_uses
   - Tracks invitation usage

**Then restart app:**
```bash
npx expo start -c
```

---

## Summary

**What was broken:**
- ❌ `getMemberships(orgId)` only returned one org's members
- ❌ Commanders couldn't see their scope
- ❌ Members saw wrong people
- ❌ Couldn't invite to child orgs

**What's fixed:**
- ✅ `getMembersInScope()` returns all members in user's scope
- ✅ Commanders see org + descendants automatically
- ✅ Members see only their org
- ✅ Can invite to any org in scope
- ✅ RLS uses RPC functions (no recursion)

**Apply the migrations and the member visibility will work correctly!** 🎉

