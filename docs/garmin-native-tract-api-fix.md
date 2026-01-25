# Tract Native Garmin API (iOS) — What’s Fixed, Why, and How It Flows

This repo integrates Garmin watches using the Garmin **Connect IQ Mobile SDK** via the community React Native module **`react-native-garmin-connect`**.

In this codebase, “**Tract native Garmin API**” refers to the **native iOS bridge layer** (Swift/Obj‑C) that sits underneath `services/garminService.ts` and emits events back to JavaScript.

The important part: **we do not directly edit native iOS source in `ios/`**. Instead, we apply a **patch-package** patch to `node_modules/react-native-garmin-connect` and use an **Expo config plugin** to make Expo prebuild generate the right iOS wiring.

## Where the fix lives (source of truth)

- **Patch applied to the library**: `patches/react-native-garmin-connect+0.3.0.patch`
  - Applied automatically by `patch-package` on install (`package.json` → `"postinstall": "patch-package"`).
- **Expo prebuild wiring (URL handler + iOS project config)**: `plugins/withGarminUrlHandler.js`
- **JS bridge wrapper (what the app actually imports)**: `services/garminService.ts`
- **State layer consuming service events**: `store/garminStore.tsx`
- **Deep-link route used during pairing**: `app/device-select-resp.tsx`
- **User entry point / UX**: `app/(protected)/integrations.tsx`

## What was broken in the upstream/native flow (and why)

### 1) “Previously paired device won’t reconnect after app restart”

- **Symptom**
  - The UI can show a saved device (UUID/name/model), but attempts to connect can fail silently or report an “offline/invalid” state after the app is killed/relaunched.
- **Root cause**
  - Garmin’s `IQDevice` objects are **session-scoped**: they’re only valid when produced by the current app session’s `ConnectIQ.parseDeviceSelectionResponse(from:)`.
  - Recreating an `IQDevice` from stored UUID/model/name (or trying to persist the `IQDevice` itself) produces a “dead” reference that ConnectIQ won’t talk to.
- **Fix**
  - The patch changes device storage to persist **display info only**, and caches **LIVE `IQDevice` objects in-memory for the current app session**.
  - On connect, the native module refuses to connect if it can’t find a live session device, and emits a clear status payload telling the JS layer that re-pairing is required.
- **Where**
  - `patches/react-native-garmin-connect+0.3.0.patch`
    - `ios/GarminDeviceStorage.swift`: introduces `sessionDevices` (in-memory cache) + `getDevice(byId:)`.
    - `ios/GarminConnectModule.swift`: `connectDevice(...)` now calls `GarminDeviceStorage.getDevice(byId:)` and emits `needsRepairing: true` when missing.
- **How it surfaces in JS**
  - `getDevicesList()` returns objects with `needsRepairing` and status reflecting whether the device exists in the current session cache.
  - `services/garminService.ts` logs this and includes `reason` in status events.
  - `app/(protected)/integrations.tsx` treats `ONLINE` as “open watch app”, and everything else as “pair/re-pair”.

### 2) “GCM device selection callback doesn’t reliably populate devices”

- **Symptom**
  - User taps “pair” → Garmin Connect Mobile opens → user selects device → returns to the app, but the device list isn’t updated / the app can’t connect.
- **Root cause**
  - On iOS, Garmin Connect Mobile returns to the app via a **URL callback** (custom scheme), and the library expects the app to pass this URL into device parsing (`parseDeviceSelectionResponse(from:)`).
  - In an Expo Router app, if the URL isn’t forwarded at the native AppDelegate layer, the parsing never happens.
- **Fix**
  - The Expo config plugin injects AppDelegate URL handling so that **every URL with our scheme** is forwarded to `GarminDeviceStorage.onDevicesReceived(open:)`, while still letting Expo Router handle the route.
  - The patch makes `GarminDeviceStorage.onDevicesReceived(open:)` more defensive: it validates that the URL looks like a device selection response before parsing.
- **Where**
  - `plugins/withGarminUrlHandler.js`: modifies AppDelegate to call `GarminDeviceStorage.onDevicesReceived(open: url)`
  - `patches/react-native-garmin-connect+0.3.0.patch`:
    - `ios/GarminDeviceStorage.swift`: URL logging + `isDeviceSelectResp` detection + session device caching.
  - `app/device-select-resp.tsx`: route that delays briefly and then calls `refreshDevices()` to pull the latest device list from native.

### 3) “iOS build issues: ConnectIQ headers / framework import problems”

- **Symptom**
  - Build errors like missing `ConnectIQ.h`, header search path issues, or linking problems around the vendored framework.
- **Root cause**
  - Garmin’s ConnectIQ ships as an **xcframework**, and the correct import style for headers is `<ConnectIQ/ConnectIQ.h>` plus proper search paths.
  - React Native + CocoaPods + Expo prebuild need help to locate the headers and link Obj‑C categories correctly.
- **Fix**
  - Patch updates the native header import style and adjusts the podspec so CocoaPods picks the right files and search paths.
  - Expo config plugin ensures the Xcode project uses `-ObjC` and the Podfile post_install injects the header search paths for the `react-native-garmin-connect` target.
- **Where**
  - `patches/react-native-garmin-connect+0.3.0.patch`
    - `ios/GarminConnectModule.h`: `#import <ConnectIQ/ConnectIQ.h>`
    - `react-native-garmin-connect.podspec`: `HEADER_SEARCH_PATHS` + `FRAMEWORK_SEARCH_PATHS`, and avoids exporting a conflicting `GarminDeviceStorage.h`
  - `plugins/withGarminUrlHandler.js`
    - Adds `-ObjC`
    - Injects a `post_install` hook to append `HEADER_SEARCH_PATHS`
    - Adds required iOS Info.plist keys (`LSApplicationQueriesSchemes`, Bluetooth, Bonjour services)

### 4) “Inbound message parsing / event emission was flaky”

- **Symptom**
  - Messages arrive in inconsistent shapes (`NSMutableDictionary` vs array vs other), payloads can’t be JSON-stringified safely, or events arrive off the main thread causing instability.
- **Root cause**
  - ConnectIQ can deliver messages as multiple Objective‑C/Swift container shapes.
  - React Native event emitter payloads must be **JSON-serializable primitives/objects** and are safest when emitted on the **main queue**.
- **Fix**
  - Patch normalizes inbound messages into a safe `{ type: string, payload: string }` object:
    - message type is extracted from either `body["type"]` or legacy keys
    - payload is converted into a **string** (JSON when possible)
  - Emission is pushed onto the main thread (`DispatchQueue.main.async`) to avoid race conditions.
- **Where**
  - `patches/react-native-garmin-connect+0.3.0.patch`
    - `ios/GarminConnectModule.swift`: `receivedMessage(...)` → `processReceivedMessage(...)` → `processMessage(...)` → `emitSafeMessage(...)`
  - `services/garminService.ts`: parses `raw.payload` back into JSON when it’s a JSON string.
  - `services/garmin/garmin.handlers.ts`: routes messages by `type` and implements robust ACK retry behavior.

### 5) “Outgoing messages had poor observability (and sometimes wrong format)”

- **Symptom**
  - When a message send fails, you don’t know why; or ConnectIQ expects a dictionary but you send a raw string with no structure.
- **Root cause**
  - ConnectIQ `sendMessage` works best with a key/value dictionary, and errors need to be captured via the completion handler.
- **Fix**
  - Patch parses outbound JSON strings into dictionaries and uses the completion callback to log `IQSendMessageResult`. If send fails, it emits `onError` so the JS layer can react.
- **Where**
  - `patches/react-native-garmin-connect+0.3.0.patch`
    - `ios/GarminConnectModule.swift`: `sendMessage(_:)` now:
      - parses JSON string → `[String: Any]`
      - calls `ConnectIQ.sharedInstance().sendMessage(... completion: ...)`
      - emits `onError` if not `.success`

## The fixed end-to-end flow (what happens at runtime)

### A) App initialization (JS)

- App root calls `useGarminInitialize()` (store hook): `store/garminStore.tsx`
- Store calls `initialize()` (service): `services/garminService.ts`
- Service subscribes to native events:
  - `onSdkReady`
  - `onDeviceStatusChanged` (now includes `reason`)
  - `onMessage`
  - `onError`

### B) Pairing (GCM → deep link → native device parsing)

1. User taps the Garmin card: `app/(protected)/integrations.tsx`
2. JS calls `openDeviceSelection()` → native `showDevicesList()` via `react-native-garmin-connect`
3. Garmin Connect Mobile returns via URL callback: `retic://device-select-resp?...`
4. iOS AppDelegate forwards the URL to native storage:
   - injected by `plugins/withGarminUrlHandler.js`
   - calls `GarminDeviceStorage.onDevicesReceived(open: url)`
5. Native parses the response using ConnectIQ and caches **live session devices**:
   - `GarminDeviceStorage.sessionDevices[uuid] = IQDevice`
6. Expo Router also handles the route `/device-select-resp`:
   - `app/device-select-resp.tsx` waits ~500ms then calls `refreshDevices()` to update JS UI state.

### C) Connect (live session device only)

- JS `refreshDevices()` reads the device list (`getDevicesList()`) and autoconnects the first device: `services/garminService.ts`
- Native `connectDevice(...)`:
  - pulls the **live session `IQDevice`** from `GarminDeviceStorage.getDevice(byId:)`
  - if missing: emits `onDeviceStatusChanged` with `needsRepairing: true` and an explanatory error message
  - if present: registers for device events and (when connected) registers for app messages

### D) Messaging (bi-directional)

- **Phone → Watch**
  - `services/garminService.ts` → `sdkSendMessage(JSON.stringify({ type, payload }))`
  - patched native `sendMessage` converts JSON → dictionary and sends via ConnectIQ with completion logs.
- **Watch → Phone**
  - patched `receivedMessage(...)` normalizes payload → safe event object `{ type, payload: string }`
  - JS parses payload string back into JSON when possible and routes via `services/garmin/garmin.handlers.ts`

## Why these fixes were the “right” fixes (design intent)

- **Session-only device cache** is non-negotiable because ConnectIQ’s `IQDevice` is not a stable persisted identity; it’s a live handle owned by the current ConnectIQ session.
- **Explicit `needsRepairing`** avoids confusing UX (“why won’t it connect?”) and gives the UI a deterministic state to show.
- **Main-thread event emission** prevents hard-to-debug RN bridge crashes and race conditions.
- **Safe serialization strategy** (stringifying payloads crossing the RN bridge) ensures every message is transferable and debuggable.
- **Expo plugin wiring** makes the integration robust under Expo Router + prebuild (where you don’t hand-edit AppDelegate/Podfile).

## Practical debugging: what to look at

- **Native logs** (Xcode console) are prefixed with `[Garmin]` in the patch.
- **JS logs**:
  - `services/garminService.ts` prints raw native events and payload parsing results.
  - `services/garmin/garmin.diagnostics.ts` keeps a rolling log of inbound/outbound messages and heartbeat health.
- **UI clue**:
  - `ONLINE` means “watch reachable but the watch app is not open” (see `app/(protected)/integrations.tsx`).
  - `needsRepairing: true` means “you must re-pair via Garmin Connect Mobile to get live session devices”.

## Configuration caveat (App ID / scheme)

- The JS layer centralizes the *intended* config in `services/garminService.ts` (`GARMIN_DEFAULT_CONFIG`), but iOS native uses values embedded by the patch (library constants).
- If you change:
  - the **Expo scheme** (`expo.scheme`)
  - the **ConnectIQ watch app UUID**
  
…you must update the patch values in `patches/react-native-garmin-connect+0.3.0.patch` and rebuild from a clean prebuild install.

## Related docs

- `docs/garmin-integration.md` (high-level integration + build notes)
- `docs/garmin-architecture.md` (system diagram + connection states)
- `docs/watch-sync-protocol-v2.md` (watch → phone sync protocol and message sizing)
- `docs/garmin-drill-sync-spec.md` (drill/session payload expectations)

