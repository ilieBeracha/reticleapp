# Session Creation Flows

> **Note:** Following the session simplification (Dec 2024), the primary entry point is now the unified `createSession` screen with three tabs: Quick Start, Custom, and My Presets.

> Complete documentation of all paths that lead a user to enter scores (active session).

---

## Overview

A **Session** is the core unit where users record their shooting performance. All paths eventually lead to the `activeSession` screen where users:
- Add targets (scan or manual)
- Record shots and hits
- Complete the session with stats

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SESSION ENTRY POINTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │   SOLO       │   │  TRAINING    │   │   RESUME     │   │  GARMIN      │  │
│  │  PRACTICE    │   │    DRILL     │   │   ACTIVE     │   │   WATCH      │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  │
│         │                  │                  │                  │          │
│         ▼                  ▼                  ▼                  ▼          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        createSession()                                │   │
│  │                    services/sessionService.ts                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       activeSession.tsx                               │   │
│  │              /(protected)/activeSession?sessionId=xxx                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         USER ENTERS SCORES                            │   │
│  │                    (targets, shots, hits, accuracy)                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Solo Practice (Personal Session)

**Entry Points:**
- Home page → "Quick Practice" button
- Quick Actions Grid → "Quick Practice" tile
- SmartActionHero → "Start Session" card

**Path:**
```
Home Page
    │
    ├── QuickActionsGrid → "Quick Practice"
    │   └── router.push('/(protected)/createSession')
    │
    ├── SmartActionHero → StartSessionCard → onStart()
    │   └── UnifiedHomePage.handleStartSession()
    │       └── router.push('/(protected)/createSession')
    │
    └── UnifiedHomePage → direct button
        └── router.push('/(protected)/createSession')
```

**createSession.tsx Flow:**
```
createSession.tsx
    │
    ├── 1. Check for active session (useFocusEffect)
    │   │   └── getMyActiveSession()
    │   │
    │   ├── If active session exists → Alert:
    │   │   ├── "Continue" → activeSession?sessionId=xxx
    │   │   ├── "Delete & Start New" → deleteSession() → continue
    │   │   └── "Cancel" → router.back()
    │   │
    │   └── If no active session → show form
    │
    ├── 2. useSessionForm hook manages state:
    │   ├── drillGoal: 'grouping' | 'achievement'
    │   ├── inputMethod: 'scan' | 'manual'
    │   ├── distance, shots, rounds, timeLimit
    │   └── controlMode: 'phone' | 'watch' (removed from UI)
    │
    ├── 3. SessionFormSheet renders form:
    │   ├── OBJECTIVE: Grouping or Achievement
    │   ├── INPUT METHOD: Scan or Manual
    │   └── PARAMETERS: Distance, Shots, Rounds, Time
    │
    └── 4. Submit → form.submit()
        │   └── createSession(config)
        │
        └── Success → router.replace('/(protected)/activeSession')
```

**Key Files:**
- `app/(protected)/createSession.tsx` - Screen
- `components/session/form/SessionFormSheet.tsx` - Form UI
- `components/session/form/useSessionForm.ts` - Form logic/state

---

## Flow 2: Training Drill (Team Session)

**Entry Points:**
- Training Detail page → Drill row → "Start" button
- Training notifications → Deep link to training

**Path:**
```
Home/Calendar/Notifications
    │
    └── Navigate to Training
        └── router.push('/(protected)/trainingDetail?id=xxx')
            │
            ├── TrainingDetail shows drill list
            │
            └── DrillRow → handleStartDrill(drill)
                │
                └── useTrainingActions.handleStartDrill()
                    │
                    ├── Create session config:
                    │   ├── team_id: training.team_id
                    │   ├── training_id: training.id
                    │   ├── drill_id: drill.id
                    │   ├── drill_config: null (uses training_drills table)
                    │   ├── watch_controlled: false
                    │   └── start_as_pending: true
                    │
                    └── createSession(config)
                        └── router.push('/(protected)/activeSession?sessionId=xxx')
```

**Training Flow Details:**
```
trainingDetail.tsx
    │
    ├── Training Status: 'planned' | 'ongoing' | 'finished' | 'cancelled'
    │
    ├── If 'planned':
    │   └── Commander can "Start Training" → startTrainingWithConfig()
    │       └── Status changes to 'ongoing'
    │
    ├── If 'ongoing':
    │   └── Users can start individual drills
    │       │
    │       └── DrillRow.onStart()
    │           └── handleStartDrill(drill)
    │               └── Creates session → activeSession
    │
    └── If 'finished':
        └── View-only mode with results
```

**Key Files:**
- `app/(protected)/trainingDetail.tsx` - Training detail screen
- `components/training-detail/hooks/useTrainingActions.ts` - Start drill logic
- `app/(protected)/createTraining.tsx` - Create training (schedule drills)

---

## Flow 3: Resume Active Session

**Entry Points:**
- Home page → Active session banner
- SmartActionHero → Resume card
- Orphaned session check on app launch
- Notifications → Deep link

**Path:**
```
App Launch / Navigation
    │
    ├── useOrphanedSessionCheck (hooks/useOrphanedSessionCheck.ts)
    │   └── Checks for orphaned 'active' sessions
    │       └── Alert: "Continue" or "Complete & Start New"
    │
    ├── ActiveSessionBanner (home)
    │   └── handleContinue()
    │       └── router.push('/(protected)/activeSession?sessionId=xxx')
    │
    ├── SmartActionHero → hasActiveSession
    │   └── onResume()
    │       └── router.push('/(protected)/activeSession?sessionId=xxx')
    │
    └── Notifications → handleNotificationPress()
        └── screen: 'activeSession', id: sessionId
            └── router.push('/(protected)/activeSession?sessionId=xxx')
```

**Key Files:**
- `hooks/useOrphanedSessionCheck.ts` - Detects orphaned sessions
- `components/home/ActiveSessionBanner.tsx` - Banner component
- `hooks/useNotifications.ts` - Notification handling

---

## Flow 4: Session with Watch Control

**Entry Points:**
- Any session creation flow with Garmin watch connected

**Path:**
```
Session Creation (any flow)
    │
    └── Session created with start_as_pending: true
        │
        └── activeSession.tsx loads
            │
            ├── If session.status === 'pending':
            │   └── Show SessionPrepView
            │       │
            │       ├── Watch Status Card
            │       │   ├── "Watch Connected" or "No Watch Detected"
            │       │   └── Refresh button to detect watch
            │       │
            │       ├── Drill Requirements
            │       │   └── Distance, shots, time limit
            │       │
            │       └── Action Buttons:
            │           ├── "Start with Watch" → activateSession(id, true)
            │           └── "Phone Only" → activateSession(id, false)
            │
            └── Session activated → Normal active session view
                │
                └── useGarminSession hook:
                    ├── Syncs drill config to watch
                    ├── Receives shot timestamps
                    └── On end: requestWatchData()
```

**Key Files:**
- `components/session/activeSession/SessionPrepView.tsx` - Watch selection
- `hooks/useGarminSession.ts` - Garmin integration
- `store/garminStore.tsx` - Watch connection state

---

## Flow 5: Quick Drill in Training Creation

**Entry Points:**
- Create Training screen → "New" drill button

**Path:**
```
createTraining.tsx
    │
    ├── DrillLibraryPicker
    │   ├── Shows team's existing drills
    │   └── "+ New" button → handleOpenQuickDrill()
    │
    └── UnifiedDrillModal (mode: 'quick')
        │
        ├── User fills drill form:
        │   ├── Name (required)
        │   ├── Objective: Grouping or Achievement
        │   ├── Input Method: Scan or Manual (hidden for grouping)
        │   └── Parameters: Distance, Shots, Rounds, Time
        │
        └── "Add Drill" → handleQuickDrillSave()
            │
            ├── Creates drill template in DB
            └── Adds to training drill list
```

**Note:** This doesn't start a session directly. It creates a drill that will be started later when the training is executed.

**Key Files:**
- `app/(protected)/createTraining.tsx` - Training creation screen
- `components/drills/UnifiedDrillModal.tsx` - Drill form modal

---

## Session States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SESSION LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────────┐                │
│   │ PENDING │───▶│ ACTIVE  │───▶│COMPLETED│    │ CANCELLED │                │
│   └─────────┘    └─────────┘    └─────────┘    └───────────┘                │
│       │              │                                                       │
│       │              │                                                       │
│  Created with    User adds        User ends                                  │
│  watch pending   targets/shots    session                                    │
│       │              │                                                       │
│       ▼              ▼                                                       │
│  SessionPrepView  ActiveSession                                              │
│  (choose watch    (main scoring                                              │
│   or phone)        interface)                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Status Definitions:**
- `pending` - Created but not activated (waiting for watch choice)
- `active` - In progress, user is recording scores
- `completed` - Finished with results
- `cancelled` - Abandoned/deleted

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CREATION                                                                    │
│  ────────                                                                    │
│  useSessionForm.buildSessionConfig() → BaseSessionConfig                     │
│      │                                                                       │
│      ├── team_id: string | null (null = personal solo session)              │
│      ├── training_id: string | null (null = not part of training)           │
│      ├── drill_id: string | null (training drill reference)                 │
│      ├── drill_template_id: string | null                                   │
│      ├── drill_config: DrillConfig | null (inline drill definition)         │
│      ├── session_mode: 'solo' | 'group'                                     │
│      ├── watch_controlled: boolean                                          │
│      └── start_as_pending: boolean                                          │
│                                                                              │
│  RUNTIME                                                                     │
│  ───────                                                                     │
│  SessionWithDetails (from activeSession)                                     │
│      │                                                                       │
│      ├── Session metadata (id, status, times)                               │
│      ├── drill_config (merged from various sources)                         │
│      ├── targets[] (recorded shots)                                         │
│      └── stats (calculated accuracy, hits, etc.)                            │
│                                                                              │
│  COMPLETION                                                                  │
│  ──────────                                                                  │
│  completeSession(sessionId)                                                  │
│      │                                                                       │
│      ├── Calculates final stats                                             │
│      ├── If watch: requestWatchData() for shot timestamps                   │
│      └── Saves to sessions table with status: 'completed'                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Types

```typescript
// Session configuration for creation
interface BaseSessionConfig {
  team_id: string | null;
  training_id: string | null;
  drill_id: string | null;
  drill_template_id: string | null;
  drill_config: DrillConfig | null;
  session_mode: 'solo' | 'group';
  watch_controlled: boolean;
  start_as_pending: boolean;
}

// Drill configuration (embedded in session)
interface DrillConfig {
  name: string;
  drill_goal: 'grouping' | 'achievement';
  target_type: 'paper' | 'tactical';
  input_method: 'scan' | 'manual';
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds: number | null;
  strings_count: number;
}

// Form state for session creation
interface SessionFormState {
  name: string;
  drillGoal: 'grouping' | 'achievement';
  inputMethod: 'scan' | 'manual';
  distance: number;
  shots: number;
  rounds: number;
  timeLimit: number | null;
  controlMode: 'phone' | 'watch';
}
```

---

## Entry Point Summary Table

| Entry Point | Screen | Flow | Team Required |
|------------|--------|------|---------------|
| Quick Practice | Home | Solo → createSession → activeSession | No |
| Quick Actions Grid | Home | Solo → createSession → activeSession | No |
| Start Session Card | Home | Solo → createSession → activeSession | No |
| Training Drill | trainingDetail | Training → createSession → activeSession | Yes |
| Resume Banner | Home | Direct → activeSession | No |
| Orphaned Check | App Launch | Direct → activeSession | No |
| Notification | Any | Deep link → activeSession | Varies |

---

## Related Files

**Core Session Files:**
- `app/(protected)/createSession.tsx` - Solo session creation screen
- `app/(protected)/activeSession.tsx` - Active session screen
- `services/sessionService.ts` - Session CRUD operations
- `services/session/types.ts` - Session type definitions

**Form Components:**
- `components/session/form/SessionFormSheet.tsx` - Session form UI
- `components/session/form/useSessionForm.ts` - Form state hook
- `components/session/form/DrillFormComponents.tsx` - Shared UI primitives

**Training Integration:**
- `app/(protected)/trainingDetail.tsx` - Training detail screen
- `app/(protected)/createTraining.tsx` - Training creation
- `components/training-detail/hooks/useTrainingActions.ts` - Drill start logic
- `components/drills/UnifiedDrillModal.tsx` - Drill form modal

**Watch Integration:**
- `components/session/activeSession/SessionPrepView.tsx` - Watch selection
- `hooks/useGarminSession.ts` - Garmin session hook
- `store/garminStore.tsx` - Watch state management

**Home Entry Points:**
- `components/home/UnifiedHomePage.tsx` - Main home
- `components/home/unified/sections/QuickActionsGrid.tsx` - Quick actions
- `components/home/personal-home/SmartActionHero.tsx` - Smart hero card
- `components/home/ActiveSessionBanner.tsx` - Resume banner

