# 🎭 Role Management System - Complete Architecture

## Overview

This system implements a **two-level role hierarchy** that clearly separates organizational permissions from team-specific permissions.

## 🏗️ Architecture

### Two-Level Role System

```
┌─────────────────────────────────────────────────────────┐
│                    ORGANIZATION                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Profile (one per user per org)                     │ │
│  │ Table: profiles                                    │ │
│  │ Role: owner | admin | instructor | member          │ │
│  │                                                     │ │
│  │ ┌────────────────────┐  ┌────────────────────────┐│ │
│  │ │   Team A           │  │   Team B               ││ │
│  │ │   Table: teams     │  │   Table: teams         ││ │
│  │ │                    │  │                        ││ │
│  │ │ ┌────────────────┐ │  │ ┌────────────────────┐││ │
│  │ │ │ Team Membership│ │  │ │ Team Membership    │││ │
│  │ │ │ team_members   │ │  │ │ team_members       │││ │
│  │ │ │ Role: commander│ │  │ │ Role: squad_cmd    │││ │
│  │ │ │     squad_cmd  │ │  │ │     soldier        │││ │
│  │ │ │     soldier    │ │  │ │                    │││ │
│  │ │ └────────────────┘ │  │ └────────────────────┘││ │
│  │ └────────────────────┘  └────────────────────────┘│ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📊 Data Model

### Level 1: Organization Roles

**Table:** `profiles`  
**Relationship:** One profile per user per organization

```sql
profiles {
  id: uuid
  user_id: uuid (references auth.users)
  org_id: uuid (references orgs)
  role: text CHECK (role IN ('owner', 'admin', 'instructor', 'member'))
  ...
}
```

**Key Concept:** Each user has ONE profile per organization. This profile stores their organizational role.

### Level 2: Team Roles

**Table:** `team_members`  
**Relationship:** Links profiles to teams with team-specific roles

```sql
team_members {
  team_id: uuid (references teams)
  profile_id: uuid (references profiles) -- NOT user_id!
  role: text CHECK (role IN ('commander', 'squad_commander', 'soldier'))
  details: jsonb { squad_id: "Alpha" }
  ...
}
```

**Key Concept:** Only users with `member` org role can be assigned to teams. Team membership is profile-specific (not user-specific).

## 🎯 Role Definitions

### Organization Roles (Stored in `profiles.role`)

| Role | Level | Description | Can Be Team Member? |
|------|-------|-------------|---------------------|
| **Owner** | 4 | Full control over organization. Can delete org, manage all settings. | ❌ No |
| **Admin** | 3 | Can manage members, create teams, invite users. Cannot delete org or remove owner. | ❌ No |
| **Instructor** | 2 | Can view all teams, create trainings, view all progress. Cannot create teams or manage members. | ❌ No |
| **Member** | 1 | Basic organization access. Can be assigned to teams. | ✅ **Yes** |

### Team Roles (Stored in `team_members.role`)

| Role | Level | Description | Squad Required? |
|------|-------|-------------|-----------------|
| **Commander** | 3 | Leads entire team. Can manage team members, create trainings. | ❌ No |
| **Squad Commander** | 2 | Leads a specific squad within team. Can manage their squad. | ✅ Yes |
| **Soldier** | 1 | Regular team member. Can add sessions, view own progress. | ✅ Yes |

## 🔐 Permission Matrix

### Organization Permissions

| Permission | Owner | Admin | Instructor | Member |
|-----------|-------|-------|------------|--------|
| **Organization Management** |
| Delete organization | ✅ | ❌ | ❌ | ❌ |
| Update org settings | ✅ | ✅ | ❌ | ❌ |
| View org settings | ✅ | ✅ | ✅ | ❌ |
| **Member Management** |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Update member roles | ✅ | ✅ | ❌ | ❌ |
| View all members | ✅ | ✅ | ✅ | ❌ |
| Remove owner | ✅ | ❌ | ❌ | ❌ |
| **Team Management** |
| Create teams | ✅ | ✅ | ❌ | ❌ |
| Delete teams | ✅ | ✅ | ❌ | ❌ |
| Update teams | ✅ | ✅ | ❌ | ❌ |
| View all teams | ✅ | ✅ | ✅ | ❌ |
| Assign members to teams | ✅ | ✅ | ❌ | ❌ |
| **Training/Sessions** |
| Create trainings | ✅ | ✅ | ✅ | ❌ |
| View all progress | ✅ | ✅ | ✅ | ❌ |
| View all sessions | ✅ | ✅ | ✅ | ❌ |

### Team Permissions

| Permission | Commander | Squad Commander | Soldier |
|-----------|-----------|-----------------|---------|
| **Team Management** |
| Manage team | ✅ | ❌ | ❌ |
| View team details | ✅ | ✅ | ✅ |
| **Member Management** |
| Invite to team | ✅ | ❌ | ❌ |
| Remove from team | ✅ | ❌ | ❌ |
| Update team member roles | ✅ | ❌ | ❌ |
| **Squad Management** |
| Manage all squads | ✅ | ❌ | ❌ |
| Manage own squad | ✅ | ✅ | ❌ |
| View all squads | ✅ | ✅ | ✅ |
| **Training/Sessions** |
| Create team training | ✅ | ❌ | ❌ |
| Add sessions to team | ✅ | ✅ | ✅ |
| View team progress | ✅ | ✅ | ❌ |
| View own progress | ✅ | ✅ | ✅ |

## 💡 Usage Examples

### Example 1: Check Organization Permission

```typescript
import { useRolePermissions } from '@/hooks/useRolePermissions';

function OrganizationSettings() {
  const { org, can, getRoleInfo } = useRolePermissions();
  
  // Method 1: Direct property access
  if (org.canCreateTeams) {
    return <CreateTeamButton />;
  }
  
  // Method 2: Permission checker
  if (can.org('canInviteMembers')) {
    return <InviteMembersButton />;
  }
  
  // Get role styling
  const { color, icon, displayName } = getRoleInfo.org;
  
  return (
    <View>
      <Ionicons name={icon} color={color} />
      <Text>{displayName}</Text>
    </View>
  );
}
```

### Example 2: Check Team Permission

```typescript
import { useRolePermissions } from '@/hooks/useRolePermissions';

function TeamDashboard({ myTeamRole }: { myTeamRole: 'commander' | 'squad_commander' | 'soldier' }) {
  const { team, can, isTeamCommander } = useRolePermissions(myTeamRole);
  
  // Check if commander
  if (isTeamCommander) {
    return <CommanderControls />;
  }
  
  // Check specific team permission
  if (team?.canAddSessionsToTeam) {
    return <AddSessionButton />;
  }
  
  // Check permission dynamically
  if (can.team('canManageOwnSquad')) {
    return <ManageSquadButton />;
  }
}
```

### Example 3: Validate Role Changes

```typescript
import { useRolePermissions } from '@/hooks/useRolePermissions';

function MemberManagement({ targetMember }: { targetMember: Member }) {
  const { can, validate } = useRolePermissions();
  
  const handleRoleChange = (newRole: OrgRole) => {
    // Validate before making API call
    const validation = validate.roleChange(targetMember.role, newRole);
    
    if (!validation.valid) {
      Alert.alert('Cannot Change Role', validation.reason);
      return;
    }
    
    // Proceed with role change
    updateMemberRole(targetMember.id, newRole);
  };
  
  // Check if can modify this member
  const canModify = can.modifyRole(targetMember.role);
  
  return (
    <View>
      <RoleSelector 
        disabled={!canModify}
        onSelect={handleRoleChange}
      />
    </View>
  );
}
```

### Example 4: Simple Permission Check

```typescript
import { useCanDo, useCanDoInTeam } from '@/hooks/useRolePermissions';

function QuickCheck() {
  // Simple org permission check
  const canCreateTeams = useCanDo('canCreateTeams');
  
  // Simple team permission check (if you know the team role)
  const canManageTeam = useCanDoInTeam('canManageTeam', 'commander');
  
  return (
    <View>
      {canCreateTeams && <CreateTeamButton />}
      {canManageTeam && <ManageTeamButton />}
    </View>
  );
}
```

## 🔄 Data Flow

### Scenario 1: User Joins Organization

```
1. User accepts invitation
2. Profile created with org role (owner/admin/instructor/member)
3. Profile stored in `profiles` table
   ├─ user_id: links to auth.users
   ├─ org_id: links to organization
   └─ role: organizational role
```

### Scenario 2: Member Joins Team

```
1. Admin assigns member to team
2. Validation: Can only assign if profile.role = 'member'
3. Team membership created in `team_members`
   ├─ team_id: links to team
   ├─ profile_id: links to profile (NOT user_id!)
   ├─ role: team role (commander/squad_commander/soldier)
   └─ details: { squad_id: "Alpha" }
```

### Scenario 3: Checking Permissions

```
1. Component renders
2. useRolePermissions() hook reads activeProfile
3. Gets org role from profile.role
4. Gets team role from team_members (if applicable)
5. Calculates permissions based on role hierarchy
6. Returns permission flags
```

## 🚨 Important Rules

### 1. Profile-Based System
- **DO:** Link team_members to `profile_id`
- **DON'T:** Link team_members to `user_id`
- **WHY:** A user can have different roles in different orgs

### 2. Team Membership Restriction
- **ONLY** users with `member` org role can be assigned to teams
- **Owners, Admins, Instructors** manage teams but don't join them
- **Enforced** at database level with triggers

### 3. Role Hierarchy
- Higher roles **inherit** permissions from lower roles
- **Owner** can do everything Admin can do
- **Admin** can do everything Instructor can do
- **Commander** can do everything Squad Commander can do

### 4. Squad Requirements
- **Commanders:** No squad required (command entire team)
- **Squad Commanders:** MUST have squad assigned
- **Soldiers:** MUST have squad assigned
- **Enforced** at database level with CHECK constraint

## 📁 Files

### Core Files
- `services/roleService.ts` - Permission calculation and validation
- `hooks/useRolePermissions.ts` - React hook for permission checking
- `contexts/ProfileContext.tsx` - Active profile and org data
- `supabase/migrations/20251122000000_fresh_multi_profile_schema.sql` - Database schema

### Type Definitions
- `types/workspace.ts` - Workspace and role types
- `types/database.ts` - Database types

## 🎨 UI Helpers

### Role Colors
```typescript
import { getOrgRoleColor, getTeamRoleColor } from '@/services/roleService';

const ownerColor = getOrgRoleColor('owner'); // '#FFD700' (Gold)
const adminColor = getOrgRoleColor('admin'); // '#FF6B6B' (Red)
const commanderColor = getTeamRoleColor('commander'); // '#FFD700' (Gold)
```

### Role Icons
```typescript
import { getOrgRoleIcon, getTeamRoleIcon } from '@/services/roleService';

const ownerIcon = getOrgRoleIcon('owner'); // 'shield-checkmark'
const commanderIcon = getTeamRoleIcon('commander'); // 'star'
```

## 🔧 Maintenance

### Adding New Permission
1. Add to `OrgPermissions` or `TeamPermissions` interface
2. Update `getOrgPermissions()` or `getTeamPermissions()`
3. Update permission matrix in this doc

### Adding New Role
1. Add to `OrgRole` or `TeamRole` type
2. Update role hierarchy constant
3. Update permission calculation functions
4. Update database CHECK constraint
5. Update UI helpers (colors, icons)

## ✅ Best Practices

1. **Always use the hook:** Don't manually check roles, use `useRolePermissions()`
2. **Check permissions, not roles:** Use `can.org('canCreateTeams')` instead of `role === 'admin'`
3. **Validate before actions:** Use `validate.roleChange()` before updating roles
4. **Profile-based:** Always link to `profile_id`, not `user_id`
5. **Team membership:** Always check if user can be assigned to team before attempting

## 🐛 Troubleshooting

### "Cannot assign admin to team"
- **Cause:** Only `member` org role can join teams
- **Solution:** Admins manage teams but don't join them

### "Cannot find team role"
- **Cause:** User not in team_members table
- **Solution:** Assign user to team first (only if they're a member)

### "Permission denied"
- **Cause:** Insufficient role level
- **Solution:** Check permission matrix and verify role hierarchy

---

**Last Updated:** November 22, 2024  
**Version:** 1.0.0


