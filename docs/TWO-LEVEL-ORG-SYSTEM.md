# Three-Level Organization System - Simplified Architecture

**Date:** November 7, 2024  
**Decision:** Simplify from 5-level hierarchy to 3-level system

---

## Overview

**Old System:** Organizations → L1 → L2 → L3 → L4 (5 levels, recursive complexity)  
**New System:** Organizations → Teams → Squads (3 levels, simple hierarchy)

**Complexity Reduction:** ~70% less code, minimal recursion, clear mental model

---

## Data Model

### Level Structure

```
Organization (depth: 0)
  ├─ Team A (depth: 1)
  │    ├─ Squad A1 (depth: 2)
  │    └─ Squad A2 (depth: 2)
  ├─ Team B (depth: 1)
  │    └─ Squad B1 (depth: 2)
  └─ Team C (depth: 1)

Max depth: 2
```

### Database Constraints

**Add constraint to organizations table:**
```sql
ALTER TABLE organizations 
ADD CONSTRAINT max_depth_check 
CHECK (depth <= 2);
```

**Terminology:**
- `depth = 0` → "Organization" (e.g., "Battalion HQ", "1st Company")
- `depth = 1` → "Team" (e.g., "Platoon 1", "Alpha Team")
- `depth = 2` → "Squad" (e.g., "Squad A", "Fire Team 1")

---

## User Interface

### Organization Switcher

**Personal Mode:**
```
┌─────────────────────────────────────┐
│  👤  Personal Workspace         ✓   │
│                                     │
│  ORGANIZATIONS                      │
├─────────────────────────────────────┤
│  🏢  Battalion HQ        [ADMIN]    │ ← Root org
│  🏢  Alpha Company       [ADMIN]    │ ← Another root
│  🏢  Bravo Company       [MEMBER]   │ ← Another root
└─────────────────────────────────────┘
```

**Inside Organization (Battalion HQ):**
```
┌─────────────────────────────────────┐
│  🏢  Battalion HQ                   │
│      Organization • Root Admin      │
│                                     │
│  ⬇️  TEAMS IN THIS ORGANIZATION     │
├─────────────────────────────────────┤
│  👥  Alpha Squad         [ADMIN] →  │ ← Team
│  👥  Bravo Squad         [ADMIN] →  │ ← Team
│  👥  Charlie Squad       [MEMBER] → │ ← Team
│                                     │
│  [Create New Team]                  │
│  [Invite Members]                   │
│  [Switch Organization]              │
└─────────────────────────────────────┘
```

**Inside Team:**
```
┌─────────────────────────────────────┐
│  👥  Alpha Squad                    │
│      Team • Member                  │
│      Part of Battalion HQ           │
│                                     │
│  ⬆️  GO TO ORGANIZATION              │
├─────────────────────────────────────┤
│  🏢  Battalion HQ         [ADMIN] → │ ← Go up
│                                     │
│  [Invite Members]                   │
│  [Switch Organization]              │
└─────────────────────────────────────┘
```

---

## Simplified Components

### Component Structure

**Before (1,778 LOC):**
```
OrganizationModal
  └─ OrgListView
       └─ OrgTreeItem (recursive, 5 levels)
            └─ OrgListItem
                 └─ helpers (12 functions)
```

**After (~200 LOC):**
```
OrganizationModal
  └─ OrgSwitcher (simple)
       ├─ OrganizationsList (depth 0)
       └─ TeamsList (depth 1)
```

### Data Flow

**Simplified:**
```typescript
// Organizations (depth 0)
const orgs = accessibleOrgs.filter(o => o.depth === 0);

// Teams in current org (depth 1)
const teams = accessibleOrgs.filter(o => 
  o.depth === 1 && o.parent_id === currentOrgId
);

// That's it! No recursion needed.
```

---

## Migration Strategy

### For Existing Deep Hierarchies

**Option 1: Flatten (Recommended)**

Convert deep hierarchies to 2 levels:
```sql
-- Example: Battalion → Company → Platoon → Squad
-- Becomes: Battalion → Squad 1, Squad 2, Squad 3

-- Keep root as Organization
-- Promote all descendants to Teams (depth 1)
UPDATE organizations 
SET parent_id = root_id, depth = 1
WHERE depth > 1;
```

**Option 2: Namespace Teams**

Keep structure in names:
```
Battalion HQ (Organization)
  ├─ Alpha Company - Platoon 1 (Team)
  ├─ Alpha Company - Platoon 2 (Team)
  ├─ Bravo Company - Platoon 1 (Team)
  └─ Bravo Company - Platoon 2 (Team)
```

---

## Implementation Plan

### Phase 1: Database Changes

1. **Add depth constraint**
   ```sql
   ALTER TABLE organizations 
   ADD CONSTRAINT max_depth_check 
   CHECK (depth <= 1);
   ```

2. **Migrate existing data** (if needed)
   ```sql
   -- Flatten deep hierarchies
   UPDATE organizations
   SET parent_id = root_id, depth = 1
   WHERE depth > 1;
   ```

3. **Update RPC functions**
   - Remove recursive CTEs
   - Simplify to 2-level queries

### Phase 2: Service Layer

**Simplify organizationsService.ts:**

```typescript
// Before: 449 lines with tree utilities
// After: ~150 lines

static async getAccessibleOrgs(userId: string): Promise<FlatOrganization[]> {
  const client = await AuthenticatedClient.getClient();
  
  // Get user's memberships
  const { data: memberships } = await client
    .from('org_memberships')
    .select('org_id, role, organizations(*)')
    .eq('user_id', userId);

  // Get organizations (depth 0)
  const orgs = memberships
    .filter(m => m.organizations.depth === 0)
    .map(m => ({
      ...m.organizations,
      role: m.role,
      isContextOnly: false,
    }));

  // Get teams in those orgs (depth 1)
  const orgIds = orgs.map(o => o.id);
  const { data: teams } = await client
    .from('org_memberships')
    .select('org_id, role, organizations(*)')
    .eq('user_id', userId)
    .eq('organizations.depth', 1)
    .in('organizations.parent_id', orgIds);

  return [...orgs, ...teams];
}
```

**No more:**
- ❌ Recursive tree building
- ❌ Context-only logic
- ❌ Descendant calculations
- ❌ Sibling fetching
- ❌ Ancestor traversal

### Phase 3: UI Components

**Single switcher component:**

```typescript
// components/organizations/SimpleSwitcher.tsx (~150 lines)

export function SimpleSwitcher() {
  const orgs = accessibleOrgs.filter(o => o.depth === 0);
  
  return (
    <View>
      <Text>ORGANIZATIONS</Text>
      {orgs.map(org => (
        <OrgCard key={org.id} org={org}>
          {/* Show teams when org selected */}
          {selectedOrgId === org.id && (
            <TeamsList orgId={org.id} />
          )}
        </OrgCard>
      ))}
    </View>
  );
}
```

### Phase 4: Remove Old Code

**Delete these files:**
- `lib/treeUtils.ts` (recursive tree utilities)
- `components/organizations/OrgTreeItem.tsx`
- `components/organizations/OrgListItem.tsx`
- `utils/organizationHelpers.ts`
- All recursive logic

**Estimated code reduction:** 1,500+ lines → ~400 lines (73% reduction)

---

## Benefits

### User Experience
✅ **Crystal clear** - "Organization" vs "Team" (everyone understands)  
✅ **No confusion** - Can't get lost in deep hierarchies  
✅ **Fast switching** - Org list → Team list → done  
✅ **Mobile-friendly** - Less scrolling, larger tap targets  

### Developer Experience
✅ **No recursion** - Simple loops  
✅ **Easy to test** - Just 2 depth values  
✅ **Easy to debug** - No tree traversal  
✅ **Easy to extend** - Add features without breaking tree logic  

### Performance
✅ **Faster queries** - No recursive CTEs  
✅ **Smaller payload** - Less hierarchy metadata  
✅ **Faster rendering** - No recursive components  

---

## Migration Path

### Step 1: Add Constraint (Non-Breaking)

```sql
-- Prevent new deep hierarchies
ALTER TABLE organizations 
ADD CONSTRAINT max_depth_check 
CHECK (depth <= 1);
```

### Step 2: Flatten Existing Data (If Needed)

Check current data:
```sql
SELECT depth, COUNT(*) 
FROM organizations 
GROUP BY depth 
ORDER BY depth;
```

If depth > 1 exists:
```sql
-- Flatten to 2 levels (backup first!)
UPDATE organizations
SET 
  parent_id = root_id,
  depth = 1,
  name = name || ' (' || org_type || ')' -- Preserve context in name
WHERE depth > 1;
```

### Step 3: Simplify Service Layer

Create new `getSimpleAccessibleOrgs()`:
```typescript
// Returns only depth 0 and 1
// No tree calculations
// No context-only logic
```

### Step 4: New UI Components

Build fresh components:
- `SimpleOrgSwitcher.tsx`
- `OrgCard.tsx`
- `TeamsList.tsx`

### Step 5: Cut Over

Feature flag switch, then delete old code.

---

## Quick Prototype

Want me to build a **quick prototype** of the 2-level system to see how it feels?

I can create:
1. New simplified service (150 lines)
2. New switcher component (150 lines)
3. Migration SQL (if you have deep orgs)

**Total time:** ~30 minutes to prototype  
**Decision:** See if it works, then commit or rollback

**Should I start building the 2-level system?** 🚀

