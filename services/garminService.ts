/**
 * Garmin Connect IQ Service
 *
 * Handles direct communication with the native ConnectIQ Mobile SDK.
 * This is the bridge layer between React Native and Swift/Kotlin.
 *
 * Architecture:
 * - Service: Native bridge, event emitters, message sending
 * - Store: State management only (subscribes to service events)
 * - View: Calls service.initialize() on mount
 */

import {
  DeviceEventEmitter,
  NativeEventEmitter,
  Platform
} from 'react-native';
import {
  type Device,
  GarminConnect,
  Status,
  connectDevice,
  destroy,
  getDevicesList,
  initialize as sdkInitialize,
  sendMessage as sdkSendMessage,
  showDevicesList,
} from 'react-native-garmin-connect';

// ============================================================================
// TYPES
// ============================================================================

export type GarminDevice = Device & {
/** True if device info exists but needs re-pairing via Garmin Connect Mobile */
needsRepairing?: boolean;
};

export { Status as GarminDeviceStatus };

export type GarminConnectionStatus =
| 'UNKNOWN'
| 'CONNECTED'
| 'ONLINE'
| 'OFFLINE'
| 'ACK'
| 'PONG';

/** Message types sent TO the watch */
export type GarminOutboundMessageType =
| 'START_SESSION'
| 'END_SESSION'
| 'SYNC_DRILL'
| 'PING';

/** Message types received FROM the watch */
export type GarminInboundMessageType =
| 'SESSION_DATA'
| 'SHOT_RECORDED'
| 'SESSION_ENDED'
| 'HEARTBEAT'
| 'PONG';

export interface GarminSessionData {
/** Session ID (matches our DB session) */
sessionId?: string;
/** Total shots recorded by the watch */
shotsRecorded: number;
/** Shot timestamps (ms since session start) */
shotTimestamps?: number[];
/** Average time between shots (ms) */
avgSplitMs?: number;
/** Session duration (ms) */
durationMs?: number;
/** Heart rate data if available */
heartRate?: {
  avg: number;
  max: number;
  min: number;
};
}

export interface GarminInboundMessage {
type: GarminInboundMessageType | string;
payload?: unknown;
sessionData?: GarminSessionData;
timestamp?: number;
}

export interface GarminOutboundMessage {
type: GarminOutboundMessageType;
payload?: unknown;
}

// Event types emitted by this service
export type GarminServiceEvent =
| { event: 'sdk_ready' }
| { event: 'status_changed'; status: GarminConnectionStatus; reason?: string }
| { event: 'devices_updated'; devices: GarminDevice[] }
| { event: 'message_received'; message: GarminInboundMessage }
| { event: 'session_data'; data: GarminSessionData }
| { event: 'error'; error: Error };

export type GarminServiceListener = (event: GarminServiceEvent) => void;

// ============================================================================
// CONFIGURATION (set via initialize)
// ============================================================================

export interface GarminConfig {
/** Your app's URL scheme (e.g., 'retic', 'myapp') */
urlScheme: string;
/** Your ConnectIQ watch app UUID */
appId: string;
}

// ============================================================================
// SERVICE STATE (module-level singleton)
// ============================================================================

let config: GarminConfig | null = null;
let isInitialized = false;
let isReady = false;
let currentStatus: GarminConnectionStatus = 'UNKNOWN';
let pairedDevices: GarminDevice[] = [];
const listeners = new Set<GarminServiceListener>();

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function emit(event: GarminServiceEvent) {
listeners.forEach((listener) => {
  try {
    listener(event);
  } catch (err) {
    console.error('[GarminService] Listener error:', err);
  }
});
}

function getEmitter() {
if (Platform.OS === 'ios') {
  return new NativeEventEmitter(GarminConnect as any);
}
return DeviceEventEmitter;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
* Subscribe to service events.
* Returns an unsubscribe function.
*/
export function subscribe(listener: GarminServiceListener): () => void {
listeners.add(listener);
return () => listeners.delete(listener);
}

/**
* Initialize the Garmin SDK with your app configuration.
* Call once at app root (e.g., in _layout.tsx useEffect).
* Returns a cleanup function.
*
* @param urlScheme - Your app's URL scheme (must match Info.plist)
* @param appId - Your ConnectIQ watch app UUID
*/
export function initialize(urlScheme: string, appId: string): () => void {
if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
  console.log('[GarminService] Not a mobile platform, skipping init');
  return () => {};
}
urlScheme = 'retic';
appId = '467f4bb7-cd3c-45c4-a39b-9bb78260c9ed';

if (!urlScheme || !appId) {
  console.error('[GarminService] Missing urlScheme or appId');
  return () => {};
}

if (isInitialized) {
  console.log('[GarminService] Already initialized');
  return () => {};
}

console.log('[GarminService] Initializing SDK...');
console.log(`[GarminService] URL Scheme: ${urlScheme}`);
console.log(`[GarminService] App ID: ${appId}`);

config = { urlScheme, appId };
isInitialized = true;

const emitter = getEmitter();

// SDK Ready
const sdkSub = emitter.addListener('onSdkReady', () => {
  console.log('[GarminService] ✅ SDK Ready');
  isReady = true;
  emit({ event: 'sdk_ready' });

  // Auto-fetch devices on ready
  refreshDevices().catch(console.error);
});

// Device Status Changes
const statusSub = emitter.addListener('onDeviceStatusChanged', (event: any) => {
  const status = event.status as GarminConnectionStatus;
  const reason = event.reason || '';
  console.log(`[GarminService] 📱 Status: ${status}${reason ? ` (${reason})` : ''}`);

  currentStatus = status;
  emit({ event: 'status_changed', status, reason });
});

// Incoming Messages from Watch
const msgSub = emitter.addListener('onMessage', (raw: any) => {
  console.log('[GarminService] 📩 Raw message:', raw);

  const message: GarminInboundMessage = {
    type: raw?.type || 'unknown',
    payload: raw?.payload,
    sessionData: raw?.sessionData,
    timestamp: Date.now(),
  };

  emit({ event: 'message_received', message });

  // Special handling for session data
  if (message.type === 'SESSION_DATA' || message.type === 'SESSION_ENDED') {
    if (message.sessionData) {
      emit({ event: 'session_data', data: message.sessionData });
    }
  }
});

// Errors
const errSub = emitter.addListener('onError', (error: any) => {
  console.error('[GarminService] ❌ Error:', error);
  emit({ event: 'error', error: new Error(String(error)) });
});

// Initialize the native SDK with both urlScheme and appId
sdkInitialize(urlScheme);

// Cleanup function
return () => {
  console.log('[GarminService] Cleaning up...');
  sdkSub.remove();
  statusSub.remove();
  msgSub.remove();
  errSub.remove();
  destroy();

  config = null;
  isInitialized = false;
  isReady = false;
  currentStatus = 'UNKNOWN';
  pairedDevices = [];
};
}

/**
* Fetch paired devices and auto-connect to the first one.
*/
export async function refreshDevices(): Promise<GarminDevice[]> {
if (!isReady) {
  console.log('[GarminService] SDK not ready, cannot refresh devices');
  return [];
}

try {
  const devices = await getDevicesList();
  console.log('[GarminService] Devices:', devices);

  pairedDevices = devices as GarminDevice[];
  emit({ event: 'devices_updated', devices: pairedDevices });

  // Auto-connect to first device if available
  if (devices.length > 0) {
    const d = devices[0] as GarminDevice;
    console.log(
      '[GarminService] Connecting to:',
      d.name,
      d.needsRepairing ? '(stale session)' : ''
    );
    connectDevice(d.id, d.model, d.name);
  }

  return devices;
} catch (error) {
  console.error('[GarminService] Error fetching devices:', error);
  emit({ event: 'error', error: error as Error });
  return [];
}
}

/**
* Opens Garmin Connect Mobile for device selection.
*/
export function openDeviceSelection(): void {
if (!isReady) {
  console.log('[GarminService] SDK not ready');
  return;
}
showDevicesList();
}

/**
* Send a message to the connected watch app.
*/
export function sendMessage(type: GarminOutboundMessageType, payload?: unknown): boolean {
if (currentStatus !== 'CONNECTED') {
  console.log('[GarminService] Cannot send - status:', currentStatus);
  return false;
}

const message = JSON.stringify({ type, payload });
console.log('[GarminService] 📤 Sending:', message);
sdkSendMessage(message);
return true;
}

// ============================================================================
// SESSION-SPECIFIC HELPERS
// ============================================================================

/**
* Tell the watch to start tracking a session.
*/
export function startWatchSession(sessionId: string, drillName?: string): boolean {
return sendMessage('START_SESSION', {
  sessionId,
  drillName,
  startedAt: Date.now(),
});
}

/**
* Tell the watch to end the session and send back data.
*/
export function endWatchSession(sessionId: string): boolean {
return sendMessage('END_SESSION', { sessionId });
}

/**
* Sync drill config to the watch (for display/timing).
*/
export function syncDrillToWatch(drill: {
name: string;
rounds: number;
distance?: number;
timeLimit?: number;
}): boolean {
return sendMessage('SYNC_DRILL', drill);
}

// ============================================================================
// GETTERS (for reading current state without subscribing)
// ============================================================================

export function getConfig(): GarminConfig | null {
return config;
}

export function getIsReady(): boolean {
return isReady;
}

export function getCurrentStatus(): GarminConnectionStatus {
return currentStatus;
}

export function getPairedDevices(): GarminDevice[] {
return pairedDevices;
}

export function isConnected(): boolean {
return currentStatus === 'CONNECTED';
}