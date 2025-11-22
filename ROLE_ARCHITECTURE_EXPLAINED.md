# 🎯 Role Architecture - Quick Reference

## The Confusion vs Reality

### ❌ What You Might Think (WRONG)
```
Organization
├─ User A (role: owner)
├─ User B (role: admin)
├─ User C (role: commander)  ← WRONG! Commander is not an org role
└─ User D (role: soldier)     ← WRONG! Soldier is not an org role
```

### ✅ How It Actually Works (CORRECT)
```
Organization
├─ User A (org role: owner)
│   └─ [manages org, cannot join teams]
│
├─ User B (org role: admin)
│   └─ [manages members & teams, cannot join teams]
│
├─ User C (org role: instructor)
│   └─ [views all teams, creates trainings, cannot join teams]
│
├─ User D (org role: member)
│   ├─ Team Alpha
│   │   └─ (team role: commander)  ← Team role is separate!
│   │
│   └─ [can join teams because org role is 'member']
│
└─ User E (org role: member)
    └─ Team Alpha
        └─ (team role: soldier)  ← Team role is separate!
```

## Two-Level System Explained

### Level 1: Organization Role (Profile Level)
**Where:** `profiles` table  
**Scope:** Entire organization  
**Question:** "What can I do in this organization?"

| Role | Can Manage Org? | Can Create Teams? | Can View All Teams? | Can Join Teams? |
|------|-----------------|-------------------|---------------------|-----------------|
| owner | ✅ | ✅ | ✅ | ❌ |
| admin | ⚠️ (not delete) | ✅ | ✅ | ❌ |
| instructor | ❌ | ❌ | ✅ | ❌ |
| member | ❌ | ❌ | ❌ | ✅ |

### Level 2: Team Role (Team Membership Level)
**Where:** `team_members` table  
**Scope:** Specific team  
**Question:** "What can I do in THIS team?"  
**Requirement:** Must have `member` org role

| Team Role | Manages Team? | Manages Squad? | Adds Sessions? | Needs Squad? |
|-----------|---------------|----------------|----------------|--------------|
| commander | ✅ | ✅ All | ✅ | ❌ |
| squad_commander | ❌ | ✅ Own | ✅ | ✅ Required |
| soldier | ❌ | ❌ | ✅ | ✅ Required |

## Real-World Scenarios

### Scenario 1: Organization Owner
```
John is the OWNER of "Tactical Training Inc"

Profile:
  org_role: owner ← Stored in profiles table
  
Capabilities:
  ✅ Delete organization
  ✅ Manage all settings
  ✅ Create teams
  ✅ Invite/remove members
  ✅ View all teams
  ❌ Cannot join teams (manages them instead)
  
Team Membership:
  None (owners don't join teams)
```

### Scenario 2: Team Commander (Member + Commander)
```
Sarah is a MEMBER of "Tactical Training Inc"
AND a COMMANDER of "Team Alpha"

Profile:
  org_role: member ← Stored in profiles table
  
Team Membership:
  team: Team Alpha
  team_role: commander ← Stored in team_members table
  
Org-Level Capabilities:
  ❌ Cannot create teams
  ❌ Cannot invite members
  ❌ Cannot view other teams
  ✅ Can add sessions
  
Team-Level Capabilities (Team Alpha only):
  ✅ Manage team members
  ✅ Create team trainings
  ✅ Manage all squads
  ✅ View team progress
```

### Scenario 3: Admin (Manages Teams)
```
Mike is an ADMIN of "Tactical Training Inc"

Profile:
  org_role: admin ← Stored in profiles table
  
Capabilities:
  ✅ Create teams
  ✅ Manage all members
  ✅ Assign members to teams
  ✅ View all teams
  ❌ Cannot join teams (manages them instead)
  ⚠️ Cannot delete org (only owner can)
  
Team Membership:
  None (admins manage teams but don't join them)
```

### Scenario 4: Instructor (Views Teams)
```
Lisa is an INSTRUCTOR of "Tactical Training Inc"

Profile:
  org_role: instructor ← Stored in profiles table
  
Capabilities:
  ✅ View all teams (read-only)
  ✅ Create trainings
  ✅ View all progress
  ❌ Cannot create teams
  ❌ Cannot manage members
  ❌ Cannot join teams
  
Team Membership:
  None (instructors observe but don't join)
```

## Key Insight: Why Two Levels?

### The Problem
If you tried to make "commander" an org role:
- ❓ Commander of WHICH team?
- ❓ Can one person be commander of multiple teams?
- ❓ What if they leave one team but not another?

### The Solution
Two separate role systems:
1. **Org role:** What you can do at the organization level
2. **Team role:** What you can do within a specific team

### Example
```
User: Alex

Organization: Police Academy
├─ Org Role: member
└─ Can join teams

Team A: SWAT
├─ Team Role: commander
└─ Manages SWAT team

Team B: Training Unit
├─ Team Role: soldier
└─ Regular member of Training

Result:
- Alex is a "member" of the org (org role)
- Alex is a "commander" in SWAT (team role)
- Alex is a "soldier" in Training (different team role)
```

## Data Storage

### profiles table (Org roles)
```sql
id          | user_id | org_id | role        
------------|---------|--------|-------------
profile-1   | user-a  | org-1  | owner       ← Org role
profile-2   | user-b  | org-1  | admin       ← Org role
profile-3   | user-c  | org-1  | instructor  ← Org role
profile-4   | user-d  | org-1  | member      ← Org role (can join teams)
```

### team_members table (Team roles)
```sql
team_id   | profile_id | role            | squad
----------|------------|-----------------|--------
team-a    | profile-4  | commander       | null
team-a    | profile-5  | squad_commander | alpha
team-a    | profile-6  | soldier         | alpha
team-b    | profile-4  | soldier         | bravo
```

Notice:
- `profile-4` has **org role: member** (in profiles table)
- `profile-4` has **team role: commander** in team-a (in team_members)
- `profile-4` has **team role: soldier** in team-b (different team role!)

## Updated Permissions for Your Requirements

Based on your requirements, here's how I've adjusted the permissions:

### Owner
✅ Can do everything

### Admin  
✅ Can do all  
❌ Except: Remove owner, Delete org

### Instructor
✅ Can view all teams in org  
❌ Cannot create teams  
❌ Cannot manage members

### Commander (team role for members)
✅ Can see his own team  
✅ Can create trainings for his team  
✅ Can manage his team members  
❌ Cannot see other teams

### Soldier (team role for members)
✅ Can add sessions to his team  
✅ Can view his own progress  
❌ Cannot manage team

## Hierarchical Inheritance

"All roles above can do below them"

### Organization Level
```
owner (level 4)
  └─ Can do everything admin can
      │
      admin (level 3)
        └─ Can do everything instructor can
            │
            instructor (level 2)
              └─ Can do everything member can
                  │
                  member (level 1)
```

### Team Level (for members only)
```
commander (level 3)
  └─ Can do everything squad_commander can
      │
      squad_commander (level 2)
        └─ Can do everything soldier can
            │
            soldier (level 1)
```

## Quick Decision Tree

### "Can I create a team?"
```
Check org role:
├─ owner? → ✅ YES
├─ admin? → ✅ YES
├─ instructor? → ❌ NO
└─ member? → ❌ NO
```

### "Can I join a team?"
```
Check org role:
├─ owner? → ❌ NO (you manage, not join)
├─ admin? → ❌ NO (you manage, not join)
├─ instructor? → ❌ NO (you observe, not join)
└─ member? → ✅ YES
```

### "Can I manage Team Alpha?"
```
Step 1: Check team membership
├─ Not in Team Alpha? → ❌ NO
└─ In Team Alpha?
    │
    Step 2: Check team role
    ├─ commander? → ✅ YES
    ├─ squad_commander? → ⚠️ Can manage own squad only
    └─ soldier? → ❌ NO
```

## Summary

**Your confusion was natural!** It seems like "commander" and "soldier" should be org-wide roles, but they're actually team-specific roles.

**The Key Insight:**
- **Org roles** = Organization-wide permissions (who manages what)
- **Team roles** = Team-specific permissions (who does what in THIS team)

**Why This Works:**
1. Clear separation of concerns
2. One person can have different roles in different teams
3. Admins manage teams without joining them
4. Members can join multiple teams with different roles
5. Database enforces constraints automatically

**Your Current System is Actually Perfect!** You just needed this documentation to understand it. 🎉


