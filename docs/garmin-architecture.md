# Garmin Integration Architecture

## Overview

### What the App Does

ReticleIQ is a military/law enforcement training management platform. The Garmin integration enables:

1. **Watch as Shot Counter** - The watch counts shots during a shooting session
2. **Session Synchronization** - Phone sends drill config to watch, watch sends results back
3. **Hands-Free Training** - Shooter doesn't need to touch phone during drills

---

## System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                PHONE (iOS)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   UI Components │     │   garminStore   │     │  garminService  │       │
│  │ (React Native)  │◄────│    (Zustand)    │◄────│  (JS Bridge)    │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                           │                 │
│                                                           │ Native Events   │
│                                                           ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    react-native-garmin-connect                        │  │
│  │                         (Native Module)                               │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  GarminConnect.mm          │  GarminConnectModule.swift              │  │
│  │  (Obj-C Bridge)            │  (Main Logic)                           │  │
│  │                            │                                          │  │
│  │  GarminDeviceStorage.swift │  AppConstants.swift                     │  │
│  │  (Session Device Cache)    │  (Configuration)                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    │ ConnectIQ SDK                          │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      ConnectIQ.xcframework                            │  │
│  │                      (Garmin's Proprietary SDK)                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Bluetooth LE
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GARMIN CONNECT MOBILE (GCM)                          │
│                        (Garmin's Official App)                              │
│                                                                             │
│  - Acts as Bluetooth bridge between phone and watch                         │
│  - Handles device discovery and pairing                                     │
│  - Routes messages between apps                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Bluetooth LE / ANT+
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GARMIN WATCH                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    ConnectIQ Watch App                                │  │
│  │                    (Monkey C Language)                                │  │
│  │                                                                        │  │
│  │  - Receives SESSION_START from phone                                  │  │
│  │  - Counts shots (accelerometer/button)                                │  │
│  │  - Tracks elapsed time                                                │  │
│  │  - Sends SESSION_RESULT back to phone                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Connection Flow

### Step 1: SDK Initialization

**When:** App starts (in `_layout.tsx` via `useGarminInitialize()`)

```
Phone                                              Native
  │                                                  │
  │  initialize('retic', 'app-uuid')                 │
  ├─────────────────────────────────────────────────►│
  │                                                  │
  │                    ConnectIQ.initialize(urlScheme)
  │                                                  │
  │  onSdkReady event                                │
  │◄─────────────────────────────────────────────────┤
  │                                                  │
  │  getDevicesList()                                │
  ├─────────────────────────────────────────────────►│
  │                                                  │
  │  devices[] (from UserDefaults cache)             │
  │◄─────────────────────────────────────────────────┤
  │                                                  │
  │  connectDevice(id, model, name)                  │
  ├─────────────────────────────────────────────────►│
  │                                                  │
```

### Step 2: Device Pairing (First Time or Re-Pairing)

**When:** User taps "Connect" in Integrations or GarminConnectionBanner

```
Phone                           GCM App                        Watch
  │                               │                               │
  │  showDevicesList()            │                               │
  ├──────────────────────────────►│                               │
  │                               │                               │
  │  (GCM opens device selector)  │                               │
  │                               │◄──────────────────────────────┤
  │                               │   (Shows paired watches)      │
  │                               │                               │
  │  User selects watch           │                               │
  │                               │                               │
  │  URL callback:                │                               │
  │  retic://device-select-resp   │                               │
  │◄──────────────────────────────┤                               │
  │                               │                               │
  │  parseDeviceSelectionResponse()                               │
  │  (Gets LIVE IQDevice objects)                                 │
  │                               │                               │
  │  Cache IQDevice in sessionDevices                             │
  │  Store device info in UserDefaults                            │
  │                               │                               │
```

### Step 3: Device Connection

**When:** After pairing, or when app resumes with cached device

```
Phone                                              Native
  │                                                  │
  │  connectDevice(id, model, name)                  │
  ├─────────────────────────────────────────────────►│
  │                                                  │
  │           GarminDeviceStorage.getDevice(byId)    │
  │           (Returns LIVE IQDevice or nil)         │
  │                                                  │
  │           if nil → emit needsRepairing = true    │
  │           if found → register for device events  │
  │                                                  │
  │  onDeviceStatusChanged: ONLINE                   │
  │◄─────────────────────────────────────────────────┤
  │  (watch reachable but app not open)              │
  │                                                  │
  │  ... user opens watch app ...                    │
  │                                                  │
  │  onDeviceStatusChanged: CONNECTED                │
  │◄─────────────────────────────────────────────────┤
  │  (watch app is open, ready for messages)         │
  │                                                  │
  │           register(forAppMessages: connectedApp) │
  │                                                  │
```

### Connection States

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| `UNKNOWN` | SDK not initialized | Wait for init |
| `OFFLINE` | Watch not reachable | Open Garmin Connect Mobile |
| `ONLINE` | Watch reachable, app not open | Open watch app |
| `CONNECTED` | Watch app is open | Ready to send/receive |

---

## Message Flow

### Phone → Watch (Outbound)

**When:** User starts a session in the app

```
Phone (JS)                    Native (Swift)                    Watch
  │                               │                               │
  │  sendMessage('SESSION_START', │                               │
  │    { sessionId, drillName,    │                               │
  │      distance, rounds, ... }) │                               │
  ├──────────────────────────────►│                               │
  │                               │                               │
  │           JSON.stringify()    │                               │
  │           Parse to [String:Any]                               │
  │                               │                               │
  │           ConnectIQ.sendMessage(                              │
  │             messageDict,                                      │
  │             to: connectedApp)                                 │
  │                               ├──────────────────────────────►│
  │                               │                               │
  │                               │        Parse message          │
  │                               │        Start session          │
  │                               │        Init shot counter      │
  │                               │                               │
  │                               │   ACK: { status: started }    │
  │                               │◄──────────────────────────────┤
  │                               │                               │
  │  onMessage: ACK               │                               │
  │◄──────────────────────────────┤                               │
  │                               │                               │
```

### Watch → Phone (Inbound)

**When:** Session ends on watch (max shots reached OR user presses BACK)

```
Watch                           Native (Swift)                   Phone (JS)
  │                               │                               │
  │  Session ends                 │                               │
  │  (max bullets OR user BACK)   │                               │
  │                               │                               │
  │  SESSION_RESULT:              │                               │
  │  { sessionId, shotsFired,     │                               │
  │    elapsedTime, distance,     │                               │
  │    completed }                │                               │
  ├──────────────────────────────►│                               │
  │                               │                               │
  │           receivedMessage()   │                               │
  │           processReceivedMessage()                            │
  │           processMessage()    │                               │
  │           emitSafeMessage()   │                               │
  │                               │                               │
  │                               │  onMessage event              │
  │                               ├──────────────────────────────►│
  │                               │                               │
  │                               │        Parse payload          │
  │                               │        Map to GarminSessionData
  │                               │        Emit session_data      │
  │                               │        Update store           │
  │                               │                               │
```

---

## Message Types

### Outbound (Phone → Watch)

| Type | When Sent | Payload |
|------|-----------|---------|
| `SESSION_START` | User starts session | `{ sessionId, drillName, drillGoal, distance, rounds, timeLimit }` |
| `END_SESSION` | User ends session manually | `{ sessionId }` |
| `SYNC_DRILL` | Update drill config | `{ name, rounds, distance, timeLimit }` |
| `PING` | Test connectivity | `{ time }` |

### Inbound (Watch → Phone)

| Type | When Received | Payload |
|------|---------------|---------|
| `ACK` | After SESSION_START | `{ status: "session_started" }` |
| `SESSION_RESULT` | Session ends (auto/manual) | `{ sessionId, shotsFired, elapsedTime, distance, completed }` |
| `PONG` | Response to PING | `{ }` |

---

## Watch App Behavior

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                         WATCH APP                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IDLE STATE                                                     │
│  ├── Waiting for SESSION_START from phone                       │
│  └── Displays "Ready" or similar                                │
│                                                                 │
│          │ Receives SESSION_START                               │
│          ▼                                                      │
│                                                                 │
│  ACTIVE SESSION                                                 │
│  ├── Stores: sessionId, distance, maxBullets (rounds)           │
│  ├── Starts: elapsed timer                                      │
│  ├── Initializes: shotsFired = 0                                │
│  ├── Sends: ACK { status: "session_started" }                   │
│  │                                                              │
│  │   User presses button / accelerometer detects shot           │
│  │   └── shotsFired++                                           │
│  │   └── Display updates                                        │
│  │                                                              │
│  │   If shotsFired >= maxBullets                                │
│  │   └── Auto-complete → Send SESSION_RESULT                    │
│  │                                                              │
│  │   If user presses BACK                                       │
│  │   └── Manual end → Send SESSION_RESULT                       │
│  │                                                              │
│          │ Session ends                                         │
│          ▼                                                      │
│                                                                 │
│  SESSION_RESULT SENT                                            │
│  └── { sessionId, shotsFired, elapsedTime, distance, completed }│
│  └── completed = true if maxBullets reached                     │
│  └── completed = false if manual end                            │
│                                                                 │
│          │                                                      │
│          ▼                                                      │
│                                                                 │
│  IDLE STATE (ready for next session)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### GarminSessionData (Phone receives)

```typescript
interface GarminSessionData {
  sessionId?: string;        // Matches DB session ID
  shotsRecorded: number;     // Total shots counted by watch
  durationMs?: number;       // Session duration in milliseconds
  distance?: number;         // Distance setting in meters
  completed?: boolean;       // true = max bullets reached
  shotTimestamps?: number[]; // (Optional) Per-shot timing
  avgSplitMs?: number;       // (Optional) Average time between shots
  heartRate?: {              // (Optional) If watch supports HR
    avg: number;
    max: number;
    min: number;
  };
}
```

### Watch SESSION_RESULT (Raw from watch)

```json
{
  "sessionId": "uuid-string",
  "shotsFired": 10,
  "elapsedTime": 45,
  "distance": 25,
  "completed": true
}
```

### Mapping (Watch → Phone)

| Watch Field | Phone Field | Transformation |
|-------------|-------------|----------------|
| `shotsFired` | `shotsRecorded` | Direct |
| `elapsedTime` | `durationMs` | × 1000 (seconds → ms) |
| `distance` | `distance` | Direct |
| `completed` | `completed` | Direct |
| `sessionId` | `sessionId` | Direct |

---

## File Structure

### Phone Side

```
services/
  garminService.ts          # Native bridge, event handling
                            # - initialize()
                            # - sendMessage()
                            # - subscribe()

store/
  garminStore.tsx           # Zustand state management
                            # - devices, status, messages
                            # - useGarminInitialize()
                            # - Convenience hooks

hooks/
  useGarminSession.ts       # High-level session hook
                            # - Auto-sync drill to watch
                            # - Handle session data callback

components/
  garmin/
    GarminConnectionBanner.tsx  # Inline status + reconnect UI

patches/
  react-native-garmin-connect+0.3.0.patch  # Swift code fixes

plugins/
  withGarminUrlHandler.js   # Expo config plugin
                            # - Info.plist entries
                            # - Podfile header paths
                            # - AppDelegate URL handling
```

### Native Side (in node_modules, via patch)

```
node_modules/react-native-garmin-connect/ios/
  GarminConnect.mm              # Obj-C → React Native bridge
  GarminConnectModule.swift     # Main SDK logic
  GarminDeviceStorage.swift     # Session-based device cache
  AppConstants.swift            # Configuration (APP_ID, etc.)
  ConnectIQ.xcframework/        # Garmin's proprietary SDK
```

---

## Key Concepts

### Session-Based Device Handling

**Problem:** Garmin's `IQDevice` objects cannot be serialized/persisted. They are only valid within the current app session.

**Solution:** 
1. Store device **info** (UUID, name, model) in `UserDefaults` for display
2. Cache **live** `IQDevice` objects in `sessionDevices` dictionary
3. On app restart, display cached info but require re-pairing via GCM to get fresh `IQDevice`

### needsRepairing Flag

When a device's `IQDevice` reference is stale:
- `needsRepairing = true`
- UI shows "Connect" button
- User must pair via Garmin Connect Mobile

### Message Serialization

- Phone → Watch: JSON string
- Watch → Phone: Dictionary (parsed to JSON string for JS)
- All payloads are stringified for safe bridge crossing

---

## Error States

| Error | Cause | Resolution |
|-------|-------|------------|
| "Session expired" | App restarted, IQDevice invalid | Re-pair via GCM |
| "Watch app not connected" | connectedApp is nil | Open watch app |
| "SDK not ready" | initialize() not called | Call initialize() first |
| "bluetoothNotReady" | Bluetooth off | Turn on Bluetooth |
| "notFound" | GCM not running | Open Garmin Connect Mobile |

---

## Timing

| Event | Typical Duration |
|-------|------------------|
| SDK initialization | ~100ms |
| Device list fetch | ~50ms |
| Device connection (ONLINE) | ~500ms |
| Watch app detection (CONNECTED) | ~1-3s after opening app |
| Message round-trip | ~200-500ms |
| Session result delivery | Immediate after session end |

