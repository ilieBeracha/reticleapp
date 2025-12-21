/**
 * Garmin Device Selection Response Handler
 * 
 * This route handles the callback from Garmin Connect Mobile.
 * It quickly processes the response and redirects to integrations.
 */
import { useGarminStore } from '@/store/garminStore';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

export default function DeviceSelectResponseScreen() {
  const { refreshDevices } = useGarminStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const process = async () => {
      console.log('[Garmin] Device selection callback - processing...');
      
      // Wait a moment for native side to finish parsing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh devices list
      await refreshDevices();
      
      const { devices } = useGarminStore.getState();
      
      console.log('[Garmin] Devices after refresh:', devices.length);
      
      // Ready to redirect
      setReady(true);
    };

    process();
  }, []);

  // Once ready, redirect to integrations
  if (ready) {
    router.replace('/(protected)');    
  }
  return null;

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

