import { requireNativeModule, type EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';
import { AudioDetectionConfig, ShotDetectionEvent, ShotDetectionListener } from './ShotAudio.types';

// Native module - use requireNativeModule for new architecture
let ShotAudio: any = null;
let isNativeModuleAvailable = false;

if (Platform.OS === 'ios') {
  try {
    ShotAudio = requireNativeModule('ShotAudio');
    isNativeModuleAvailable = ShotAudio != null;
    console.log('[ShotAudio] Native module loaded successfully');
  } catch (e) {
    console.warn('[ShotAudio] Native module not found - run `npx expo run:ios` to rebuild');
    isNativeModuleAvailable = false;
  }
}

/**
 * Check if the native module is loaded (requires native rebuild)
 */
export function isModuleAvailable(): boolean {
  return isNativeModuleAvailable;
}

// Debug and status listener subscriptions
let debugSubscription: EventSubscription | null = null;
let statusSubscription: EventSubscription | null = null;

/**
 * Start listening for audio-based shot detection
 * Requires microphone permission
 */
export function startShotAudio(): void {
  if (!isNativeModuleAvailable) {
    console.warn('[ShotAudio] Native module not available. Run `npx expo run:ios` to rebuild.');
    return;
  }

  // Subscribe to status changes
  if (ShotAudio && !statusSubscription) {
    statusSubscription = ShotAudio.addListener('onStatusChange', (data: any) => {
      console.log(`[ShotAudio] Status: ${data.status}`, data);
    });
  }

  // Subscribe to debug logs
  if (ShotAudio && !debugSubscription) {
    debugSubscription = ShotAudio.addListener('onDebugLog', (data: any) => {
      console.log(`[ShotAudio] frame=${data.frame} energy=${data.energy.toFixed(4)} peak=${data.peak.toFixed(4)} thresh=(${data.energyThreshold}, ${data.riseThreshold})`);
    });
  }

  console.log('[ShotAudio] Calling native start...');
  ShotAudio.start();
}

/**
 * Stop audio detection and release microphone
 */
export function stopShotAudio(): void {
  if (!isNativeModuleAvailable) return;

  // Clean up subscriptions
  debugSubscription?.remove();
  debugSubscription = null;
  statusSubscription?.remove();
  statusSubscription = null;

  console.log('[ShotAudio] Calling native stop...');
  ShotAudio.stop();
}

/**
 * Check if audio input is available on this device
 */
export function isAvailable(): boolean {
  if (!isNativeModuleAvailable) return false;
  return ShotAudio.isAvailable();
}

/**
 * Update detection sensitivity parameters
 */
export function setConfig(config: AudioDetectionConfig): void {
  if (!isNativeModuleAvailable) return;
  // Lower defaults for testing - set higher for actual gunshots
  ShotAudio.setConfig(config.energyThreshold ?? 0.005, config.riseThreshold ?? 0.01, config.cooldownMs ?? 200);
}

/**
 * Subscribe to shot detection events
 * @returns Subscription that should be removed when no longer needed
 */
export function onShotDetected(listener: ShotDetectionListener): EventSubscription {
  if (!ShotAudio) {
    // Return a no-op subscription when native module not available
    return { remove: () => {} };
  }
  return ShotAudio.addListener('onShotDetected', (event: ShotDetectionEvent) => {
    listener({
      ...event,
      source: 'audio',
    });
  });
}

export default {
  isModuleAvailable,
  startShotAudio,
  stopShotAudio,
  isAvailable,
  setConfig,
  onShotDetected,
};
