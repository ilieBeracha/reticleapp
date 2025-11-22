# ✅ Simplified Team Membership Architecture

## What Changed

You were absolutely right! Since each profile is only ever in ONE team at a time, we simplified the architecture by removing the `team_members` junction table.

## Before (Complex) ❌

```sql
profiles {
  id, user_id, org_id, role
}

team_members {  ← Extra table!
  profile_id, team_id, role, squad_id
}
```

## After (Simple) ✅

```sql
profiles {
  id, user_id, org_id, 
  role (org role: owner/admin/instructor/member)
  team_id (FK to teams - nullable)
  team_role (commander/squad_commander/soldier - nullable)
  squad_id (squad assignment - nullable)
}
```

## Benefits

1. ✅ **One Less Table** - No more team_members table
2. ✅ **Simpler Queries** - Direct relationship through FK
3. ✅ **Cleaner API** - Team info is part of profile
4. ✅ **Makes Sense** - Aligns with profile-based architecture
5. ✅ **Better Performance** - No junction table joins

## Key Constraints

### 1. Only Members Can Join Teams
```sql
CHECK (
  (team_id IS NULL) OR  
  (team_id IS NOT NULL AND role = 'member')
)
```
- Owners, admins, instructors manage teams but don't join them
- Only users with 'member' org role can be in teams

### 2. Squad Requirements
```sql
CHECK (
  (team_role = 'commander') OR  -- No squad needed
  (team_role IN ('soldier', 'squad_commander') AND squad_id IS NOT NULL)
)
```
- Commanders lead the whole team (no squad)
- Soldiers and squad commanders MUST have squad

### 3. One Commander Per Team
```sql
CREATE UNIQUE INDEX profiles_one_commander_per_team 
ON profiles(team_id) WHERE team_role = 'commander';
```
- Each team can only have one commander
- Enforced at database level

## Updated Data Model

```
┌─────────────────────────────────────┐
│           Organization              │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Profile                      │ │
│  │  ├─ org_role: member          │ │
│  │  ├─ team_id: team-alpha ─────┼─┼──┐
│  │  ├─ team_role: commander     │ │  │
│  │  └─ squad_id: null            │ │  │
│  └───────────────────────────────┘ │  │
│                                     │  │
│  ┌───────────────────────────────┐ │  │
│  │  Profile                      │ │  │
│  │  ├─ org_role: member          │ │  │
│  │  ├─ team_id: team-alpha ─────┼─┼──┤
│  │  ├─ team_role: soldier       │ │  │
│  │  └─ squad_id: "alpha"        │ │  │
│  └───────────────────────────────┘ │  │
│                                     │  │
│  ┌───────────────────────────────┐ │  │
│  │  Team Alpha                   │◄┼──┘
│  │  ├─ name: "Alpha Team"        │ │
│  │  ├─ squads: ["alpha","bravo"] │ │
│  │  └─ Get members via profiles  │ │
│  │     WHERE team_id = this.id   │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## How To Use

### Get User's Team Role (Automatic!)

```typescript
import { useRolePermissions } from '@/hooks/useRolePermissions';

function MyComponent() {
  // Team role is automatically read from activeProfile!
  const { team, roles } = useRolePermissions();
  
  console.log(roles.team); // 'commander', 'soldier', etc (or null)
  
  if (team?.canManageTeam) {
    return <ManageTeamButton />;
  }
}
```

No need to pass `teamRole` parameter anymore - it's read from the profile!

### Get Team Members

```typescript
// Get all members of a team
const teamMembers = await supabase
  .from('profiles')
  .select('*')
  .eq('team_id', teamId)
  .eq('status', 'active');
```

### Assign Member to Team

```typescript
// Simply update the profile
await supabase
  .from('profiles')
  .update({
    team_id: 'team-alpha-id',
    team_role: 'soldier',
    squad_id: 'alpha'
  })
  .eq('id', profileId);
```

### Remove from Team

```typescript
// Clear team fields
await supabase
  .from('profiles')
  .update({
    team_id: null,
    team_role: null,
    squad_id: null
  })
  .eq('id', profileId);
```

### Get Team Commander

```typescript
// Find the commander
const commander = await supabase
  .from('profiles')
  .select('*')
  .eq('team_id', teamId)
  .eq('team_role', 'commander')
  .single();
```

## Migration Steps

1. **Backup your data** (if in production)

2. **Run the migration**:
```bash
supabase migration up
```

3. **Test the changes**:
   - Create a profile
   - Assign to team
   - Check constraints work
   - Verify queries

## What Got Removed

- ❌ `team_members` table
- ❌ `team_members` RLS policies
- ❌ Complex many-to-many queries
- ❌ Need to pass `teamRole` to `useRolePermissions()`

## What Got Added

- ✅ `profiles.team_id` column (FK)
- ✅ `profiles.team_role` column
- ✅ `profiles.squad_id` column
- ✅ Database constraints
- ✅ Automatic team role detection

## Important Notes

### ⚠️ This Simplification Assumes:

1. ✅ Each profile is in **at most ONE team** at a time
2. ✅ If they switch teams, they **leave** the old team
3. ✅ No need for team membership history
4. ✅ No cross-team assignments

### If You Later Need Multiple Teams:

You'd need to:
1. Create a `team_memberships` table
2. Move team_id, team_role, squad_id there
3. Update queries and API

But based on your use case, you won't need that! 🎉

## Examples

### User Workflow

```typescript
// 1. User joins org as member
Profile created: {
  role: 'member',
  team_id: null,
  team_role: null
}

// 2. Admin assigns to team
Update profile: {
  team_id: 'team-alpha',
  team_role: 'soldier',
  squad_id: 'bravo'
}

// 3. Promote to commander
Update profile: {
  team_id: 'team-alpha',
  team_role: 'commander',
  squad_id: null  // Commanders don't have squads
}

// 4. Transfer to different team
Update profile: {
  team_id: 'team-bravo',
  team_role: 'soldier',
  squad_id: 'charlie'
}
```

## Updated Role System

### Org Roles (profiles.role)
- `owner` - Manages entire org
- `admin` - Manages members & teams
- `instructor` - Views teams, creates trainings
- `member` - Can join teams

### Team Roles (profiles.team_role)
- `commander` - Leads the team
- `squad_commander` - Leads a squad
- `soldier` - Regular team member

## Summary

You were right to question the complexity! For your use case (one team per person), this simplified architecture is:

- ✅ Easier to understand
- ✅ Simpler to query
- ✅ Better performance
- ✅ Perfectly aligned with profile-based system

The many-to-many complexity was unnecessary for your requirements. Good catch! 🎯

---

**Status:** ✅ Migration ready to run
**Breaking Changes:** Yes - removes team_members table
**Data Loss Risk:** Only if profiles are in multiple teams (which won't happen in your case)


