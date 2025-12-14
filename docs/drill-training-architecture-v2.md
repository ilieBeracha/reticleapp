# Drill & Training Architecture v2

## Executive Summary

This document outlines the redesigned architecture for managing drills and trainings, addressing:
1. **Data fragmentation** - Drill definitions copied in 3 places
2. **Confusing UI** - Tabs that don't match user mental models
3. **Role-based access** - Users with different roles across teams
4. **Missing features** - Quick practice from templates

---

## Current Problems

### 1. Data Duplication

```
DrillTemplate → (copied to) → TrainingDrill → (copied to) → Session.drill_config
```

Each copy can drift. Updates to templates don't propagate.

### 2. UI Confusion

Current structure:
```
Trainings Tab
├── My Schedule (shows trainings from ALL teams)
└── Team Operations (requires selecting one team)
    ├── Trainings sub-tab
    └── Drills sub-tab
```

**Problems:**
- User must switch "active team" to see different team's drills
- A soldier in Team B can't see Team B's drills (no "Team Operations" access)
- A commander in Team A sees nothing useful if Team B is active
- "Drill Templates" concept is buried

### 3. Role Logic Tied to Active Team

```typescript
const { canManageTraining } = usePermissions();
// This only works for activeTeam - ignores other teams
```

---

## New Architecture

### Principle: **Drill Templates are First-Class Citizens**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DRILL TEMPLATES (Source of Truth)                │
│  - Stored in drill_templates table                                  │
│  - Team-owned, created by commanders                                │
│  - Immutable after creation (versioned if needed)                   │
│  - Soldiers can VIEW but not EDIT                                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
┌───────────────────────┐                   ┌───────────────────────┐
│      TRAININGS        │                   │    QUICK PRACTICE     │
│  (Scheduled events)   │                   │  (Immediate start)    │
│                       │                   │                       │
│  training_drills:     │                   │  session:             │
│  - drill_template_id  │                   │  - drill_template_id  │
│  - order_index        │                   │  - user starts solo   │
│  - overrides (opt)    │                   │                       │
└───────────┬───────────┘                   └───────────┬───────────┘
            │                                           │
            └─────────────────┬─────────────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │       SESSIONS        │
                  │  - drill_template_id  │
                  │  - training_id (opt)  │
                  │  - drill_id (opt)     │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │    SESSION TARGETS    │
                  │  (Enforces drill req) │
                  └───────────────────────┘
```

### Database Changes

#### 1. Modify `training_drills` table

```sql
-- Add reference to template instead of copying all fields
ALTER TABLE training_drills
  ADD COLUMN drill_template_id UUID REFERENCES drill_templates(id) ON DELETE SET NULL;

-- Keep existing fields for backwards compatibility and overrides
-- But prefer reading from drill_template when drill_template_id is set
```

#### 2. Modify `sessions` table

```sql
-- Add direct reference to template for quick practice
ALTER TABLE sessions
  ADD COLUMN drill_template_id UUID REFERENCES drill_templates(id) ON DELETE SET NULL;
```

#### 3. New view for resolved drills

```sql
CREATE OR REPLACE VIEW resolved_training_drills AS
SELECT 
  td.id,
  td.training_id,
  td.order_index,
  td.drill_template_id,
  -- Use template values, fall back to inline values
  COALESCE(dt.name, td.name) as name,
  COALESCE(dt.drill_goal, td.drill_goal) as drill_goal,
  COALESCE(dt.target_type, td.target_type) as target_type,
  COALESCE(dt.distance_m, td.distance_m) as distance_m,
  COALESCE(dt.rounds_per_shooter, td.rounds_per_shooter) as rounds_per_shooter,
  COALESCE(dt.time_limit_seconds, td.time_limit_seconds) as time_limit_seconds,
  COALESCE(dt.min_accuracy_percent, td.min_accuracy_percent) as min_accuracy_percent,
  COALESCE(dt.strings_count, td.strings_count) as strings_count,
  -- ... other fields
  td.created_at
FROM training_drills td
LEFT JOIN drill_templates dt ON td.drill_template_id = dt.id;
```

---

## New UI Design

### Trainings Tab - Simplified Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRAININGS                                      [Filter by Team ▾]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 📅 UPCOMING                                                   │  │
│  │                                                               │  │
│  │ ┌─────────────────────────────────────────────────────────┐   │  │
│  │ │ 🟢 Morning Drill        Alpha Team • Today 09:00       │   │  │
│  │ │     5 drills • 3 soldiers                              │   │  │
│  │ └─────────────────────────────────────────────────────────┘   │  │
│  │ ┌─────────────────────────────────────────────────────────┐   │  │
│  │ │ 📆 Qualification Test    Bravo Team • Tomorrow         │   │  │
│  │ │     3 drills • 8 soldiers                              │   │  │
│  │ └─────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 🎯 DRILL LIBRARY                          [+ New Drill]      │  │
│  │                                                               │  │
│  │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │  │
│  │ │ Grouping Test   │ │ Qual Course     │ │ Speed Drill     │   │  │
│  │ │ 🎯 25m • 5 rds  │ │ 🏆 50m • 10 rds │ │ 🏆 7m • 3 rds   │   │  │
│  │ │ Alpha Team      │ │ Bravo Team      │ │ Alpha Team      │   │  │
│  │ │ [▶ Practice]    │ │ [▶ Practice]    │ │ [▶ Practice]    │   │  │
│  │ └─────────────────┘ └─────────────────┘ └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 📊 RECENT SESSIONS                                            │  │
│  │  [Session cards for solo practice history]                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

FAB: [+ New Training] (only if canManageTraining for ANY team)
```

### Key UX Improvements

#### 1. **Role-Aware Per-Team Indicators**

Show user's role badge on each team's content:
- 👑 Owner
- ⭐ Commander  
- 🎖️ Squad Commander
- 👤 Soldier

Commander actions (edit/delete) only show for teams where user is commander.

#### 2. **Drill Library is Always Visible**

Everyone can SEE drill templates from their teams. Only commanders can EDIT.

Soldiers get a **"Practice Now"** button to immediately start a session with that drill.

#### 3. **Team Filter Instead of Team Tabs**

Replace "My Schedule" vs "Team Operations" with a single view + dropdown filter:
- `All Teams` (default)
- `Alpha Team`
- `Bravo Team`
- etc.

#### 4. **FAB Logic**

```typescript
// Show FAB if user can manage training in ANY team
const canCreateAnything = teams.some(t => 
  t.my_role === 'owner' || t.my_role === 'commander'
);

// FAB opens action sheet:
// - "New Training" → select team first if multiple
// - "New Drill Template" → select team first if multiple
```

#### 5. **Simplified Sections**

| Section | Who sees it | What's shown |
|---------|-------------|--------------|
| **Upcoming** | Everyone | Trainings from user's teams (all of them) |
| **Drill Library** | Everyone | Drill templates from user's teams |
| **Recent Sessions** | Everyone | User's recent solo practice sessions |
| **Manage** | Commanders | Edit/delete for teams they command |

---

## Implementation Plan

### Phase 1: Fix Critical Bugs (Day 1)

1. ✅ Fix `drill_goal` not saved in `trainingService.ts`
2. ✅ Lock `addTarget` to drill requirements during drill session

### Phase 2: Database Migration (Day 1-2)

1. Add `drill_template_id` to `training_drills`
2. Add `drill_template_id` to `sessions`
3. Create `resolved_training_drills` view
4. Backfill existing training_drills with template IDs where possible

### Phase 3: New UI (Day 2-3)

1. Redesign `trainings.tsx` with new structure
2. Add team filter dropdown
3. Add "Practice Now" button on drill templates
4. Update FAB logic for multi-team awareness

### Phase 4: Quick Practice Flow (Day 3)

1. Add `startQuickPractice(drillTemplateId)` service
2. Create session with `drill_template_id`
3. Navigate to `activeSession`

---

## Type Definitions

```typescript
// NEW: Resolved drill with template reference
interface ResolvedDrill {
  id: string;
  training_id?: string;
  drill_template_id?: string;
  order_index: number;
  
  // Resolved from template or inline
  name: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  strings_count: number;
  time_limit_seconds?: number;
  min_accuracy_percent?: number;
  // ... other fields
  
  // Source info
  source: 'template' | 'inline';
  template?: DrillTemplate; // Original template if from template
}

// NEW: Quick practice session params
interface QuickPracticeParams {
  drill_template_id: string;
  team_id?: string; // Optional, defaults to template's team
}
```

---

## Migration Notes

### Backwards Compatibility

- Existing `training_drills` without `drill_template_id` continue to work
- Session creation still accepts inline `drill_config` for backwards compat
- Views resolve template vs inline automatically

### Rollback Plan

- `drill_template_id` columns are nullable
- Views fall back to inline data if template missing
- No destructive changes to existing data

---

## Questions to Resolve

1. **Should soldiers be able to create personal drill templates?**
   - Current: No (team-owned only)
   - Alternative: Allow personal templates stored in user's profile

2. **Should training_drills be mutable after training starts?**
   - Current: Yes (commanders can modify)
   - Alternative: Lock drills once training is `ongoing`

3. **Drill versioning?**
   - Not included in v2, but architecture supports adding `version` column later
