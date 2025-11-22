# Complete Role-Based Navigation System

## 🎯 The Dual Hierarchy

### Level 1: Organization Role (Workspace Access)
- **Owner/Admin** → Full org management
- **Member** → Team access only

### Level 2: Team Role (Within Teams)
- **Commander** → Team leader, full team control
- **Squad Commander** → Squad leader, manage their squad
- **Soldier** → Regular team member

---

## 🗺️ Complete Navigation Map

### **Organization Owner/Admin**
```
Organization Dashboard
├── 📊 Overview Tab
│   ├── Organization stats
│   ├── Total members, teams, sessions
│   └── Recent activity
│
├── 👥 Members Tab
│   ├── All Members view
│   ├── By Team view
│   ├── Unassigned view
│   └── Member management (add, remove, assign)
│
├── 🏢 Teams Tab
│   ├── All teams list
│   ├── Create new team
│   ├── Manage team settings
│   └── Assign members to teams
│
├── 📈 Analytics Tab (future)
│   ├── Org-wide training stats
│   ├── Performance metrics
│   └── Activity reports
│
└── ⚙️ Settings Tab
    ├── Organization settings
    ├── Billing & plans
    └── Integrations
```

**What they can do:**
- ✅ See all members
- ✅ Create/delete teams
- ✅ Assign members to teams
- ✅ Promote/demote members
- ✅ Invite new members
- ✅ Access all training data
- ✅ Organization settings

---

### **Team Member → Commander Role**
```
My Team Dashboard
├── 📊 Team Overview Tab
│   ├── Team stats (members, squads, sessions)
│   ├── Team activity feed
│   └── Quick actions (schedule training, message team)
│
├── 👥 Team Members Tab
│   ├── All team members list
│   ├── Squad assignments
│   ├── Member roles within team
│   ├── ADD members (from org unassigned)
│   ├── REMOVE members from team
│   └── ASSIGN members to squads
│
├── 🎯 Squads Tab
│   ├── All squads in team
│   ├── Create new squad
│   ├── Manage squad members
│   └── Squad performance
│
├── 📅 Training Tab
│   ├── Team training sessions
│   ├── Create new session
│   ├── Session history
│   └── Team progress
│
└── 📈 Team Stats Tab
    ├── Team performance metrics
    ├── Individual progress
    └── Leaderboards
```

**What they can do:**
- ✅ See all team members
- ✅ Add members to team (from org)
- ✅ Remove members from team
- ✅ Assign members to squads
- ✅ Promote squad commanders
- ✅ Schedule team training
- ✅ View team stats
- ❌ Cannot see other teams
- ❌ Cannot access org management

---

### **Team Member → Squad Commander Role**
```
My Squad View
├── 📊 Squad Overview Tab
│   ├── Squad stats (members, sessions)
│   ├── Squad activity
│   └── My commander responsibilities
│
├── 👥 Squad Members Tab
│   ├── My squad members only
│   ├── Member performance
│   └── Communication tools
│
├── 📅 Training Tab
│   ├── Squad training sessions
│   ├── Schedule squad training
│   ├── Session attendance
│   └── Squad progress
│
└── 📈 Stats Tab
    ├── Squad performance
    ├── Individual progress
    └── My leadership stats
```

**What they can do:**
- ✅ See full team (read-only)
- ✅ Manage squad members
- ✅ Schedule squad training
- ✅ View squad stats
- ❌ Cannot add/remove team members
- ❌ Cannot manage other squads
- ❌ Cannot see other teams

---

### **Team Member → Soldier Role**
```
My Team View
├── 📊 Team Tab
│   ├── Team overview
│   ├── Teammates directory
│   ├── Squad assignment
│   └── Team activity
│
├── 📅 Training Tab
│   ├── Upcoming team training
│   ├── My training history
│   └── Session details
│
└── 📈 My Stats Tab
    ├── Personal performance
    ├── Training progress
    └── Achievements
```

**What they can do:**
- ✅ View team members
- ✅ View team stats
- ✅ Join training sessions
- ✅ Track personal progress
- ❌ Cannot manage anyone
- ❌ Cannot see other teams
- ❌ Read-only on team info

---

## 🎨 UI Layout Strategy

### **Navigation Pattern:**

#### For Org Owners/Admins:
```
Top Level: Organization Context
[Overview] [Members] [Teams] [Analytics] [Settings]
     ↓
Each tab shows org-wide data
```

#### For Team Commanders:
```
Top: Minimal Org Context
"Part of Acme Tactical Organization"

Main Level: Team Context
[Team Overview] [Members] [Squads] [Training] [Stats]
     ↓
Each tab shows team-specific data with management tools
```

#### For Squad Commanders:
```
Top: Team Context (minimal)
"Alpha Team"

Main Level: Squad Context + Team View
[My Squad] [Full Team] [Training] [Stats]
     ↓
Focus on squad, with read-only team view
```

#### For Soldiers:
```
Top: Team Context
"Alpha Team • Bravo Squad"

Main Level: Team View (read-only)
[Team] [Training] [My Stats]
     ↓
Consumption-focused, minimal management
```

---

## 🔐 Permission Matrix

| Action | Org Owner | Org Admin | Team Commander | Squad Commander | Soldier |
|--------|-----------|-----------|----------------|-----------------|---------|
| **Organization Level** |
| See all org members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite to org | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create teams | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete teams | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Team Level** |
| See team members | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add to team | ✅ | ✅ | ✅ | ❌ | ❌ |
| Remove from team | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create squads | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign to squads | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Squad Level** |
| See squad members | ✅ | ✅ | ✅ | ✅ (own) | ✅ (own) |
| Manage squad | ✅ | ✅ | ✅ | ✅ (own) | ❌ |
| **Training** |
| Schedule team training | ✅ | ✅ | ✅ | ❌ | ❌ |
| Schedule squad training | ✅ | ✅ | ✅ | ✅ (own) | ❌ |
| Join training | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📁 Proposed File Structure

```
app/(protected)/workspace/organization/
├── _layout.tsx                    # Route org role to correct view
├── index.tsx                      # Redirector based on role
│
├── admin/                         # Org Owner/Admin views
│   ├── _layout.tsx
│   ├── overview.tsx               # Dashboard
│   ├── members.tsx                # All members management
│   ├── teams.tsx                  # All teams management
│   ├── analytics.tsx              # Org analytics
│   └── settings.tsx               # Org settings
│
├── team/                          # Team member views (all team roles)
│   ├── _layout.tsx                # Route by team role
│   │
│   ├── commander/                 # Team Commander views
│   │   ├── index.tsx              # Team dashboard
│   │   ├── members.tsx            # Manage team members
│   │   ├── squads.tsx             # Manage squads
│   │   ├── training.tsx           # Team training
│   │   └── stats.tsx              # Team stats
│   │
│   ├── squad-commander/           # Squad Commander views
│   │   ├── index.tsx              # Squad dashboard
│   │   ├── squad.tsx              # My squad
│   │   ├── team.tsx               # Full team (read-only)
│   │   ├── training.tsx           # Squad training
│   │   └── stats.tsx              # Squad stats
│   │
│   └── soldier/                   # Soldier views
│       ├── index.tsx              # Team overview
│       ├── teammates.tsx          # Team directory
│       ├── training.tsx           # Training sessions
│       └── stats.tsx              # Personal stats
│
└── components/                    # Shared components
    ├── TeamHeader.tsx
    ├── MemberCard.tsx
    ├── SquadCard.tsx
    └── StatsCard.tsx
```

---

## 🚀 Implementation Plan

### Phase 1: Role Detection & Routing
```typescript
// _layout.tsx - Main router
export default function OrganizationLayout() {
  const permissions = useWorkspacePermissions();
  const myTeamRole = useMyTeamRole(); // Get role within team
  
  // Org admin → admin views
  if (permissions.role === 'owner' || permissions.role === 'admin') {
    return <AdminLayout />;
  }
  
  // Team member → route by team role
  if (permissions.role === 'member') {
    switch (myTeamRole) {
      case 'commander':
        return <CommanderLayout />;
      case 'squad_commander':
        return <SquadCommanderLayout />;
      case 'soldier':
        return <SoldierLayout />;
      default:
        return <NoTeamView />;
    }
  }
  
  return <NoAccessView />;
}
```

### Phase 2: Create Layouts for Each Role
Each layout defines the tabs and navigation for that role.

### Phase 3: Implement Role-Specific Views
Build the actual pages with appropriate data and actions.

---

## 💡 Key Design Decisions

### 1. **Context Awareness**
- Soldiers see: "Part of Alpha Team"
- Squad Commanders see: "Alpha Team → Bravo Squad"
- Commanders see: "Leading Alpha Team"
- Admins see: "Managing Acme Tactical"

### 2. **Progressive Disclosure**
- Only show management tools to those who can use them
- Soldiers see simplified, consumption-focused UI
- Commanders see rich management dashboards

### 3. **Consistent Navigation**
- Same tab pattern across roles
- Just different content and capabilities
- Easy to understand hierarchy

### 4. **Smart Defaults**
- Commanders land on team dashboard
- Squad commanders land on squad view
- Soldiers land on team overview
- Admins land on org dashboard

---

Would you like me to implement this complete system? I'll create:
1. ✅ Smart routing based on org role + team role
2. ✅ Layouts for each role type
3. ✅ Role-specific views with appropriate data/actions
4. ✅ Permission-aware components
5. ✅ Beautiful, role-appropriate UIs

This will give you a professional, scalable organization management system! 🎯

