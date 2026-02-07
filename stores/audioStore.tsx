import type { AudioDetectionConfig, ShotDetectionEvent } from '@/modules/shot-audio';
import {
  isAvailable,
  isModuleAvailable,
  onShotDetected,
  setConfig,
  startShotAudio,
  stopShotAudio,
} from '@/modules/shot-audio';
import type { AudioDetection } from '@/types/audio';
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

  // Session tracking
  sessionDetections: AudioDetection[];
  sessionStartTime: number | null;

  // Actions
  start: () => void;
  stop: () => void;
  setConfig: (config: AudioDetectionConfig) => void;
  setShotDetectedCallback: (cb: ((e: ShotDetectionEvent) => void) | null) => void;
  checkAvailability: () => boolean;
  reset: () => void;

  // Session actions
  startSession: () => void;
  endSession: () => AudioDetection[];
  getSessionDetections: () => AudioDetection[];
}

let subscription: EventSubscription | null = null;

export const useAudioStore = create<AudioState>((set, get) => ({
  isListening: false,
  isAvailable: false,
  isModuleLoaded: isModuleAvailable(),
  lastDetection: null,
  detectionCount: 0,
  onShotDetectedCallback: null,
  sessionDetections: [],
  sessionStartTime: null,

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

      // Accumulate for session correlation
      const detection: AudioDetection = {
        timestamp: event.timestamp,
        confidence: event.confidence,
        peakEnergy: event.peakEnergy,
      };

      set((state) => ({
        sessionDetections: [...state.sessionDetections, detection],
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
      sessionDetections: [],
      sessionStartTime: null,
    });
    console.log('[AudioStore] Reset');
  },

  startSession: () => {
    set({
      sessionDetections: [],
      sessionStartTime: Date.now(),
      detectionCount: 0,
    });
    get().start();
    console.log('[AudioStore] Session started');
  },

  endSession: () => {
    get().stop();
    const detections = get().sessionDetections;
    console.log(`[AudioStore] Session ended with ${detections.length} detections`);
    return detections;
  },

  getSessionDetections: () => {
    return get().sessionDetections;
  },
}));

// Selector hooks for common use cases
export const useIsAudioListening = () => useAudioStore((s) => s.isListening);
export const useAudioDetectionCount = () => useAudioStore((s) => s.detectionCount);
export const useLastAudioDetection = () => useAudioStore((s) => s.lastDetection);
export const useIsAudioModuleLoaded = () => useAudioStore((s) => s.isModuleLoaded);
export const useSessionDetections = () => useAudioStore((s) => s.sessionDetections);
export const useSessionStartTime = () => useAudioStore((s) => s.sessionStartTime);