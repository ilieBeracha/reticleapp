# COMPONENT REFERENCE

## Modal Sheets (in app/(protected)/_layout.tsx)

### CreateTrainingSheet
- **Path**: `components/modals/CreateTrainingSheet.tsx`
- **Ref**: `createTrainingSheetRef`
- **Callback**: `onTrainingCreated`
- **Features**:
  - Role-filtered team selection (commanders see only their teams)
  - Drill builder
  - Date/time picker
  - Status: planned by default

### TrainingDetailSheet
- **Path**: `components/modals/TrainingDetailSheet.tsx`
- **Ref**: `trainingDetailSheetRef`
- **Callback**: `onTrainingUpdated`
- **Open with**: `.open(trainingId: string)`
- **Features**:
  - View/edit training details
  - Start/finish training
  - Add drills
  - View sessions

### CreateTeamSheet
- **Path**: `components/modals/CreateTeamSheet.tsx`
- **Ref**: `createTeamSheetRef`
- **Callback**: `onTeamCreated`
- **Features**:
  - Team name
  - Team type (field/back_office)
  - Initial squads

### InviteMembersSheet
- **Path**: `components/modals/InviteMembersSheet.tsx`
- **Ref**: `inviteMembersSheetRef`
- **Callback**: `onMemberInvited`
- **Features**:
  - Role-based UI:
    - Owner/Admin: Full access (org + team invites)
    - Commander: Team invites only (squad_commander, soldier)
  - Team/role selection
  - Pending invites list
  - Copy invite code

### CreateSessionSheet
- **Path**: `components/modals/CreateSessionSheet.tsx`
- **Ref**: `createSessionSheetRef`
- **Callback**: `onSessionCreated`
- **Features**:
  - Session name
  - Environment settings
  - Optional training/drill link

### AcceptInviteSheet
- **Path**: `components/modals/AcceptInviteSheet.tsx`
- **Ref**: `acceptInviteSheetRef`
- **Callback**: `onInviteAccepted`
- **Features**:
  - Enter invite code
  - Preview workspace/role
  - Accept/decline

### WorkspaceSwitcherBottomSheet
- **Path**: `components/modals/WorkspaceSwitcherBottomSheet.tsx`
- **Ref**: `workspaceSwitcherSheetRef`
- **Callback**: `onWorkspaceSwitched`
- **Features**:
  - List all workspaces
  - Switch workspace
  - Create new workspace
  - Join via invite

### TeamPreviewSheet
- **Path**: `components/modals/TeamPreviewSheet.tsx`
- **Ref**: `teamPreviewSheetRef`
- **State**: `selectedTeam`
- **Features**:
  - Team details
  - Member list
  - Squad list

### MemberPreviewSheet
- **Path**: `components/modals/MemberPreviewSheet.tsx`
- **Ref**: `memberPreviewSheetRef`
- **State**: `selectedMember`
- **Features**:
  - Member profile
  - Role info
  - Team memberships

---

## Screen Components

### Home (workspace/index.tsx)
Conditionally renders:
- **PersonalHomePage** (`components/home/PersonalHomePage.tsx`)
  - Recent sessions
  - Quick actions
  - Training chart
  
- **OrganizationHomePage** (`components/home/OrganizationHomePage.tsx`)
  - KPI donut chart
  - Stat cards
  - Today's sessions (currently mock data)

### Trainings (workspace/trainings.tsx)
- Imports: `components/organization/trainings.tsx`
- Filter tabs: Upcoming, Active, Completed
- Training cards with status
- New button (role-restricted)

### Manage (workspace/manage.tsx)
- Tabs: Members, Teams, Invites
- Permission banner (shows user's access level)
- Role-based action buttons
- Member cards with role badges
- Team cards

### Insights (workspace/insights.tsx)
- Analytics dashboard
- Session charts
- Biometric guard (future)

### Settings (workspace/settings.tsx)
- App preferences
- Account settings

---

## Shared Components

### BaseBottomSheet
- **Path**: `components/modals/BaseBottomSheet.tsx`
- Cross-platform (iOS native + Android @gorhom/bottom-sheet)
- Props: `snapPoints`, `backdropOpacity`, `children`

### BaseAvatar
- **Path**: `components/BaseAvatar.tsx`
- Props: `fallbackText`, `size`, `role`, `imageUrl`

### TrainingChart
- **Path**: `components/shared/TrainingChart.tsx`
- Pie chart with gifted-charts

### EmptyState
- **Path**: In manage.tsx (inline)
- Props: `icon`, `title`, `description`, `actionLabel`, `onAction`

---

## Context Usage

```tsx
// Get modal refs and callbacks
const { 
  createTrainingSheetRef,
  setOnTrainingCreated 
} = useModals();

// Get role info
const { 
  orgRole, 
  isAdmin, 
  isCommander, 
  teamInfo 
} = useOrgRole();

// Get app context
const { 
  activeWorkspace, 
  activeWorkspaceId, 
  switchWorkspace 
} = useAppContext();

// Get theme
const { theme } = useTheme();
const colors = Colors[theme];
// OR
const colors = useColors();
```

---

## Opening Modals

```tsx
// Simple open
createTrainingSheetRef.current?.open();

// With data
trainingDetailSheetRef.current?.open(trainingId);

// Set selected item first
setSelectedTeam(team);
teamPreviewSheetRef.current?.open();
```

---

## Callback Registration Pattern

```tsx
useEffect(() => {
  // Register refresh callback
  setOnTrainingCreated(() => fetchTrainings);
  
  return () => {
    // Cleanup on unmount
    setOnTrainingCreated(null);
  };
}, [fetchTrainings, setOnTrainingCreated]);
```

