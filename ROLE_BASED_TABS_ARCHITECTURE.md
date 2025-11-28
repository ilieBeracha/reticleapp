# Role-Based Tab System - Complete Architecture

## 🎯 Overview

**Different roles see completely different tab structures** to match their responsibilities and workflows.

---

## 📱 Tab Layouts by Role

### **1. Admin Tabs** (Owner, Admin, Instructor)
```
┌──────────────────────────────────┐
│ [Overview] [Members] [Calendar]  │
└──────────────────────────────────┘
```

**Purpose:** Full organization management
- **Overview** → Org stats, recent activity, quick actions
- **Members** → All members, teams, assignments
- **Calendar** → Org-wide calendar, all events

**Who sees this:** `owner`, `admin`, `instructor`

---

### **2. Commander Tabs** (Team Commander)
```
┌──────────────────────────────────┐
│ [Team] [Organization] [Training] │
└──────────────────────────────────┘
```

**Purpose:** Team focus with minimal org awareness
- **Team** (index) → My team dashboard, members, squads
- **Organization** → Minimal org view (other teams read-only)
- **Training** (calendar) → Team-specific training calendar

**Who sees this:** `member` with `teamRole='commander'`

**Key Difference:**
- ✅ CAN manage own team
- ✅ CAN see org minimal view
- ❌ CANNOT manage other teams
- ❌ CANNOT see all org members

---

### **3. Team Member Tabs** (Squad Commander, Soldier)
```
┌──────────────────────────────────┐
│ [My Squad/Team] [Sessions] [Stats]│
└──────────────────────────────────┘
```

**Purpose:** Shooting-focused operational view
- **My Squad/Team** (index) → Squad/team overview
- **Sessions** (calendar) → Training sessions, qualifications
- **Stats** (organization) → Personal/squad performance

**Who sees this:** `member` with `teamRole='squad_commander'` or `'soldier'`

**Key Difference:**
- 🎯 **Completely different UX** - tactical/operational
- 🎯 **No org management** - focus on training
- 🎯 **Performance focused** - stats, progress, achievements
- 🎯 **Professional shooting app feel**

---

## 🗺️ Page Routing Per Role

### **index.tsx** (First Tab)

#### Admin/Instructor sees:
```typescript
<OrganizationOverview>
  - Organization stats
  - Quick actions (Start Session, Create Team)
  - Teams section
  - Recent sessions
</OrganizationOverview>
```

#### Team Commander sees:
```typescript
<TeamCommanderDashboard>
  - Team overview
  - My team members
  - Squad management
  - Team stats
</TeamCommanderDashboard>
```

#### Squad Commander sees:
```typescript
<SquadDashboard>
  - My squad overview
  - Squad members
  - Recent sessions
  - Squad performance
</SquadDashboard>
```

#### Soldier sees:
```typescript
<TeamMemberDashboard>
  - Team overview
  - My teammates
  - My upcoming sessions
  - My personal stats
</TeamMemberDashboard>
```

---

### **calendar.tsx** (Middle Tab)

#### Admin/Instructor sees:
```typescript
<OrganizationCalendar>
  - All org events
  - All team sessions
  - Create events
  - Manage calendar
</OrganizationCalendar>
```

#### Team Commander sees:
```typescript
<TeamTrainingCalendar>
  - My team's sessions
  - Schedule team training
  - Team event history
  - Attendance tracking
</TeamTrainingCalendar>
```

#### Squad Commander/Soldier sees:
```typescript
<TrainingSessionsView>
  - Upcoming sessions
  - My session history
  - Qualifications
  - Performance tracking
  - Join/register for sessions
</TrainingSessionsView>
```

---

### **organization.tsx** (Third Tab)

#### Admin/Instructor sees:
```typescript
<MemberManagement>
  - All members list
  - By team view
  - Unassigned view
  - Invite/manage members
  - Assign to teams
</MemberManagement>
```

#### Team Commander sees:
```typescript
<MinimalOrgView>
  - Org context (name, total members)
  - Other teams (read-only list)
  - My team (full management)
  - Cannot see unassigned
  - Cannot invite to org
</MinimalOrgView>
```

#### Squad Commander/Soldier sees:
```typescript
<PerformanceStats>
  - Personal stats
  - Squad/team rankings
  - Achievements
  - Progress tracking
  - Qualification status
</PerformanceStats>
```

---

## 🎨 Visual Design Per Role

### Admin Tabs
- **Color:** Primary blue (#007AFF)
- **Style:** Professional, management-focused
- **Tone:** Administrative, overview-heavy

### Commander Tabs
- **Color:** Accent teal (#5B7A8C)
- **Style:** Balanced - management + operational
- **Tone:** Leadership, team-focused

### Team Member Tabs
- **Color:** Tactical orange (#FF6B35)
- **Style:** Operational, action-focused
- **Tone:** Professional shooter, performance-driven

---

## 📊 Tab Label Comparison

| Role | Tab 1 | Tab 2 | Tab 3 |
|------|-------|-------|-------|
| Admin | Overview | Members | Calendar |
| Commander | Team | Organization | Training |
| Squad Commander | My Squad | Sessions | Stats |
| Soldier | Team | Sessions | Stats |

---

## 🔧 Implementation Details

### Layout Structure
```typescript
// _layout.tsx
<OrgRoleProvider>
  <OrganizationTabs />  // Routes to correct tab layout
</OrgRoleProvider>

// OrganizationTabs component
if (isAdmin) return <AdminTabs />;
if (isCommander) return <CommanderTabs />;
if (isTeamMember) return <TeamMemberTabs />;
return <NoTeamTabs />;
```

### Page Routing in Each File
```typescript
// index.tsx
export default function IndexPage() {
  const { orgRole, teamRole } = useOrgRole();
  
  if (orgRole === 'owner' || orgRole === 'admin' || orgRole === 'instructor') {
    return <OrgOverview />;
  }
  if (teamRole === 'commander') {
    return <TeamCommanderDashboard />;
  }
  if (teamRole === 'squad_commander') {
    return <SquadDashboard />;
  }
  return <TeamMemberView />;
}
```

---

## 🎯 Key Principles

### 1. **Role-Appropriate Interfaces**
- Admins see management tools
- Commanders see team leadership tools
- Team members see operational/performance tools

### 2. **Clear Separation**
- **NO mixing** of admin UI in team member views
- **NO management tools** for non-managers
- **Different visual language** per role

### 3. **Professional Execution**
- Team member tabs = **shooting app feel**
- Commander tabs = **team management feel**
- Admin tabs = **organization management feel**

### 4. **Information Architecture**
```
Admin → "I manage the organization"
Commander → "I lead my team"
Squad Commander → "I lead my squad + perform"
Soldier → "I train and perform"
```

---

## 🚀 Next Steps

### Immediate:
1. ✅ Tab layouts created (DONE)
2. 🔄 Update `index.tsx` for role routing
3. 🔄 Update `calendar.tsx` for role routing
4. 🔄 Update `organization.tsx` for role routing

### Phase 2:
- Create `TeamCommanderDashboard` component
- Create `SquadDashboard` component
- Create `TrainingSessionsView` component
- Create `PerformanceStats` component

### Phase 3:
- Commander team management features
- Squad commander squad management
- Performance tracking system
- Session join/registration flow

---

## 📝 Current State

✅ **Working:**
- Role detection via OrgRoleContext
- Dynamic tab layouts per role
- Proper separation between roles

🔄 **In Progress:**
- Page content routing per role
- Role-specific components
- Feature implementation

---

## 🎨 Summary

**The tab bar itself changes based on role:**

**Admin:** Management-focused tabs  
**Commander:** Hybrid (team + org awareness) tabs  
**Team Members:** Operational/shooting-focused tabs

**Clean separation, professional execution, role-appropriate UX!** 🎯

