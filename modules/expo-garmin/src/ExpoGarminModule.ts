import { EventEmitter, requireNativeModule, Subscription } from 'expo-modules-core';
import { Platform } from 'react-native';
import { AppStatus, DeviceStatusChangedEvent, DevicesUpdatedEvent, GarminDevice, MessageReceivedEvent } from './ExpoGarmin.types';

interface ExpoGarminModuleType {
  showDeviceSelection(): void;
  getConnectedDevices(): Promise<GarminDevice[]>;
  sendMessage(message: Record<string, any>, appId: string): Promise<{ success: boolean }>;
  getAppStatus(appId: string): Promise<AppStatus>;
  openAppOnDevice(appId: string): Promise<{ success: boolean }>;
}

let ExpoGarminNative: ExpoGarminModuleType | null = null;
let emitter: EventEmitter | null = null;

try {
  ExpoGarminNative = requireNativeModule<ExpoGarminModuleType>('ExpoGarmin');
  emitter = new EventEmitter(ExpoGarminNative as any);
} catch (e) {
  console.warn('ExpoGarmin native module not available');
}

export function showDeviceSelection(): void {
  if (Platform.OS === 'ios' && ExpoGarminNative) {
    ExpoGarminNative.showDeviceSelection();
  } else {
    console.warn('Garmin is only available on iOS');
  }
}

export async function getConnectedDevices(): Promise<GarminDevice[]> {
  if (Platform.OS === 'ios' && ExpoGarminNative) {
    return await ExpoGarminNative.getConnectedDevices();
  }
  return [];
}

export async function sendMessage(message: Record<string, any>, appId: string): Promise<{ success: boolean }> {
  if (Platform.OS === 'ios' && ExpoGarminNative) {
    return await ExpoGarminNative.sendMessage(message, appId);
  }
  throw new Error('Garmin is only available on iOS');
}

export async function getAppStatus(appId: string): Promise<AppStatus> {
  if (Platform.OS === 'ios' && ExpoGarminNative) {
    return await ExpoGarminNative.getAppStatus(appId);
  }
  throw new Error('Garmin is only available on iOS');
}

export async function openAppOnDevice(appId: string): Promise<{ success: boolean }> {
  if (Platform.OS === 'ios' && ExpoGarminNative) {
    return await ExpoGarminNative.openAppOnDevice(appId);
  }
  throw new Error('Garmin is only available on iOS');
}

// Event listeners using expo-modules-core EventEmitter
export function addDevicesUpdatedListener(callback: (event: DevicesUpdatedEvent) => void): Subscription {
  if (emitter) {
    return emitter.addListener('onDevicesUpdated', callback);
  }
  return { remove: () => {} };
}

export function addDeviceStatusChangedListener(callback: (event: DeviceStatusChangedEvent) => void): Subscription {
  if (emitter) {
    return emitter.addListener('onDeviceStatusChanged', callback);
  }
  return { remove: () => {} };
}

export function addMessageReceivedListener(callback: (event: MessageReceivedEvent) => void): Subscription {
  if (emitter) {
    return emitter.addListener('onMessageReceived', callback);
  }
  return { remove: () => {} };
}
