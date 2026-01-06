# Session System Documentation

> Complete guide to how sessions work in Retic - from creation to completion.

---

## Table of Contents

1. [Overview](#overview)
2. [Mental Model](#mental-model)
3. [Session Types](#session-types)
4. [Session Creation Flow](#session-creation-flow)
5. [Session Lifecycle](#session-lifecycle)
6. [Watch Integration](#watch-integration)
7. [Data Input Methods](#data-input-methods)
8. [Session Results](#session-results)
9. [Database Schema](#database-schema)
10. [Key Files Reference](#key-files-reference)

---

## Overview

A **Session** is the core unit of activity in Retic. It represents a single shooting practice event where a user:
- Configures what they want to practice (goal, weapon, distance, etc.)
- Records their performance (shots, hits, groupings)
- Gets feedback and analytics

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Session** | A single shooting practice event |
| **Drill** | A template/preset that defines session parameters |
| **Target** | A single target within a session (can have multiple) |
| **Result** | The measured outcome (grouping size, hit count, accuracy) |

---

## Mental Model

Sessions follow a **6-step mental model**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SESSION MENTAL MODEL                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INTENT        "What am I going to do?"                              │
│     └── Choose: Grouping or Engagement                                  │
│                                                                          │
│  2. WEAPON        "What am I shooting with?"                            │
│     └── Select weapon from personal inventory                           │
│                                                                          │
│  3. CONTEXT       "Under what conditions?"                              │
│     └── Distance, position, time limit, stress drill                    │
│                                                                          │
│  4. EXECUTION     "Shooting in progress"                                │
│     └── Timer runs, watch tracks shots                                  │
│                                                                          │
│  5. RESULTS       "What actually happened?"                             │
│     └── Scan targets or enter manually                                  │
│                                                                          │
│  6. REVIEW        "Does this look right?"                               │
│     └── Confirm and save session                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Session Types

### By Goal (DrillGoal)

| Goal | Description | Input Method | Metrics |
|------|-------------|--------------|---------|
| **Grouping** | Measure shot consistency/dispersion | Scan only | Group size (cm), MOA |
| **Engagement** | Measure accuracy/hits | Scan or Manual | Hit count, accuracy % |

### By Context

| Context | Description | Team Required |
|---------|-------------|---------------|
| **Solo Practice** | Personal training session | No |
| **Team Training** | Part of a scheduled training | Yes |
| **Stress Drill** | Physical activity before shooting | No |

### By Control Mode

| Mode | Description | Features |
|------|-------------|----------|
| **Phone Only** | Manual control from phone | Timer, manual shot marking |
| **Watch Controlled** | Garmin watch tracks session | Auto shot detection, biometrics, timestamps |

---

## Session Creation Flow

### 3-Step UI Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SESSION CREATION STEPS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STEP 1: INTENT                                                         │
│  ─────────────────                                                      │
│  "What am I going to do?"                                               │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐                             │
│  │    GROUPING      │  │   ENGAGEMENT     │                             │
│  │    ○ ━━━━━━      │  │    ◎ ━━━━━━      │                             │
│  │  Measure shot    │  │  Hit targets     │                             │
│  │  dispersion      │  │  zone scoring    │                             │
│  └──────────────────┘  └──────────────────┘                             │
│                                                                          │
│  STEP 2: WEAPON                                                         │
│  ─────────────────                                                      │
│  "What am I shooting with?"                                             │
│                                                                          │
│  ┌──────────────────────────────────────────┐                           │
│  │  M40A5 Sniper Rifle                      │                           │
│  │  .308 Win  •  Bolt Action                │                           │
│  └──────────────────────────────────────────┘                           │
│  [Change Weapon]                                                         │
│                                                                          │
│  STEP 3: CONTEXT                                                        │
│  ─────────────────                                                      │
│  "Under what conditions?"                                               │
│                                                                          │
│  Distance:    [25m] [50m] [100m] [200m] [Other]                        │
│  Bullets:     [3] [5] [10] [20] [Other]  (hidden for grouping)         │
│  Position:    [Standing] [Kneeling] [Prone] [Any]                      │
│                                                                          │
│  ▼ More options                                                         │
│  ┌──────────────────────────────────────────┐                           │
│  │ ○ Time limit        Set a countdown      │                           │
│  │ ○ Stress drill      Physical activity    │                           │
│  │ [Session notes...]                       │                           │
│  └──────────────────────────────────────────┘                           │
│                                                                          │
│                    [Preview Session →]                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Session Prep View

After creating the session, users see the **SessionPrepView** where they:
- Review session configuration
- Choose Watch or Phone control
- Adjust shot detection sensitivity (if watch)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back                Ready to Start                              ✕    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│           ┌───────────────────────────────────────┐                     │
│           │           🎯 Grouping                 │                     │
│           │        100m • 5 shots • 2:00          │                     │
│           └───────────────────────────────────────┘                     │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐                               │
│  │ 🔫 Weapon       │  │ 👥 Training     │                               │
│  │ M40A5           │  │ Team Alpha      │                               │
│  │ .308 Win        │  │ Morning Drill   │                               │
│  └─────────────────┘  └─────────────────┘                               │
│                                                                          │
│  ┌───────────────────────────────────────────────────────┐              │
│  │  ⌚ Watch Connected                                    │              │
│  │  Ready to track                           [Refresh]   │              │
│  └───────────────────────────────────────────────────────┘              │
│                                                                          │
│  ┌───────────────────────────────────────────────────────┐              │
│  │  ⚙️ Shot Detection: 2.5G (Standard)              ▼    │              │
│  │  [Light 0.8G] [Medium 2.5G] [Heavy 4.0G] [Shotgun]   │              │
│  │  ✨ Auto (.308 Win)                                   │              │
│  └───────────────────────────────────────────────────────┘              │
│                                                                          │
│  ℹ️ Watch will track your shots automatically                           │
│                                                                          │
│              ┌─────────────────────────────────┐                        │
│              │   ⌚ Start with Watch           │                        │
│              └─────────────────────────────────┘                        │
│              ┌─────────────────────────────────┐                        │
│              │   📱 Phone Only                 │                        │
│              └─────────────────────────────────┘                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SESSION STATE MACHINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                           createSession()                                │
│                                 │                                        │
│                                 ▼                                        │
│   ┌─────────────┐      activateSession()      ┌─────────────┐           │
│   │   PENDING   │ ───────────────────────────▶│   ACTIVE    │           │
│   │             │                              │             │           │
│   │ Waiting for │                              │ Recording   │           │
│   │ watch/phone │                              │ shots       │           │
│   │ selection   │                              │             │           │
│   └─────────────┘                              └──────┬──────┘           │
│         │                                             │                  │
│         │ onClose()                      endSession() │                  │
│         │                                             │                  │
│         ▼                                             ▼                  │
│   ┌─────────────┐                              ┌─────────────┐          │
│   │  CANCELLED  │                              │  COMPLETED  │          │
│   │             │                              │             │          │
│   │ Deleted     │                              │ With stats  │          │
│   │             │                              │ and results │          │
│   └─────────────┘                              └─────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status | Description | UI View |
|--------|-------------|---------|
| `pending` | Created, waiting for watch/phone choice | SessionPrepView |
| `active` | In progress, recording shots | ActiveSessionView |
| `completed` | Finished with results saved | SessionDetail / History |
| `cancelled` | Abandoned/deleted | N/A |

---

## Watch Integration

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHONE ←→ WATCH COMMUNICATION                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PHONE                                              WATCH                │
│  ─────                                              ─────                │
│                                                                          │
│  1. SESSION_START ──────────────────────────────▶                       │
│     { sessionId, distance, shots, sensitivity }                         │
│                                                                          │
│                    ◀────────────────────────────── SESSION_START_ACK     │
│                                                                          │
│  2. Session Active...                                                    │
│     Watch detects shots via accelerometer                               │
│     Watch records: timestamp, heart rate                                │
│                                                                          │
│  3. SESSION_END ────────────────────────────────▶                       │
│                                                                          │
│                    ◀────────────────────────────── SESSION_SUMMARY       │
│     { shots, duration, avgHR, weather }                                 │
│                                                                          │
│                    ◀────────────────────────────── TIMELINE_CHUNK        │
│     { shotTimestamps[], biometrics[] }                                  │
│                                                                          │
│  4. TIMELINE_ACK ───────────────────────────────▶                       │
│                                                                          │
│                    ◀────────────────────────────── TIMELINE_COMPLETE     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Shot Detection Sensitivity

Based on weapon caliber/category:

| Category | Sensitivity | Use Case |
|----------|-------------|----------|
| Light (0.8G) | Low recoil | .22 LR, test rounds |
| Medium (2.5G) | Standard | 9mm, 5.56 NATO |
| Heavy (4.0G) | High recoil | .308, .45 ACP |
| Shotgun (5.5G) | Very high | 12 gauge |

---

## Data Input Methods

### Scan (Paper Targets)

```
User shoots → Scan paper target with camera → AI detects holes → 
Calculate grouping/hits → Save results
```

- Uses ML model to detect bullet holes
- Measures group size in cm/MOA
- Identifies hit zones for scoring

### Manual Entry

**For Engagement Sessions:**
```
User shoots → Enter hits count → Calculate accuracy → Save results
```
- Simple hit/miss counting
- Stage cleared toggle
- Time tracking (optional)

**For Grouping Sessions:**
```
User shoots → Enter group size (cm) → Save results
```
- Group size input in centimeters
- Quick preset buttons (1cm, 2cm, 3cm, 5cm, 10cm)
- No hits counter needed

---

## Session Results

### Data Captured

| Data Type | Source | Description |
|-----------|--------|-------------|
| Shots Fired | Watch/Manual | Total shot count |
| Hits | Scan/Manual | Successful hits on target |
| Accuracy | Calculated | hits/shots × 100 |
| Group Size | Scan | Dispersion in cm or MOA |
| Duration | Timer | Total session time |
| Heart Rate | Watch | Avg/Min/Max during session |
| Weather | Watch | Temp, wind, humidity, pressure |
| Shot Timeline | Watch | Timestamp + HR for each shot |

### Weather Data (from Watch)

```typescript
interface WatchWeather {
  temp: number;        // Temperature (°C)
  hum: number;         // Humidity (%)
  ws: number;          // Wind speed (m/s)
  wd: number;          // Wind direction (degrees)
  wb: number;          // Wind bearing
  press: number;       // Pressure (hPa)
  c: string;           // Condition code
}
```

---

## Database Schema

### Core Tables

```
sessions
├── id (UUID)
├── user_id (UUID)
├── team_id (UUID | null)
├── training_id (UUID | null)
├── weapon_id (UUID | null)
├── drill_config (JSONB)
├── status ('pending' | 'active' | 'completed' | 'cancelled')
├── watch_controlled (boolean)
├── started_at (timestamp)
├── completed_at (timestamp)
└── created_at (timestamp)

session_targets
├── id (UUID)
├── session_id (UUID)
├── distance_m (number)
├── position (string)
├── target_image_url (string | null)
└── created_at (timestamp)

paper_target_results
├── id (UUID)
├── session_target_id (UUID)
├── paper_type ('grouping' | 'engagement')
├── group_size_mm (number | null)
├── group_size_moa (number | null)
├── hits (number)
├── bullets_fired (number)
└── ring_breakdown (JSONB)

tactical_target_results
├── id (UUID)
├── session_target_id (UUID)
├── hits (number)
├── bullets_fired (number)
├── shot_timeline (JSONB)
├── biometrics (JSONB)
├── weather (JSONB)
└── created_at (timestamp)
```

---

## Key Files Reference

### Session Creation

| File | Purpose |
|------|---------|
| `app/(protected)/createSession.tsx` | Main creation screen |
| `components/session/creation/SessionIntentStep.tsx` | Step 1: Goal selection |
| `components/session/creation/SessionWeaponStep.tsx` | Step 2: Weapon selection |
| `components/session/creation/SessionContextStep.tsx` | Step 3: Details configuration |
| `components/session/creation/useSessionCreation.ts` | Creation state management |
| `components/session/creation/sessionCreation.types.ts` | Type definitions |

### Active Session

| File | Purpose |
|------|---------|
| `app/(protected)/activeSession.tsx` | Main active session screen |
| `components/session/activeSession/useActiveSession.ts` | Active session logic |
| `components/session/activeSession/SessionPrepView.tsx` | Watch/phone selection |
| `components/session/activeSession/WatchControlView.tsx` | Watch-controlled UI |

### Services

| File | Purpose |
|------|---------|
| `services/sessionService.ts` | Session CRUD operations |
| `services/session/types.ts` | Core type definitions |
| `services/session/targets.ts` | Target/result operations |
| `services/garminService.ts` | Watch communication |

### Stores

| File | Purpose |
|------|---------|
| `store/sessionStore.tsx` | Session list state |
| `store/garminStore.tsx` | Watch connection state |

---

## Common Scenarios

### Scenario 1: Quick Solo Practice

```
1. User taps "Start Session" on home
2. Selects "Grouping" → Next
3. Weapon auto-selected (default) → Next
4. Sets distance: 100m, position: Prone → Preview Session
5. SessionPrepView shows → "Start with Watch"
6. Session active, watch tracking shots
7. User shoots, watch detects each shot
8. User scans target → Group size calculated
9. User ends session → Results saved
```

### Scenario 2: Team Training

```
1. Commander creates training with drills
2. Soldier receives notification
3. Opens training, sees drill list
4. Taps "Start" on first drill
5. Session created with drill config locked
6. Completes drill, moves to next
7. Training marked complete when all drills done
```

### Scenario 3: Stress Drill

```
1. User enables "Stress drill" toggle
2. Physical activity before shooting (elevated HR)
3. Watch captures heart rate throughout
4. Results show HR correlation with accuracy
5. Analytics identify performance under stress
```

---

## API Reference

### Create Session

```typescript
import { createSession } from '@/services/sessionService';

const config: BaseSessionConfig = {
  team_id: null,              // Personal session
  training_id: null,          // Not part of training
  weapon_id: 'uuid',          // Selected weapon
  drill_id: null,             // No preset drill
  drill_config: {             // Inline config
    name: 'Practice',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 100,
    rounds_per_shooter: 5,
    time_limit_seconds: null,
  },
  session_mode: 'solo',
  watch_controlled: true,
  start_as_pending: true,
};

const session = await createSession(config);
```

### Activate Session

```typescript
import { activateSession } from '@/services/sessionService';

// User chose watch control
const activated = await activateSession(sessionId, true);
```

### End Session

```typescript
import { endSession } from '@/services/sessionService';

await endSession(sessionId);
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial session system |
| 2.0 | Jan 2025 | Simplified to 3-step flow, renamed achievement→engagement |
| 2.1 | Jan 2025 | Added stress drill toggle, removed bullets for grouping |

---

*Last updated: January 2025*

