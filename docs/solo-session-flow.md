# Solo Session Management

This document describes how a solo user (not in a team training) creates, configures, and executes a shooting session.

---

## Overview

A **solo session** gives the user full control over all parameters. The flow is designed around the question: *"What am I going to do?"*

```
┌─────────────────────────────────────────────────────────────────┐
│                        SOLO SESSION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CREATE          →    PREP         →    ACTIVE       →   END    │
│  (2 steps)            (optional)        (shooting)       (save) │
│                                                                  │
│  1. Intent            Watch?            Add targets      Review  │
│  2. Details           Sensitivity       Track shots      Score   │
│                       Time limit        Manual/Scan             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Session Creation

**Route:** `/createSession`

### Step 1: Intent (Goal)

*Question: "What's my goal?"*

User selects session purpose:

| Purpose | Description | Target Type |
|---------|-------------|-------------|
| **Grouping** | Precision practice, measure dispersion | Paper |
| **Engagement** | Hit targets, speed & accuracy | Tactical/Steel |

**Alternative:** User can skip by selecting a **saved drill preset** which auto-fills purpose + details.

### Step 2: Details (Context)

*Question: "Under what conditions?"*

| Field | Required | Description |
|-------|----------|-------------|
| **Weapon** | ✅ Yes | Select from personal weapons or create new |
| **Distance** | ✅ Yes | Default based on weapon category |
| **Shots** | ✅ Yes | Planned shots per target |
| **Position** | Optional | Standing, prone, kneeling, etc. |
| **Time Limit** | Optional | Per-target time constraint |

**Weapon Selection:**
- Opens weapon picker modal
- Shows personal weapons only (no team weapons in solo)
- Can create new weapon inline if none exist
- Selecting weapon auto-fills suggested distance based on category

**Drill Presets:**
- User can save current config as a preset for future quick-start
- Presets store: goal, distance, shots, time limit, weapon category

---

## Phase 2: Session Prep (Conditional)

**Component:** `SessionPrepView`

This phase only appears when a **Garmin watch is connected**. Without a watch, session activates immediately.

### Watch Connected Options

| Option | Description |
|--------|-------------|
| **Start with Watch** | Watch tracks shots, time, biometrics |
| **Phone Only** | Manual mode, no watch tracking |

### Watch Configuration

When starting with watch:

| Setting | Description |
|---------|-------------|
| **Shot Detection Sensitivity** | Auto-derived from weapon caliber, or manual override (0.8G-5.5G) |
| **Time Limit** | Optional countdown timer on watch |

**Sensitivity Presets:**
- Light (0.8G) - .22, test fire
- Medium (2.5G) - 9mm, 5.56
- Heavy (4.0G) - .45, .308
- Shotgun (5.5G) - 12ga
- Auto - Based on weapon caliber

---

## Phase 3: Active Session

**Route:** `/activeSession?sessionId={id}`

### Session Modes

| Mode | Control | Applies When |
|------|---------|--------------|
| **Solo** | Full control - can edit all parameters | No team/training attached |
| **Training** | Locked - drill config immutable | Part of team training |

### User Actions During Session

#### Adding Targets

| Action | Method | Result |
|--------|--------|--------|
| **Scan Paper** | Camera → AI detection | Auto-detects bullet holes, calculates dispersion |
| **Manual Entry** | Form input | User enters hits, shots fired, time |
| **Log Tactical** | Quick entry | Hits/misses for engagement targets |

#### Target Data Captured

| Data | Grouping | Engagement |
|------|----------|------------|
| Distance | ✅ | ✅ |
| Shots fired | ✅ | ✅ |
| Hits | ✅ | ✅ |
| Dispersion (cm) | ✅ | - |
| Time | Optional | Optional |
| Image | If scanned | - |

### Watch Integration (if enabled)

Watch provides:
- Real-time shot count
- Session duration
- Heart rate data
- Shot timestamps
- Biometric correlation

User can:
- Mark shots manually on watch
- End session from watch
- View live stats on watch

### Progress Tracking

For drills with requirements:
- Shots progress: X/Y fired
- Targets progress: X/Y completed
- Time remaining (if limit set)
- Accuracy percentage

**Drill Completion:**
- Modal appears when all requirements met
- User can continue or end early

---

## Phase 4: Session End

### Manual Session (No Watch)

Session ends immediately when user taps "End Session" (no confirmation if requirements met).

### Watch Session

1. Watch sends session summary
2. App receives: total shots, duration, biometrics
3. Data saved to session

### Session Summary

After ending, user sees:
- Total shots fired
- Total hits
- Accuracy %
- Best grouping (if paper)
- Session duration
- Score (based on drill type)

---

## Data Model

### Session Record

```typescript
interface Session {
  id: string;
  user_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  
  // Configuration
  drill_config: DrillConfig | null;
  weapon_id: string | null;
  weapon_name: string | null;
  weapon_caliber: string | null;
  weapon_category: string | null;
  
  // Execution
  watch_controlled: boolean;
  started_at: string | null;
  ended_at: string | null;
  
  // Context (solo only)
  team_id: string | null;      // null for solo
  training_id: string | null;  // null for solo
  
  // Results
  stats: SessionStats;
  weather: WeatherData | null;
}
```

### Drill Config

```typescript
interface DrillConfig {
  name: string;
  drill_goal: 'grouping' | 'engagement';
  distance_m: number;
  rounds_per_shooter: number;
  targets_per_round: number;
  time_limit_seconds: number | null;
  target_type: 'paper' | 'tactical';
  position: string | null;
}
```

---

## Permission Model (Solo)

| Action | Allowed |
|--------|---------|
| Edit drill config | ✅ Yes |
| Change distance per target | ✅ Yes |
| Add unlimited targets | ✅ Yes (unless drill limit) |
| End session anytime | ✅ Yes |
| Delete session | ✅ Yes |

---

## Comparison: Solo vs Team Training

| Aspect | Solo | Team Training |
|--------|------|---------------|
| Drill config | Editable | Locked |
| Weapon selection | User choice | May be assigned |
| Distance | User choice | Fixed by drill |
| Shots per target | User choice | Fixed by drill |
| Can skip requirements | ✅ Yes | ❌ No |
| Back button | ✅ Visible | ❌ Hidden |
| Session mode | `'solo'` | `'training'` |

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `createSession.tsx` | 2-step creation flow |
| `SessionIntentStep` | Goal selection UI |
| `SessionContextStep` | Details configuration UI |
| `SessionPrepView` | Watch setup & start |
| `activeSession.tsx` | Main session screen |
| `useActiveSession` | All session state/logic |
| `TacticalTargetFlow` | Manual hit entry |
| `paperTarget.tsx` | Paper scan flow |
| `WeaponPicker` | Weapon selection modal |

---

## Key Behaviors

1. **Active Session Check:** On create, checks for existing active session → offer continue/delete
2. **Weather Auto-Attach:** Fetches weather in background, attaches to session
3. **Watch Auto-Start:** If watch connected + watch_controlled, auto-sends session to watch
4. **Drill Completion Detection:** Monitors progress, shows modal when complete
5. **Graceful Fallback:** If watch fails, user can continue phone-only
