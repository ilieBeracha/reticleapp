# Organization Views by Role - Design Spec

## Overview
Different organization roles see different levels of information. This document outlines what each role should see and access.

---

## 🛡️ Owner / Admin View
**Access Level:** FULL

### What They See:
- ✅ Full organization dashboard
- ✅ All members (management + team members)
- ✅ All teams and their members
- ✅ Organization stats and analytics
- ✅ Invite/manage members
- ✅ Create/manage teams
- ✅ Assign members to teams

### UI Components:
- Stats: Total members, teams, unassigned
- Tabs: All Members | By Team | Unassigned
- Management section with all org members
- Team section with all teams

**Use Case:** Org administrators who need full visibility

---

## 👥 Regular Member (Team Member) View
**Access Level:** LIMITED - Team-Focused

### What They See:
- ✅ Organization name & their role
- ✅ **Their team(s) only** - full details
- ✅ **Their teammates** - profiles, roles, contact info
- ✅ Their team stats (sessions, training hours)
- ✅ Minimal org context (total members count, team count)
- ❌ NOT other org members outside their team
- ❌ NOT unassigned members
- ❌ NOT management/admin tools

### UI Components:
```
┌─────────────────────────────────────┐
│  Alpha Team                         │
│  Your Role: Sniper                  │
├─────────────────────────────────────┤
│  📊 Team Stats                      │
│  • 12 Members                        │
│  • 3 Squads                         │
│  • Part of "Acme Tactical" org     │
├─────────────────────────────────────┤
│  👥 Your Teammates                  │
│  [List of team members with roles]  │
├─────────────────────────────────────┤
│  📈 Team Activity                   │
│  [Team-specific sessions/training]  │
└─────────────────────────────────────┘
```

**Use Case:** Team members who need to collaborate within their team

---

## 📚 Instructor View
**Access Level:** MEDIUM - Training-Focused

### What They See:
- ✅ Organization overview
- ✅ All teams (to assign training)
- ✅ Team members they're instructing
- ✅ Training stats and progress
- ✅ Limited member management (training-related)
- ❌ NOT full admin controls
- ❌ NOT financial/sensitive org data

**Use Case:** Training coordinators who work across teams

---

## 🎨 Detailed UI Flows

### **Admin/Owner Flow:**
1. Opens org page → Sees full dashboard
2. Can switch tabs: All Members | By Team | Unassigned
3. Manages everyone and everything

### **Regular Member Flow:**
1. Opens org page → Redirected to "My Teams" view
2. If on 1 team → Shows that team directly
3. If on multiple teams → Shows team selector
4. Focused view of their team(s) only

---

## 🔐 Permission Matrix

| Feature | Owner | Admin | Instructor | Member |
|---------|-------|-------|------------|--------|
| See all org members | ✅ | ✅ | ❌ | ❌ |
| See own team members | ✅ | ✅ | ✅ | ✅ |
| See other teams | ✅ | ✅ | ✅ (view only) | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Create teams | ✅ | ✅ | ❌ | ❌ |
| Assign to teams | ✅ | ✅ | ❌ | ❌ |
| View org stats | ✅ | ✅ | ✅ (limited) | ✅ (minimal) |
| View team stats | ✅ | ✅ | ✅ | ✅ (own teams) |
| Message teammates | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Implementation Strategy

### Phase 1: Add Permission Checks
```typescript
// In organization.tsx, add role-based rendering
const showFullOrgView = permissions.role === 'owner' || permissions.role === 'admin';
const showTeamView = permissions.role === 'member';
const showInstructorView = permissions.role === 'instructor';
```

### Phase 2: Create "My Teams" Component
- New component for team member view
- Shows only teams they're assigned to
- Full team details, limited org context

### Phase 3: Filter Data by Role
```typescript
// Service layer filtering
export function getMemberVisibleData(workspaceMembers, currentUserId) {
  const currentMember = workspaceMembers.find(m => m.member_id === currentUserId);
  
  if (currentMember.role === 'member') {
    // Only return teammates from their teams
    return getTeammatesForMember(workspaceMembers, currentMember);
  }
  
  // Admins see everyone
  return workspaceMembers;
}
```

---

## 💡 Recommendations

### **For Best UX:**

1. **Members should see:**
   - Prominent "My Team" section
   - Minimal org header ("Part of XYZ Organization")
   - Team-focused navigation
   - Teammate directory
   - Team chat/collaboration tools

2. **Members should NOT see:**
   - Unassigned members list
   - Members from other teams
   - Admin management tools
   - Org-wide member directory

3. **Navigation Pattern:**
   ```
   Admin View:
   Organization → [All Members | By Team | Unassigned]
   
   Member View:
   My Team → [Team Overview | Teammates | Activity]
   ```

### **Information Architecture:**
```
Organization (Admin)
├── Dashboard (stats, overview)
├── All Members
├── Teams
│   ├── Team A (all members)
│   ├── Team B (all members)
│   └── Team C (all members)
└── Settings

My Team (Member)
├── Team Overview
├── My Teammates (only my team)
├── Team Activity
└── My Profile
```

---

## 🎯 Answer to Your Questions

### "Will they have access to organization?"
**Yes, but limited:**
- They see org name/branding
- Minimal org stats (team count, member count)
- Their role badge
- NOT full member list or management tools

### "Will they have just their team page separate from all?"
**Yes - focused "My Team" view:**
- Dedicated team page(s)
- Full visibility of their teammates
- Team-specific features
- Separate from org management

### "Will they see org minimal data and have access to their team within?"
**Yes - this is the BEST approach:**
- Top navigation shows org context
- Main view is team-focused
- Can't see members outside their team
- Can collaborate with teammates

---

## 🏗️ Technical Implementation

### Database Security:
```sql
-- RPC should filter based on role
CREATE FUNCTION get_my_visible_members(p_org_workspace_id uuid)
RETURNS TABLE (...) AS $$
BEGIN
  -- Check user's role
  IF user_role = 'member' THEN
    -- Return only teammates from user's teams
    RETURN QUERY SELECT ... WHERE team_id IN (user's teams);
  ELSE
    -- Return all members (admin view)
    RETURN QUERY SELECT ... all members;
  END IF;
END;
$$;
```

This ensures data security at the database level, not just UI hiding.

---

## Summary

**Recommended Approach: Hybrid Context-Aware View**

- **Admins:** Full org management dashboard (current implementation)
- **Members:** "My Team" focused view with minimal org context
- **Security:** Database-level filtering, not just UI
- **UX:** Clear, role-appropriate information
- **Privacy:** Members don't see irrelevant org data

Would you like me to implement this role-based view system?

