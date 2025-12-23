/**
 * Garmin Connect IQ Store
 * 
 * Manages connection to Garmin wearables via the ConnectIQ Mobile SDK.
 * Handles device pairing, status tracking, and bidirectional messaging.
 */

import { DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';
import {
  type Device,
  GarminConnect,
  Status,
  connectDevice,
  destroy,
  getDevicesList,
  initialize,
  sendMessage,
  showDevicesList,
} from 'react-native-garmin-connect';
import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export type GarminDevice = Device;
export { Status as GarminDeviceStatus };

export type GarminStatus = 'UNKNOWN' | 'CONNECTED' | 'ONLINE' | 'OFFLINE' | 'ACK' | 'PONG';

export interface GarminMessage {
  type: string;
  payload?: unknown;
}

interface GarminState {
  // State
  devices: GarminDevice[];
  status: GarminStatus;
  statusReason: string;
  isReady: boolean;
  messages: GarminMessage[];

  // Actions
  openDeviceSelection: () => void;
  refreshDevices: () => Promise<void>;
  send: (type: string, payload?: unknown) => void;
  clearMessages: () => void;

  // Lifecycle
  _initialize: () => () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const URL_SCHEME = 'retic';
const MAX_MESSAGES = 20;

// ============================================================================
// STORE
// ============================================================================

export const useGarminStore = create<GarminState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------
  devices: [],
  status: 'UNKNOWN',
  statusReason: '',
  isReady: false,
  messages: [],

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Opens Garmin Connect Mobile for device selection */
  openDeviceSelection: () => {
    if (!get().isReady) {
      console.log('[Garmin] SDK not ready');
      return;
    }
    showDevicesList();
  },

  /** Fetches paired devices and auto-connects to the first one */
  refreshDevices: async () => {
    if (!get().isReady) return;

    try {
      const devices = await getDevicesList();
      console.log('[Garmin] Devices:', devices);
      set({ devices });

      // Auto-connect to first device
      if (devices.length > 0) {
        const d = devices[0];
        console.log('[Garmin] Connecting to:', d.name);
        connectDevice(d.id, d.model, d.name);
      }
    } catch (error) {
      console.error('[Garmin] Error fetching devices:', error);
    }
  },

  /** Sends a message to the connected watch app */
  send: (type: string, payload?: unknown) => {
    if (get().status !== 'CONNECTED') {
      console.log('[Garmin] Cannot send - status:', get().status);
      return;
    }

    const message = JSON.stringify({ type, payload });
    console.log('[Garmin] 📤 Sending:', message);
    sendMessage(message);
  },

  /** Clears the message history */
  clearMessages: () => set({ messages: [] }),

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Initializes the SDK and sets up event listeners. Call once at app root. */
  _initialize: () => {
    // Only available on mobile
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return () => {};
    }

    console.log('[Garmin] Initializing SDK...');

    // Create platform-specific event emitter
    const emitter =
      Platform.OS === 'ios'
        ? new NativeEventEmitter(GarminConnect as any)
        : DeviceEventEmitter;

    // SDK Ready
    const sdkSub = emitter.addListener('onSdkReady', () => {
      console.log('[Garmin] ✅ SDK Ready');
      set({ isReady: true });
      get().refreshDevices();
    });

    // Device Status Changes
    const statusSub = emitter.addListener('onDeviceStatusChanged', (event: any) => {
      const status = event.status as GarminStatus;
      const reason = event.reason || '';
      console.log(`[Garmin] 📱 Status: ${status}${reason ? ` (${reason})` : ''}`);
      set({ status, statusReason: reason });
    });

    // Incoming Messages from Watch
    const msgSub = emitter.addListener('onMessage', (raw: any) => {
      console.log('[Garmin] 📩 Message received:', raw);
      
      const message: GarminMessage = {
        type: raw?.type || 'unknown',
        payload: raw?.payload,
      };
      
      set((state) => ({
        messages: [...state.messages, message].slice(-MAX_MESSAGES),
      }));
    });

    // Errors
    const errSub = emitter.addListener('onError', (error: any) => {
      console.error('[Garmin] ❌ Error:', error);
    });

    // Initialize the native SDK
    initialize(URL_SCHEME);

    // Cleanup function
    return () => {
      console.log('[Garmin] Cleaning up...');
      sdkSub.remove();
      statusSub.remove();
      msgSub.remove();
      errSub.remove();
      destroy();
      set({ isReady: false, status: 'UNKNOWN', devices: [] });
    };
  },
}));

// ============================================================================
// HOOKS (Convenience selectors)
// ============================================================================

/** Returns the current connection status */
export const useGarminStatus = () => useGarminStore((s) => s.status);

/** Returns true if a device is connected */
export const useIsGarminConnected = () => useGarminStore((s) => s.status === 'CONNECTED');

/** Returns the list of paired devices */
export const useGarminDevices = () => useGarminStore((s) => s.devices);

/** Returns the first paired device (if any) */
export const useGarminDevice = () => useGarminStore((s) => s.devices[0]);

/** Returns messages received from the watch */
export const useGarminMessages = () => useGarminStore((s) => s.messages);

/** Returns the send function */
export const useGarminSend = () => useGarminStore((s) => s.send);
