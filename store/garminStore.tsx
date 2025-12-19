import type { GarminDevice } from 'expo-garmin';
import {
    addDeviceStatusChangedListener,
    addDevicesUpdatedListener,
    getConnectedDevices,
    showDeviceSelection
} from 'expo-garmin';
import { Platform } from 'react-native';
import { create } from 'zustand';

interface GarminState {
  // State
  devices: GarminDevice[];
  isConnecting: boolean;
  isInitialized: boolean;
  lastError: string | null;
  
  // Actions
  startDeviceSelection: () => void;
  refreshDevices: () => Promise<void>;
  clearError: () => void;
  _initialize: () => () => void;
}

export const useGarminStore = create<GarminState>((set, get) => ({
  devices: [],
  isConnecting: false,
  isInitialized: false,
  lastError: null,

  startDeviceSelection: () => {
    if (Platform.OS !== 'ios') {
      set({ lastError: 'Garmin is only available on iOS' });
      return;
    }
    
    // Prevent multiple selection flows
    if (get().isConnecting) {
      console.log('[Garmin] Already connecting, ignoring...');
      return;
    }
    
    set({ isConnecting: true, lastError: null });
    
    // This opens Garmin Connect Mobile - the app will go to background
    // When user returns, the URL callback will trigger device update
    showDeviceSelection();
    
    // Reset connecting state after a timeout (in case user cancels in GCM)
    setTimeout(() => {
      set({ isConnecting: false });
    }, 30000); // 30 second timeout
  },

  refreshDevices: async () => {
    if (Platform.OS !== 'ios') return;
    
    try {
      const devices = await getConnectedDevices();
      set({ devices, isConnecting: false });
    } catch (error) {
      console.error('[Garmin] Error fetching devices:', error);
      set({ lastError: 'Failed to fetch devices', isConnecting: false });
    }
  },

  clearError: () => set({ lastError: null }),

  _initialize: () => {
    if (Platform.OS !== 'ios') {
      return () => {};
    }
    
    if (get().isInitialized) {
      return () => {};
    }
    
    console.log('[Garmin] Initializing store listeners...');
    set({ isInitialized: true });

    // Listen for device updates from the native module
    const devicesSub = addDevicesUpdatedListener((event) => {
      console.log('[Garmin] Devices updated:', event.devices);
      set({ devices: event.devices, isConnecting: false });
    });

    // Listen for device status changes
    const statusSub = addDeviceStatusChangedListener((event) => {
      console.log('[Garmin] Device status changed:', event);
      // Refresh devices when status changes
      get().refreshDevices();
    });

    // Initial fetch of connected devices
    get().refreshDevices();

    // Return cleanup function
    return () => {
      console.log('[Garmin] Cleaning up store listeners...');
      devicesSub.remove();
      statusSub.remove();
      set({ isInitialized: false });
    };
  },
}));

// Helper hook to get connection status
export const useGarminConnectionStatus = () => {
  const { devices, isConnecting } = useGarminStore();
  
  if (isConnecting) return 'connecting';
  if (devices.length > 0) return 'connected';
  return 'disconnected';
};

