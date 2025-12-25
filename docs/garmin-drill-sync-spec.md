# Garmin Drill Sync Specification

> **Document Purpose:** Specifications for syncing drills between mobile app and Garmin watch, with mode-aware behavior.

---

## Overview

Every drill can be opened/controlled from the watch. The watch behavior adapts based on drill type:

| Drill Type | Input Method | Watch Mode | Watch Primary Function |
|------------|--------------|------------|------------------------|
| **Zeroing** | `scan` | `supplementary` | Timer only |
| **Grouping** | `scan` | `supplementary` | Timer only |
| **Timed** | `manual` | `primary` | Shot counter + enforces limits |
| **Qualification** | `both` | `adaptive` | Based on user choice |

---

## Message Protocol

### SESSION_START (Phone → Watch)

**When:** User starts a session on the phone

```typescript
interface SessionStartPayload {
  // Session identification
  sessionId: string;           // UUID matching DB session
  drillName: string;           // Display name ("Bill Drill", "5-Shot Group")
  
  // Drill classification
  drillType: 'zeroing' | 'grouping' | 'timed' | 'qualification';
  inputMethod: 'scan' | 'manual' | 'both';
  
  // Watch behavior mode
  watchMode: 'primary' | 'supplementary';
  
  // Drill parameters
  distance: number;            // meters
  rounds: number;              // max shots (0 = unlimited)
  timeLimit: number | null;    // seconds (null = no limit)
  parTime: number | null;      // seconds (null = no par)
  strings: number;             // number of strings/stages
  
  // Timestamps
  startedAt: number;           // Unix timestamp ms
}
```

### SESSION_RESULT (Watch → Phone)

**When:** Session ends on watch (auto-complete OR user presses BACK)

```typescript
interface SessionResultPayload {
  // Session identification
  sessionId: string;
  
  // Results
  shotsFired: number;          // Total shots counted
  elapsedTime: number;         // Seconds (with decimals)
  completed: boolean;          // true = max rounds reached
  
  // Per-string data (if applicable)
  strings?: {
    index: number;
    shots: number;
    time: number;
  }[];
  
  // Optional extras
  splitTimes?: number[];       // Time between shots (ms)
  avgSplit?: number;           // Average split (ms)
  heartRate?: {
    avg: number;
    max: number;
    min: number;
  };
}
```

---

## Watch Modes Explained

### Mode: `primary`

**Used for:** Timed drills, Manual qualification drills

**Watch is the main input device:**
- User MUST tap watch to count shots
- Watch enforces round limits (blocks after max)
- Watch can auto-complete session when limit reached
- Watch data is authoritative

**Display:**
```
┌─────────────────────┐
│  🎯 Bill Drill      │
│     7m              │
│                     │
│  Shots: 3 / 6       │  ← Progress toward limit
│  Time: 00:01.2      │
│  Par: 2.0s          │  ← If par time set
│                     │
│  [ TAP TO ADD SHOT ]│
└─────────────────────┘
```

**Behavior:**
1. Each tap increments shot count
2. Display updates immediately
3. When `shotsFired >= rounds`:
   - Vibrate/beep
   - Show "COMPLETE"
   - Auto-send SESSION_RESULT
   - Return to idle
4. User can press BACK to end early
   - `completed = false` in result

---

### Mode: `supplementary`

**Used for:** Zeroing drills, Grouping drills (any scan-based drill)

**Watch is a passive timer:**
- Shot counting is OPTIONAL (user choice)
- Watch does NOT enforce limits
- Phone is authoritative (via camera scan)
- Watch provides timing/HR data only

**Display:**
```
┌─────────────────────┐
│  🎯 5-Shot Group    │
│     100m            │
│                     │
│  Timer: 00:45.3     │  ← Always running
│                     │
│  Shots: -- (tap +)  │  ← Optional, no limit
│                     │
│  [ TAP FOR SPLIT ]  │  ← Optional timing
└─────────────────────┘
```

**Behavior:**
1. Timer starts immediately on SESSION_START
2. Taps are optional (for split timing only)
3. No shot limit enforced
4. Session ends only when:
   - Phone sends END_SESSION, OR
   - User presses BACK on watch
5. SESSION_RESULT sent with timing data

---

## Drill Type → Watch Mode Mapping

### Automatic Derivation (Mobile App)

```typescript
function deriveWatchMode(drill: Drill): 'primary' | 'supplementary' {
  // Based on inputMethod from drill type
  const drillType = DRILL_TYPES[drill.drill_type];
  
  if (drillType.inputMethod === 'manual') {
    return 'primary';
  }
  
  if (drillType.inputMethod === 'scan') {
    return 'supplementary';
  }
  
  // For 'both', check target_type or drill_goal
  if (drill.target_type === 'tactical') {
    return 'primary';
  }
  
  return 'supplementary';
}
```

### Mapping Table

| drillType | inputMethod | target_type | watchMode |
|-----------|-------------|-------------|-----------|
| zeroing | scan | paper | supplementary |
| grouping | scan | paper | supplementary |
| timed | manual | tactical | **primary** |
| qualification | both | paper | supplementary |
| qualification | both | tactical | **primary** |

---

## Mobile App Implementation

### 1. Update SessionDrillConfig Type

```typescript
// types/session.ts
export interface SessionDrillConfig {
  sessionId: string;
  drillName: string;
  drillType: DrillTypeId;
  inputMethod: InputMethod;
  watchMode: 'primary' | 'supplementary';
  distance: number;
  rounds: number;
  timeLimit: number | null;
  parTime: number | null;
  strings: number;
}
```

### 2. Create deriveWatchMode Helper

```typescript
// utils/garminHelpers.ts
import { DRILL_TYPES, DrillTypeId } from '@/types/drillTypes';
import type { Drill } from '@/types/workspace';

export function deriveWatchMode(
  drill: Drill | { drill_type?: DrillTypeId; target_type?: string }
): 'primary' | 'supplementary' {
  const drillTypeId = drill.drill_type as DrillTypeId | undefined;
  
  if (!drillTypeId || !DRILL_TYPES[drillTypeId]) {
    // Fallback: if we don't know, use supplementary (safer)
    return 'supplementary';
  }
  
  const drillType = DRILL_TYPES[drillTypeId];
  
  // Manual drills = primary (watch counts shots)
  if (drillType.inputMethod === 'manual') {
    return 'primary';
  }
  
  // Scan drills = supplementary (phone counts via camera)
  if (drillType.inputMethod === 'scan') {
    return 'supplementary';
  }
  
  // "both" = check target type
  if (drill.target_type === 'tactical') {
    return 'primary';
  }
  
  return 'supplementary';
}
```

### 3. Update garminService.startWatchSession

```typescript
// services/garminService.ts

export interface StartSessionPayload {
  sessionId: string;
  drillName: string;
  drillType: DrillTypeId;
  inputMethod: InputMethod;
  watchMode: 'primary' | 'supplementary';
  distance: number;
  rounds: number;
  timeLimit: number | null;
  parTime: number | null;
  strings: number;
  startedAt: number;
}

export function startWatchSession(config: StartSessionPayload): boolean {
  return sendMessage('START_SESSION', config);
}
```

### 4. Update activeSession.tsx

```typescript
// app/(protected)/activeSession.tsx

import { deriveWatchMode } from '@/utils/garminHelpers';

// When starting session:
const handleStartSession = async () => {
  // ... create session in DB ...
  
  // Prepare watch payload
  const watchMode = deriveWatchMode(currentDrill);
  
  startWatchSession({
    sessionId: session.id,
    drillName: currentDrill.name,
    drillType: currentDrill.drill_type as DrillTypeId,
    inputMethod: DRILL_TYPES[currentDrill.drill_type].inputMethod,
    watchMode,
    distance: currentDrill.distance_m,
    rounds: currentDrill.rounds_per_shooter,
    timeLimit: currentDrill.time_limit_seconds,
    parTime: currentDrill.par_time_seconds ?? null,
    strings: currentDrill.strings_count ?? 1,
    startedAt: Date.now(),
  });
};
```

### 5. Handle SESSION_RESULT Based on Mode

```typescript
// In session completion handler:

const handleWatchSessionResult = (data: GarminSessionData) => {
  const watchMode = deriveWatchMode(currentDrill);
  
  if (watchMode === 'primary') {
    // Watch is authoritative - use its shot count
    setSessionShots(data.shotsRecorded);
    setSessionDuration(data.durationMs);
    
    if (data.completed) {
      // Auto-complete the session
      completeSession();
    }
  } else {
    // Supplementary - just use timing data
    setSessionDuration(data.durationMs);
    // Shot count comes from phone (camera scan)
  }
};
```

---

## Watch App Implementation (Monkey C)

### 1. Session State Model

```javascript
// SessionManager.mc

class SessionManager {
    // State
    var _sessionId as String?;
    var _drillName as String?;
    var _watchMode as String = "supplementary";  // "primary" | "supplementary"
    var _inputMethod as String = "scan";         // "scan" | "manual" | "both"
    
    // Parameters
    var _distance as Number = 0;
    var _maxRounds as Number = 0;      // 0 = unlimited
    var _timeLimit as Number? = null;  // seconds, null = none
    var _parTime as Number? = null;    // seconds, null = none
    var _strings as Number = 1;
    
    // Runtime
    var _shotsFired as Number = 0;
    var _startTime as Number = 0;
    var _splitTimes as Array<Number> = [];
    var _isActive as Boolean = false;
    
    // ...
}
```

### 2. Message Handler

```javascript
// CommDelegate.mc

function onMessage(msg) {
    var type = msg.get("type");
    var payload = msg.get("payload");
    
    if (type.equals("START_SESSION")) {
        handleSessionStart(payload);
    } else if (type.equals("END_SESSION")) {
        handleSessionEnd(payload);
    }
}

function handleSessionStart(payload) {
    // Parse all fields
    SessionManager.startSession(
        payload.get("sessionId"),
        payload.get("drillName"),
        payload.get("watchMode"),      // NEW: "primary" or "supplementary"
        payload.get("inputMethod"),    // NEW: "scan", "manual", "both"
        payload.get("distance"),
        payload.get("rounds"),
        payload.get("timeLimit"),
        payload.get("parTime"),
        payload.get("strings")
    );
    
    // Switch to appropriate view based on mode
    if (payload.get("watchMode").equals("primary")) {
        WatchUi.switchToView(new PrimarySessionView(), new PrimarySessionDelegate());
    } else {
        WatchUi.switchToView(new SupplementarySessionView(), new SupplementarySessionDelegate());
    }
    
    // Send ACK
    Comm.sendMessage({"type": "ACK", "payload": {"status": "session_started"}});
}
```

### 3. Primary Mode View

```javascript
// PrimarySessionView.mc

class PrimarySessionView extends WatchUi.View {
    
    function onUpdate(dc) {
        dc.clear();
        
        // Drill name + distance
        dc.drawText(center_x, 20, Graphics.FONT_SMALL, 
            SessionManager.getDrillName() + " - " + SessionManager.getDistance() + "m");
        
        // Shot counter (prominent)
        var shotsText = SessionManager.getShotsFired() + " / " + SessionManager.getMaxRounds();
        dc.drawText(center_x, center_y - 20, Graphics.FONT_LARGE, shotsText);
        
        // Timer
        var elapsed = SessionManager.getElapsedTime();
        dc.drawText(center_x, center_y + 30, Graphics.FONT_MEDIUM, formatTime(elapsed));
        
        // Par time indicator (if set)
        if (SessionManager.getParTime() != null) {
            dc.drawText(center_x, center_y + 60, Graphics.FONT_SMALL, 
                "Par: " + SessionManager.getParTime() + "s");
        }
        
        // Instruction
        dc.drawText(center_x, height - 40, Graphics.FONT_TINY, "TAP TO ADD SHOT");
    }
}

class PrimarySessionDelegate extends WatchUi.BehaviorDelegate {
    
    function onSelect() {
        // Button press = add shot
        var result = SessionManager.addShot();
        
        if (result == :completed) {
            // Max rounds reached
            Attention.vibrate([new Attention.VibeProfile(100, 500)]);
            SessionManager.endSession(true);  // completed = true
        }
        
        WatchUi.requestUpdate();
        return true;
    }
    
    function onBack() {
        // Manual end (early)
        SessionManager.endSession(false);  // completed = false
        return true;
    }
}
```

### 4. Supplementary Mode View

```javascript
// SupplementarySessionView.mc

class SupplementarySessionView extends WatchUi.View {
    
    function onUpdate(dc) {
        dc.clear();
        
        // Drill name + distance
        dc.drawText(center_x, 20, Graphics.FONT_SMALL, 
            SessionManager.getDrillName() + " - " + SessionManager.getDistance() + "m");
        
        // Timer (prominent - main feature)
        var elapsed = SessionManager.getElapsedTime();
        dc.drawText(center_x, center_y, Graphics.FONT_NUMBER_THAI_HOT, formatTime(elapsed));
        
        // Optional shot counter (smaller, muted)
        if (SessionManager.getShotsFired() > 0) {
            dc.drawText(center_x, center_y + 50, Graphics.FONT_SMALL, 
                "Taps: " + SessionManager.getShotsFired());
        }
        
        // Instruction
        dc.drawText(center_x, height - 40, Graphics.FONT_TINY, "TAP FOR SPLIT TIME");
    }
}

class SupplementarySessionDelegate extends WatchUi.BehaviorDelegate {
    
    function onSelect() {
        // Optional split time recording
        SessionManager.recordSplit();
        WatchUi.requestUpdate();
        return true;
    }
    
    function onBack() {
        // End session - always sends result
        SessionManager.endSession(false);
        return true;
    }
}
```

### 5. Session End & Result

```javascript
// SessionManager.mc

function endSession(completed as Boolean) {
    if (!_isActive) { return; }
    
    var elapsed = (System.getTimer() - _startTime) / 1000.0;  // seconds
    
    var result = {
        "type" => "SESSION_RESULT",
        "payload" => {
            "sessionId" => _sessionId,
            "shotsFired" => _shotsFired,
            "elapsedTime" => elapsed,
            "completed" => completed,
            "distance" => _distance,
            "splitTimes" => _splitTimes,
            "avgSplit" => calculateAvgSplit()
        }
    };
    
    Comm.sendMessage(result);
    
    // Reset state
    _isActive = false;
    _sessionId = null;
    _shotsFired = 0;
    _splitTimes = [];
    
    // Return to idle view
    WatchUi.switchToView(new IdleView(), new IdleDelegate());
}

function addShot() {
    if (!_isActive) { return :inactive; }
    
    _shotsFired += 1;
    
    // Record split time
    var now = System.getTimer();
    if (_splitTimes.size() > 0) {
        _splitTimes.add(now - _lastShotTime);
    }
    _lastShotTime = now;
    
    // Check if completed (primary mode with limit)
    if (_watchMode.equals("primary") && _maxRounds > 0 && _shotsFired >= _maxRounds) {
        return :completed;
    }
    
    return :added;
}
```

---

## UI/UX Guidelines

### Mobile App

1. **Session Start Screen** - Show watch mode indicator:
   ```
   ┌─────────────────────────────────────────┐
   │  Ready to Start: Bill Drill            │
   │                                         │
   │  Distance: 7m                           │
   │  Rounds: 6                              │
   │  Par Time: 2.0s                         │
   │                                         │
   │  ⌚ Garmin: Connected                   │
   │  Mode: Primary                          │
   │  → Watch will count your shots          │
   │  → Tap watch after each shot            │
   │                                         │
   │  [ START SESSION ]                      │
   └─────────────────────────────────────────┘
   ```

2. **For Supplementary Mode:**
   ```
   │  ⌚ Garmin: Connected                   │
   │  Mode: Timer Only                       │
   │  → Timer runs on watch                  │
   │  → Scan target when done                │
   ```

3. **No Watch Connected:**
   ```
   │  ⌚ Garmin: Not connected              │
   │  Session will run on phone only         │
   │                                         │
   │  [ START SESSION ] [ Connect Watch ]    │
   ```

### Watch App

1. **Primary Mode UI Priority:**
   - Shot count (LARGE, center)
   - Remaining shots
   - Timer
   - Par time indicator

2. **Supplementary Mode UI Priority:**
   - Timer (LARGE, center)
   - Drill info (smaller)
   - Optional tap counter (subtle)

3. **Visual Feedback:**
   - Short vibrate on each tap (primary mode)
   - Long vibrate on completion
   - Green checkmark when complete
   - Red X if ended early

---

## Implementation Checklist

### Mobile App (React Native)

- [ ] Create `deriveWatchMode()` helper function
- [ ] Update `SessionDrillConfig` type with `watchMode`
- [ ] Modify `startWatchSession()` to include new fields
- [ ] Update `activeSession.tsx` to derive and send watchMode
- [ ] Handle SESSION_RESULT differently based on watchMode
- [ ] Update session start UI to show watch mode

### Watch App (Monkey C)

- [ ] Parse new SESSION_START fields (`watchMode`, `inputMethod`)
- [ ] Create `PrimarySessionView` (shot counting focus)
- [ ] Create `SupplementarySessionView` (timer focus)
- [ ] Update `SessionManager` to track mode
- [ ] Implement shot limit enforcement for primary mode
- [ ] Add split time recording for both modes
- [ ] Include all data in SESSION_RESULT

---

## Testing Scenarios

| Test | Expected Behavior |
|------|-------------------|
| Start Timed drill with watch | Watch shows primary UI, counts shots, enforces limit |
| Start Grouping drill with watch | Watch shows timer only, no limit enforcement |
| Tap beyond limit in primary mode | Watch blocks, vibrates, auto-completes |
| End early with BACK (primary) | SESSION_RESULT with completed=false |
| End early with BACK (supplementary) | SESSION_RESULT with timing data |
| Start drill, watch not connected | Phone works normally, no watch features |
| Reconnect mid-session | Not supported - session continues on phone |

---

*Last Updated: December 2024*

