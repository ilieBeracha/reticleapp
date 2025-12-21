import { useGarminStore, GarminDeviceStatus } from "@/store/garminStore";

interface BluetoothDevice {
  name: string;
  model: string;
  battery?: number;
  isCharging?: boolean;
}

/**
 * Hook to get Bluetooth/Garmin connection status.
 * Uses the Garmin store to get real device data.
 */
export function useBluetoothStatus() {
  const { devices } = useGarminStore();
  
  // Find the first connected device
  const connectedDevice = devices.find(
    (d) => d.status === GarminDeviceStatus.CONNECTED
  );
  
  const device: BluetoothDevice | null = connectedDevice
    ? {
        name: connectedDevice.name,
        model: connectedDevice.model,
        // Battery info not available from Garmin Connect SDK
        battery: undefined,
        isCharging: undefined,
      }
    : null;

  return {
    isConnected: !!connectedDevice,
    device,
  };
}
