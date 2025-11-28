# Visual Tab System by Role

## 👑 Admin/Owner/Instructor

```
┌──────────────────────────────────────────────┐
│          ORGANIZATION DASHBOARD              │
├──────────────────────────────────────────────┤
│                                              │
│  Tab Bar (Blue Theme):                       │
│  📊 Overview  │  👥 Members  │  📅 Calendar  │
│      ↑                                        │
│   (Active)                                    │
└──────────────────────────────────────────────┘

OVERVIEW TAB:
- Organization stats
- Quick actions (Start Session, Create Team)
- All teams list
- Recent sessions
- Full management controls

MEMBERS TAB:
- All members (management + team members)
- Team assignments
- Invite new members
- Manage roles
- Unassigned members

CALENDAR TAB:
- Organization-wide calendar
- All team sessions
- Create events
- Manage schedules
```

---

## ⭐ Team Commander

```
┌──────────────────────────────────────────────┐
│          MY TEAM COMMAND CENTER              │
├──────────────────────────────────────────────┤
│                                              │
│  Tab Bar (Teal Theme):                       │
│  👥 Team  │  🏢 Organization  │  📅 Training │
│      ↑                                        │
│   (Active)                                    │
└──────────────────────────────────────────────┘

TEAM TAB (Primary Focus):
- My team dashboard
- Team members list
- Squad management
- Add/remove members
- Assign to squads
- Team performance

ORGANIZATION TAB (Minimal View):
- Org name and context
- Other teams (read-only)
- Total members count
- Cannot manage org
- Cannot see unassigned

TRAINING TAB:
- Team training calendar
- Schedule sessions
- Team attendance
- Training history
```

---

## 🛡️ Squad Commander

```
┌──────────────────────────────────────────────┐
│          MY SQUAD & PERFORMANCE              │
├──────────────────────────────────────────────┤
│                                              │
│  Tab Bar (Orange Theme - Tactical):          │
│  🛡️ My Squad  │  ⏰ Sessions  │  📊 Stats   │
│       ↑                                       │
│    (Active)                                   │
└──────────────────────────────────────────────┘

MY SQUAD TAB:
- Squad overview
- My squad members
- Squad assignments
- Communication
- Squad leadership tools

SESSIONS TAB:
- Upcoming training sessions
- My session history
- Register for sessions
- Session performance
- Qualifications

STATS TAB:
- Squad performance
- Personal stats
- Squad rankings
- Achievements
- Progress tracking
```

---

## 🎯 Soldier

```
┌──────────────────────────────────────────────┐
│          MY TEAM & TRAINING                  │
├──────────────────────────────────────────────┤
│                                              │
│  Tab Bar (Orange Theme - Operational):       │
│  👥 Team  │  ⏰ Sessions  │  📊 Stats        │
│     ↑                                         │
│  (Active)                                     │
└──────────────────────────────────────────────┘

TEAM TAB:
- Team overview
- My teammates
- Squad assignment
- Team activity
- Communication

SESSIONS TAB:
- Upcoming sessions
- My training history
- Join sessions
- Session details
- Attendance

STATS TAB:
- Personal performance
- My achievements
- Progress tracking
- Qualification status
- Personal goals
```

---

## 📊 Side-by-Side Comparison

| Feature | Admin | Commander | Squad Cmdr | Soldier |
|---------|-------|-----------|------------|---------|
| **Tab 1** | Overview | My Team | My Squad | Team |
| **Tab 2** | Members | Organization | Sessions | Sessions |
| **Tab 3** | Calendar | Training | Stats | Stats |
| **Theme Color** | Blue | Teal | Orange | Orange |
| **Focus** | Org Mgmt | Team Lead | Squad Lead | Performance |
| **Org View** | Full | Minimal | None | None |
| **Team View** | All Teams | Own Team | Own Squad | Own Team |
| **Management** | Full | Team Only | Squad Only | None |

---

## 🎨 Visual Hierarchy

### Admin Tabs
```
┌─────────────────┐
│   📊 Overview   │  ← Full org dashboard
├─────────────────┤
│   👥 Members    │  ← All members management
├─────────────────┤
│   📅 Calendar   │  ← Org-wide calendar
└─────────────────┘
Primary: Management
Secondary: Overview
```

### Commander Tabs
```
┌─────────────────┐
│   👥 Team       │  ← MY team (primary focus)
├─────────────────┤
│   🏢 Org        │  ← Context only
├─────────────────┤
│   📅 Training   │  ← Team training
└─────────────────┘
Primary: Team
Secondary: Training
Tertiary: Org context
```

### Team Member Tabs
```
┌─────────────────┐
│   🛡️/👥 Unit    │  ← My squad/team
├─────────────────┤
│   ⏰ Sessions   │  ← Training sessions
├─────────────────┤
│   📊 Stats      │  ← Performance
└─────────────────┘
Primary: Performance
Secondary: Training
Tertiary: Unit info
```

---

## 🔄 Navigation Flow Examples

### Admin navigates:
1. Opens org → Sees "Overview" tab
2. Checks members → Switches to "Members" tab
3. Schedules event → Switches to "Calendar" tab
**All tabs = management tools**

### Commander navigates:
1. Opens org → Sees "Team" tab (auto-focus on their team)
2. Checks org context → Switches to "Organization" tab (read-only)
3. Schedules training → Switches to "Training" tab
**Primary tab = team management**

### Soldier navigates:
1. Opens org → Sees "Team" tab (their team info)
2. Checks sessions → Switches to "Sessions" tab
3. Reviews progress → Switches to "Stats" tab
**All tabs = operational/performance**

---

## 💡 Key Design Decisions

### 1. **Tab Count**: Always 3
- Consistent across all roles
- Easy to navigate
- Not overwhelming

### 2. **Tab Order Logic**:
- **Tab 1** = Primary focus (most used)
- **Tab 2** = Context/support
- **Tab 3** = Secondary focus

### 3. **Visual Distinction**:
- **Admin** = Professional blue (management)
- **Commander** = Confident teal (leadership)
- **Team Members** = Tactical orange (operational)

### 4. **Label Clarity**:
- Clear, role-appropriate language
- No confusion about purpose
- Matches user's mental model

---

## ✨ Implementation Summary

✅ **Complete separation** - No shared UI between roles  
✅ **Role-appropriate naming** - Labels match responsibilities  
✅ **Visual hierarchy** - Color coding by role type  
✅ **Professional execution** - Each role feels purpose-built  

**The tab bar itself adapts to the user's role!** 🎯

