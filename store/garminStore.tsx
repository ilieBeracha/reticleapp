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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

// AsyncStorage key for watch enabled preference
const WATCH_ENABLED_KEY = '@garmin_watch_enabled';

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
  // ---------------------------------------------------------------------------
  // User Preference
  // ---------------------------------------------------------------------------
  /** Whether user has enabled Garmin watch integration */
  watchEnabled: boolean;
  /** Whether we've loaded the preference from storage */
  watchEnabledLoaded: boolean;
  
  // ---------------------------------------------------------------------------
  // Connection state
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  
  /** Toggle watch enabled preference (persists to AsyncStorage) */
  setWatchEnabled: (enabled: boolean) => Promise<void>;
  /** Load watch enabled preference from storage */
  loadWatchEnabled: () => Promise<boolean>;
  
  // Actions (delegating to service)
  openDeviceSelection: () => void;
  refreshDevices: () => Promise<void>;
  send: (type: GarminOutboundMessageType, payload?: unknown) => boolean;
  clearMessages: () => void;
  clearLastSessionData: () => void;

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
  watchEnabled: true, // Default to true for existing users
  watchEnabledLoaded: false,
  devices: [],
  status: 'UNKNOWN',
  statusReason: '',
  isReady: false,
  messages: [],
  lastSessionData: null,
  onSessionData: null,

  // ---------------------------------------------------------------------------
  // Watch Enabled Preference
  // ---------------------------------------------------------------------------

  setWatchEnabled: async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(WATCH_ENABLED_KEY, JSON.stringify(enabled));
      set({ watchEnabled: enabled });
      console.log(`[GarminStore] Watch enabled set to: ${enabled}`);
    } catch (error) {
      console.error('[GarminStore] Failed to save watchEnabled:', error);
    }
  },

  loadWatchEnabled: async () => {
    try {
      const stored = await AsyncStorage.getItem(WATCH_ENABLED_KEY);
      // Default to true if never set (for existing users with watches)
      const enabled = stored !== null ? JSON.parse(stored) : true;
      set({ watchEnabled: enabled, watchEnabledLoaded: true });
      console.log(`[GarminStore] Watch enabled loaded: ${enabled}`);
      return enabled;
    } catch (error) {
      console.error('[GarminStore] Failed to load watchEnabled:', error);
      set({ watchEnabled: true, watchEnabledLoaded: true });
      return true;
    }
  },

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
  
  clearLastSessionData: () => set({ lastSessionData: null }),

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
  const cleanupRef = useRef<(() => void) | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
    
    // Load preference and conditionally initialize
    const initAsync = async () => {
      const { loadWatchEnabled } = useGarminStore.getState();
      const watchEnabled = await loadWatchEnabled();
      
      if (!watchEnabled) {
        console.log('[GarminStore] Watch disabled by user preference - skipping init');
        return;
      }
      
      console.log('[GarminStore] Watch enabled - initializing SDK');
      
      // Initialize the native SDK (uses GARMIN_DEFAULT_CONFIG)
      cleanupRef.current = initialize();

      // Subscribe to service events and update store
      unsubscribeRef.current = subscribe((event) => {
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
      // Only if watchEnabled is true
      // =========================================================================
      appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        const wasBackground = appStateRef.current.match(/inactive|background/);
        const isNowActive = nextAppState === 'active';
        
        if (wasBackground && isNowActive) {
          const { isReady, status, watchEnabled } = useGarminStore.getState();
          
          // Only try to reconnect if watch enabled, SDK ready, and not already connected
          if (watchEnabled && isReady && status !== 'CONNECTED') {
            console.log('[GarminStore] App resumed - attempting silent reconnect');
            serviceRefreshDevices().catch((err) => {
              console.log('[GarminStore] Silent reconnect failed:', err);
            });
          }
        }
        
        appStateRef.current = nextAppState;
      });
    };
    
    initAsync();

    return () => {
      unsubscribeRef.current?.();
      cleanupRef.current?.();
      appStateSubscription?.remove();
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

/** Returns whether watch integration is enabled by user */
export const useWatchEnabled = () => useGarminStore((s) => s.watchEnabled);

/** Returns whether watch preference has been loaded from storage */
export const useWatchEnabledLoaded = () => useGarminStore((s) => s.watchEnabledLoaded);
