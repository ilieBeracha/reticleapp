# RETICLE2 - AI CONTEXT DOCUMENT
> Last Updated: 2025-11-26
> For AI agents to understand codebase without prior context

---

## QUICK START

```bash
# Install & Run
npm install
npx expo start

# Supabase (linked to remote)
# Migrations in: supabase/migrations/
# Apply via MCP: mcp_supabase_apply_migration
```

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                         EXPO ROUTER                             │
├─────────────────────────────────────────────────────────────────┤
│  app/                                                           │
│  ├── _layout.tsx          → Root (Auth check, LogBox ignores)   │
│  ├── index.tsx            → Redirect based on auth              │
│  ├── auth/                → Sign-in flow                        │
│  └── (protected)/                                               │
│      ├── _layout.tsx      → ALL MODALS LIVE HERE + OrgRoleProvider│
│      └── workspace/                                             │
│          ├── _layout.tsx  → CONDITIONAL TABS (personal vs org)  │
│          ├── index.tsx    → Home (Personal/Org conditional)     │
│          ├── trainings.tsx→ Training list (ORG ONLY)            │
│          ├── manage.tsx   → Members/Teams/Invites (ORG ONLY)    │
│          ├── insights.tsx → Analytics (PERSONAL ONLY)           │
│          └── settings.tsx → App settings (PERSONAL ONLY)        │
└─────────────────────────────────────────────────────────────────┘

### Tab Visibility
- Personal Mode: Home, Insights, Settings
- Org Mode: Home, Trainings, Manage
- Mode switch triggers: key change + router.replace to index
```

---

## DATA MODEL

### Core Entities
```
profiles (user data)
  └── workspace_access (membership in org)
        └── org_workspaces (organizations)
              ├── teams
              │     └── team_members (user_id, role: commander|squad_commander|soldier)
              ├── trainings
              │     └── training_drills
              │           └── sessions (can link to drill)
              ├── sessions (standalone or training-linked)
              └── workspace_invitations
```

### Role Hierarchy
```
ORG LEVEL:                    TEAM LEVEL:
├── owner      (full access)  ├── commander       (manage team)
├── admin      (full access)  ├── squad_commander (lead squad)
├── instructor (trainings)    └── soldier         (participate)
└── member     (team access)
```

---

## KEY CONTEXTS

### 1. AuthContext (`contexts/AuthContext.tsx`)
- Manages: `user`, `session`, `loading`
- Wraps entire app

### 2. ModalContext (`contexts/ModalContext.tsx`)
- **ALL BOTTOM SHEETS CONTROLLED HERE**
- Refs: `createTrainingSheetRef`, `createTeamSheetRef`, `inviteMembersSheetRef`, etc.
- Callbacks: `onTrainingCreated`, `onTeamCreated`, `onMemberInvited`, etc.
- Usage: Components call `setOnXxxCreated(() => refetchFn)` to register refresh callbacks

### 3. OrgRoleContext (`contexts/OrgRoleContext.tsx`)
- Provides: `orgRole`, `teamRole`, `isAdmin`, `isCommander`, `teamInfo`, `allTeams`
- **MUST wrap components that need role info**
- Located in: `app/(protected)/_layout.tsx`

### 4. useAppContext (`hooks/useAppContext.ts`)
- Provides: `userId`, `activeWorkspace`, `activeWorkspaceId`, `workspaces`, `switchWorkspace`
- Handles personal ↔ org mode switching

---

## PERMISSION MATRIX

| Action | Owner | Admin | Instructor | Commander | Squad Cmdr | Soldier |
|--------|-------|-------|------------|-----------|------------|---------|
| Create Org Invite | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Team Invite | ✅ | ✅ | ❌ | ✅* | ❌ | ❌ |
| Create Team | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Training | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ |
| View All Trainings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Team Trainings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add Session to Training | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

`*` = Own team only

---

## MODAL SYSTEM

All modals in `app/(protected)/_layout.tsx`:
```tsx
<OrgRoleProvider>
  <Stack>...</Stack>
  
  {/* All sheets here */}
  <CreateTrainingSheet ref={createTrainingSheetRef} onTrainingCreated={...} />
  <CreateTeamSheet ref={createTeamSheetRef} onTeamCreated={...} />
  <InviteMembersSheet ref={inviteMembersSheetRef} onMemberInvited={...} />
  {/* etc... */}
</OrgRoleProvider>
```

### Re-render Pattern
```tsx
// In component (e.g., trainings.tsx):
const { createTrainingSheetRef, setOnTrainingCreated } = useModals();

useEffect(() => {
  setOnTrainingCreated(() => fetchTrainings);  // Register callback
  return () => setOnTrainingCreated(null);     // Cleanup
}, [fetchTrainings]);
```

---

## RLS POLICIES (Supabase)

### Key Tables with RLS
- `workspace_access` - org membership
- `workspace_invitations` - invite codes
- `trainings` - training events
- `training_drills` - drill items in training
- `sessions` - user sessions
- `team_members` - team membership

### Common Patterns
```sql
-- Owner/Admin check
EXISTS (
  SELECT 1 FROM workspace_access wa
  WHERE wa.org_workspace_id = TABLE.org_workspace_id
  AND wa.member_id = auth.uid()
  AND wa.role IN ('owner', 'admin')
)

-- Team commander check
EXISTS (
  SELECT 1 FROM team_members tm
  WHERE tm.team_id = TABLE.team_id
  AND tm.user_id = auth.uid()
  AND tm.role = 'commander'
)
```

---

## FILE STRUCTURE - KEY FILES

```
components/
├── modals/                    # All bottom sheet components
│   ├── BaseBottomSheet.tsx    # Wrapper (cross-platform)
│   ├── CreateTrainingSheet.tsx
│   ├── TrainingDetailSheet.tsx
│   ├── CreateTeamSheet.tsx
│   ├── InviteMembersSheet.tsx
│   └── ...
├── home/
│   ├── PersonalHomePage.tsx   # Personal mode home
│   └── OrganizationHomePage.tsx
├── organization/
│   └── trainings.tsx          # Main trainings list component
└── shared/                    # Reusable components

services/
├── trainingService.ts         # Training CRUD
├── sessionService.ts          # Session CRUD
├── teamService.ts             # Team CRUD
├── invitationService.ts       # Invite code management
└── authenticatedClient.ts     # Supabase client wrapper

contexts/
├── AuthContext.tsx            # Auth state
├── ModalContext.tsx           # Modal refs + callbacks
├── OrgRoleContext.tsx         # Role detection
└── ThemeContext.tsx           # Light/dark theme

hooks/
├── useAppContext.ts           # Main app context
├── useOrgRole.ts              # (imported from OrgRoleContext)
└── useWorkspaceData.ts        # Workspace data fetching

types/
├── workspace.ts               # All workspace-related types
└── database.ts                # Generated Supabase types
```

---

## COMMON ISSUES & FIXES

### 1. "RLS policy violation"
- Check if user has correct role
- Verify policy includes the action (INSERT/SELECT/UPDATE/DELETE)
- For team operations, ensure `team_members.user_id` (not `member_id`)

### 2. "Data not refreshing after create"
- Register callback: `setOnXxxCreated(() => fetchFn)`
- Ensure callback fires BEFORE sheet closes in `_layout.tsx`

### 3. "Tab icon warnings on Android"
- SF Symbols don't work on Android
- Use `tabBarIcon` with cross-platform approach
- Warnings suppressed in `app/_layout.tsx` via LogBox

### 4. "Modal not showing role-filtered data"
- Ensure `OrgRoleProvider` wraps the modal
- It's in `app/(protected)/_layout.tsx`

---

## TYPESCRIPT TYPES (Key Ones)

```typescript
// workspace.ts
interface Training {
  id: string;
  org_workspace_id: string;
  team_id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_at: string;
  created_by: string;
}

interface WorkspaceMemberWithTeams {
  id: string;
  member_id: string;
  role: 'owner' | 'admin' | 'instructor' | 'member';
  profile_full_name?: string;
  profile_email?: string;
  teams: Array<{
    team_id: string;
    team_name: string;
    team_role: 'commander' | 'squad_commander' | 'soldier';
  }>;
}

interface TeamMemberShip = 'commander' | 'squad_commander' | 'soldier';
interface WorkspaceRole = 'owner' | 'admin' | 'instructor' | 'member';
```

---

## RECENT CHANGES LOG

### 2025-11-26
- Added `allow_commander_invitations` migration
- Team commanders can now create invites for their team (squad_commander, soldier only)
- Centralized all modals to `_layout.tsx` with `ModalContext`
- Added re-render callbacks for immediate data refresh
- Updated `manage.tsx` with role-based UI and permissions
- Updated `InviteMembersSheet` with commander restrictions

### Previous
- Training system implemented with RLS
- Session linking to trainings
- Team-based training visibility

---

## TODO / IN PROGRESS

- [ ] Real data in OrganizationHomePage (currently mock)
- [ ] Session stats aggregation
- [ ] Push notifications
- [ ] Offline support

---

## DEBUGGING

```typescript
// Enable role debug logging
// In OrgRoleContext.tsx, look for console.log('🎯 OrgRoleContext:')

// Check current user role
const { orgRole, teamRole, isAdmin, isCommander } = useOrgRole();
console.log({ orgRole, teamRole, isAdmin, isCommander });

// Check modal context
const { createTrainingSheetRef, onTrainingCreated } = useModals();
console.log('Callback registered:', !!onTrainingCreated);
```

---

## SUPABASE MCP COMMANDS

```
mcp_supabase_apply_migration   # Apply DDL changes
mcp_supabase_execute_sql       # Run queries
mcp_supabase_list_tables       # See schema
mcp_supabase_get_logs          # Debug errors
mcp_supabase_get_advisors      # Security/performance checks
```

