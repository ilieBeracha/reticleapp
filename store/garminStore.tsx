/**
 * Garmin Connect IQ Store
 *
 * Pure state management layer for Garmin integration.
 * Subscribes to garminService events and exposes reactive state.
 *
 * Architecture:
 * - Service: Native bridge, event emitters, message sending
 * - Store: State management only (this file)
 * - View: Calls initialize() hook on mount
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import {
  type GarminConnectionStatus,
  type GarminDevice,
  type GarminInboundMessage,
  type GarminOutboundMessageType,
  type GarminSessionData,
  endWatchSession,
  getCurrentStatus,
  getIsReady,
  getPairedDevices,
  initialize,
  openDeviceSelection as serviceOpenDeviceSelection,
  refreshDevices as serviceRefreshDevices,
  sendMessage as serviceSendMessage,
  startWatchSession,
  subscribe,
  syncDrillToWatch,
} from '@/services/garminService';

// Re-export types for convenience
export type { GarminConnectionStatus, GarminDevice, GarminSessionData };

// ============================================================================
// TYPES
// ============================================================================

const MAX_MESSAGES = 20;

interface GarminState {
  // Connection state
  devices: GarminDevice[];
  status: GarminConnectionStatus;
  statusReason: string;
  isReady: boolean;

  // Message history (for debugging/display)
  messages: GarminInboundMessage[];

  // Session data received from watch
  lastSessionData: GarminSessionData | null;

  // Callbacks for session data (set by active session screen)
  onSessionData: ((data: GarminSessionData) => void) | null;

  // Actions (delegating to service)
  openDeviceSelection: () => void;
  refreshDevices: () => Promise<void>;
  send: (type: GarminOutboundMessageType, payload?: unknown) => boolean;
  clearMessages: () => void;

  // Session helpers
  startSession: (sessionId: string, drillName?: string) => boolean;
  endSession: (sessionId: string) => boolean;
  syncDrill: (drill: { name: string; rounds: number; distance?: number; timeLimit?: number }) => boolean;

  // Callback registration
  setSessionDataCallback: (callback: ((data: GarminSessionData) => void) | null) => void;

  // Internal: called by initialization hook
  _syncFromService: () => void;
}

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
  lastSessionData: null,
  onSessionData: null,

  // ---------------------------------------------------------------------------
  // Actions (delegating to service)
  // ---------------------------------------------------------------------------

  openDeviceSelection: () => {
    serviceOpenDeviceSelection();
  },

  refreshDevices: async () => {
    const devices = await serviceRefreshDevices();
    set({ devices });
  },

  send: (type, payload) => {
    return serviceSendMessage(type, payload);
  },

  clearMessages: () => set({ messages: [], lastSessionData: null }),

  // ---------------------------------------------------------------------------
  // Session Helpers
  // ---------------------------------------------------------------------------

  startSession: (sessionId, drillName) => {
    return startWatchSession(sessionId, drillName);
  },

  endSession: (sessionId) => {
    return endWatchSession(sessionId);
  },

  syncDrill: (drill) => {
    return syncDrillToWatch(drill);
  },

  // ---------------------------------------------------------------------------
  // Callback Registration
  // ---------------------------------------------------------------------------

  setSessionDataCallback: (callback) => {
    set({ onSessionData: callback });
  },

  // ---------------------------------------------------------------------------
  // Internal: Sync state from service
  // ---------------------------------------------------------------------------

  _syncFromService: () => {
    set({
      isReady: getIsReady(),
      status: getCurrentStatus(),
      devices: getPairedDevices(),
    });
  },
}));

// ============================================================================
// INITIALIZATION HOOK
// ============================================================================

/**
 * Hook to initialize the Garmin service and sync state to the store.
 * Call this once at the app root (e.g., in _layout.tsx).
 *
 * @example
 * ```tsx
 * import { useGarminInitialize } from '@/store/garminStore';
 *
 * export default function RootLayout() {
 *   useGarminInitialize();
 *   return <Stack />;
 * }
 * ```
 */
export function useGarminInitialize() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  
  useEffect(() => {
    // Initialize the native SDK (uses GARMIN_DEFAULT_CONFIG)
    const cleanup = initialize();

    // Subscribe to service events and update store
    const unsubscribe = subscribe((event) => {
      const store = useGarminStore.getState();

      switch (event.event) {
        case 'sdk_ready':
          useGarminStore.setState({ isReady: true });
          break;

        case 'status_changed':
          useGarminStore.setState({
            status: event.status,
            statusReason: event.reason || '',
          });
          break;

        case 'devices_updated':
          useGarminStore.setState({ devices: event.devices });
          break;

        case 'message_received':
          console.log('[GarminStore] 📩 MESSAGE_RECEIVED event');
          console.log('[GarminStore] 📩 Message:', JSON.stringify(event.message, null, 2));
          useGarminStore.setState((state) => {
            const newMessages = [...state.messages, event.message].slice(-MAX_MESSAGES);
            console.log('[GarminStore] 📩 Total messages now:', newMessages.length);
            return { messages: newMessages };
          });
          break;

        case 'session_data':
          useGarminStore.setState({ lastSessionData: event.data });

          // Call registered callback if any
          if (store.onSessionData) {
            store.onSessionData(event.data);
          }
          break;

        case 'error':
          console.error('[GarminStore] Service error:', event.error);
          break;
      }
    });

    // Sync initial state
    useGarminStore.getState()._syncFromService();
    
    // =========================================================================
    // AUTO-RECONNECT ON APP RESUME
    // When app comes back to foreground, try to refresh devices & reconnect
    // =========================================================================
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';
      
      if (wasBackground && isNowActive) {
        console.log('[GarminStore] App resumed - attempting auto-reconnect');
        const { isReady, status } = useGarminStore.getState();
        
        // Only try to reconnect if SDK ready and not already connected
        if (isReady && status !== 'CONNECTED') {
          serviceRefreshDevices().catch((err) => {
            console.log('[GarminStore] Auto-reconnect failed:', err);
          });
        }
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      unsubscribe();
      cleanup();
      appStateSubscription.remove();
      useGarminStore.setState({
        isReady: false,
        status: 'UNKNOWN',
        devices: [],
        messages: [],
      });
    };
  }, []);
}

// ============================================================================
// CONVENIENCE SELECTORS (Hooks)
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

/** Returns the last session data received from watch */
export const useGarminSessionData = () => useGarminStore((s) => s.lastSessionData);

/** Returns true if SDK is ready */
export const useGarminReady = () => useGarminStore((s) => s.isReady);
