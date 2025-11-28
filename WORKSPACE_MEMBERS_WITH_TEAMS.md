# Organization Members with Team Context - Implementation Guide

## Overview

This document explains the **optimized single-query solution** for fetching organization members with their complete team membership context. This approach eliminates N+1 query problems and provides all member data in one efficient database call.

## Architecture

### Database Layer (Migration)

**File:** `supabase/migrations/20251122000000_org_members_with_teams_optimized.sql`

The RPC function `get_org_workspace_members()` returns:
- ✅ Workspace access details
- ✅ Flattened profile information
- ✅ **Aggregated team memberships as JSONB array**
- ✅ Built-in security check (only org members can query)

**Key Features:**
- Single query execution
- Team data scoped to the specific organization
- Consistent ordering by team name
- Empty array for members without teams

### TypeScript Types

**File:** `types/workspace.ts`

```typescript
interface TeamMembership {
  team_id: string;
  team_name: string;
  team_role: TeamMemberShip;
  team_type: TeamType | null;
  squads?: string[] | null;
  joined_team_at: string;
}

interface WorkspaceMemberWithTeams {
  // Access info
  id: string;
  member_id: string;
  role: WorkspaceRole;
  joined_at: string;
  
  // Profile (flattened)
  profile_id: string;
  profile_email: string;
  profile_full_name: string | null;
  profile_avatar_url: string | null;
  
  // Team assignments
  teams: TeamMembership[];
}
```

### Service Layer

**File:** `services/workspaceService.ts`

**Primary Function:**
```typescript
getWorkspaceMembers(orgWorkspaceId: string): Promise<WorkspaceMemberWithTeams[]>
```

**Helper Utilities:**
- `getUnassignedMembers()` - Filter members without team assignments
- `groupMembersByTeam()` - Organize members by team
- `getMembersForTeam()` - Get all members on a specific team
- `getMemberTeamRole()` - Check member's role in a team
- `isMemberAssigned()` - Check if member has any team assignment

## Usage Examples

### 1. Basic: Fetch All Members

```typescript
import { getWorkspaceMembers } from '@/services/workspaceService';

const members = await getWorkspaceMembers(orgWorkspaceId);

// Each member has complete data:
members.forEach(member => {
  console.log(member.profile_full_name);
  console.log(`Org Role: ${member.role}`);
  console.log(`Teams: ${member.teams.length}`);
  
  member.teams.forEach(team => {
    console.log(`  - ${team.team_name} (${team.team_role})`);
  });
});
```

### 2. Display Members with Team Badges

```typescript
const MemberCard = ({ member }: { member: WorkspaceMemberWithTeams }) => {
  return (
    <div className="member-card">
      <Avatar url={member.profile_avatar_url} />
      <div>
        <h4>{member.profile_full_name}</h4>
        <p>{member.profile_email}</p>
        <span className="org-role">{member.role}</span>
      </div>
      
      {/* Team badges - no additional queries needed! */}
      <div className="team-badges">
        {member.teams.length === 0 ? (
          <span className="no-team">No team assigned</span>
        ) : (
          member.teams.map(team => (
            <span key={team.team_id} className="team-badge">
              {team.team_name} ({team.team_role})
            </span>
          ))
        )}
      </div>
    </div>
  );
};
```

### 3. Find Unassigned Members

```typescript
import { getUnassignedMembers } from '@/services/workspaceService';

const members = await getWorkspaceMembers(orgWorkspaceId);
const unassigned = getUnassignedMembers(members);

console.log(`${unassigned.length} members need team assignment`);
```

### 4. Group Members by Team

```typescript
import { groupMembersByTeam } from '@/services/workspaceService';

const members = await getWorkspaceMembers(orgWorkspaceId);
const teamGroups = groupMembersByTeam(members);

teamGroups.forEach(({ team, members }) => {
  console.log(`Team: ${team.team_name}`);
  console.log(`Members: ${members.length}`);
  
  members.forEach(member => {
    console.log(`  - ${member.profile_full_name} (${team.team_role})`);
  });
});
```

### 5. Multi-View UI Component

```typescript
const OrganizationMembersView = () => {
  const [members, setMembers] = useState<WorkspaceMemberWithTeams[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'by-team' | 'unassigned'>('all');
  
  useEffect(() => {
    loadMembers();
  }, [activeWorkspaceId]);

  const loadMembers = async () => {
    if (!activeWorkspaceId) return;
    const data = await getWorkspaceMembers(activeWorkspaceId);
    setMembers(data);
  };

  // Computed values - all client-side, no extra queries!
  const unassignedMembers = getUnassignedMembers(members);
  const membersByTeam = groupMembersByTeam(members);
  const assignedCount = members.filter(m => m.teams.length > 0).length;

  return (
    <div>
      {/* Stats Bar */}
      <div className="stats">
        <div>Total Members: {members.length}</div>
        <div>Assigned to Teams: {assignedCount}</div>
        <div>Unassigned: {unassignedMembers.length}</div>
      </div>

      {/* View Toggle */}
      <SegmentedControl value={viewMode} onChange={setViewMode}>
        <SegmentedControl.Item value="all">All Members</SegmentedControl.Item>
        <SegmentedControl.Item value="by-team">By Team</SegmentedControl.Item>
        <SegmentedControl.Item value="unassigned">
          Unassigned ({unassignedMembers.length})
        </SegmentedControl.Item>
      </SegmentedControl>

      {/* Conditional Rendering */}
      {viewMode === 'all' && (
        <MemberList members={members} />
      )}

      {viewMode === 'by-team' && (
        <TeamGroupedView 
          groups={membersByTeam} 
          unassigned={unassignedMembers} 
        />
      )}

      {viewMode === 'unassigned' && (
        <MemberList 
          members={unassignedMembers} 
          emptyMessage="All members are assigned! 🎉" 
        />
      )}
    </div>
  );
};
```

### 6. Search/Filter Members

```typescript
const [searchQuery, setSearchQuery] = useState('');

// All filtering is client-side - data is already loaded!
const filteredMembers = members.filter(member => {
  const nameMatch = member.profile_full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  const emailMatch = member.profile_email.toLowerCase().includes(searchQuery.toLowerCase());
  const teamMatch = member.teams.some(t => 
    t.team_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return nameMatch || emailMatch || teamMatch;
});
```

### 7. Check Team Membership

```typescript
import { getMemberTeamRole, isMemberAssigned } from '@/services/workspaceService';

// Check if member is on a specific team
const memberRole = getMemberTeamRole(member, targetTeamId);
if (memberRole) {
  console.log(`Member is a ${memberRole} on this team`);
} else {
  console.log('Member is not on this team');
}

// Check if member has any team assignment
if (!isMemberAssigned(member)) {
  // Show "Add to Team" prompt
}
```

## Performance Benefits

### Before (Multiple Queries - N+1 Problem)
```typescript
// ❌ BAD: Multiple database calls
const members = await getWorkspaceMembers(orgId);  // 1 query
for (const member of members) {
  const teams = await getTeamsForMember(member.id);  // N queries
}
// Total: 1 + N queries 😰
```

### After (Single Optimized Query)
```typescript
// ✅ GOOD: One database call
const members = await getWorkspaceMembers(orgId);  // 1 query, everything included
// Total: 1 query 🎉
```

**Impact:**
- 100 members: 101 queries → 1 query (99% reduction)
- Faster load times
- Reduced database load
- Better user experience

## Migration Path

### For New Code
Use the new `getWorkspaceMembers()` function directly:
```typescript
const members = await getWorkspaceMembers(orgId);
```

### For Existing Code
A legacy compatibility function is provided:
```typescript
// Old code still works
const members = await getWorkspaceMembersLegacy(orgId);
// Returns old format, but uses new optimized RPC under the hood
```

**Recommendation:** Migrate to the new format to take full advantage of team context.

## Best Practices

1. **Load Once, Use Everywhere**
   - Fetch members at the org/workspace level
   - Pass data down to child components
   - Avoid re-fetching for each view

2. **Client-Side Operations**
   - Filtering, sorting, grouping can all happen client-side
   - The data structure supports multiple views without re-querying

3. **Real-Time Updates**
   - When teams change, refetch members
   - Consider Supabase real-time subscriptions for live updates

4. **Error Handling**
   ```typescript
   try {
     const members = await getWorkspaceMembers(orgId);
   } catch (error) {
     if (error.message === 'Access denied to workspace') {
       // User doesn't have permission
     }
     // Handle other errors
   }
   ```

## Security

The RPC function includes built-in security:
- ✅ Only authenticated users can call it
- ✅ Only org members can view member list
- ✅ Team data is scoped to the specific organization
- ✅ No cross-org data leakage

## Testing

```typescript
describe('Workspace Members with Teams', () => {
  it('should fetch members with team context', async () => {
    const members = await getWorkspaceMembers(testOrgId);
    
    expect(members.length).toBeGreaterThan(0);
    expect(members[0]).toHaveProperty('teams');
    expect(Array.isArray(members[0].teams)).toBe(true);
  });
  
  it('should identify unassigned members', async () => {
    const members = await getWorkspaceMembers(testOrgId);
    const unassigned = getUnassignedMembers(members);
    
    unassigned.forEach(member => {
      expect(member.teams).toHaveLength(0);
    });
  });
  
  it('should group members by team', async () => {
    const members = await getWorkspaceMembers(testOrgId);
    const groups = groupMembersByTeam(members);
    
    groups.forEach(group => {
      expect(group.team).toBeDefined();
      expect(group.members.length).toBeGreaterThan(0);
    });
  });
});
```

## Summary

This solution provides:
- ✅ **Single-query efficiency** - No N+1 problems
- ✅ **Complete context** - Members + teams in one call
- ✅ **Flexible views** - All, by-team, unassigned without re-fetching
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Secure** - Built-in access control
- ✅ **Well-documented** - Clear types and helpers

The architecture enables building complex UIs with excellent performance and developer experience.

