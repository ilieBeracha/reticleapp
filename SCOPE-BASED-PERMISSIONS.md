# Scope-Based Permissions - How It Works

## 🎯 Core Concept

**Commanders manage their scope WITHOUT being members of every child org.**

Permissions flow from **tree position**, not direct membership.

---

## 📊 Membership Model

### Root Organization

```
Alice creates "Alpha Unit"
↓
Alice → DIRECT MEMBER of Alpha Unit (role: commander)
```

**Result:**
- ✅ Alice has membership in `org_memberships` table
- ✅ `org_id` = Alpha Unit
- ✅ `role` = commander

### Child Organization

```
Alice creates "Team 1" under Alpha Unit
↓
Alice → NOT added as member of Team 1
```

**Result:**
- ❌ Alice has NO membership in Team 1 row
- ✅ Alice manages Team 1 via Unit commander scope
- ✅ Alice can invite to Team 1, view Team 1 members, etc.

---

## 🔐 How Permissions Work

### Example Hierarchy

```
Alpha Unit (depth 0)
├─ Alice (Commander) ← Direct membership
├─ Team 1 (depth 1)
│  ├─ Bob (Member) ← Direct membership
│  └─ Squad A (depth 2)
│     └─ Charlie (Member) ← Direct membership
└─ Team 2 (depth 1)
   └─ Diana (Member) ← Direct membership
```

### Database State

**`org_memberships` table:**
```
user_id | org_id      | role
--------|-------------|----------
Alice   | Alpha Unit  | commander
Bob     | Team 1      | member
Charlie | Squad A     | member
Diana   | Team 2      | member
```

**Notice:** Alice is ONLY in Alpha Unit, NOT in Team 1, Team 2, or Squad A!

---

## 🎮 What Alice Can Do (Unit Commander)

### View Members

**Query:** `getMembersInScope()`

**Returns:**
```
Alice (Alpha Unit, Commander)
Bob (Team 1, Member)
Charlie (Squad A, Member)
Diana (Team 2, Member)
```

**How:** RPC function `get_members_in_user_scope()` computes scope from Alice's position

### Create Child Org

**Action:** Alice creates "Team 3"

**Database changes:**
```sql
-- New org created
INSERT INTO organizations (name, parent_id) 
VALUES ('Team 3', 'Alpha Unit');

-- Alice is NOT added to Team 3
-- (No INSERT into org_memberships)
```

**Result:** Alice still only member of Alpha Unit, manages Team 3 via scope

### Invite to Child Org

**Action:** Alice invites Eve to Team 1

**Permission check:**
```sql
-- Checks Alice is commander in SAME TREE as Team 1
SELECT EXISTS (
  WHERE om.user_id = 'Alice'
    AND om.role = 'commander'
    AND o1.root_id = o2.root_id  -- Alpha tree
)
-- ✅ Passes! Alice can invite
```

**Result:** Invitation created for Team 1, even though Alice is not direct member

---

## 🔄 Comparison: Old vs New

### Old (Broken) Model

```
Create child → Add creator as member
↓
Alice creates Team 1 → Alice added to Team 1
Alice creates Team 2 → Alice added to Team 2
Alice creates Squad A → Alice added to Squad A
↓
Alice in 4 orgs (Unit, Team 1, Team 2, Squad A)
↓
Confusion: Which org am I in? Switch between them?
```

### New (Clean) Model

```
Create child → Creator stays in parent
↓
Alice creates Team 1 → Alice stays in Unit
Alice creates Team 2 → Alice stays in Unit
Alice creates Squad A → Alice stays in Unit
↓
Alice in 1 org (Unit)
↓
Clear: Alice manages entire tree from Unit position
```

---

## 🎯 Permission Rules

| User | Direct Membership | Can View Members | Can Invite To | Can Create Child |
|------|-------------------|------------------|---------------|------------------|
| **Alice (Unit Commander)** | Alpha Unit only | Unit + all descendants | Any org in tree | Teams under Unit |
| **Bob (Team 1 Member)** | Team 1 only | Team 1 only | None | None |
| **Charlie (Squad Commander)** | Squad A only | Squad A only | Squad A | None (max depth) |

---

## 🔧 Technical Implementation

### RPC Functions Handle Scope

**`get_members_in_user_scope()`:**
```sql
-- Get user's org and role
SELECT org_id, role FROM org_memberships WHERE user_id = p_user_id;

-- If commander: Get all orgs in scope
IF role = 'commander' THEN
  scope_ids = ARRAY(
    SELECT id FROM organizations 
    WHERE path @> ARRAY[user_org_id]
  );
ELSE
  scope_ids = ARRAY[user_org_id];
END IF;

-- Return members from scope_ids
RETURN members WHERE org_id = ANY(scope_ids);
```

### Invitation RLS Checks Tree

**Policy:**
```sql
WITH CHECK (
  EXISTS (
    SELECT 1
    WHERE om.user_id = auth.uid()
      AND om.role = 'commander'
      AND o1.root_id = o2.root_id  -- Same tree, not direct org!
  )
)
```

**Result:** Commander can invite to child orgs without being member

---

## ✅ Summary

**Key Points:**
1. ✅ Root creator → Direct membership (commander)
2. ✅ Child creator → NO membership added
3. ✅ Commanders manage scope from their org
4. ✅ Don't need to be in every child org
5. ✅ Permissions flow from tree position
6. ✅ RPC functions compute scope dynamically

**Benefits:**
- 🎯 Clean data: 1 membership per user per tree
- 🚀 Simple: No duplicate memberships
- 💡 Clear: Manage from your position
- 🔐 Secure: RLS checks tree root_id

**Apply the migration and it all works correctly!** 🚀

