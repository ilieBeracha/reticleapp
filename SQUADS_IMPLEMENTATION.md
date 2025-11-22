# Squad Management Implementation

## Overview
Elegant squad management system where squads are optional organizational units within teams. Squads are stored as a simple array on the team, and members can be assigned to squads.

## Database Changes

### Migration: `20251120150000_add_squads_and_member_constraint.sql`

1. **Added `squads` column to `teams` table**
   ```sql
   ALTER TABLE public.teams
   ADD COLUMN IF NOT EXISTS squads TEXT[] DEFAULT ARRAY[]::TEXT[];
   ```
   - Simple TEXT array (e.g. `["Alpha", "Bravo", "Charlie"]`)
   - Optional - can be empty or populated
   - Easy to query and manage

2. **Enforced member-only constraint**
   - Only users with `'member'` role can be added to teams
   - Admins, owners, and instructors cannot be team members
   - User must be in the org before being added to a team
   - Trigger: `enforce_team_member_workspace_role`

3. **Updated `create_team` RPC**
   - Now accepts `p_squads TEXT[]` parameter
   - Returns squads in the response

## TypeScript Types

### Updated `types/workspace.ts`

```typescript
export interface Team {
  id: string;
  workspace_owner_id: string;
  name: string;
  team_type?: TeamType | null;
  description?: string | null;
  squads?: string[];  // NEW: Array of squad names
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamMemberShip;
  details?: { squad_id?: string };  // Squad assignment
  joined_at: string;
}
```

## Services

### Updated `services/teamService.ts`

```typescript
export interface CreateTeamInput {
  workspace_type: 'personal' | 'org';
  workspace_owner_id?: string;
  org_workspace_id?: string;
  name: string;
  description?: string;
  squads?: string[];  // NEW: Optional squads
}

export interface UpdateTeamInput {
  team_id: string;
  name?: string;
  description?: string;
  squads?: string[];  // NEW: Update squads
}
```

## UI Components

### 1. CreateTeamSheet.tsx - Elegant Squad Creation

**Features:**
- ✅ Add squads while creating a team
- ✅ Visual squad chips with remove button
- ✅ Inline add squad input with + button
- ✅ Squads are optional
- ✅ Beautiful, clean UI

**UI Flow:**
1. Enter team name
2. Enter description (optional)
3. Add squads (optional):
   - Type squad name
   - Click + button or press Enter
   - Squad appears as a chip
   - Click X on chip to remove

**Visual Design:**
- Squad chips with shield icon
- Primary color theme
- Smooth interactions with haptic feedback
- Clear visual hierarchy

### 2. InviteMembersSheet.tsx - Smart Squad Selection

**Features:**
- ✅ Shows available squads from selected team as chips
- ✅ Click chip to select existing squad
- ✅ Or type new squad name
- ✅ Dynamic placeholder text
- ✅ Elegant horizontal scroll for squad chips

**UI Flow:**
1. Select team
2. Select team role
3. If soldier/squad_commander:
   - See available squads as clickable chips
   - Click to select, or
   - Type new squad name

**Visual Design:**
- Horizontal scrolling squad chips
- Selected squad highlighted in primary color
- Unselected squads in card color
- Shield icon for each squad
- Smooth selection feedback

## Key Features

### 1. **Flexible Squad Management**
- Squads defined at team level (not separate table)
- Easy to see what squads exist: `team.squads`
- Members reference squad by name in `details.squad_id`

### 2. **Member-Only Constraint**
- Database enforces that only 'member' role users can join teams
- Prevents admins/owners/instructors from being team members
- Clear error messages

### 3. **Elegant UX**
- Create squads on-the-fly when creating teams
- Select from existing squads when inviting
- Or create new squads during invitation
- Visual feedback with chips and icons

### 4. **Simple Data Model**
```
Team {
  squads: ["Alpha", "Bravo", "Charlie"]
}

TeamMember {
  details: { squad_id: "Alpha" }
}
```

## Usage Examples

### Creating a Team with Squads

```typescript
await createTeam({
  workspace_type: 'org',
  org_workspace_id: '...',
  name: 'Delta Force',
  description: 'Elite tactical unit',
  squads: ['Alpha', 'Bravo', 'Charlie']
});
```

### Inviting Member to Squad

```typescript
await createInvitation(
  orgWorkspaceId,
  'member',
  teamId,
  'soldier',
  { squad_id: 'Alpha' }
);
```

### Querying Squads

```typescript
// Get all squads in a team
const squads = team.squads || [];

// Get all members in a squad
const alphaMembers = teamMembers.filter(
  m => m.details?.squad_id === 'Alpha'
);

// Get unique squads from members (in case of new squads)
const usedSquads = [...new Set(
  teamMembers
    .map(m => m.details?.squad_id)
    .filter(Boolean)
)];
```

## Benefits

1. ✅ **Simple**: No complex tables, just an array
2. ✅ **Flexible**: Create squads on-demand
3. ✅ **Elegant**: Beautiful, intuitive UI
4. ✅ **Fast**: Easy queries, no joins needed
5. ✅ **Maintainable**: Clear data model
6. ✅ **Secure**: Database-enforced constraints

## Next Steps

To fully integrate squad management:

1. **Update ManageMemberSheet.tsx** - Show squad chips when assigning existing members
2. **Display squads in team cards** - Show squad breakdown in organization view
3. **Squad-based filtering** - Filter team members by squad
4. **Squad statistics** - Show member count per squad

## Testing

1. ✅ Create team with squads
2. ✅ Invite member to specific squad
3. ✅ Try to add admin to team (should fail)
4. ✅ Try to add non-member to team (should fail)
5. ✅ Select existing squad vs create new
6. ✅ Update team squads

