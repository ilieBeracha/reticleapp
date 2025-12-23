import { DeviceEventEmitter, NativeEventEmitter, Platform } from 'react-native';
import {
    type Device,
    GarminConnect,
    Status,
    connectDevice,
    destroy,
    getDevicesList,
    initialize,
    showDevicesList
} from 'react-native-garmin-connect';
import { create } from 'zustand';

export type GarminDevice = Device;
export { Status as GarminDeviceStatus };

interface GarminState {
  devices: GarminDevice[];
  status: string;
  reason: string;
  isReady: boolean;
  
  openDeviceSelection: () => void;
  refreshDevices: () => Promise<void>;
  _initialize: () => () => void;
}

export const useGarminStore = create<GarminState>((set, get) => ({
  devices: [],
  status: 'UNKNOWN',
  reason: '',
  isReady: false,

  openDeviceSelection: () => {
    if (!get().isReady) return;
    showDevicesList();
  },

  refreshDevices: async () => {
    if (!get().isReady) return;
    try {
      const devices = await getDevicesList();
      console.log('[Garmin] Devices:', devices);
      set({ devices });
      
      // Auto-connect to first device if available
      if (devices.length > 0) {
        const d = devices[0];
        console.log('[Garmin] Connecting to:', d.name);
        connectDevice(d.id, d.model, d.name);
      }
    } catch (e) {
      console.error('[Garmin] Error:', e);
    }
  },

  _initialize: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return () => {};
    
    console.log('[Garmin] Init');
    
    const emitter = Platform.OS === 'ios' 
      ? new NativeEventEmitter(GarminConnect as any)
      : DeviceEventEmitter;

    const sdkSub = emitter.addListener('onSdkReady', () => {
      console.log('[Garmin] Ready');
      set({ isReady: true });
      get().refreshDevices();
    });

    const statusSub = emitter.addListener('onDeviceStatusChanged', (e: any) => {
      console.log('[Garmin] Status:', e.status, '-', e.reason || '');
      set({ status: e.status, reason: e.reason || '' });
    });

    initialize('retic');

    return () => {
      sdkSub.remove();
      statusSub.remove();
      destroy();
    };
  },
}));
