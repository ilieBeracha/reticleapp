# Watch App Implementation Instructions

> **For:** Garmin Watch App Developer (Monkey C)
> **From:** Mobile App Team
> **Purpose:** Implement drill-aware watch modes

---

## Layout Best Practices (from Travis Vitek, Garmin)

### Dynamic Positioning - Use Expressions in Layouts

Instead of hard-coded absolute positions, use expressions that scale:

```xml
<drawable class="Triangle">
  <param name="locX">dc.getWidth() * .5</param>
  <param name="locY">dc.getHeight() * .25</param>
  <param name="width">75</param>
  <param name="height">75</param>
</drawable>
```

### Dynamic Font Selection

Call a function to pick the best font for available space:

```javascript
// In your code
function select_font_for_text(dc, width, height, sample_text) {
  // Pick a font that fits sample_text in the provided area
  // using dc.getTextDimensions()
}
```

```xml
<!-- In layout -->
<drawable class="Ui.Text">
  <param name="locX">dc.getWidth() * .33</param>
  <param name="locY">dc.getHeight() * .5</param>
  <param name="color">Gfx.COLOR_WHITE</param>
  <param name="font">select_font_for_text(dc, dc.getWidth() * .33, dc.getHeight() * .5, "-88.88")</param>
  <param name="justification">Gfx.TEXT_JUSTIFY_CENTER</param>
</drawable>
```

### Layout Selector Pattern

Create a selector class to pick the right layout based on dc dimensions:

```javascript
class LayoutSelector {
  function getSelection(dc) {
    var width = dc.getWidth();
    var height = dc.getHeight();
    
    // Get the symbol for best fit layout
    var method = new Lang.Method(Rez.Layouts, getLayout(width, height));
    return method.invoke(dc);
  }
  
  hidden function getLayout(width, height) {
    if (width > 200) {
      return :LayoutLarge;
    } else if (width > 150) {
      return :LayoutMedium;
    } else {
      return :LayoutSmall;
    }
  }
}
```

### Key Principles

1. **Avoid hard-coded absolute positions** - Use `dc.getWidth() * percentage` instead
2. **Minimize number of layouts** - Use dynamic calculations, not one layout per size
3. **Use `Ui.Text` drawable** instead of `<label>` for consistency with params
4. **Pick fonts dynamically** - Don't hard-code fonts that may not fit on smaller screens
5. **Test on multiple devices** - Edge 520 vs Edge 1000 have different field sizes

---

## TL;DR - What You Need to Do

1. **Parse new fields in SESSION_START message**: `watchMode`, `inputMethod`
2. **Create two different UI screens** based on `watchMode`:
   - `primary` → Shot Counter screen (enforces limits)
   - `supplementary` → Timer-only screen (no limits)
3. **Include `completed` flag in SESSION_RESULT** to indicate if max rounds reached

---

## New SESSION_START Payload

When the phone sends `SESSION_START`, it now includes:

```json
{
  "type": "START_SESSION",
  "payload": {
    "sessionId": "abc123-uuid",
    "drillName": "Bill Drill",
    "drillType": "timed",
    "inputMethod": "manual",
    "watchMode": "primary",       // "primary" or "supplementary"
    "distance": 7,
    "rounds": 6,                   // Max shots (0 = unlimited)
    "timeLimit": null,
    "parTime": 2.0,
    "strings": 1,
    "startedAt": 1703500000000,
    
    // === NEW: Shot Detection Config ===
    "autoDetect": true,            // Enable accelerometer shot detection
    "detection": {
      "sensitivity": 3.2,          // Primary G-force threshold
      "minThreshold": 1.6,         // Reject peaks below this
      "maxThreshold": 9.6,         // Expected max peak
      "cooldownMs": 80,            // Min time between shots (ms)
      "profile": "handgun"         // "handgun" | "rifle" | "shotgun"
    },
    "sensitivity": 3.2,            // Legacy field (same as detection.sensitivity)
    "vrcv": true                   // Vibrate on shot detection
  }
}
```

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `watchMode` | `"primary"` \| `"supplementary"` | How watch should behave |
| `inputMethod` | `"scan"` \| `"manual"` \| `"both"` | How user inputs data (FYI) |
| `rounds` | Number | Max shots allowed (0 = no limit) |
| `parTime` | Number \| null | Par time in seconds (null = none) |

### Detection Configuration (NEW)

| Field | Type | Description |
|-------|------|-------------|
| `detection.sensitivity` | Number | Primary G-force threshold (1.0 - 7.0) |
| `detection.minThreshold` | Number | Reject peaks below this (false positive rejection) |
| `detection.maxThreshold` | Number | Expected max peak for normalization |
| `detection.cooldownMs` | Number | Minimum ms between detected shots |
| `detection.profile` | String | Weapon profile: "handgun", "rifle", "shotgun" |
| `vrcv` | Boolean | Vibrate when shot is detected |

**⚠️ IMPORTANT:** Different firearms have different recoil. The phone derives sensitivity from weapon caliber:

| Caliber | Sensitivity |
|---------|-------------|
| .22 LR | 2.0G |
| 9mm | 3.2G |
| .45 ACP | 4.2G |
| 5.56 rifle | 3.5G |
| .308 rifle | 4.5G |
| 12ga shotgun | 5.5G |

See `docs/shot-detection-calibration.md` for the full algorithm.

---

## Watch Mode: PRIMARY

**When:** `watchMode === "primary"`

**Purpose:** Watch is the main shot counter. User MUST tap watch per shot.

### Behavior

1. **Display:** Shot count prominently (e.g., "3 / 6")
2. **On tap:** Increment shot count
3. **When `shotsFired >= rounds`:**
   - Vibrate (long pulse)
   - Show "COMPLETE!" message
   - Auto-send SESSION_RESULT with `completed: true`
   - Return to idle view
4. **On BACK button:**
   - End session early
   - Send SESSION_RESULT with `completed: false`

### UI Mockup

```
┌─────────────────────────┐
│                         │
│     🎯 Bill Drill       │
│        7m               │
│                         │
│    ╔═══════════════╗    │
│    ║   3  /  6     ║    │  ← Large, center
│    ╚═══════════════╝    │
│                         │
│     Time: 00:01.5       │
│     Par: 2.0s           │
│                         │
│   [ TAP TO ADD SHOT ]   │
│                         │
└─────────────────────────┘
```

### Pseudocode

```javascript
// On button press
function onSelect() {
    shotsFired += 1;
    recordSplitTime();
    
    if (rounds > 0 && shotsFired >= rounds) {
        // Max reached!
        vibrateLong();
        endSession(completed: true);
    } else {
        vibrateShort();
        requestUpdate();
    }
}

// On back button
function onBack() {
    endSession(completed: false);
}
```

---

## Watch Mode: SUPPLEMENTARY

**When:** `watchMode === "supplementary"`

**Purpose:** Watch is just a timer. Phone handles actual shot detection (via camera scan).

### Behavior

1. **Display:** Timer prominently
2. **On tap:** Record split time (optional, for user convenience)
3. **NO shot limit enforcement** - taps are optional
4. **On BACK button:**
   - End session
   - Send SESSION_RESULT with timing data

### UI Mockup

```
┌─────────────────────────┐
│                         │
│   🎯 5-Shot Group       │
│       100m              │
│                         │
│   ╔═══════════════╗     │
│   ║   00:45.3     ║     │  ← Timer, large
│   ╚═══════════════╝     │
│                         │
│    Taps: 3 (optional)   │  ← Smaller, muted color
│                         │
│  [ TAP FOR SPLIT TIME ] │
│                         │
└─────────────────────────┘
```

### Pseudocode

```javascript
// On button press
function onSelect() {
    tapCount += 1;  // Optional, for splits
    recordSplitTime();
    vibrateShort();
    requestUpdate();
    // NO limit check - user can tap as many times as they want
}

// On back button
function onBack() {
    endSession(completed: false);  // Always false - phone determines completion
}
```

---

## SESSION_RESULT Message (Watch → Phone)

When session ends, send this to the phone:

```json
{
  "type": "SESSION_RESULT",
  "payload": {
    "sessionId": "abc123-uuid",
    "shotsFired": 6,
    "elapsedTime": 1.85,
    "completed": true,
    "distance": 7,
    "splitTimes": [310, 285, 302, 298, 295, 355],
    "avgSplit": 307
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | String | Same as received in SESSION_START |
| `shotsFired` | Number | Total button taps recorded |
| `elapsedTime` | Number | Total time in **seconds** (with decimals) |
| `completed` | Boolean | `true` if max rounds reached, `false` if ended early |
| `distance` | Number | Echo back for confirmation |
| `splitTimes` | Array<Number> | Time between shots in **milliseconds** |
| `avgSplit` | Number | Average split time in **milliseconds** |

### Completed Flag Logic

| Scenario | completed |
|----------|-----------|
| Primary mode, reached max rounds | `true` |
| Primary mode, user pressed BACK | `false` |
| Supplementary mode, any exit | `false` |
| Phone sent END_SESSION | `false` |

---

## View Switching Logic

On SESSION_START:

```javascript
function handleSessionStart(payload) {
    // Store session data
    sessionId = payload.sessionId;
    drillName = payload.drillName;
    watchMode = payload.watchMode;
    maxRounds = payload.rounds;
    parTime = payload.parTime;
    distance = payload.distance;
    
    // Reset counters
    shotsFired = 0;
    startTime = System.getTimer();
    splitTimes = [];
    
    // Send ACK
    sendMessage({type: "ACK", payload: {status: "session_started"}});
    
    // Switch to appropriate view
    if (watchMode == "primary") {
        switchToView(PrimarySessionView, PrimarySessionDelegate);
    } else {
        switchToView(SupplementarySessionView, SupplementarySessionDelegate);
    }
}
```

---

## Visual Feedback Guidelines

### Vibration Patterns

| Event | Pattern |
|-------|---------|
| Shot recorded (primary) | Short pulse (50ms) |
| Split recorded (supplementary) | Short pulse (50ms) |
| Session complete (max reached) | Long pulse (500ms) |
| Session ended early | Double short (50ms, 50ms gap, 50ms) |

### Colors (if device supports)

| Element | Color |
|---------|-------|
| Active timer | White/Default |
| Shot count (under limit) | White/Default |
| Shot count (at limit) | Green |
| Par time indicator | Yellow/Amber |
| "COMPLETE" text | Green |

---

## Testing Checklist

- [ ] Primary mode: Taps increment count
- [ ] Primary mode: Count blocked at max rounds
- [ ] Primary mode: Vibrates on completion
- [ ] Primary mode: Auto-sends result when complete
- [ ] Primary mode: BACK sends result with completed=false
- [ ] Supplementary mode: Timer runs, count is optional
- [ ] Supplementary mode: No limit enforcement
- [ ] Supplementary mode: BACK sends result
- [ ] Session ID echoed correctly in result
- [ ] Split times recorded accurately
- [ ] ElapsedTime is in seconds (not ms)
- [ ] SplitTimes are in ms

---

## Connection States (FYI)

The phone tracks these connection states:

| State | Meaning | Phone Shows |
|-------|---------|-------------|
| OFFLINE | Watch not reachable | "Retry" button (opens Garmin Connect) |
| ONLINE | Watch reachable, **app not open** | "Open app on watch" instruction (no button) |
| CONNECTED | Watch app running | Ready to sync |

**Why this matters:** When ONLINE, the phone can't force-open your app. Only the user can open it manually. The phone will show an instruction rather than a useless "Reconnect" button.

---

## Questions?

Contact the mobile team if:
- You need additional data in SESSION_START
- The payload format doesn't work for Monkey C
- You want to add new message types

---

*Document Version: 1.0*
*Last Updated: December 2024*

