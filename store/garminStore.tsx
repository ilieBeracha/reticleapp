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

// Re-export types for consumers
export type GarminDevice = Device;
export { Status as GarminDeviceStatus };

interface GarminState {
  // State
  devices: GarminDevice[];
  isConnecting: boolean;
  isInitialized: boolean;
  isSdkReady: boolean;
  lastError: string | null;
  
  // Actions
  startDeviceSelection: () => void;
  connectToDevice: (device: GarminDevice) => void;
  sendMessage: (message: string) => void;
  refreshDevices: () => Promise<void>;
  clearError: () => void;
  _initialize: () => () => void;
}

// URL scheme from app.config.js
const URL_SCHEME = 'retic';

export const useGarminStore = create<GarminState>((set, get) => ({
  devices: [],
  isConnecting: false,
  isInitialized: false,
  isSdkReady: false,
  lastError: null,
  sendMessage: (message: string) => {
    try {
      sendMessage(message);
    } catch (error) {
      console.error('[Garmin] Error sending message:', error);
      set({ lastError: 'Failed to send message' });
    }
  },
  startDeviceSelection: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      set({ lastError: 'Garmin is only available on iOS and Android' });
      return;
    }
    
    if (!get().isSdkReady) {
      console.log('[Garmin] SDK not ready yet');
      set({ lastError: 'Garmin SDK not ready' });
      return;
    }
    
    // Prevent multiple selection flows
    if (get().isConnecting) {
      console.log('[Garmin] Already connecting, ignoring...');
      return;
    }
    
    set({ isConnecting: true, lastError: null });
    
    // This opens Garmin Connect Mobile - the app will go to background
    showDevicesList();
    
    // Reset connecting state after a timeout (in case user cancels in GCM)
    setTimeout(() => {
      set({ isConnecting: false });
    }, 30000); // 30 second timeout
  },

  connectToDevice: (device: GarminDevice) => {
    if (!get().isSdkReady) {
      console.log('[Garmin] SDK not ready yet');
      return;
    }
    
    console.log('[Garmin] Connecting to device:', device.name);
    connectDevice(device.id, device.model, device.name);
  },

  refreshDevices: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    if (!get().isSdkReady) return;
    
    try {
      const devices = await getDevicesList();
      console.log('[Garmin] Fetched devices:', devices);
      set({ devices, isConnecting: false });
    } catch (error) {
      console.error('[Garmin] Error fetching devices:', error);
      set({ lastError: 'Failed to fetch devices', isConnecting: false });
    }
  },

  clearError: () => set({ lastError: null }),

  _initialize: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return () => {};
    }
    
    if (get().isInitialized) {
      return () => {};
    }
    
    console.log('[Garmin] Initializing SDK...');
    set({ isInitialized: true });

    // Create the appropriate event emitter based on platform
    // IMPORTANT: Register listeners BEFORE calling initialize() to avoid race condition
    const emitter = Platform.OS === 'ios' 
      ? new NativeEventEmitter(GarminConnect as any)
      : DeviceEventEmitter;

    // Listen for SDK ready
    const sdkReadySub = emitter.addListener('onSdkReady', () => {
      console.log('[Garmin] SDK is ready');
      set({ isSdkReady: true });
      // Fetch initial devices list
      get().refreshDevices();
    });

    // Initialize the Garmin SDK with URL scheme AFTER listeners are set up
    initialize(URL_SCHEME);

    // Listen for device status changes (CONNECTED, DISCONNECTED, etc.)
    const deviceStatusSub = emitter.addListener('onDeviceStatusChanged', (event: { name: string; status: string; error?: string }) => {
      console.log('[Garmin] Device status changed:', event);
      
      // If there's an error (e.g., device not found), set it
      if (event.error) {
        set({ lastError: event.error, isConnecting: false });
      } else {
        // Clear any previous errors on successful status update
        set({ lastError: null });
      }
      
      // Refresh device list to get updated status
      get().refreshDevices();
    });

    // Listen for messages from Garmin device
    const messageSub = emitter.addListener('onMessage', (message: any) => {
      console.log('[Garmin] Received message:', message);
      // Handle incoming messages from Garmin device if needed
    });

    // Listen for errors
    const errorSub = emitter.addListener('onError', (error: any) => {
      console.error('[Garmin] Error:', error);
      set({ lastError: error?.message || 'Garmin error occurred' });
    });

    // Listen for info (e.g., Garmin Connect app not installed)
    const infoSub = emitter.addListener('onInfo', (info: any) => {
      console.log('[Garmin] Info:', info);
      if (info?.message?.includes('not installed')) {
        set({ lastError: 'Garmin Connect app is not installed' });
      }
    });

    // Return cleanup function
    return () => {
      console.log('[Garmin] Cleaning up SDK...');
      sdkReadySub.remove();
      deviceStatusSub.remove();
      messageSub.remove();
      errorSub.remove();
      infoSub.remove();
      destroy();
      set({ isInitialized: false, isSdkReady: false });
    };
  },
}));

// Helper hook to get connection status
export const useGarminConnectionStatus = () => {
  const { devices, isConnecting } = useGarminStore();
  
  if (isConnecting) return 'connecting';
  // Check if any device is connected (not just in the list)
  const connectedDevice = devices.find(d => d.status === Status.CONNECTED);
  if (connectedDevice) return 'connected';
  if (devices.length > 0) return 'paired';
  return 'disconnected';
};

