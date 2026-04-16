/**
 * globalSearchStore - Imperative open/close for the global search sheet.
 *
 * Allows any component (header button, keyboard shortcut, etc.) to open the
 * palette without prop-drilling through the navigator tree.
 */

import { create } from 'zustand';

interface GlobalSearchState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useGlobalSearchStore = create<GlobalSearchState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function openGlobalSearch(): void {
  useGlobalSearchStore.getState().open();
}

export function closeGlobalSearch(): void {
  useGlobalSearchStore.getState().close();
}
