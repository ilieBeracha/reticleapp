import { useEffect, useState } from "react";

interface GarminDevice {
  name: string;
  model: string;
  battery: number;
  isCharging: boolean;
}

export function useBluetoothStatus() {
  const [isConnected, setIsConnected] = useState(true); // Mock as connected
  const [device, setDevice] = useState<GarminDevice | null>(null);

  useEffect(() => {
    // Mock Garmin device - replace with actual Bluetooth/Garmin SDK
    // You can use Garmin Connect IQ SDK or react-native-ble-manager

    // Simulated Garmin device
    const mockGarminDevice: GarminDevice = {
      name: "Garmin Forerunner 965",
      model: "FR965",
      battery: 87,
      isCharging: false,
    };

    setIsConnected(true);
    setDevice(mockGarminDevice);

    // Simulate battery drain every 30 seconds
    const interval = setInterval(() => {
      setDevice((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          battery: Math.max(0, prev.battery - 1),
        };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return { isConnected, device };
}
