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
  type GarminTimelineData,
  endWatchSession,
  getCurrentStatus,
  getIsReady,
  getPairedDevices,
  initialize,
  openDeviceSelection as serviceOpenDeviceSelection,
  refreshDevices as serviceRefreshDevices,
  sendMessage as serviceSendMessage,
  sendMessageWithRetry as serviceSendMessageWithRetry,
  startWatchSession,
  subscribe,
  syncDrillToWatch,
} from '@/services/garminService';

import { saveSessionTimeline } from '@/services/session/timelineService';

import {
  mergeCompactWatchDetails,
  mergeWatchSessionDetails,
} from '@/services/session/mutations';
import type { WatchDetailsPayload } from '@/services/session/watchTypes';

// Re-export types for convenience
export type { GarminConnectionStatus, GarminDevice, GarminSessionData, GarminTimelineData };

// ============================================================================
// TYPES
// ============================================================================

const MAX_MESSAGES = 20;

/** Session start status for retry tracking */
export type SessionStartStatus = 'idle' | 'sending' | 'success' | 'failed';

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

  // Timeline data received from watch (Phase 3)
  lastTimelineData: GarminTimelineData | null;
  timelineProgress: { chunk: number; total: number } | null;

  // Watch heartbeat state (from HEARTBEAT_ACK)
  watchState: {
    state: 'idle' | 'preview' | 'active' | 'syncing' | 'unknown';
    sessionId: string | null;
    shotCount: number;
    syncPhase: number;
    lastUpdate: number;
  };

  // Callbacks for session data (set by active session screen)
  onSessionData: ((data: GarminSessionData) => void) | null;
  onTimelineComplete: ((data: GarminTimelineData) => void) | null;
  /** Called when watch session completes (state goes from active to idle) */
  onWatchSessionComplete: ((sessionId: string, shotCount: number) => void) | null;

  // ---------------------------------------------------------------------------
  // Session Start Retry State
  // ---------------------------------------------------------------------------
  /** Status of sending SESSION_START to watch */
  sessionStartStatus: SessionStartStatus;
  /** Number of retry attempts made */
  sessionStartAttempts: number;

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
  /** Send message with retry and ACK confirmation */
  sendWithRetry: (type: string, payload: Record<string, unknown>, options?: { maxRetries?: number; timeoutMs?: number }) => Promise<boolean>;
  clearMessages: () => void;
  clearLastSessionData: () => void;

  // Session helpers
  startSession: (sessionId: string, drillName?: string) => boolean;
  /** Start session with retry logic - returns true if watch acknowledged */
  startSessionWithRetry: (payload: Record<string, unknown>) => Promise<boolean>;
  endSession: (sessionId: string) => boolean;
  syncDrill: (drill: { name: string; rounds: number; distance?: number; timeLimit?: number }) => boolean;
  
  // Session start status management
  setSessionStartStatus: (status: SessionStartStatus) => void;
  resetSessionStartStatus: () => void;

  // Callback registration
  setSessionDataCallback: (callback: ((data: GarminSessionData) => void) | null) => void;
  setTimelineCompleteCallback: (callback: ((data: GarminTimelineData) => void) | null) => void;
  setWatchSessionCompleteCallback: (callback: ((sessionId: string, shotCount: number) => void) | null) => void;
  clearTimelineData: () => void;

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
  lastTimelineData: null,
  timelineProgress: null,
  watchState: {
    state: 'unknown',
    sessionId: null,
    shotCount: 0,
    syncPhase: 0,
    lastUpdate: 0,
  },
  onSessionData: null,
  onTimelineComplete: null,
  onWatchSessionComplete: null,
  sessionStartStatus: 'idle',
  sessionStartAttempts: 0,

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

  sendWithRetry: async (type, payload, options) => {
    return serviceSendMessageWithRetry(type, payload, options);
  },

  clearMessages: () => set({ messages: [], lastSessionData: null }),
  
  clearLastSessionData: () => set({ lastSessionData: null }),

  // ---------------------------------------------------------------------------
  // Session Helpers
  // ---------------------------------------------------------------------------

  startSession: (sessionId, drillName) => {
    return startWatchSession(sessionId, drillName);
  },

  startSessionWithRetry: async (payload) => {
    set({ sessionStartStatus: 'sending', sessionStartAttempts: 0 });
    
    const success = await serviceSendMessageWithRetry('SESSION_START', payload, {
      maxRetries: 3,
      timeoutMs: 3000,
    });
    
    if (success) {
      set({ sessionStartStatus: 'success' });
    } else {
      set({ sessionStartStatus: 'failed' });
    }
    
    return success;
  },

  endSession: (sessionId) => {
    return endWatchSession(sessionId);
  },

  syncDrill: (drill) => {
    return syncDrillToWatch(drill);
  },

  setSessionStartStatus: (status) => {
    set({ sessionStartStatus: status });
  },

  resetSessionStartStatus: () => {
    set({ sessionStartStatus: 'idle', sessionStartAttempts: 0 });
  },

  // ---------------------------------------------------------------------------
  // Callback Registration
  // ---------------------------------------------------------------------------

  setSessionDataCallback: (callback) => {
    set({ onSessionData: callback });
  },

  setTimelineCompleteCallback: (callback) => {
    set({ onTimelineComplete: callback });
  },

  setWatchSessionCompleteCallback: (callback) => {
    set({ onWatchSessionComplete: callback });
  },

  clearTimelineData: () => {
    set({ lastTimelineData: null, timelineProgress: null });
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

          // =========================================================================
          // TWO-PHASE SYNC: SESSION_SUMMARY (Phase 1 - Instant, show results fast)
          // =========================================================================
          case 'session_summary':
            console.log('[GarminStore] 📩 SESSION_SUMMARY received (Phase 1)');
            useGarminStore.setState({ lastSessionData: event.data });

            // Call registered callback if any
            if (store.onSessionData) {
              store.onSessionData(event.data);
            }
            
            // SESSION_SUMMARY = session is DONE! (Timeline syncs in background)
            // This is Phase 1 - instant, user shouldn't wait for timeline
            if (event.data?.completed && event.data?.sessionId) {
              console.log('[GarminStore] 🏁 Session complete (from SESSION_SUMMARY)');
              if (store.onWatchSessionComplete) {
                store.onWatchSessionComplete(event.data.sessionId, event.data.shotsRecorded || 0);
              }
            }
            break;

          // =========================================================================
          // TWO-PHASE SYNC: SESSION_DETAILS (Phase 2 - Merge full data)
          // =========================================================================
          case 'session_details':
            // SESSION_DETAILS is Phase 2 - background data
            // DO NOT update lastSessionData - this would cause UI glitches
            // Just save to DB silently and show a toast
            console.log('[GarminStore] 📩 SESSION_DETAILS received (Phase 2 - background only)');
            
            const sessionIdForMerge = event.data.sessionId;
            if (sessionIdForMerge) {
              console.log('[GarminStore] 📩 Saving details to DB silently...');
              
              // Check if this is the new compact format (has shotBiometrics from transformer)
              const hasCompactFormat = event.data.steadiness?.shots?.[0]?.flinch !== undefined ||
                event.data.biometrics?.shotBiometrics?.[0]?.shot !== undefined;
              
              // Try compact format first, then fall back to legacy
              const mergePromise = hasCompactFormat
                ? mergeCompactWatchDetails(sessionIdForMerge, {
                    sid: sessionIdForMerge,
                    shotData: (event.data.biometrics?.shotBiometrics || []).map((sb: { shot: number; hr?: number }) => ({
                      n: sb.shot,
                      t: 0, // Not available in this path
                      hr: sb.hr || 0,
                      st: 0, // Not available in this path
                      fl: 0 as const,
                    })),
                    meta: {
                      auto: event.data.autoDetected ?? false,
                      sens: event.data.detectionSensitivity ?? 0,
                      overrides: event.data.manualOverrides ?? 0,
                    },
                  } as WatchDetailsPayload)
                : mergeWatchSessionDetails(sessionIdForMerge, event.data);
              
              mergePromise
                .then((success) => {
                  if (success) {
                    console.log('[GarminStore] ✅ Details synced to DB');
                    // TODO: Show toast "Detailed biometrics synced ✓"
                  } else {
                    // No existing target - store details for when user saves
                    console.log('[GarminStore] ℹ️ No existing target, caching details');
                    // Cache the details so they can be included when summary is saved
                    useGarminStore.setState((state) => {
                      const existing = state.lastSessionData;
                      if (existing && existing.sessionId === sessionIdForMerge) {
                        // Merge into lastSessionData for when user saves
                        return {
                          lastSessionData: {
                            ...existing,
                            ...event.data,
                            shotsRecorded: existing.shotsRecorded,
                            durationMs: existing.durationMs,
                            isSummaryOnly: false,
                          } as GarminSessionData,
                        };
                      }
                      return {};
                    });
                  }
                })
                .catch((err) => {
                  console.error('[GarminStore] ❌ Error saving details to DB:', err);
                });
            }
            break;

          // =========================================================================
          // THREE-PHASE SYNC: TIMELINE_CHUNK (Phase 3 - Progress update)
          // =========================================================================
          case 'timeline_chunk':
            console.log(`[GarminStore] 📩 TIMELINE_CHUNK ${event.chunk + 1}/${event.total}`);
            useGarminStore.setState({
              timelineProgress: { chunk: event.chunk + 1, total: event.total },
            });
            break;

          // =========================================================================
          // THREE-PHASE SYNC: TIMELINE_COMPLETE (Phase 3 - All chunks received)
          // =========================================================================
          case 'timeline_complete':
            console.log('[GarminStore] 📩 TIMELINE_COMPLETE received');
            console.log('[GarminStore] 📩 Timeline summary:', event.data.summary);
            
            // Update state with timeline data
            useGarminStore.setState({
              lastTimelineData: event.data,
              timelineProgress: null, // Clear progress
            });
            
            // Call registered callback if any
            if (store.onTimelineComplete) {
              store.onTimelineComplete(event.data);
            }
            
            // Save to database (background - user already sees results from SESSION_SUMMARY)
            const timelineSessionId = event.data.sessionId;
            if (timelineSessionId) {
              console.log('[GarminStore] 📩 Saving timeline to DB...');
              saveSessionTimeline(event.data)
                .then((saved) => {
                  console.log('[GarminStore] ✅ Timeline saved to DB:', saved.id);
                  // Timeline syncs silently - session completion already triggered by SESSION_SUMMARY
                })
                .catch((err) => {
                  console.error('[GarminStore] ❌ Error saving timeline to DB:', err);
                });
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

/** Returns the session start status for retry UI */
export const useSessionStartStatus = () => useGarminStore((s) => s.sessionStartStatus);

/** Returns the last timeline data received from watch */
export const useGarminTimelineData = () => useGarminStore((s) => s.lastTimelineData);

/** Returns timeline sync progress (chunk/total) */
export const useTimelineProgress = () => useGarminStore((s) => s.timelineProgress);
