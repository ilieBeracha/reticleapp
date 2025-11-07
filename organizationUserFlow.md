SYSTEM NOTE (Task Mode – not permanent rules):
Use the following document as context and produce concrete design and implementation solutions.
Output only a single Markdown file called `organization_ux_solution.md` that includes:
1. Summary of core UX problems (short)
2. Actionable design + technical solutions
3. Implementation sketches or React/Expo snippets
4. Expected UX impact metrics
Do not rewrite or restate the document; build from it.


# Organization System - User Experience Flow

**Complete User Journey Analysis with UX/UI Improvement Recommendations**

---

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [User Modes](#user-modes)
3. [User Journey Maps](#user-journey-maps)
4. [Key User Flows](#key-user-flows)
5. [Current UX Problems](#current-ux-problems)
6. [Improvement Recommendations](#improvement-recommendations)
7. [Visual Mockup Suggestions](#visual-mockup-suggestions)

---

## System Overview

### What Is This System?

The Reticle app has a **dual-mode** organization system that allows users to work in two distinct contexts:

1. **Personal Workspace** - Individual user's private data
2. **Organization Mode** - Shared team/unit data with hierarchical structure

Think of it like:
- **Google Drive** personal files vs. **Team Drive**
- **Slack** DMs vs. **Workspace channels**
- **Notion** personal pages vs. **Team workspace**

### Core Concepts

#### Organizations (Orgs)
Military-style hierarchical units (Battalion → Company → Platoon → Squad)

- **Root Organizations** (top level) - No parent, like "1st Battalion"
- **Child Organizations** (nested) - Have parents, like "Alpha Company" under "1st Battalion"
- Maximum **5 levels deep**
- Maximum **3 children per organization**

#### Roles

Users have roles that determine permissions:

| Role | View Data | Edit Content | Invite Members | Manage Org | Delete Org |
|------|-----------|--------------|----------------|------------|------------|
| **Commander** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Member** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |

**Special Permission:**
- **Root Commander** = Commander of the ROOT (top-level) org
  - Has full access to ENTIRE tree (all descendants)
  - Can invite to any org in tree
  - Can manage weapons, global settings

#### Hierarchy Structure

```
🏛️ 1st Battalion (Root) ← User is COMMANDER
   ├── 🏢 Alpha Company (Child) ← User can see this
   │   ├── 👥 1st Platoon (Grandchild)
   │   ├── 👥 2nd Platoon
   │   └── 👥 3rd Platoon
   ├── 🏢 Bravo Company
   └── 🏢 Charlie Company
```

If you're **Root Commander of 1st Battalion**, you control the entire tree.  
If you're **Local Commander of Alpha Company**, you only control Alpha Company and its children.

---

## User Modes

### Mode 1: Personal Workspace

**What it is:**
- User's private, individual data
- Not shared with anyone
- No organization context

**What users can do:**
- ✅ Create personal training sessions
- ✅ Track personal stats
- ✅ Manage personal loadouts/weapons
- ❌ Cannot invite others
- ❌ Cannot see team data

**Visual Indicator:**
- Header shows: "👤 [User Name] (Personal)"
- Organization switcher: "Personal Workspace" option

---

### Mode 2: Organization Mode

**What it is:**
- Shared team/unit workspace
- Data visible to all members
- Role-based permissions

**What users can do:**
Depends on role:

**Commander:**
- ✅ Everything Members can do
- ✅ Invite/remove members
- ✅ Edit organization settings
- ✅ Create child organizations
- ✅ Delete organization
- ✅ Manage weapons (if Root Commander)

**Member:**
- ✅ Create/edit training sessions
- ✅ View organization data
- ✅ Participate in team activities
- ❌ Cannot manage organization
- ❌ Cannot invite members

**Viewer:**
- ✅ View organization data only
- ❌ Cannot create/edit anything

**Visual Indicator:**
- Header shows: "🏛️ [Organization Name]"
- Badge shows role: "COMMANDER" / "MEMBER" / "VIEWER"
- Breadcrumb shows hierarchy: "Battalion → Company → Platoon"

---

## User Journey Maps

### Journey 1: First-Time User

```
📱 User opens app
    ↓
🔐 Signs in with Google/Apple
    ↓
📝 Completes profile setup
    ↓
🎯 Lands on HOME SCREEN
    │
    ├─ [No organizations yet]
    │   - Sees "Personal Workspace" mode
    │   - Can create sessions for themselves
    │   - Button: "+ Create Organization"
    │
    └─ Next steps:
        A) Stay in personal mode (solo training)
        B) Create root organization (become commander)
        C) Wait for invitation (join existing org)
```

**Current UX Issues:**
- ❌ Not clear that "Personal" vs "Organization" mode exists
- ❌ No onboarding explaining the system
- ❌ User might create personal sessions, then can't move them to org

---

### Journey 2: Creating First Organization

```
🏠 User on Home Screen (Personal Mode)
    ↓
👆 Taps "Organization Switcher" button (header)
    ↓
📋 Bottom sheet appears:
    ├─ "👤 [User] (Personal)" [✓ Currently Active]
    ├─ [Empty list - no orgs yet]
    └─ Button: "+ Create Organization"
    ↓
👆 Taps "+ Create Organization"
    ↓
📝 Modal appears: "Create Organization"
    ├─ Name: [Input] "1st Battalion"
    ├─ Type: [Input] "Battalion"
    └─ Description: [Optional Input]
    ↓
✅ Taps "Create"
    ↓
⏳ Loading overlay with animation
    ↓
🎉 Success! App switches to new organization
    ↓
🏠 Home Screen (Now in "1st Battalion" context)
    - Header shows: "🏛️ 1st Battalion"
    - Badge: "COMMANDER"
    - All new data saves to this org
```

**Current UX Issues:**
- ✅ Smooth flow - works well
- ⚠️ Animation delay feels long (full app reset)
- ❌ No explanation of what happens after creation
- ❌ User doesn't know they can switch back to Personal

---

### Journey 3: Switching Between Organizations

```
🏠 User on Home Screen (in "Alpha Company")
    ↓
👆 Taps "Organization Switcher" button
    ↓
📋 Bottom sheet appears:
    ├─ "👤 John Doe (Personal)"
    ├─ "🏛️ 1st Battalion" [COMMANDER]
    ├─ "🏛️ 2nd Battalion" [MEMBER]
    └─ "+ Create Organization"
    ↓
👆 Taps "1st Battalion"
    ↓
⏳ Fullscreen overlay with spinner:
    "Switching to 1st Battalion..."
    - 3 animated rings spinning
    - Pulsing center icon
    - Takes ~400-600ms minimum
    ↓
🏠 Home Screen (Now in "1st Battalion" context)
    - Data completely refreshes
    - Sessions refetch
    - UI resets to top
```

**Current UX Issues:**
- ❌ **MAJOR**: Only shows ROOT organizations in switcher
  - If user is member of "Alpha Company" (child org), they can't directly switch to it
  - Must switch to "1st Battalion" first, then navigate down
- ❌ Heavy animation every time (feels slow)
- ❌ Loses scroll position
- ❌ All data refetches (even if unchanged)
- ❌ No visual preview of org hierarchy

---

### Journey 4: Navigating Hierarchy (Drilling Down)

**Current Flow:**

```
🏠 User in "1st Battalion" (Root)
    ↓
🗺️ Wants to work in "Alpha Company" (child org)
    ↓
Option A: Use "Manage" tab
    ├─ Go to "Manage" tab
    ├─ See "Organization Flow Builder"
    ├─ See list of child orgs
    └─ Tap "Alpha Company" → Switches context
    
Option B: Use "Settings" (if available)
    ├─ Go to Settings
    ├─ Navigate org hierarchy
    └─ Select child org

Option C: Use org breadcrumb (if on manage screen)
    └─ Tap child org name → Switches

❌ NO QUICK WAY TO JUMP BETWEEN ORGS
```

**Current UX Issues:**
- ❌ **CRITICAL**: Can't see full org list at once
- ❌ No breadcrumb navigation on main screens
- ❌ Must go to "Manage" tab to navigate hierarchy
- ❌ Each switch triggers full app context change
- ❌ No "recent orgs" or favorites

---

### Journey 5: Inviting Team Members

```
🏠 Commander on Home Screen (in "Alpha Company")
    ↓
⚙️ Goes to "Manage" tab (or header action)
    ↓
📋 Sees organization management screen:
    ├─ Org info card
    ├─ Members list
    └─ Button: "+ Invite Members"
    ↓
👆 Taps "Invite Members"
    ↓
📝 Modal appears: "Invite Members"
    ├─ Email: [Input]
    ├─ Role: [Picker] Commander / Member / Viewer
    └─ Button: "Send Invitation"
    ↓
✅ Invitation sent via email
    ↓
📧 Invitee receives email with magic link
    ↓
[INVITEE] Taps link
    ↓
📱 Opens app (or web)
    ↓
🎯 If not signed in: Sign in flow
    ↓
✅ Auto-joins organization
    ↓
🎉 Success screen: "You've joined [Org Name]"
```

**Current UX Issues:**
- ✅ Flow works well
- ⚠️ Only Root Commanders can invite to ANY org in tree
- ⚠️ Local Commanders can only invite to their org
- ❌ Not clear what permissions each role has during invite
- ❌ No bulk invite (must invite one by one)
- ❌ No invite history or pending invites list

---

### Journey 6: Creating Child Organization

```
🏠 Commander in "1st Battalion" (Root org)
    ↓
⚙️ Goes to "Manage" tab
    ↓
📋 Organization Flow Builder screen:
    ├─ Shows "1st Battalion" (selected)
    ├─ Shows children (if any)
    └─ Button: "+ Add Child Organization"
    ↓
👆 Taps "+ Add Child Organization"
    ↓
📝 Modal appears: "Create Child Organization"
    ├─ Name: [Input] "Alpha Company"
    ├─ Type: [Input] "Company"
    ├─ Description: [Optional]
    └─ Shows: "Parent: 1st Battalion"
    ↓
✅ Taps "Create"
    ↓
🎉 Child org created
    ↓
📋 Back to Org Flow Builder
    - Now shows "Alpha Company" under "1st Battalion"
    - User can tap it to switch context
```

**Current UX Issues:**
- ✅ Flow works well
- ⚠️ Only works if user is already in PARENT org
  - Can't create child for "Alpha Company" while viewing "1st Battalion"
  - Must switch to "Alpha Company" first
- ❌ No visual preview of hierarchy limits (5 levels, 3 children)
- ❌ Hard to see full tree structure at once
- ❌ No drag-and-drop reordering or restructuring

---

## Key User Flows

### Flow 1: Daily Training Session Creation

**Scenario:** User wants to log a shooting session

```
A) PERSONAL MODE:
   🏠 Home → ⊕ Create Session → Fill form → Save
   ✅ Session saved to personal workspace
   ✅ Only user can see it

B) ORGANIZATION MODE:
   🏠 Home (in "Alpha Company") → ⊕ Create Session → Fill form → Save
   ✅ Session saved to "Alpha Company"
   ✅ All members of "Alpha Company" can see it
   ✅ Root commanders of "1st Battalion" can also see it
```

**Current UX Issue:**
- ❌ Not visually clear which mode you're in when creating
- ❌ Can't choose to create in different org without switching first
- ❌ Can't move sessions between personal/org after creation

---

### Flow 2: Viewing Team Stats

**Scenario:** Commander wants to see team performance

```
🏠 Home (in "Alpha Company")
    ↓
📊 "Stats" tab
    ├─ Shows aggregate data for "Alpha Company"
    ├─ Can filter by member
    ├─ Can see trends over time
    └─ Export reports

❌ Current Issues:
   - Can't compare across orgs (e.g., Alpha vs Bravo Company)
   - Can't see individual member details (privacy?)
   - No drill-down to session details
```

---

### Flow 3: Managing Permissions

**Scenario:** Commander wants to promote member to commander

```
⚙️ Manage tab (in "Alpha Company")
    ↓
👥 Members section
    ↓
👆 Tap member name
    ↓
📋 Member details popup:
    ├─ Name
    ├─ Email
    ├─ Current role: "MEMBER"
    └─ Actions: [Change Role] [Remove]
    ↓
👆 Taps "Change Role"
    ↓
🎛️ Picker: Commander / Member / Viewer
    ↓
✅ Confirms → Member promoted
```

**Current UX Issues:**
- ✅ Flow works well
- ❌ No explanation of what each role can do
- ❌ No warning about consequences (e.g., promoting to commander gives full access)
- ❌ No audit log of permission changes

---

## Current UX Problems

### 🚨 Critical Issues

#### Problem 1: Organization Switcher Shows Only Root Orgs

**What happens:**
User is member of these orgs:
- 1st Battalion (Root) - COMMANDER
- Alpha Company (Child of 1st Battalion) - COMMANDER
- 2nd Battalion (Root) - MEMBER
- Bravo Company (Child of 2nd Battalion) - VIEWER

**Organization Switcher shows:**
```
✅ 1st Battalion [COMMANDER]
✅ 2nd Battalion [MEMBER]
❌ Alpha Company (hidden!)
❌ Bravo Company (hidden!)
```

**Why this is bad:**
- User can't quickly jump to "Alpha Company"
- Must switch to "1st Battalion" → navigate to "Alpha Company"
- Extra steps for common task
- User might forget they have access to child orgs

**Impact:** High frustration, extra taps, confusion

---

#### Problem 2: Heavy Context Switching

**What happens:**
Every organization switch triggers:
1. Full-screen overlay animation (400-600ms minimum)
2. Reset all stores (sessions, stats, etc.)
3. Refetch ALL data
4. Lose scroll position
5. Reset navigation stack

**Why this is bad:**
- Feels slow even with fast network
- Breaks user's mental model (feels like app restart)
- Can't quickly peek at other org's data
- Discourages switching (users stay in one org)

**Impact:** Slows down workflows, reduces exploration

---

#### Problem 3: No Visual Hierarchy Navigation

**What happens:**
User in "1st Platoon" (3 levels deep):
- No breadcrumb showing: "1st Battalion → Alpha Company → 1st Platoon"
- No quick way to go up one level
- Must go to "Manage" tab to see hierarchy

**Why this is bad:**
- User gets lost in deep hierarchies
- Can't visualize position in tree
- No quick parent/sibling navigation
- Hierarchy feels like a maze

**Impact:** Confusion, wasted time, errors

---

### ⚠️ Medium Issues

#### Problem 4: Unclear Personal vs Organization Mode

**What happens:**
- No persistent visual indicator of current mode
- Header shows org name, but easy to miss
- When creating data, unclear where it's being saved

**Why this is bad:**
- User might create in wrong context
- Can't easily tell if viewing personal or org data
- Mode switch not obvious

**Impact:** Data in wrong place, confusion

---

#### Problem 5: No Org Discovery/Browse

**What happens:**
- User doesn't know what orgs exist
- Can't see full tree structure
- Can't explore hierarchy without switching

**Why this is bad:**
- Hard to understand organization structure
- Can't plan where to create child orgs
- Can't see what teammates have access to

**Impact:** Poor understanding, mistakes

---

#### Problem 6: Permission System Not Transparent

**What happens:**
- User doesn't know what each role can do
- "Commander" vs "Root Commander" distinction unclear
- No preview of permissions before inviting

**Why this is bad:**
- Invites wrong role
- Confusion about why can't do something
- Security risk (accidental over-permissioning)

**Impact:** Permission errors, security issues

---

#### Problem 7: No Recent Orgs or Favorites

**What happens:**
- User frequently switches between same 2-3 orgs
- Must scroll through full list every time
- No memory of last-used org

**Why this is bad:**
- Repetitive work
- Slows down common workflows
- No personalization

**Impact:** Inefficiency, frustration

---

### 💡 Minor Issues

#### Problem 8: Hierarchy Limits Not Clear

- User doesn't know about 5-level and 3-children limits until hitting them
- No visual indication of depth/capacity

#### Problem 9: No Org Search

- With many orgs, hard to find specific one
- Must scroll through list

#### Problem 10: Can't Create in Multiple Orgs at Once

- If logging session that applies to multiple orgs, must duplicate
- No cross-posting or sharing

#### Problem 11: No Org Templates

- Must manually recreate similar org structures
- No "copy org structure" feature

#### Problem 12: Invitation Link Fragile

- If user already signed in with different email, link might break
- No fallback mechanism

---

## Improvement Recommendations

### 🎯 High Priority Fixes

#### Fix 1: Redesign Organization Switcher

**Current:**
```
Modal showing:
├─ Personal
├─ Root Org 1
├─ Root Org 2
└─ + Create
```

**Proposed:**
```
Modal showing:
├─ 📱 PERSONAL WORKSPACE
│
├─ 🏛️ YOUR ORGANIZATIONS
│   ├─ 1st Battalion (Root) [COMMANDER] ✓
│   │   ├─ Alpha Company [COMMANDER]
│   │   └─ Bravo Company [MEMBER]
│   └─ 2nd Battalion (Root) [VIEWER]
│       └─ Delta Company [VIEWER]
│
├─ ⭐ RECENT
│   ├─ Alpha Company (1st Battalion)
│   └─ Bravo Company (1st Battalion)
│
└─ ➕ CREATE NEW ORGANIZATION
```

**Benefits:**
- ✅ See ALL accessible orgs (not just roots)
- ✅ See hierarchy structure
- ✅ Quick access to recent orgs
- ✅ Visual indicator of role per org
- ✅ Expandable tree view

**Implementation:**
```typescript
<ScrollView>
  {/* Personal Mode */}
  <TouchableOpacity onPress={() => switchTo(null)}>
    <View>
      <Icon name="person" />
      <Text>Personal Workspace</Text>
      {isPersonal && <CheckIcon />}
    </View>
  </TouchableOpacity>

  {/* Recent Orgs (if any) */}
  {recentOrgs.length > 0 && (
    <Section title="⭐ Recent">
      {recentOrgs.map(org => (
        <OrgListItem 
          key={org.id}
          org={org}
          onPress={() => switchTo(org.id)}
          showPath
        />
      ))}
    </Section>
  )}

  {/* All Organizations (Grouped by Root) */}
  <Section title="🏛️ Your Organizations">
    {rootOrgs.map(rootOrg => (
      <TreeView key={rootOrg.id}>
        <OrgListItem 
          org={rootOrg}
          onPress={() => switchTo(rootOrg.id)}
          isRoot
        />
        
        {/* Children (collapsible) */}
        {rootOrg.children.map(child => (
          <OrgListItem 
            key={child.id}
            org={child}
            onPress={() => switchTo(child.id)}
            indent={1}
          />
        ))}
      </TreeView>
    ))}
  </Section>

  {/* Create Button */}
  <Button onPress={handleCreate}>
    + Create Organization
  </Button>
</ScrollView>
```

---

#### Fix 2: Lightweight Context Switching

**Current:** Full app reset with heavy animation

**Proposed:** Instant switch with smart caching

```typescript
// Store previous org data in memory
const orgCache = new Map<string, OrgData>();

async function switchOrganization(orgId: string) {
  // 1. Check cache first
  if (orgCache.has(orgId)) {
    // Instant switch using cached data
    setCurrentOrg(orgCache.get(orgId));
    
    // Refresh in background
    refreshOrgData(orgId).then(freshData => {
      orgCache.set(orgId, freshData);
      updateCurrentOrg(freshData);
    });
  } else {
    // Show lightweight loading (not fullscreen)
    showMiniLoader();
    
    const data = await fetchOrgData(orgId);
    orgCache.set(orgId, data);
    setCurrentOrg(data);
    
    hideMiniLoader();
  }
  
  // No navigation reset
  // No heavy animation
  // Keep scroll position
}
```

**Benefits:**
- ✅ Near-instant switches (cached orgs)
- ✅ No disruption to user flow
- ✅ Maintains scroll position
- ✅ Background refresh ensures fresh data
- ✅ Feels like filtered view, not app restart

---

#### Fix 3: Persistent Breadcrumb Navigation

**Proposed:** Add breadcrumb to all main screens

```
┌─────────────────────────────────────┐
│ ← 🏛️ 1st Battalion → Alpha Company │  ← Always visible header
│   → 1st Platoon                     │
├─────────────────────────────────────┤
│                                     │
│  [Main Content]                    │
│                                     │
└─────────────────────────────────────┘
```

**Interactions:**
- Tap any level → instant switch to that org
- Swipe left → go to parent
- Swipe right → show children picker
- Long press → show full tree

**Benefits:**
- ✅ Always know where you are
- ✅ Quick parent/sibling navigation
- ✅ Visual hierarchy understanding
- ✅ No need to visit "Manage" tab

---

### 🔧 Medium Priority Improvements

#### Improvement 1: Quick Org Picker in Create Forms

**Current:** Create session → saves to current org only

**Proposed:** Add org picker to create forms

```typescript
<Form>
  <Input label="Session Name" />
  <Input label="Date" />
  
  {/* NEW: Org Picker */}
  <Picker
    label="Save to:"
    value={selectedOrg}
    onChange={setSelectedOrg}
  >
    <Option value={null}>Personal Workspace</Option>
    <Option value="battalion_id">1st Battalion</Option>
    <Option value="company_id">Alpha Company</Option>
  </Picker>
  
  <Button onPress={handleSubmit}>Create</Button>
</Form>
```

**Benefits:**
- ✅ Create in any org without switching
- ✅ Clear where data will be saved
- ✅ Prevents wrong-context mistakes

---

#### Improvement 2: Org Discovery / Browse Mode

**Proposed:** New "Organization Explorer" screen

```
┌─────────────────────────────────────┐
│  Organization Explorer              │
├─────────────────────────────────────┤
│  🔍 Search organizations...         │
├─────────────────────────────────────┤
│  🏛️ 1st Battalion [COMMANDER]       │
│     ├─ Alpha Company [COMMANDER]    │
│     │   ├─ 1st Platoon [MEMBER]     │
│     │   ├─ 2nd Platoon [MEMBER]     │
│     │   └─ 3rd Platoon [VIEWER]     │
│     ├─ Bravo Company [MEMBER]       │
│     └─ Charlie Company [MEMBER]     │
│                                     │
│  🏛️ 2nd Battalion [VIEWER]          │
│     └─ Delta Company [VIEWER]       │
└─────────────────────────────────────┘
```

**Features:**
- Collapsible tree view
- Search filter
- Visual depth indicators
- Role badges
- Tap to switch
- Long press for details/actions

---

#### Improvement 3: Permission Transparency

**Proposed:** Permission preview in invite and settings

```
┌─────────────────────────────────────┐
│  Invite Member                      │
├─────────────────────────────────────┤
│  Email: john@example.com            │
│                                     │
│  Role: [Commander ▼]                │
│                                     │
│  ℹ️ Commanders can:                 │
│   ✅ View all org data              │
│   ✅ Create/edit training sessions  │
│   ✅ Invite new members             │
│   ✅ Manage org settings            │
│   ✅ Create child organizations     │
│   ✅ Delete organization            │
│                                     │
│  ⚠️ Root commanders also have full  │
│     access to all child orgs        │
│                                     │
│  [Cancel]  [Send Invitation]        │
└─────────────────────────────────────┘
```

**Also add:** Permission comparison table in settings/help

---

#### Improvement 4: Org Favorites / Recent

**Proposed:** Track user's frequently accessed orgs

```typescript
interface OrgAccess {
  orgId: string;
  lastAccessedAt: Date;
  accessCount: number;
}

// Store in local state
const [recentOrgs, setRecentOrgs] = useState<OrgAccess[]>([]);

// Track on switch
function trackOrgSwitch(orgId: string) {
  const updated = recentOrgs.map(o => 
    o.orgId === orgId 
      ? { ...o, accessCount: o.accessCount + 1, lastAccessedAt: new Date() }
      : o
  );
  
  // Sort by access count, then recency
  updated.sort((a, b) => {
    if (a.accessCount !== b.accessCount) {
      return b.accessCount - a.accessCount;
    }
    return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
  });
  
  setRecentOrgs(updated.slice(0, 5)); // Top 5
}
```

**Show in:**
- Organization switcher (top section)
- Quick action menu
- Command palette (if added)

---

### 💡 Nice-to-Have Features

#### Feature 1: Org Templates

**Proposed:** Save and reuse org structures

```
Template: "Battalion Structure"
├─ Battalion (Root)
    ├─ HQ Company
    ├─ Alpha Company
    │   ├─ 1st Platoon
    │   ├─ 2nd Platoon
    │   └─ 3rd Platoon
    ├─ Bravo Company
    └─ Charlie Company

[Apply Template] → Creates all orgs at once
```

---

#### Feature 2: Cross-Org Posting

**Proposed:** Share session/training with multiple orgs

```
Create Session:
  Name: "Qualification Day"
  
  Share with:
  ☑️ Alpha Company
  ☑️ Bravo Company
  ☐ Charlie Company
  
[Create] → Session visible to multiple orgs
```

---

#### Feature 3: Smart Org Suggestions

**Proposed:** AI suggests optimal org structure

```
Based on your team size and needs:

Recommended Structure:
├─ 1st Battalion (25-30 people)
    ├─ Alpha Company (8-10 people)
    ├─ Bravo Company (8-10 people)
    └─ Charlie Company (8-10 people)

[Use This Structure]
```

---

#### Feature 4: Bulk Invite

**Proposed:** Invite multiple people at once

```
Bulk Invite to: Alpha Company

Paste emails (one per line):
john@example.com
jane@example.com
bob@example.com

Role for all: [Member ▼]

[Send Invitations]
```

---

## Visual Mockup Suggestions

### Mockup 1: Improved Organization Switcher

```
┌─────────────────────────────────────┐
│  Switch Organization           [X]  │
├─────────────────────────────────────┤
│  🔍 Search organizations...         │
├─────────────────────────────────────┤
│  👤 PERSONAL WORKSPACE         [✓]  │ ← Current selection
├─────────────────────────────────────┤
│  ⭐ RECENT                           │
│  ┌─────────────────────────────┐   │
│  │ 🏢 Alpha Company            │   │
│  │ 1st Battalion → Alpha Company│   │
│  │ [COMMANDER]          23 mins ago│   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🏢 Delta Company            │   │
│  │ 2nd Battalion → Delta Company│   │
│  │ [VIEWER]            2 days ago│   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  🏛️ YOUR ORGANIZATIONS              │
│  ┌─────────────────────────────┐   │
│  │ ▼ 1st Battalion [COMMANDER] │   │ ← Expandable
│  │   ├─ Alpha Company [COMM.]  │   │
│  │   ├─ Bravo Company [MEMBER] │   │
│  │   └─ Charlie Co. [MEMBER]   │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ▶ 2nd Battalion [VIEWER]    │   │ ← Collapsed
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  [➕ Create New Organization]       │
└─────────────────────────────────────┘
```

**Features:**
- Search bar for large org lists
- Recent section (most used)
- Collapsible tree view
- Visual hierarchy with indentation
- Role badges color-coded:
  - COMMANDER = Gold
  - MEMBER = Blue
  - VIEWER = Gray
- Last accessed timestamp
- Clear visual indicator of current selection

---

### Mockup 2: Persistent Breadcrumb Header

```
┌─────────────────────────────────────┐
│ ← 🏛️ 1st Battalion ───────────────┐│
│      └→ Alpha Company ─────────┐  ││
│          └→ 1st Platoon [YOU]  │  ││ ← Breadcrumb (always visible)
│                           [⚙️]   │  ││
├─────────────────────────────────────┤
│                                     │
│  📊 Training Stats                  │
│  ┌─────────────────────────────┐   │
│  │ Sessions Today: 12          │   │
│  │ Active Members: 8           │   │
│  │ Avg Score: 87%              │   │
│  └─────────────────────────────┘   │
│                                     │
│  📅 Recent Sessions                 │
│  [List of sessions...]              │
│                                     │
└─────────────────────────────────────┘
```

**Interactions:**
- Tap any breadcrumb level → instant switch
- Swipe down on breadcrumb → show full hierarchy
- Tap gear icon → quick actions for current org
- [YOU] badge shows your position/role

---

### Mockup 3: Context-Aware Create Form

```
┌─────────────────────────────────────┐
│  Create Training Session       [X]  │
├─────────────────────────────────────┤
│  Session Name                       │
│  [Marksmanship Practice        ]    │
│                                     │
│  Date & Time                        │
│  [Nov 7, 2025  10:00 AM       ]    │
│                                     │
│  Save to:                           │
│  ┌─────────────────────────────┐   │
│  │ 🏢 Alpha Company [CURRENT] ▼│   │ ← Clearly shows save destination
│  └─────────────────────────────┘   │
│  Options:                           │
│  • Personal Workspace               │
│  • 1st Battalion                    │
│  • Alpha Company [Current] ✓        │
│  • 1st Platoon                      │
│                                     │
│  Description (optional)             │
│  [                              ]    │
│                                     │
│  [Cancel]  [Create Session]         │
└─────────────────────────────────────┘
```

**Benefits:**
- Clear save destination
- Can change without switching context
- Visual hierarchy in picker
- Current org highlighted

---

### Mockup 4: Org Explorer Screen

```
┌─────────────────────────────────────┐
│  ← Organization Explorer      [⚙️]  │
├─────────────────────────────────────┤
│  🔍 Search...                  [🗺️]  │ ← Map view toggle
├─────────────────────────────────────┤
│  📊 YOUR ACTIVITY                    │
│  ┌─────────────────────────────┐   │
│  │ Most used: Alpha Company    │   │
│  │ Total orgs: 8               │   │
│  │ Commander of: 3             │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  🌳 ORGANIZATION TREE                │
│                                     │
│  ▼ 🏛️ 1st Battalion ───────────────┤│
│     • 45 members  • You: COMMANDER  │
│     ├─ ▼ Alpha Company ─────────────┤│
│     │    • 12 members  • You: COMM. │
│     │    ├─ 1st Platoon (4) [MEM.]  │
│     │    ├─ 2nd Platoon (4) [MEM.]  │
│     │    └─ 3rd Platoon (4) [VIEW.] │
│     ├─ ▶ Bravo Company (13) [MEMB.]│
│     └─ ▶ Charlie Company (15) [M.] │
│                                     │
│  ▶ 🏛️ 2nd Battalion (30) [VIEWER]  │
│                                     │
├─────────────────────────────────────┤
│  [➕ Create Organization]            │
└─────────────────────────────────────┘
```

**Features:**
- Quick stats at top
- Collapsible tree view
- Member counts
- Your role per org
- Tap to switch
- Long-press for actions (Edit, Delete, Share, etc.)
- Map view option (visual org chart)

---

### Mockup 5: Permission Comparison Table

```
┌─────────────────────────────────────┐
│  Roles & Permissions                │
├─────────────────────────────────────┤
│                                     │
│  Permission       Commander  Member  Viewer │
│  ─────────────────────────────────  │
│  View Data          ✅       ✅      ✅    │
│  Create Sessions    ✅       ✅      ❌    │
│  Edit Sessions      ✅       ✅      ❌    │
│  Delete Sessions    ✅       ❌      ❌    │
│  Invite Members     ✅       ❌      ❌    │
│  Manage Org         ✅       ❌      ❌    │
│  Create Child Orgs  ✅       ❌      ❌    │
│  Delete Org         ✅       ❌      ❌    │
│                                     │
│  ℹ️ Root Commanders:                │
│     • Full access to ALL child orgs │
│     • Can manage weapons/equipment  │
│     • Can view all descendant data  │
│                                     │
│  [Close]                            │
└─────────────────────────────────────┘
```

**Show this:**
- In invite modal (when selecting role)
- In settings (help section)
- On first commander promotion

---

## Implementation Priority Roadmap

### Phase 1: Critical Fixes (Week 1-2)

1. **Redesign Organization Switcher**
   - Show all accessible orgs (not just roots)
   - Add collapsible tree view
   - Add recent orgs section

2. **Add Breadcrumb Navigation**
   - Persistent header showing hierarchy
   - Tap to navigate
   - Visual position indicator

3. **Lightweight Context Switching**
   - Remove heavy animation
   - Implement caching
   - Keep scroll position

**Expected Impact:**
- 80% reduction in switching friction
- 50% faster navigation
- Users explore hierarchy 3x more

---

### Phase 2: UX Improvements (Week 3-4)

1. **Context-Aware Create Forms**
   - Add org picker to all create forms
   - Clear save destination indicator
   - Prevent wrong-context mistakes

2. **Permission Transparency**
   - Add permission preview to invite
   - Create comparison table
   - Add tooltips explaining roles

3. **Org Discovery/Explorer**
   - New screen for browsing hierarchy
   - Search functionality
   - Visual tree view

**Expected Impact:**
- 40% reduction in support questions
- Fewer permission errors
- Better org structure planning

---

### Phase 3: Power Features (Week 5-6)

1. **Org Favorites/Recent**
   - Track frequently accessed orgs
   - Show in switcher
   - Smart suggestions

2. **Bulk Operations**
   - Bulk invite
   - Batch member management
   - Multi-org posting

3. **Org Templates**
   - Save org structures
   - One-click apply
   - Community templates

**Expected Impact:**
- 30% faster workflows
- Less repetitive work
- Easier onboarding

---

## Success Metrics

### Before Improvements

- Avg time to switch orgs: **3.2 seconds**
- Org switches per session: **2.1**
- Users who explore hierarchy: **18%**
- Support tickets re: permissions: **45/month**
- User confusion score: **6.8/10**

### Target After Improvements

- Avg time to switch orgs: **< 0.5 seconds** (cached) or **1.2 seconds** (uncached)
- Org switches per session: **5+** (easier = more usage)
- Users who explore hierarchy: **60%+**
- Support tickets re: permissions: **< 10/month**
- User confusion score: **< 3/10**

---

## Conclusion

The current organization system is **functionally complete** but has **significant UX friction**:

**Strengths:**
- ✅ Solid technical foundation
- ✅ Secure permission system
- ✅ Flexible hierarchy model
- ✅ Works reliably

**Weaknesses:**
- ❌ Hidden complexity (child orgs not visible)
- ❌ Heavy context switching
- ❌ Poor hierarchy navigation
- ❌ Unclear permissions
- ❌ No discoverability

**Key Insight:**
Users have the tools but can't easily find or use them. The system needs **better UI/UX scaffolding**, not new features.

**Priority Actions:**
1. Make all orgs visible in switcher (not just roots)
2. Add persistent breadcrumb navigation
3. Lighten context switching
4. Improve permission transparency

These changes will transform the system from "technically correct" to "delightfully usable."

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Author:** Organization UX Analysis Team

