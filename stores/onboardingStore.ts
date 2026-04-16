/**
 * onboardingStore - Tracks per-device onboarding state.
 *
 * Persists via AsyncStorage so users don't see the welcome tour on every
 * launch. Single flag today (`hasSeenWelcome`); extend with additional
 * flags as new tours are added.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'reticle:onboarding:v1';

interface OnboardingState {
  hasSeenWelcome: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markWelcomeSeen: () => Promise<void>;
  reset: () => Promise<void>;
}

interface PersistedState {
  hasSeenWelcome: boolean;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  hasSeenWelcome: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        set({ hasSeenWelcome: !!parsed.hasSeenWelcome, hydrated: true });
        return;
      }
    } catch {
      // treat read failures as never-seen; no crash
    }
    set({ hydrated: true });
  },

  markWelcomeSeen: async () => {
    set({ hasSeenWelcome: true });
    try {
      const state: PersistedState = { hasSeenWelcome: true };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // non-fatal; user will just see the tour again next launch
    }
  },

  reset: async () => {
    set({ hasSeenWelcome: false });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
}));

/** Kick off hydration on module import so consumers can read `hydrated`. */
if (typeof globalThis !== 'undefined') {
  useOnboardingStore.getState().hydrate();
}
