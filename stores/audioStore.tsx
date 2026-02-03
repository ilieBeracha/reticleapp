import type { AudioDetectionConfig, ShotDetectionEvent } from '@/modules/shot-audio';
import {
  isAvailable,
  isModuleAvailable,
  onShotDetected,
  setConfig,
  startShotAudio,
  stopShotAudio,
} from '@/modules/shot-audio';
import type { EventSubscription } from 'expo-modules-core';
import { create } from 'zustand';

interface AudioState {
  // State
  isListening: boolean;
  isAvailable: boolean;
  isModuleLoaded: boolean;
  lastDetection: ShotDetectionEvent | null;
  detectionCount: number;

  // Callback for external handling (e.g., session integration)
  onShotDetectedCallback: ((event: ShotDetectionEvent) => void) | null;

  // Actions
  start: () => void;
  stop: () => void;
  setConfig: (config: AudioDetectionConfig) => void;
  setShotDetectedCallback: (cb: ((e: ShotDetectionEvent) => void) | null) => void;
  checkAvailability: () => boolean;
  reset: () => void;
}

let subscription: EventSubscription | null = null;

export const useAudioStore = create<AudioState>((set, get) => ({
  isListening: false,
  isAvailable: false,
  isModuleLoaded: isModuleAvailable(),
  lastDetection: null,
  detectionCount: 0,
  onShotDetectedCallback: null,

  start: () => {
    if (get().isListening) return;

    const moduleLoaded = isModuleAvailable();
    console.log('[AudioStore] Module loaded:', moduleLoaded);
    if (!moduleLoaded) {
      console.warn('[AudioStore] Native module not available - run `npx expo run:ios` to rebuild');
      return;
    }

    // Subscribe to native events
    subscription = onShotDetected((event) => {
      set((state) => ({
        lastDetection: event,
        detectionCount: state.detectionCount + 1,
      }));

      // Call registered callback (for session integration)
      const callback = get().onShotDetectedCallback;
      if (callback) {
        callback(event);
      }
    });

    startShotAudio();
    set({ isListening: true });
    console.log('[AudioStore] Started listening - waiting for native module events');
  },

  stop: () => {
    if (!get().isListening) return;

    subscription?.remove();
    subscription = null;

    stopShotAudio();
    set({ isListening: false });
    console.log('[AudioStore] Stopped listening');
  },

  setConfig: (config: AudioDetectionConfig) => {
    setConfig(config);
    console.log('[AudioStore] Config updated:', config);
  },

  setShotDetectedCallback: (cb) => {
    set({ onShotDetectedCallback: cb });
  },

  checkAvailability: () => {
    const available = isAvailable();
    set({ isAvailable: available });
    return available;
  },

  reset: () => {
    get().stop();
    set({
      lastDetection: null,
      detectionCount: 0,
      onShotDetectedCallback: null,
    });
    console.log('[AudioStore] Reset');
  },
}));

// Selector hooks for common use cases
export const useIsAudioListening = () => useAudioStore((s) => s.isListening);
export const useAudioDetectionCount = () => useAudioStore((s) => s.detectionCount);
export const useLastAudioDetection = () => useAudioStore((s) => s.lastDetection);
export const useIsAudioModuleLoaded = () => useAudioStore((s) => s.isModuleLoaded);