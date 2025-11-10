# Commander Scope Management - How It Works

## 🎯 Core Principle

**Commanders manage their ENTIRE SCOPE from their assigned org.**

No need to switch to child orgs - you control everything from your level!

---

## 📊 How Scope Works

### Example Hierarchy

```
Alpha Unit (Root, depth 0)                    ← Commander: Alice
├─ Team 1 (depth 1)                          ← Commander: Bob
│  ├─ Squad A (depth 2)                      ← Commander: Charlie
│  └─ Squad B (depth 2)                      ← Commander: Diana
└─ Team 2 (depth 1)                          ← Commander: Eve
   └─ Squad C (depth 2)                      ← Commander: Frank
```

---

### Alice (Unit Commander)

**Assigned Org:** Alpha Unit  
**Stays in:** Alpha Unit (doesn't switch to children)  
**Manages from Unit level:**
- ✅ Alpha Unit members
- ✅ Team 1 members
- ✅ Team 2 members
- ✅ Squad A, B, C members
- ✅ Create Teams under Unit
- ✅ Invite members to any level
- ✅ View all members in scope
- ✅ Assign commanders to Teams

**UI Shows:**
```
┌─────────────────────────────┐
│ Alpha Unit (Commander)      │
│ Sub-Organizations (2)       │
│ ├─ Team 1 • 5 members       │  ← Info only, not clickable
│ └─ Team 2 • 3 members       │  ← Info only, not clickable
│                             │
│ ➕ Create sub-organization  │
│ 👥 Invite members           │
│ 👁️  View members (6 orgs)   │  ← Sees ALL in scope
│ ⚙️  Settings                │
│ ─────────────────────       │
│ ↔️  Switch organization     │
└─────────────────────────────┘
```

---

### Bob (Team 1 Commander)

**Assigned Org:** Team 1  
**Stays in:** Team 1 (doesn't switch to squads)  
**Manages from Team level:**
- ✅ Team 1 members
- ✅ Squad A members
- ✅ Squad B members
- ✅ Create Squads under Team 1
- ✅ Invite members to Team 1 or squads
- ✅ View all members in Team 1 scope
- ✅ Assign commanders to Squads
- ❌ Cannot see Team 2, Squad C (different branch)

**UI Shows:**
```
┌─────────────────────────────┐
│ Team 1 (Commander)          │
│ in Alpha Unit               │
│ Sub-Organizations (2)       │
│ ├─ Squad A • 2 members      │  ← Info only, not clickable
│ └─ Squad B • 1 member       │  ← Info only, not clickable
│                             │
│ ➕ Create sub-organization  │
│ 👥 Invite members           │
│ 👁️  View members (3 orgs)   │  ← Team 1 + squads
│ ⚙️  Settings                │
│ ─────────────────────       │
│ ↔️  Switch organization     │
└─────────────────────────────┘
```

---

### Charlie (Squad A Commander)

**Assigned Org:** Squad A  
**Stays in:** Squad A  
**Manages from Squad level:**
- ✅ Squad A members only
- ❌ Cannot create child orgs (max depth)
- ✅ Invite members to Squad A
- ✅ View Squad A members only
- ❌ Cannot see Team 1, Squad B, or other squads

**UI Shows:**
```
┌─────────────────────────────┐
│ Squad A (Commander)         │
│ in Alpha Unit → Team 1      │
│ Sub-Organizations (0)       │
│ ℹ️  Max depth reached        │
│                             │
│ 👥 Invite members           │
│ 👁️  View members (1 org)    │  ← Only Squad A
│ ⚙️  Settings                │
│ ─────────────────────       │
│ ↔️  Switch organization     │
└─────────────────────────────┘
```

---

### Greg (Member of Team 1)

**Assigned Org:** Team 1  
**Stays in:** Team 1  
**Can see:**
- ✅ Team 1 members only
- ❌ Cannot see squads (not commander)
- ❌ Cannot create child orgs
- ❌ Cannot invite members

**UI Shows:**
```
┌─────────────────────────────┐
│ Team 1 (Member)             │
│ in Alpha Unit               │
│                             │
│ 👁️  View members (1 org)    │  ← Only Team 1
│ ─────────────────────       │
│ ↔️  Switch organization     │
└─────────────────────────────┘
```

---

## 🎮 User Actions

### Creating Child Org

**Before (Wrong):**
1. Commander creates child org
2. System switches to child org
3. Commander is now in child org context (loses parent scope)

**After (Correct):**
1. Commander creates child org from their level
2. **Stays in parent org** (maintains scope)
3. Child appears in "Sub-Organizations" list (info only)
4. Commander manages child from parent level

### Viewing Members

**Commander clicks "View members":**
- Sees members from ALL orgs in scope
- Grouped by organization
- No need to navigate to each org

**Example: Alice (Unit Commander) sees:**
```
Alpha Unit (3 members)
├─ Alice (Commander)
├─ John (Member)
└─ Sarah (Member)

Team 1 (5 members)
├─ Bob (Commander)
├─ ...

Squad A (2 members)
├─ Charlie (Commander)
└─ ...
```

---

## 🚫 What Users CANNOT Do

### Users Without Org Membership
- ❌ Cannot see "Switch organization" button
- ❌ Stuck in Personal Workspace until invited
- ❌ Must be invited or create root org to join

### Members (Non-Commanders)
- ❌ Cannot create child orgs
- ❌ Cannot invite members
- ❌ Cannot see child org members (only their level)
- ✅ Can only see members in their specific org

### Commanders
- ❌ Cannot navigate to child orgs (no need!)
- ❌ Cannot switch to child orgs (manage from parent)
- ✅ Manage entire scope from their assigned org

---

## 💡 Design Philosophy

### Single Source of Control

Each commander operates from ONE org and controls their scope:

```
Unit Commander (Alice)
│
├─ Controls from: Alpha Unit
├─ Scope: Alpha Unit + all children
└─ No switching needed - manages all from Unit level

Team Commander (Bob)
│
├─ Controls from: Team 1
├─ Scope: Team 1 + squads
└─ No switching needed - manages all from Team level
```

### Why No Child Navigation?

**Old (Complex):**
```
Alice in Unit → Switches to Team 1 → Switches to Squad A → Manages
                ↓                      ↓
        Loses Unit scope      Loses Team scope
```

**New (Simple):**
```
Alice in Unit → Manages Unit + Teams + Squads directly
                ↓
        Maintains full scope always
```

---

## 🎯 Summary

**Key Rules:**
1. ✅ Commander assigned to ONE org
2. ✅ Manages entire scope from that org
3. ✅ Child orgs shown as INFO only (not clickable)
4. ✅ No navigation to child orgs needed
5. ✅ Switch organization = Switch between DIFFERENT TREES

**Example:**
- Alice is commander of Alpha Unit (Tree 1)
- Dave is commander of Bravo Unit (Tree 2)
- Alice can switch to: Personal or Alpha Unit
- Dave can switch to: Personal or Bravo Unit
- Alice manages ALL of Alpha tree from Unit level
- Dave manages ALL of Bravo tree from Unit level

**No confusion, clear hierarchy, simple management!** 🎉

