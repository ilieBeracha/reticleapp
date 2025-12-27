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
| 'SESSION_START'  // Alias for START_SESSION (used by watch)
| 'SESSION_END'    // Alias for END_SESSION (used by watch)
| 'SYNC_DRILL'
| 'PING';

/** Message types received FROM the watch */
export type GarminInboundMessageType =
| 'SESSION_DATA'
| 'SESSION_RESULT'  // Watch sends this when session ends (auto or manual)
| 'SHOT_RECORDED'
| 'SESSION_ENDED'
| 'HEARTBEAT'
| 'PONG';

export interface GarminSessionData {
/** Session ID (matches our DB session) */
sessionId?: string;
/** Total shots recorded by the watch (watch sends as shotsFired) */
shotsRecorded: number;
/** Shot timestamps (ms since session start) */
shotTimestamps?: number[];
/** Average time between shots (ms) */
avgSplitMs?: number;
/** Session duration (ms) - watch sends elapsedTime in seconds */
durationMs?: number;
/** Distance in meters (from watch) */
distance?: number;
/** Whether session was completed (max bullets reached) */
completed?: boolean;
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
// DEFAULT CONFIG (centralized - change here only)
// ============================================================================

/** Default Garmin configuration for this app */
export const GARMIN_DEFAULT_CONFIG: GarminConfig = {
  urlScheme: 'retic',
  appId: '467f4bb7-cd3c-45c4-a39b-9bb78260c9ed',
} as const;

// ============================================================================
// SERVICE STATE (module-level singleton)
// ============================================================================

let config: GarminConfig | null = null;
let isInitialized = false;
let isReady = false;
let currentStatus: GarminConnectionStatus = 'UNKNOWN';
let pairedDevices: GarminDevice[] = [];
const listeners = new Set<GarminServiceListener>();

// Pending ACK tracking for retry logic
let pendingAck: {
  type: string;
  resolve: (success: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
} | null = null;

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
* @param customConfig - Optional custom config (defaults to GARMIN_DEFAULT_CONFIG)
*/
export function initialize(customConfig?: Partial<GarminConfig>): () => void {
if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
  console.log('[GarminService] Not a mobile platform, skipping init');
  return () => {};
}

// Merge with defaults
const urlScheme = customConfig?.urlScheme ?? GARMIN_DEFAULT_CONFIG.urlScheme;
const appId = customConfig?.appId ?? GARMIN_DEFAULT_CONFIG.appId;

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
  console.log('[GarminService] 📩 ========================================');
  console.log('[GarminService] 📩 MESSAGE RECEIVED FROM NATIVE');
  console.log('[GarminService] 📩 Raw:', JSON.stringify(raw, null, 2));
  console.log('[GarminService] 📩 ========================================');

  // Parse payload if it's a JSON string
  let parsedPayload = raw?.payload;
  if (typeof parsedPayload === 'string') {
    try {
      parsedPayload = JSON.parse(parsedPayload);
      console.log('[GarminService] 📩 Parsed payload:', parsedPayload);
    } catch {
      // Keep as string if not valid JSON
      console.log('[GarminService] 📩 Payload is plain string');
    }
  }

  const message: GarminInboundMessage = {
    type: raw?.type || 'unknown',
    payload: parsedPayload,
    // Extract sessionData from parsed payload if present
    sessionData: parsedPayload?.sessionData || parsedPayload,
    timestamp: Date.now(),
  };

  // Handle ACK messages for retry logic
  if (message.type === 'ACK') {
    handleAckReceived(parsedPayload);
  }

  console.log('[GarminService] 📩 Emitting message_received:', message.type);
  emit({ event: 'message_received', message });

  // Special handling for session data
  // Watch sends: SESSION_RESULT with { sessionId, shotsFired, elapsedTime, distance, completed }
  if (message.type === 'SESSION_DATA' || message.type === 'SESSION_ENDED' || message.type === 'SESSION_RESULT') {
    console.log('[GarminService] 📩 Session data message detected, type:', message.type);
    
    // Debug: Log raw values from watch BEFORE any conversion
    console.log('[GarminService] 📩 RAW from watch:');
    console.log('  - elapsedTime (seconds):', parsedPayload?.elapsedTime);
    console.log('  - shotsFired:', parsedPayload?.shotsFired);
    console.log('  - sessionId:', parsedPayload?.sessionId);
    console.log('  - distance:', parsedPayload?.distance);
    
    // Map SESSION_RESULT fields to our GarminSessionData format
    const rawElapsedTime = parsedPayload?.elapsedTime ?? 0;
    const convertedDurationMs = rawElapsedTime * 1000;
    
    console.log('[GarminService] 📩 Converting: elapsedTime', rawElapsedTime, 'sec → durationMs', convertedDurationMs, 'ms');
    
    const sessionData: GarminSessionData = {
      sessionId: parsedPayload?.sessionId,
      shotsRecorded: parsedPayload?.shotsFired ?? 0,
      durationMs: convertedDurationMs,
      // Additional fields from watch if available
      ...(parsedPayload?.distance && { distance: parsedPayload.distance }),
      ...(parsedPayload?.completed !== undefined && { completed: parsedPayload.completed }),
    };
    
    console.log('[GarminService] 📩 Final sessionData:', JSON.stringify(sessionData));
    emit({ event: 'session_data', data: sessionData });
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
export function sendMessage(type: GarminOutboundMessageType | string, payload?: unknown): boolean {
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
// ACK HANDLING & RETRY LOGIC
// ============================================================================

/**
 * Handle ACK received from watch. Resolves any pending ACK promise.
 */
function handleAckReceived(ackPayload: { status?: string } | null): void {
  if (!pendingAck) {
    console.log('[GarminService] ACK received but no pending request');
    return;
  }

  clearTimeout(pendingAck.timeout);
  const wasWaiting = pendingAck;
  pendingAck = null;

  // Check if ACK indicates success
  const status = ackPayload?.status;
  if (status === 'session_started' || status === 'session_ended' || status === 'received' || status === 'weather_updated') {
    console.log('[GarminService] ✅ ACK received for:', wasWaiting.type, '- status:', status);
    wasWaiting.resolve(true);
  } else {
    console.log('[GarminService] ⚠️ ACK received with unexpected status:', status);
    wasWaiting.resolve(false);
  }
}

/**
 * Send a message and wait for ACK with timeout.
 */
function sendAndWaitForAck(
  type: string,
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<boolean> {
  return new Promise((resolve) => {
    // Clear any existing pending ACK
    if (pendingAck) {
      clearTimeout(pendingAck.timeout);
      pendingAck.resolve(false);
    }

    // Set up ACK listener with timeout
    pendingAck = {
      type,
      resolve,
      timeout: setTimeout(() => {
        console.warn(`[GarminService] ⏱️ ACK timeout for ${type} after ${timeoutMs}ms`);
        pendingAck = null;
        resolve(false);
      }, timeoutMs),
    };

    // Send the message
    const sent = sendMessage(type, payload);
    if (!sent) {
      // If send failed immediately (not connected), resolve false
      if (pendingAck) {
        clearTimeout(pendingAck.timeout);
        pendingAck = null;
      }
      resolve(false);
    }
  });
}

/**
 * Send a message with retry and ACK confirmation.
 * Returns true if message was acknowledged by watch, false otherwise.
 * 
 * @param type - Message type (e.g., 'SESSION_START')
 * @param payload - Message payload
 * @param options - Retry options (maxRetries, timeoutMs)
 */
export async function sendMessageWithRetry(
  type: string,
  payload: Record<string, unknown>,
  options: { maxRetries?: number; timeoutMs?: number } = {}
): Promise<boolean> {
  const { maxRetries = 3, timeoutMs = 3000 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[GarminService] 📤 Sending ${type}, attempt ${attempt}/${maxRetries}`);

    const success = await sendAndWaitForAck(type, payload, timeoutMs);
    if (success) {
      console.log(`[GarminService] ✅ ${type} acknowledged on attempt ${attempt}`);
      return true;
    }

    // Exponential backoff before retry
    if (attempt < maxRetries) {
      const backoffMs = 1000 * attempt;
      console.log(`[GarminService] ⏳ Waiting ${backoffMs}ms before retry...`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  console.warn(`[GarminService] ❌ ${type} failed after ${maxRetries} attempts`);
  return false;
}

// ============================================================================
// SESSION-SPECIFIC HELPERS
// ============================================================================

/**
 * Configuration for starting a watch session.
 * Import WatchSessionConfig from @/utils/garminHelpers for building this.
 */
export interface StartWatchSessionPayload {
  sessionId: string;
  drillName: string;
  drillType: string;
  inputMethod: string;
  watchMode: 'primary' | 'supplementary';
  distance: number;
  rounds: number;
  timeLimit: number | null;
  parTime: number | null;
  strings: number;
  startedAt: number;
}

/**
 * Tell the watch to start tracking a session.
 *
 * For full drill-aware sessions, use the payload version.
 * For simple sessions, use the string version (legacy).
 */
export function startWatchSession(
  sessionIdOrPayload: string | StartWatchSessionPayload,
  drillName?: string
): boolean {
  // If payload object, send full config
  if (typeof sessionIdOrPayload === 'object') {
    return sendMessage('START_SESSION', sessionIdOrPayload);
  }

  // Legacy: simple session start
  return sendMessage('START_SESSION', {
    sessionId: sessionIdOrPayload,
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
// MOCK (for testing without a real watch)
// ============================================================================

/**
 * Simulate receiving session data from a watch.
 * Useful for testing the flow without a real Garmin device.
 * 
 * Usage: mockWatchSessionResult('session-id-here', 5, 45);
 */
export function mockWatchSessionResult(
  sessionId: string,
  shotsFired: number = 5,
  elapsedTimeSeconds: number = 30,
  distance: number = 25,
  completed: boolean = true
): void {
  console.log('[GarminService] 🧪 MOCK: Simulating watch session result');
  
  const mockPayload = {
    sessionId,
    shotsFired,
    elapsedTime: elapsedTimeSeconds,
    distance,
    completed,
  };
  
  // Simulate the same flow as a real watch message
  const sessionData: GarminSessionData = {
    sessionId: mockPayload.sessionId,
    shotsRecorded: mockPayload.shotsFired,
    durationMs: mockPayload.elapsedTime * 1000,
    distance: mockPayload.distance,
    completed: mockPayload.completed,
  };
  
  console.log('[GarminService] 🧪 MOCK: Emitting session_data:', sessionData);
  emit({ event: 'session_data', data: sessionData });
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