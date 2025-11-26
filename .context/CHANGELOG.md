# CHANGELOG

## 2025-11-26 (Latest)

### Tab Navigation Fix
- **Complete rewrite of workspace/_layout.tsx**
- Separate tab configurations for personal vs org mode
- Mode change detection via ref comparison
- Forces complete Tabs remount on mode switch (key change)
- Navigates to index after mode change
- Removed problematic `sceneStyle: { display: 'none' }` approach
- Hidden tabs use `tabBarItemHidden: true`

### Previous (same day)

### RLS Policies
- **allow_commander_invitations**: Team commanders can now create invites for their team
  - Can only invite `squad_commander` or `soldier` (not `commander`)
  - Can only invite to teams they command
  - Can view/delete their team's invites

### Modal System
- Centralized ALL modals to `app/(protected)/_layout.tsx`
- All modals controlled via `ModalContext`
- Added callback pattern for immediate re-renders:
  - `setOnTrainingCreated`, `setOnTeamCreated`, `setOnMemberInvited`, etc.
- Fixed callback execution order (callback fires BEFORE sheet closes)

### InviteMembersSheet
- Added role-based restrictions:
  - Commanders: Team invites only, filtered roles
  - Owner/Admin: Full access
- Added permission banner for commanders
- Auto-select team for single-team commanders
- Role icons in selection chips

### Manage Screen (Complete Redesign)
- New tabs: Members, Teams, Invites
- Permission banner showing user's access level
- Role badges (Owner, Admin, Instructor, Member)
- Team role badges (Commander, Squad Cmdr, Soldier)
- "You" indicator for current user
- Role-based action buttons

### Training System
- Commanders can create trainings for their team
- Admin/Owner/Instructor see all trainings
- Team members see only their team's trainings
- Fixed "upcoming" filter (status-based, not date-based)
- CreateTrainingSheet filters teams by commander's access

---

## Previous Sessions

### Training Feature
- Created `trainings` and `training_drills` tables
- RLS policies for team-based access
- CRUD operations in `trainingService.ts`
- Training detail sheet with drills
- Session linking to trainings

### Session System
- Sessions can be standalone or linked to trainings
- `training_id` and `drill_id` optional fields
- Team-based visibility

### Tab System
- Native bottom tabs with `@bottom-tabs/react-navigation`
- Cross-platform icons (SF Symbols + Ionicons)
- Mode-based tab visibility (personal vs org)
- Fixed tab glitching on mode switch

### Role Context
- `OrgRoleContext` for role detection
- `orgRole` (owner/admin/instructor/member)
- `teamRole` (commander/squad_commander/soldier)
- `isAdmin`, `isCommander`, `teamInfo`, `allTeams`

---

## Known Issues / TODO

- [ ] OrganizationHomePage uses mock data
- [ ] Session stats aggregation not implemented
- [ ] Push notifications
- [ ] Offline support
- [ ] Training drill execution tracking

