# Garmin UX Improvements - Planning Document

> **Author's Intent:** The Garmin should be helpful, not a burden.

---

## Problem 1: Too Many Steps to Connect

### Current Flow (Painful)

```
1. User opens ReticleIQ app
2. User goes to Integrations
3. User taps "Connect Garmin"
4. Garmin Connect Mobile opens
5. User selects their watch
6. Returns to ReticleIQ
7. User must open the ConnectIQ app ON THE WATCH
8. Only then can they start a session that uses the watch
```

**Pain Points:**
- 8 steps before watch is usable
- User must remember to open watch app
- If watch app closes, connection lost
- Re-pairing needed after app restart

### Ideas to Simplify

#### Idea A: Auto-Open Watch App

**Concept:** When phone sends SESSION_START, automatically launch the watch app.

**How:**
- ConnectIQ SDK has `openApplication()` method
- Phone calls `openApplication(appId)` before sending SESSION_START
- Watch app opens automatically, no user action needed

**Trade-off:** User might not want app to open unexpectedly

#### Idea B: Persistent Background Connection

**Concept:** Keep watch app running in background, always listening.

**How:**
- Watch app runs as a "background service" (ConnectIQ supports this)
- Receives messages even when not in foreground
- Vibrates/beeps when session starts

**Trade-off:** Battery drain on watch

#### Idea C: Simplified Pairing with Remember

**Concept:** Once paired, never ask again unless truly broken.

**How:**
- On first pair, store device permanently
- On app start, silently attempt connection
- Only show "Connect" if connection actually fails
- Use `GarminConnectionBanner` to show status inline, not block

**Trade-off:** None significant - this is purely UX improvement

#### Idea D: "Watch Mode" Toggle

**Concept:** Let user explicitly enable/disable watch integration.

**How:**
- Settings → "Use Garmin Watch" toggle
- When OFF: All Garmin code paths skipped, no connection attempts
- When ON: Connection maintained, sessions sync to watch

**Trade-off:** User must remember to toggle

### Recommended Approach

Combine C + D:
1. Add "Use Garmin Watch" toggle in settings
2. When ON, maintain persistent connection silently
3. Show inline banner only when action needed
4. Never block user from starting sessions

---

## Problem 2: Drill Types & Watch Integration

### Drill Types

| Type | Input Method | What's Measured |
|------|--------------|-----------------|
| **Scanning (Paper)** | Camera scans paper target | Bullet holes detected by AI, positions, grouping |
| **Manual (Tactical)** | User taps to log shots | Shot count, hit/miss, time |

### Current Watch Behavior

Watch currently:
- Counts button presses as "shots"
- Tracks elapsed time
- Sends: `{ shotsFired, elapsedTime, completed }`

### Scenario Analysis

#### Scenario 1: User Has No Garmin

**Current:** Works fine, Garmin code paths check `status !== 'CONNECTED'` and skip.

**Ideal:** No change needed. Garmin features invisible if not connected.

#### Scenario 2: User Has Garmin + Scanning Drill

**Problem:** 
- Scanning drills measure accuracy via AI hole detection
- Watch can't detect bullet holes
- What value does watch add?

**Possible Watch Value:**
- Timer (hands-free start/stop)
- Shot counter as backup/validation
- Heart rate during session (stress indicator)
- Vibration alerts (time warnings)

**Proposed Flow:**
```
1. User starts scanning session on phone
2. Watch shows: Timer, Shot counter (optional)
3. User shoots
4. User taps watch button per shot (optional - for timing splits)
5. User scans target with phone camera
6. AI detects holes, calculates accuracy
7. Watch data supplements: timing, HR
8. Session ends with combined data
```

**Watch Display for Scanning:**
```
┌─────────────────────┐
│  🎯 Scanning Drill  │
│                     │
│  Timer: 00:45       │
│  Shots: 5 (tap +)   │
│                     │
│  [Optional Counter] │
└─────────────────────┘
```

**Key Insight:** For scanning drills, watch is **supplementary**, not primary.

#### Scenario 3: User Has Garmin + Manual Drill

**Current Value:**
- Watch IS the primary input device
- User taps watch per shot
- Watch enforces round limits
- Watch tracks timing

**This is where Garmin shines.**

**Proposed Flow:**
```
1. User starts manual session on phone
2. Phone sends drill config: { rounds: 10, distance: 25 }
3. Watch displays: "Failure Drill - 10 rounds"
4. User shoots, taps watch
5. Watch: shotsFired++, displays remaining
6. When shotsFired == rounds: vibrate, auto-complete
7. Watch sends SESSION_RESULT
8. Phone receives, updates session stats
```

**Watch Display for Manual:**
```
┌─────────────────────┐
│  🎯 Failure Drill   │
│     25m             │
│                     │
│  Shots: 7 / 10      │
│  Time: 00:32        │
│                     │
│  [TAP TO ADD SHOT]  │
└─────────────────────┘
```

**Watch Enforces Limits:**
- Can't exceed max shots
- Vibrates at limit
- User can end early with BACK

---

## Proposed Architecture Changes

### 1. Drill Mode Flag

Add to drill config:
```typescript
interface DrillConfig {
  // ... existing fields
  inputMode: 'scan' | 'manual';
  watchMode: 'primary' | 'supplementary' | 'disabled';
}
```

### 2. Watch Mode Behaviors

| watchMode | Watch Does | Phone Does |
|-----------|------------|------------|
| `primary` | Counts shots, enforces limits | Receives results |
| `supplementary` | Timer, optional counter | Primary input (scan/manual) |
| `disabled` | Nothing | Everything |

### 3. Adaptive Watch Display

Watch app receives drill type, adapts UI:

```
SESSION_START payload:
{
  sessionId: "...",
  drillName: "...",
  inputMode: "manual" | "scan",
  watchMode: "primary" | "supplementary",
  rounds: 10,
  distance: 25,
  timeLimit: 60
}
```

Watch shows different screens based on `inputMode` and `watchMode`.

---

## Session Flow Diagrams

### Flow A: No Garmin

```
User                    Phone                    Watch
  │                       │                        │
  │  Start Session        │                        │
  ├──────────────────────►│                        │
  │                       │                        │
  │                       │  (No watch connected)  │
  │                       │                        │
  │  Log shots manually   │                        │
  │  OR scan targets      │                        │
  ├──────────────────────►│                        │
  │                       │                        │
  │  End Session          │                        │
  ├──────────────────────►│                        │
  │                       │                        │
```

### Flow B: Garmin + Scanning Drill

```
User                    Phone                    Watch
  │                       │                        │
  │  Start Scan Session   │                        │
  ├──────────────────────►│                        │
  │                       │                        │
  │                       │  SESSION_START         │
  │                       │  (supplementary)       │
  │                       ├───────────────────────►│
  │                       │                        │
  │                       │  ACK                   │
  │                       │◄───────────────────────┤
  │                       │                        │
  │  Shoot                │         Timer runs     │
  │                       │         (optional tap) │
  │                       │                        │
  │  Scan target          │                        │
  ├──────────────────────►│                        │
  │                       │                        │
  │                       │  AI detects holes      │
  │                       │  Phone is primary      │
  │                       │                        │
  │  End Session          │                        │
  ├──────────────────────►│                        │
  │                       │                        │
  │                       │  END_SESSION           │
  │                       ├───────────────────────►│
  │                       │                        │
  │                       │  SESSION_RESULT        │
  │                       │  (timing data only)    │
  │                       │◄───────────────────────┤
  │                       │                        │
  │                       │  Merge watch timing    │
  │                       │  with scan results     │
  │                       │                        │
```

### Flow C: Garmin + Manual Drill (Primary)

```
User                    Phone                    Watch
  │                       │                        │
  │  Start Manual Session │                        │
  ├──────────────────────►│                        │
  │                       │                        │
  │                       │  SESSION_START         │
  │                       │  (primary, 10 rounds)  │
  │                       ├───────────────────────►│
  │                       │                        │
  │                       │  ACK                   │
  │                       │◄───────────────────────┤
  │                       │                        │
  │                       │         Shows:         │
  │                       │         "0 / 10"       │
  │                       │                        │
  │  Shoot + Tap Watch    │                        │
  │  ───────────────────────────────────────────►  │
  │                       │                        │
  │                       │         "1 / 10"       │
  │                       │                        │
  │  ... repeat ...       │                        │
  │                       │                        │
  │  Shoot + Tap (10th)   │                        │
  │  ───────────────────────────────────────────►  │
  │                       │                        │
  │                       │         "10 / 10"      │
  │                       │         VIBRATE!       │
  │                       │         Auto-complete  │
  │                       │                        │
  │                       │  SESSION_RESULT        │
  │                       │  (all data)            │
  │                       │◄───────────────────────┤
  │                       │                        │
  │                       │  Update session        │
  │                       │  (10 shots, 45s, etc)  │
  │                       │                        │
```

---

## UI/UX Recommendations

### 1. Connection Status (Non-Blocking)

```
┌─────────────────────────────────────────────────────┐
│ 📱 Active Session                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⌚ Watch: Connected                    ✓    │   │  ← Subtle, dismissible
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Or if not connected:                               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⌚ Watch offline        [Connect] [Dismiss] │   │  ← Non-blocking
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ... session content continues regardless ...       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2. Drill Type Indicator

When creating/starting drill, show what watch will do:

```
┌─────────────────────────────────────────────────────┐
│ Create Drill                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Name: Failure Drill                                │
│  Type: [Manual ▼]                                   │
│                                                     │
│  ⌚ Watch Mode:                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ● Primary - Watch counts shots              │   │
│  │ ○ Supplementary - Timer only                │   │
│  │ ○ Off - No watch integration                │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3. Session Start Confirmation

Before session starts, confirm watch readiness:

```
┌─────────────────────────────────────────────────────┐
│ Ready to Start                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Failure Drill - 10 rounds @ 25m                    │
│                                                     │
│  ⌚ Garmin: ✓ Connected                             │
│     Watch will count your shots                     │
│     Tap watch after each shot                       │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              START SESSION                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [ Start without watch ]                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1: Connection Simplification
1. ✅ GarminConnectionBanner (done)
2. ✅ Auto-reconnect on app resume (done)
3. ⬜ Silent connection on app start
4. ⬜ "Use Watch" setting toggle
5. ⬜ `openApplication()` to auto-launch watch app

### Phase 2: Drill Mode Awareness
1. ⬜ Add `watchMode` to drill config
2. ⬜ Pass `inputMode` and `watchMode` in SESSION_START
3. ⬜ Update watch app to show different UI per mode
4. ⬜ Merge watch data with scan results

### Phase 3: Polish
1. ⬜ Onboarding flow for Garmin setup
2. ⬜ "How to use watch" help screens
3. ⬜ Watch app improvements (vibration, sounds)
4. ⬜ Heart rate integration for stress tracking

---

## Summary

**Goal:** Garmin enhances training, never blocks it.

**Principles:**
1. No watch? No problem - app works fully without
2. Watch connected? Invisible unless useful
3. Manual drills → Watch is primary input
4. Scanning drills → Watch is supplementary (timer, optional counter)
5. Connection issues → Non-blocking, easy retry
6. One-time setup → Never ask again

**The watch should feel like a helpful assistant, not a gatekee

