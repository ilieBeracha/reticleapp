import { useGarminStore } from '@/store/garminStore';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function DeviceSelectResp() {
  const { refreshDevices } = useGarminStore();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      await new Promise(r => setTimeout(r, 500));
      await refreshDevices();
      setDone(true);
    };
    run();
  }, []);

  if (done) return <Redirect href="/(protected)/integrations" />;
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#007CC3" />
    </View>
  );
}
