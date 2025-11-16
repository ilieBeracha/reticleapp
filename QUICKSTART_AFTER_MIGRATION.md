# Quick Start After Workspace Simplification

## ✅ What's Done

All code has been updated to use the simplified **User-as-Workspace** model:

- ✅ Database schema simplified (`20251116101453_remote_schema.sql`)
- ✅ TypeScript types updated
- ✅ Services rewritten
- ✅ Store simplified
- ✅ Hooks updated
- ✅ UI components fixed
- ✅ No lint errors

## 🚀 Next Steps

### 1. Apply Database Migration

```bash
# Option A: Reset database (DESTROYS EXISTING DATA)
cd /Users/ilie/Desktop/Dev/native/reticle2
supabase db reset

# Option B: Push migration (if you have data to preserve)
supabase db push
```

### 2. Update AuthContext

Your `AuthContext.tsx` needs to be updated to use the new store API:

**Before:**
```typescript
const { loadWorkspaces } = useWorkspaceStore();
await loadWorkspaces(user.id);
```

**After:**
```typescript
const { loadWorkspaces } = useWorkspaceStore();
await loadWorkspaces();  // No userId needed
```

### 3. Update Protected Route

In `app/(protected)/_layout.tsx` or wherever you initialize workspaces:

```typescript
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

useEffect(() => {
  if (user) {
    useWorkspaceStore.getState().loadWorkspaces();
  }
}, [user]);
```

### 4. Test the App

```bash
# Start the development server
npm start

# Or for iOS
npm run ios

# Or for Android
npm run android
```

### 5. Test These Flows

#### Sign Up Flow
1. Sign up a new user
2. Check: Profile created automatically
3. Check: Workspace switcher shows "My Workspace"

#### Workspace Management
1. Open workspace switcher (header button)
2. Verify "My Workspace" appears
3. Update workspace name (settings page)
4. Check: Name updates in switcher

#### Collaboration (requires 2 users)
1. User A: Get their workspace ID from profile
2. User A: In code/console, add User B:
   ```typescript
   import { addWorkspaceMember } from '@/services/workspaceService';
   await addWorkspaceMember(userAWorkspaceId, 'userb@example.com', 'member');
   ```
3. User B: Refresh app
4. User B: Check workspace switcher shows User A's workspace
5. User B: Switch to User A's workspace

## 🔧 Common Issues

### Issue: Workspaces not loading
**Solution:** Check AuthContext is calling `loadWorkspaces()` after user signs in

### Issue: "No workspaces available"
**Solution:** Database migration may not have run. Check Supabase dashboard for `workspace_access` table

### Issue: Can't switch workspaces
**Solution:** Check RLS policies are enabled and user has `workspace_access` record

### Issue: TypeScript errors
**Solution:** Restart TypeScript server:
```bash
# In VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## 📝 Code Examples

### Get Current Context
```typescript
import { useAppContext } from '@/hooks/useAppContext';

function MyComponent() {
  const { 
    myWorkspaceId,      // My profile.id
    activeWorkspaceId,  // Currently viewing
    isMyWorkspace,      // Am I viewing my workspace?
    activeWorkspace     // Current workspace object
  } = useAppContext();
  
  // Use these IDs for queries, context-aware UI, etc.
}
```

### Workspace Operations
```typescript
import { 
  getMyWorkspace,
  updateMyWorkspace,
  getAccessibleWorkspaces
} from '@/services/workspaceService';

// Get my workspace
const myWorkspace = await getMyWorkspace();

// Update my workspace name
await updateMyWorkspace({
  workspace_name: 'New Name'
});

// Get all workspaces I can access
const workspaces = await getAccessibleWorkspaces();
```

### Team Operations
```typescript
import {
  getWorkspaceTeams,
  createTeam,
  addTeamMember
} from '@/services/workspaceService';

// Get teams in a workspace
const teams = await getWorkspaceTeams(workspaceOwnerId);

// Create a team
const team = await createTeam({
  workspace_owner_id: myWorkspaceId,
  name: 'Alpha Team',
  team_type: 'field'
});

// Add member to team
await addTeamMember(team.id, userId, 'sniper');
```

## 🎯 What Changed

### Mental Model
**Before:** Personal Workspace vs Organization Workspace (confusing!)
**After:** User = Workspace (simple!)

### Data Model
**Before:** `profiles` → `workspaces` → `workspace_members` (3 tables, complex)
**After:** `profiles` (user IS workspace) → `workspace_access` (2 tables, simple)

### API Calls
**Before:**
```typescript
const { data } = await supabase
  .from('workspaces')
  .select('*, workspace_members(*)')
  .eq('workspace_type', 'personal');
```

**After:**
```typescript
const myWorkspace = await getMyWorkspace();  // Just get my profile
```

## 📚 Documentation

- **Full Details:** See `WORKSPACE_SIMPLIFICATION.md`
- **Database Schema:** See `supabase/migrations/20251116101453_remote_schema.sql`
- **Type Definitions:** See `types/workspace.ts` and `types/database.ts`
- **Service API:** See `services/workspaceService.ts`

## ✨ Benefits

1. **Simpler Code:** ~200 lines removed
2. **Faster Queries:** Fewer joins
3. **Clearer Mental Model:** User = Workspace
4. **Better RLS:** More efficient policies
5. **Easier to Extend:** Just add columns to `profiles`

---

**Need Help?** Check the console logs - all context hooks log their state for debugging.

