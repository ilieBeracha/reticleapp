# Organization Role Context Architecture

## 🎯 Overview

**Problem Solved:** Automatic role detection when user navigates to organization workspace.

**Solution:** Centralized `OrgRoleContext` that fetches and provides both org role AND team role immediately upon entering org workspace.

---

## 🗺️ Routing Flow

```
User switches to Organization Workspace
        ↓
_layout.tsx wraps ALL routes with <OrgRoleProvider>
        ↓
OrgRoleContext automatically:
  1. Gets user ID from Supabase auth
  2. Loads workspace members
  3. Detects org role (owner/admin/member)
  4. Detects team role (commander/squad_commander/soldier)
  5. Makes data available to all children
        ↓
All pages/components can use useOrgRole() hook
        ↓
No duplicated logic, instant role access
```

---

## 📁 File Structure

```
contexts/
└── OrgRoleContext.tsx          # Central role detection & context

app/(protected)/workspace/organization/
├── _layout.tsx                 # Wraps all routes with OrgRoleProvider
├── index.tsx                   # Overview page (uses useOrgRole)
├── calendar.tsx                # Calendar page (uses useOrgRole)
├── organization.tsx            # Org management (uses useOrgRole)
└── my-team.tsx                 # Team view (uses useOrgRole)
```

---

## 🔧 How It Works

### 1. **_layout.tsx** - The Wrapper
```typescript
export default function OrganizationLayout() {
  return (
    <OrgRoleProvider>  {/* ← Wraps ALL organization routes */}
      <Tabs>
        <Tabs.Screen name="index" />      {/* Overview */}
        <Tabs.Screen name="calendar" />   {/* Calendar */}
        <Tabs.Screen name="organization" /> {/* Org Management */}
      </Tabs>
    </OrgRoleProvider>
  );
}
```

**What happens:**
- User enters org workspace
- Provider activates
- Automatically fetches all role data
- Makes it available to all child routes

### 2. **OrgRoleContext** - The Brain
```typescript
export function OrgRoleProvider({ children }) {
  // 1. Get user ID from auth
  useEffect(() => {
    getCurrentUser(); // Sets currentUserId
  }, []);
  
  // 2. Load workspace members when user ID ready
  useEffect(() => {
    if (currentUserId && activeWorkspace?.workspace_type === 'org') {
      loadWorkspaceMembers();
    }
  }, [currentUserId, activeWorkspace]);
  
  // 3. Extract roles from data
  const orgRole = permissions.role; // From useWorkspacePermissions
  const teamRole = currentMember?.teams[0]?.team_role; // From workspace members
  
  // 4. Provide to children
  return (
    <OrgRoleContext.Provider value={{
      orgRole, teamRole, isAdmin, isCommander, ...
    }}>
      {children}
    </OrgRoleContext.Provider>
  );
}
```

**Features:**
- ✅ Automatic data fetching
- ✅ Caches results (no re-fetching on tab switch)
- ✅ Loading states
- ✅ Debug logging
- ✅ Type-safe

### 3. **Using the Context** - Any Component
```typescript
// In organization.tsx
export default function OrganizationPage() {
  const { isAdmin, loading } = useOrgRole();
  
  if (loading) return <Loader />;
  
  return isAdmin ? <AdminView /> : <MemberView />;
}

// In my-team.tsx
export default function MyTeamView() {
  const { teamRole, allTeams, isCommander } = useOrgRole();
  
  return (
    <View>
      <Text>Your Role: {teamRole}</Text>
      {isCommander && <ManagementTools />}
    </View>
  );
}

// In index.tsx (overview)
export default function OrganizationOverview() {
  const { orgRole, teamRole } = useOrgRole();
  
  return (
    <View>
      <Header role={orgRole} />
      {teamRole && <TeamBadge role={teamRole} />}
    </View>
  );
}
```

---

## 🎁 What's Available via useOrgRole()

```typescript
const {
  // Organization Role
  orgRole,              // 'owner' | 'admin' | 'instructor' | 'member'
  isAdmin,              // boolean - is owner or admin
  canManageWorkspace,   // boolean - can manage org settings
  canManageTeams,       // boolean - can create/delete teams
  canInviteMembers,     // boolean - can invite new members
  
  // Team Role (if member)
  hasTeam,              // boolean - is assigned to any team
  teamRole,             // 'commander' | 'squad_commander' | 'soldier' | null
  teamInfo,             // { teamId, teamName, teamRole, squadId }
  allTeams,             // Array of all teams user is on
  
  // Computed Helpers
  isCommander,          // boolean - is team commander
  isSquadCommander,     // boolean - is squad commander
  isSoldier,            // boolean - is soldier
  
  // User Data
  currentUserId,        // string - current user's ID
  
  // State
  loading,              // boolean - still fetching roles
} = useOrgRole();
```

---

## 🔄 Data Flow

```
User Action: Switch to Organization
        ↓
_layout.tsx renders with OrgRoleProvider
        ↓
OrgRoleContext:
  1. useEffect → Get user ID from Supabase auth
  2. useEffect → Load workspace members
  3. useMemo → Find current member in members list
  4. useMemo → Extract team role from member.teams
  5. Context value → Provide all computed data
        ↓
All child components can use useOrgRole()
        ↓
No prop drilling, no duplicate fetching
```

---

## ⚡ Performance Benefits

### Before (Multiple Queries):
```typescript
// organization.tsx
const { role } = useWorkspacePermissions();  // Query 1
const { workspaceMembers } = useWorkspaceStore(); // Query 2
const myMember = workspaceMembers.find(...);

// my-team.tsx
const { role } = useWorkspacePermissions();  // Query 1 (duplicate!)
const { workspaceMembers } = useWorkspaceStore(); // Query 2 (duplicate!)
const myMember = workspaceMembers.find(...);

// index.tsx
const { role } = useWorkspacePermissions();  // Query 1 (duplicate!)
// ... same thing repeated
```

### After (Single Source):
```typescript
// _layout.tsx
<OrgRoleProvider>  // Fetches ONCE when layout mounts
  <AllRoutes />
</OrgRoleProvider>

// All child components
const { orgRole, teamRole } = useOrgRole();  // No fetching, instant access
```

**Result:** 
- ❌ Before: 6+ queries (2 per page × 3 pages)
- ✅ After: 2 queries total (fetched once, shared everywhere)

---

## 🎨 User Experience

### Admin navigates to org:
```
1. Click org workspace → _layout.tsx wraps with Provider
2. Provider loads (instant, cached from AppContext)
3. Show loader (~100ms)
4. Roles ready: orgRole='owner', isAdmin=true
5. Render admin dashboard
```

### Team member navigates to org:
```
1. Click org workspace → _layout.tsx wraps with Provider
2. Provider loads (instant, cached from AppContext)
3. Fetch workspace members (~200ms)
4. Extract team role from member data
5. Roles ready: orgRole='member', teamRole='commander'
6. Render team commander view
```

**Fast, seamless, automatic** ✨

---

## 🐛 Debug Console Output

```javascript
// When user enters org workspace:
🏢 Organization Layout: {
  isMyWorkspace: false,
  workspaceType: "org",
  workspaceName: "Acme Tactical"
}

🎯 OrgRoleContext: User ID: "abc-123-def"

🏢 OrgRoleContext: Loading org data for workspace: "Acme Tactical"

🎯 OrgRoleContext: Role Detection Complete: {
  orgRole: "member",
  isAdmin: false,
  hasTeam: true,
  teamRole: "commander",
  teamsCount: 1
}
```

---

## 🚀 Benefits

1. **Centralized** - One place for all role logic
2. **Automatic** - Fetches immediately on org navigation
3. **Cached** - No re-fetching when switching tabs
4. **Type-safe** - Full TypeScript support
5. **Debuggable** - Console logs for troubleshooting
6. **Performant** - Single fetch, shared everywhere
7. **Clean** - No duplicate code across pages
8. **Extensible** - Easy to add new role features

---

## 📊 Summary

**Before:**
- Each page fetched roles independently
- Duplicate queries
- Slow, confusing
- Role logic scattered

**After:**
- One context fetches everything
- Shared across all pages
- Fast, clean
- Role logic centralized

**Result:** 
- ✅ Faster loading
- ✅ Simpler code
- ✅ Better UX
- ✅ Easy to maintain

Perfect foundation for adding role-specific features! 🎯

