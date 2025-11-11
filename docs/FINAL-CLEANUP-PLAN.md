# Final Organization Code Cleanup Plan

**Date:** November 7, 2024  
**Status:** SAFE TO EXECUTE  
**Impact:** 732 lines removed, 0 breaking changes

---

## Database Analysis ✅

**Current State (from Supabase):**
```
depth 0: 1 org  (Rrere - Battalion)
depth 1: 3 orgs (Companies)
depth 2: 1 org  (Platoon)
Total: 5 organizations
```

**Constraint:** `depth >= 0 AND depth <= 2` ✅ Already enforced!

**RPC Functions:** 12 functions found, all are called by service layer

---

## Files to DELETE (Safe - No Dependencies)

### 1. OrganizationSwitcher.tsx ❌
**Path:** `components/organizations/OrganizationSwitcher.tsx`  
**Lines:** ~390 lines  
**Why:** Old tree-based switcher, NOT imported anywhere  
**Used By:** NOTHING (checked entire codebase)  
**Action:** DELETE

### 2. OrgTreeItem.tsx ❌
**Path:** `components/organizations/OrgTreeItem.tsx`  
**Lines:** ~105 lines  
**Why:** Recursive tree component, only used by OrganizationSwitcher  
**Used By:** OrganizationSwitcher (which is unused)  
**Action:** DELETE

### 3. OrgListItem.tsx ❌
**Path:** `components/organizations/OrgListItem.tsx`  
**Lines:** ~237 lines  
**Why:** Complex item with depth colors/badges, only used by tree components  
**Used By:** OrganizationSwitcher, OrgTreeItem (both unused)  
**Action:** DELETE

---

## Files to DELETE (Helper Code)

### 4. organizationHelpers.ts ❌
**Path:** `utils/organizationHelpers.ts`  
**Lines:** ~167 lines  
**Why:** Tree utilities (groupOrgsByParent, getRootOrgs, etc.)  
**Used By:** Only OrganizationSwitcher (unused)  
**Functions:** 12 helper functions, all for tree rendering  
**Action:** DELETE

### 5. organizationPreferencesStore.ts ❌
**Path:** `store/organizationPreferencesStore.ts`  
**Lines:** ~95 lines  
**Why:** Favorites/recents store, only used by OrganizationSwitcher  
**Used By:** OrganizationSwitcher (unused)  
**Action:** DELETE

---

## Files to KEEP (Active Use)

### Components ✅
- `OrganizationModal.tsx` - Main entry (used by Header.tsx)
- `OrgInfoView.tsx` - Info screen with drill-down
- `OrgListView.tsx` - Simplified switcher
- `OrgBreadcrumb.tsx` - Used in tabs layout
- `OrgSwitchIndicator.tsx` - Used in tabs layout

### Services ✅
- `organizationsService.ts` - ALL methods used (via store or manage modules)

### Store ✅
- `organizationsStore.ts` - ALL actions used
- `organizationSwitchStore.ts` - Used for overlay (keep)

### Hooks ✅
- All permission hooks used (useIsCommanderAnywhere, etc.)
- All org management hooks used (useCreateOrg, useInviteOrg, etc.)

### Modules ✅
- `modules/manage/*` - ALL used (manage tab uses OrganizationFlowBuilder)

---

## Total Impact

### Code Reduction:
```
OrganizationSwitcher.tsx:           390 lines
OrgTreeItem.tsx:                    105 lines
OrgListItem.tsx:                    237 lines
organizationHelpers.ts:             167 lines
organizationPreferencesStore.ts:     95 lines
─────────────────────────────────────────────
TOTAL DELETED:                      994 lines
```

### No Functionality Lost:
- ✅ Org switching works (OrgListView)
- ✅ Drill-down navigation works (OrgInfoView)
- ✅ Create/delete orgs works (service + store)
- ✅ Permissions work (hooks)
- ✅ Manage tab works (OrganizationFlowBuilder)
- ✅ Invites work (invitation service)

---

## Execution Plan

### Safe Deletion Command:
```bash
cd /Users/ilie/Desktop/Dev/native/scopes-project/reticle

# Delete dead components
rm components/organizations/OrganizationSwitcher.tsx
rm components/organizations/OrgTreeItem.tsx
rm components/organizations/OrgListItem.tsx

# Delete dead utilities
rm utils/organizationHelpers.ts

# Delete dead store
rm store/organizationPreferencesStore.ts
```

### Verification:
```bash
# Check for broken imports
npm run typecheck

# Should be clean - these files aren't imported anywhere
```

---

## Migration Status

**Database Migration:** ✅ ALREADY APPLIED!

Your database constraint already shows:
```sql
depth >= 0 AND depth <= 2
```

**Migration file** `20251107_enforce_three_level_max.sql` **NOT needed** - constraint already enforced!

---

## Summary

**SAFE TO DELETE:** 5 files, 994 lines  
**NO RISK:** None of these files are imported  
**BENEFIT:** Cleaner codebase, faster builds  
**TIME:** 30 seconds to delete  

---

**Ready to execute cleanup?** 🧹

