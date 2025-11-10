# Organization Permissions - Quick Reference

## 🎯 Core Rules

### 1. Organization Creation

| Type | Creator Becomes | Who Assigns Commander | Enforced |
|------|----------------|----------------------|----------|
| **Root Org** | **COMMANDER** (automatic) | N/A - automatic | ✅ |
| **Child Org** | **MEMBER** | Root/Parent commander | ✅ |

### 2. Commander Rules

| Rule | Enforced By | Why |
|------|-------------|-----|
| **One commander per org** | Database constraint | Data integrity |
| **One org per tree** | User joins specific org | No confusion |
| **Can't have 2 commanders in same path** | Unique index | Clear hierarchy |

### 3. Permission Scopes

| Role | Location | Can See | Can Manage |
|------|----------|---------|------------|
| **Commander** | Root (depth 0) | Entire tree | All orgs in tree |
| **Commander** | Team (depth 1) | Team + squads | Team + squads |
| **Commander** | Squad (depth 2) | Squad only | Squad only |
| **Member** | Any depth | Their org only | Nothing |
| **Viewer** | Any depth | Their org only | Nothing |

---

## 📊 Examples

### Example 1: Military Unit

```
Alpha Unit (Root, depth 0)
├─ Team 1 (depth 1)
│  ├─ Squad A (depth 2)
│  └─ Squad B (depth 2)
└─ Team 2 (depth 1)
   └─ Squad C (depth 2)
```

**User Actions:**

1. **Alice creates "Alpha Unit":**
   - Alice → **COMMANDER of Alpha Unit** (automatic)
   - Alice can see/manage: Alpha Unit + all teams + all squads

2. **Alice creates "Team 1" under Alpha Unit:**
   - Alice → MEMBER of Team 1
   - Root commander (Alice) must assign Team 1 commander

3. **Alice assigns Bob as Team 1 commander:**
   - Bob → **COMMANDER of Team 1**
   - Bob can see/manage: Team 1 + Squad A + Squad B
   - Bob CANNOT see/manage: Team 2, Squad C

4. **Bob creates "Squad A" under Team 1:**
   - Bob → MEMBER of Squad A
   - Bob (Team 1 commander) must assign Squad A commander

5. **Bob assigns Charlie as Squad A commander:**
   - Charlie → **COMMANDER of Squad A**
   - Charlie can see/manage: Squad A only
   - Charlie CANNOT see/manage: Squad B, Team 1, Alpha Unit

---

### Example 2: Multi-Tree User

```
User: Dave

Memberships:
├─ Alpha Unit (Commander) ← Dave's root org
└─ Bravo Unit → Team 3 (Member) ← Dave joined via invite
```

**Dave's View:**

**When in Alpha Unit context:**
- Role: Commander
- Scope: All of Alpha Unit tree
- Can create: Child teams
- Can manage: All Alpha Unit members

**When in Team 3 context:**
- Role: Member
- Scope: Team 3 only
- Can create: Nothing
- Can manage: Nothing

**Dave switches using "Switch organization" button:**
- Personal Workspace (always)
- Alpha Unit (commander)
- Team 3 (member, in Bravo Unit tree)

---

## 🔐 Permission Validation

### Who Can Assign Commander?

```sql
-- assign_commander(org_id, user_id)

CHECK:
1. Caller is authenticated
2. Org exists
3. Caller is commander in SAME TREE (same root_id)
4. Org doesn't already have a commander (or same user)

ALLOWS:
✅ Root commander assigns team commander
✅ Team commander assigns squad commander
✅ Root commander assigns any commander in tree

BLOCKS:
❌ Member trying to assign commander
❌ Commander in different tree trying to assign
❌ Assigning second commander (unique constraint)
```

---

## 🎨 UI Behavior

### "Switch Organization" Button

**Always shows in:**
- ✅ Personal Workspace view
- ✅ Organization view (at bottom, after divider)

**Opens list showing:**
- Personal Workspace (always)
- User's direct org memberships (1 per tree)

**Example list for user in 2 trees:**
```
☑️ Personal Workspace
□  Alpha Unit (Commander)
□  Bravo Team 3 (Member, in Bravo tree)
```

### Child Org Creation

**When commander creates child:**
1. Child org created ✅
2. Creator becomes MEMBER of child ✅
3. **Auto-switches to child org** ✅
4. Header updates to show child org ✅
5. Commander must assign child commander manually

---

## 🚀 How to Apply

### Step 1: Run Migration

Copy the SQL from:
`supabase/migrations/20251110_simplify_org_permissions.sql`

Paste into Supabase SQL Editor and run.

### Step 2: Restart App

```bash
npx expo start -c
```

### Step 3: Test

1. Create root org → You should be COMMANDER
2. Create child org → You should be MEMBER
3. Assign commander to child → Use new `assignCommander()` function
4. Try to assign second commander → Should fail (constraint)

---

## 📝 Code Examples

### Check Permissions from Context

```typescript
const { userOrgContext } = useOrganizationsStore();

if (userOrgContext?.canCreateChild) {
  // Show "Create Child Org" button
}

if (userOrgContext?.canManageMembers) {
  // Show "Invite Members" button
}

if (userOrgContext?.canManageOrg) {
  // Show "Settings" button
}
```

### Assign Commander

```typescript
import { OrganizationsService } from "@/services/organizationsService";

// Only commanders in same tree can do this
await OrganizationsService.assignCommander(childOrgId, userId);

// Validates:
// - Only one commander per org
// - Caller is commander in same tree
```

### Get Members in Scope

```typescript
// Automatically filtered by role
const members = await OrganizationsService.getMembersInScope();

// Commanders get: org + descendants
// Members get: their org only
```

---

## ✅ Summary

**Simple Rules:**
1. Root org creator = COMMANDER (automatic)
2. Child org creator = MEMBER (assigned by parent)
3. One commander per org (enforced)
4. Permissions flow from role + position
5. No recursive fetching (single RPC call)

**The system is now simple, fast, and predictable!** 🎉

