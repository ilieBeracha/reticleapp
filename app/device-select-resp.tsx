/**
 * Garmin Device Selection Response Handler
 * 
 * This route handles the callback from Garmin Connect Mobile.
 * It quickly processes the response and redirects to integrations.
 */
import { GarminDeviceStatus, useGarminStore } from '@/store/garminStore';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

function DeviceSelectResponseScreen() {
  const { refreshDevices, connectToDevice, devices } = useGarminStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const process = async () => {
      console.log('[Garmin] Device selection callback - processing...');
      
      // Wait a moment for native side to finish parsing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh devices list
      await refreshDevices();
        
      const connectedDevice = devices.find(d => d.status === GarminDeviceStatus.CONNECTED);
      if (connectedDevice) {
        connectToDevice(devices[0].id, devices[0].model, devices[0].name);
        console.log('[Garmin] Connected to device:', devices[0].name);
      }
    }
    process();
  }, [connectToDevice, devices, refreshDevices]);

  return <Redirect href="/(protected)/(tabs)" />;
}

export default DeviceSelectResponseScreen;