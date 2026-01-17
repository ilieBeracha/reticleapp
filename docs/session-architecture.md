# Session Architecture

This document describes the parent architecture for all session types in the app.

---

## Session Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         SESSION SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        ┌──────────────┐                         │
│                        │   SESSION    │                         │
│                        └──────┬───────┘                         │
│                               │                                  │
│              ┌────────────────┼────────────────┐                │
│              │                │                │                │
│      ┌───────▼───────┐ ┌──────▼──────┐ ┌──────▼──────┐         │
│      │     SOLO      │ │   TEAM      │ │  TRAINING   │         │
│      │   SESSION     │ │  SESSION    │ │  SESSION    │         │
│      └───────────────┘ └─────────────┘ └─────────────┘         │
│                                                                  │
│      User controls      Team context    Locked to drill         │
│      everything         + flexibility   requirements            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Session Types

### 1. Solo Session

**Context:** User practicing alone, not attached to any team or training.

| Attribute | Value |
|-----------|-------|
| `team_id` | `null` |
| `training_id` | `null` |
| `session_mode` | `'solo'` |
| Drill config | Fully editable |
| Weapon | User's personal weapons |

**Use cases:**
- Personal range day
- Self-directed practice
- Testing new weapons
- Casual shooting

---

### 2. Team Session (Unstructured)

**Context:** User shooting in a team context but not during a formal training.

| Attribute | Value |
|-----------|-------|
| `team_id` | Set |
| `training_id` | `null` |
| `session_mode` | `'solo'` (flexible) |
| Drill config | Editable |
| Weapon | Team or personal weapons |

**Use cases:**
- Team range day without formal training
- Open practice with team equipment
- Skill maintenance

---

### 3. Training Session

**Context:** User participating in a structured team training with defined drills.

| Attribute | Value |
|-----------|-------|
| `team_id` | Set |
| `training_id` | Set |
| `session_mode` | `'training'` |
| Drill config | **Locked** - immutable |
| Weapon | May be assigned by commander |

**Use cases:**
- Qualification courses
- Team assessments
- Structured drills
- Commander-led training

---

## Session Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
│ PENDING  │ → │  ACTIVE  │ → │ COMPLETED│ or │ CANCELLED │
└──────────┘    └──────────┘    └──────────┘    └───────────┘
     │               │               │               │
     │               │               │               │
  Created       Activated        Ended           Deleted
  Not started   In progress      With data       No data
```

### Status Transitions

| From | To | Trigger |
|------|----|---------|
| `pending` | `active` | `activateSession()` |
| `active` | `completed` | `endSession()` |
| `pending` | `cancelled` | `deleteSession()` |
| `active` | `cancelled` | `deleteSession()` |

---

## Session Components

### Core Data

```typescript
interface SessionWithDetails {
  // Identity
  id: string;
  user_id: string;
  status: SessionStatus;
  
  // Context
  team_id: string | null;
  training_id: string | null;
  drill_id: string | null;
  
  // Configuration
  drill_config: DrillConfig | null;
  custom_drill_config: Record<string, any> | null;
  
  // Weapon
  weapon_id: string | null;
  weapon_name: string | null;
  weapon_caliber: string | null;
  weapon_category: string | null;
  
  // Execution
  watch_controlled: boolean;
  started_at: string | null;
  ended_at: string | null;
  
  // Environment
  weather: WeatherData | null;
  
  // Results
  stats: SessionStats | null;
}
```

### Session Stats

```typescript
interface SessionStats {
  totalShotsFired: number;
  totalHits: number;
  accuracy: number;
  
  // Grouping
  bestDispersionCm: number | null;
  avgDispersionCm: number | null;
  
  // Time
  durationMs: number;
  avgEngagementTimeMs: number | null;
  
  // Targets
  targetsCompleted: number;
  targetsTotal: number;
}
```

---

## Drill Configuration

A drill defines the **requirements** for a session.

```typescript
interface DrillConfig {
  // Identity
  name: string;
  drill_goal: 'grouping' | 'engagement';
  
  // Requirements
  distance_m: number;
  rounds_per_shooter: number;      // Total bullets planned
  targets_per_round: number;       // Targets per shooting round
  bullets_per_target: number;      // Bullets per single target
  
  // Constraints
  time_limit_seconds: number | null;
  accuracy_threshold: number | null;  // Minimum accuracy %
  
  // Type
  target_type: 'paper' | 'tactical';
  paper_type: 'grouping' | 'achievement' | null;
  
  // Context
  position: string | null;
}
```

### Drill Goal Types

| Goal | Purpose | Scoring | Target |
|------|---------|---------|--------|
| **Grouping** | Precision measurement | Dispersion (cm) | Paper |
| **Engagement** | Hit rate & speed | Accuracy % + Time | Tactical/Steel |

---

## Target Flow

Each session contains multiple **targets** (shooting events).

```
Session
  └── Target 1 (paper, scanned)
  │     └── PaperResult (dispersion, hits, image)
  │
  └── Target 2 (tactical, manual)
  │     └── TacticalResult (hits, time)
  │
  └── Target 3 (paper, manual)
        └── PaperResult (manual entry)
```

### Target Types

| Type | Input Method | Data Captured |
|------|--------------|---------------|
| **Paper (Scanned)** | Camera + AI | Image, bullet holes, dispersion |
| **Paper (Manual)** | Form | Shots, hits, dispersion estimate |
| **Tactical** | Form | Shots, hits, time |

---

## Watch Integration

### Session Modes

| Watch State | Behavior |
|-------------|----------|
| **Not Connected** | Phone-only mode, manual tracking |
| **Connected + Watch Controlled** | Watch tracks shots, time, biometrics |
| **Connected + Phone Only** | User chose phone-only despite watch |

### Watch Data Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   PHONE     │ ──────→ │   WATCH     │ ──────→ │   PHONE     │
│             │ START   │             │ DATA    │             │
│ Session     │         │ Tracking    │         │ Save to DB  │
│ Config      │         │ Shots       │         │             │
│             │         │ HR          │         │             │
│             │         │ Time        │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
```

### Watch Session Payload

```typescript
interface WatchSessionPayload {
  type: 'SESSION_START';
  sessionId: string;
  drillName: string;
  goal: 'grouping' | 'engagement';
  distance: number;
  totalShots: number | null;
  timeLimitSeconds: number | null;
  
  // Detection config
  sensitivity: number;      // G-force threshold
  cooldownMs: number;       // Between shots
  weapon: {
    category: string;
    caliber: string;
  };
}
```

---

## Permission Model

### Who Can Do What

| Action | Solo | Team Member | Commander |
|--------|------|-------------|-----------|
| Create session | ✅ | ✅ (personal) | ✅ |
| Edit drill config | ✅ | ❌ (training) | ❌ (training) |
| Choose weapon | ✅ | Depends on policy | ✅ |
| End early | ✅ | ✅ | ✅ |
| View others' sessions | ❌ | Team only | Team only |
| Delete session | Own only | Own only | Own + team |

### Weapon Policy Effects

| Policy | Session Behavior |
|--------|------------------|
| **Any Weapon** | User picks from personal |
| **Team Catalog** | User picks from team weapons |
| **Assigned Only** | Must use assigned weapon |

---

## Entry Points

### Creating Sessions

| Entry Point | Context | Route |
|-------------|---------|-------|
| Home "Start Session" | Solo | `/createSession` |
| Training "Start Drill" | Team training | `/activeSession` (direct) |
| Team "Practice" | Team context | `/createSession?teamId=X` |

### Session Flow by Entry

```
HOME → createSession → [prep] → activeSession → end
                           ↑
TRAINING → startDrill ─────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `createSession.tsx` | Solo session creation |
| `activeSession.tsx` | Active session UI |
| `useActiveSession.ts` | Session state/logic hook |
| `SessionPrepView.tsx` | Watch configuration |
| `StartDrillSheet.tsx` | Team training drill start |
| `sessionService.ts` | API calls |
| `session/types.ts` | TypeScript definitions |
| `session/mutations.ts` | DB mutations |

---

## Related Documents

- [Solo Session Flow](./solo-session-flow.md) - Detailed solo session walkthrough
- [Garmin Architecture](./garmin-architecture.md) - Watch integration details
- [Training Session Model](./../.cursor/rules/training-session-model.mdc) - Team training specifics
