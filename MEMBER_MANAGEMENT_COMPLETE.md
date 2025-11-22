# Complete Member Management System

## Overview
Comprehensive system for managing organization members, including team assignment, role management, and squad assignment - both during invitation and for existing members.

## Features Implemented

### 1. **Invite New Members** ✅
**Component:** `InviteMembersSheet.tsx`

- Select organization role (owner, admin, instructor, member)
- **Only 'member' role can be assigned to teams**
- Select team (optional for members)
- Select team role (commander, squad_commander, soldier)
- Select or create squad:
  - Shows available squads from team as clickable chips
  - Or type new squad name
  - Required for soldiers and squad commanders

### 2. **Manage Existing Members** ✅
**Component:** `ManageMemberSheet.tsx`

- View member details (name, email, role)
- See current team assignment
- **Assign to team** (only if user has 'member' role)
- **Change team** (move between teams)
- **Update team role** (commander, squad_commander, soldier)
- **Assign to squad** (select from existing or create new)
- **Remove from team** (select "No Team")

**Access:** Click "Manage" button next to each member in "All Members" list

### 3. **Database Constraints** ✅

**Enforced at database level:**
- ✅ Only 'member' role users can be added to teams
- ✅ Admins, owners, and instructors cannot be team members
- ✅ User must be in org before being added to team
- ✅ One commander per team
- ✅ Squad required for squad commanders

**Trigger:** `enforce_team_member_workspace_role`

### 4. **Squad Management** ✅

**Team-level squads:**
- Stored as TEXT array on teams table
- Easy to see what squads exist: `team.squads`
- Create squads when creating team
- Update squads anytime
- Members reference squad by name

**Member-level assignment:**
- Squad stored in `details.squad_id`
- Select from team's squads or create new
- Optional for soldiers, required for squad commanders

## UI Components

### ManageMemberSheet.tsx

**Features:**
- 🎨 Beautiful avatar with initials
- 🎨 Role badge display
- 🎨 Current team assignment card
- 🎨 Team selection with squad hints
- 🎨 Role chips (horizontal scroll)
- 🎨 Squad chips (horizontal scroll)
- 🎨 Warning for non-member roles
- 🎨 Haptic feedback
- 🎨 Loading states

**Layout:**
```
┌─────────────────────────────┐
│         [Avatar]            │
│       John Doe              │
│   john@example.com          │
│      [MEMBER]               │
├─────────────────────────────┤
│  CURRENT ASSIGNMENT         │
│  🏢 Delta Force             │
│     Commander • Squad Alpha │
├─────────────────────────────┤
│  ASSIGN TO TEAM             │
│  [ ] No Team                │
│  [✓] Delta Force            │
│      3 squads: Alpha, Bravo │
│  [ ] Echo Team              │
├─────────────────────────────┤
│  TEAM ROLE                  │
│  [Commander] [Squad Cmd]... │
├─────────────────────────────┤
│  SQUAD                      │
│  [Alpha] [Bravo] [Charlie]  │
│  Or enter new squad name... │
├─────────────────────────────┤
│     [✓ Save Changes]        │
└─────────────────────────────┘
```

### Organization Page Integration

**"All Members" section now shows:**
- Member name and email
- Organization role badge
- Team badge (if assigned)
- Squad badge (if assigned)
- "Manage" button (gear icon)

**Example:**
```
John Doe
john@example.com • Delta Force • Alpha
[MEMBER] [⚙️]
```

## Data Flow

### Inviting New Member to Team with Squad

1. Admin opens InviteMembersSheet
2. Selects role: **member** (only members can join teams)
3. Selects team: **Delta Force**
4. Selects team role: **soldier**
5. Selects squad: **Alpha** (from existing) or types new name
6. Creates invitation
7. User accepts invitation
8. Database validates:
   - ✅ User role is 'member'
   - ✅ Squad is provided (required for soldier)
9. User added to workspace_access as 'member'
10. User added to team_members with squad

### Managing Existing Member

1. Admin clicks "Manage" button next to member
2. ManageMemberSheet opens with member data
3. Admin sees current assignment
4. Admin selects new team/role/squad
5. Clicks "Save Changes"
6. Database validates:
   - ✅ User role is 'member'
   - ✅ Squad requirements met
7. Member updated in team_members table
8. UI refreshes to show new assignment

## Error Handling

### User-Friendly Messages

**Cannot assign non-member to team:**
```
"Only users with 'member' role can be assigned to teams. 
This user is admin."
```

**Squad required:**
```
"Soldiers must be assigned to a squad."
"Squad commanders must be assigned to a squad to command."
```

**Already in org:**
```
"User must be a member of the organization before 
being added to a team"
```

## Permissions

### Who Can Manage Members?

**Invite Members:**
- Owner ✅
- Admin ✅
- Instructor ❌
- Member ❌

**Manage Existing Members:**
- Owner ✅
- Admin ✅
- Instructor ❌ (can view only)
- Member ❌

**Team Commanders:**
- Can manage their own team members
- Cannot change organization roles

## Database Schema

```sql
-- Teams with squads
teams {
  id: uuid
  name: text
  squads: text[]  -- ["Alpha", "Bravo", "Charlie"]
  ...
}

-- Team members with squad assignment
team_members {
  team_id: uuid
  user_id: uuid
  role: text  -- commander, squad_commander, soldier
  details: jsonb  -- { squad_id: "Alpha" }
  ...
}

-- Workspace access (org membership)
workspace_access {
  org_workspace_id: uuid
  member_id: uuid
  role: text  -- owner, admin, instructor, member
  ...
}
```

## Benefits

1. ✅ **Flexible**: Manage members at any time, not just during invitation
2. ✅ **Secure**: Database-enforced constraints
3. ✅ **Elegant**: Beautiful, intuitive UI
4. ✅ **Complete**: Full CRUD operations on team membership
5. ✅ **Smart**: Shows available squads, allows creating new ones
6. ✅ **Clear**: Visual feedback for current state and changes
7. ✅ **Fast**: Optimized queries, minimal re-renders

## Testing Checklist

- [ ] Invite member with 'member' role to team with squad
- [ ] Try to invite admin to team (should show warning)
- [ ] Manage existing member - assign to team
- [ ] Manage existing member - change team
- [ ] Manage existing member - update role and squad
- [ ] Manage existing member - remove from team
- [ ] Select existing squad vs create new squad
- [ ] Try to assign soldier without squad (should show error)
- [ ] Verify squad chips show correctly
- [ ] Verify team badges show in member list
- [ ] Verify permissions (only owner/admin can manage)

## Next Steps

Optional enhancements:
1. Bulk member operations
2. Squad-based filtering in team view
3. Squad statistics dashboard
4. Member search/filter in management
5. Audit log for member changes

