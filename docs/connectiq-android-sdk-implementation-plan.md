# Connect IQ Android SDK + React Native implementation plan

## Goal

Add **Android** support for the existing Garmin Connect IQ integration in `reticle2` so the phone app can:

- Initialize the Connect IQ Mobile SDK on Android
- Discover paired/known devices via Garmin Connect Mobile
- Connect to the watch app (`reticcc`) and exchange messages using the **same JS service layer** (`services/garminService.ts`)

This plan assumes we keep the current JS contract and bring Android up to parity with iOS.

---

## Current state (repo evidence)

### What already exists

- **JS bridge / service layer**: `services/garminService.ts`
  - Depends on `react-native-garmin-connect` APIs:
    - `initialize(urlScheme)`
    - `getDevicesList()`
    - `connectDevice(id, model, name)`
    - `sendMessage(messageString)`
    - Emits: `onSdkReady`, `onDeviceStatusChanged`, `onMessage`, `onError`
- **iOS native integration** (works today):
  - Custom patch file: `patches/react-native-garmin-connect+0.3.0.patch`
  - Expo plugin for iOS URL handling + plist / link flags: `plugins/withGarminUrlHandler.js`
- **Watch app UUID**:
  - `reticcc/manifest.xml` → `<iq:application id="5af8baf3-c28a-4998-9353-8c75aa77a0c8" ...>`

### What is missing / risky on Android

- The upstream `react-native-garmin-connect` Android module exists, but is not aligned with this app:
  - Hardcoded Android `APP_ID` differs from watch app UUID
  - `connectDevice(...)` does not reliably set the device used by `sendMessage(...)`
  - Message payload shape differs from iOS (string vs map/dict), which can break watch-side parsing

---

## Target architecture

Keep a single platform-agnostic interface in JS:

- `services/garminService.ts` stays the API boundary
- Android native module emits the same events and accepts the same method calls as iOS

**Message format standard**

JS → Native → Watch:

- JS always sends `JSON.stringify({ type, payload })` (already done in `garminService.ts`)
- Native should send a **dictionary/map** message to the watch:
  - `{ "type": "...", "payload": <object|string|number> }`

Watch → Native → JS:

- Native emits to JS: `{ type: string, payload: string }`
  - where `payload` is either:
    - JSON string of the payload object, or
    - plain string when the watch sends a string

This mirrors the iOS patch behavior.

---

## Implementation plan (Android)

### 1) Use the official Connect IQ Android SDK (AAR)

Garmin’s Android SDK is available as an AAR on Maven Central:

- `com.garmin.connectiq:ciq-companion-app-sdk:<version>@aar`

Action:

- Patch the dependency version in `react-native-garmin-connect/android/build.gradle` if needed (it currently pins an older version upstream).

### 2) Patch `react-native-garmin-connect` Android module to match Reticle’s behavior

We will implement changes as a `patch-package` patch (similar to iOS), so your Expo prebuild workflow continues to work.

#### 2.1 Fix App ID and make it configurable

Watch app UUID must match `reticcc/manifest.xml`:

- `5af8baf3-c28a-4998-9353-8c75aa77a0c8`

Recommended approach:

- Add a native method:
  - `setAppId(appId: String)`
- Update Android module to use the configured value when creating `IQApp(appId)`

Fallback (less ideal):

- Hardcode the correct UUID in the Android module constants.

#### 2.2 Fix device selection + connected device state

On Android, “pairing” is typically handled by Garmin Connect Mobile; the SDK exposes:

- `connectIQ.knownDevices` (paired/known)
- `connectIQ.connectedDevices` (connected)

Required behavior:

- `getDevicesList()` returns a list of:
  - `id` (stable identifier)
  - `name` (friendlyName)
  - `model` (partNumber or model string if available)
  - `status` (mapped to `ONLINE`/`OFFLINE`/`CONNECTED`)
  - `needsRepairing` (optional; use when device not resolvable)

Update `connectDevice(id, model, name)` to:

- Resolve device by `id` if possible; otherwise fall back to `name`
- Set module state:
  - `connectedDevice = resolvedDevice`
  - `myApp = IQApp(appId)`
- Register:
  - `registerForDeviceEvents(connectedDevice, listener)`
  - `registerForAppEvents(connectedDevice, myApp, listener)`
- Emit an immediate status event including a helpful `reason` string

#### 2.3 Send message (dict payload, with completion)

Update `sendMessage(messageString)` to:

- Parse `messageString` (JSON) into:
  - `type: String`
  - `payload: Any`
- Construct a map:
  - `hashMapOf("type" to type, "payload" to payload)`
- Call:
  - `connectIQ.sendMessage(connectedDevice, myApp, messageMap, completion)`
- On failure:
  - emit `onError` with a descriptive string (InvalidState, ServiceUnavailable, send status)

This matches the iOS patch’s “send dict + log error details” approach.

#### 2.4 Receive message (robust parsing)

In `onMessageReceived(...)`:

- Support common shapes:
  - `List<HashMap<String, Any>>` where each item has `type` + `payload`
  - `List<Any>` fallback
- Emit `onMessage` events for each message item:
  - `{ type: "...", payload: "<json string>" }`

#### 2.5 Status mapping and reason strings

Emit `onDeviceStatusChanged` similarly to iOS:

- Include:
  - `status` (CONNECTED / ONLINE / OFFLINE)
  - `reason` (e.g., “watch reachable but app not open”, “service unavailable”, etc.)

This improves UX and aligns with existing JS logging.

---

## Expo / Android project integration

### 1) Ensure build uses development client (not Expo Go)

ConnectIQ requires native code, so Android must be built with:

- `expo run:android` or EAS dev builds

### 2) Android Manifest considerations

Android doesn’t require the same URL callback approach as iOS for device selection.

However, for Android 11+ package visibility (optional but recommended if you query/install/open these apps):

- Garmin Connect Mobile package: `com.garmin.android.apps.connectmobile`
- Connect IQ Store package: `com.garmin.connectiq`

If needed, add `<queries>` entries via an Expo config plugin.

---

## Testing plan (Android)

### Device setup checklist

- Garmin Connect Mobile installed and logged in
- Watch paired to phone in Garmin Connect
- ReticleIQ watch app installed on watch (Connect IQ Store)
- Watch app opened (many flows require the app to be running)

### Functional test cases

- **SDK init**: `initialize()` → `onSdkReady`
- **Device list**: `getDevicesList()` returns known device(s)
- **Connect**: `connectDevice()` emits status changes and registers for app events
- **Ping**:
  - Phone sends `PING`
  - Watch replies `PONG` / `HEARTBEAT_ACK` (depending on your watch implementation)
- **Session flow**:
  - `SESSION_START` → watch ACK
  - run drill
  - `SESSION_END` → watch sends `SESSION_SUMMARY` / `SESSION_DETAILS` / `TIMELINE_CHUNK`
  - phone assembles timeline as it already does (JS-only)

### Failure modes to validate

- Garmin Connect Mobile missing/outdated → `ServiceUnavailableException` surfaced via `onError`
- Watch reachable but watch app not open → status should not be “repair”, just instruct to open watch app
- Watch app not installed → show “install from Connect IQ Store” guidance (via applicationInfo listener)

---

## Rollout strategy

- Land Android native module fixes behind a simple runtime gate:
  - If SDK not ready or no device connected → keep sessions fully functional without watch (already the UX philosophy in `docs/garmin-integration.md`)
- Add lots of logging for the first Android iteration (similar to the iOS patch) and tighten after stability.

---

## References

- Garmin Connect IQ Android SDK samples:
  - `garmin/connectiq-android-sdk` (Comm Android)
- Garmin Mobile SDK for Android docs:
  - `https://developer.garmin.com/connect-iq/core-topics/mobile-sdk-for-android/`
- Current project docs:
  - `docs/garmin-integration.md`
  - `docs/garmin-architecture.md`
