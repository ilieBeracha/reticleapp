/**
 * toastStore - Global non-blocking notifications
 *
 * Replaces stock `Alert.alert` for success/info/warning feedback. Keeps
 * destructive confirmations (delete, leave team) as Alerts by convention —
 * toasts are fire-and-forget.
 *
 * Usage:
 *   import { showToast } from '@/stores/toastStore';
 *   showToast({ title: 'Session saved', variant: 'success' });
 *   showToast({ title: 'Upload failed', variant: 'error', action: { label: 'Retry', onPress: retry } });
 */

import { create } from 'zustand';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: { label: string; onPress: () => void };
}

export interface ToastItem extends Required<Omit<ToastInput, 'action' | 'description'>> {
  id: string;
  description?: string;
  action?: ToastInput['action'];
}

interface ToastState {
  queue: ToastItem[];
  show: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 2500,
  info: 2800,
  warning: 3600,
  error: 4200,
};

export const useToastStore = create<ToastState>((set) => ({
  queue: [],
  show: (input) => {
    const variant = input.variant ?? 'info';
    const item: ToastItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: input.title,
      description: input.description,
      variant,
      durationMs: input.durationMs ?? DEFAULT_DURATION[variant],
      action: input.action,
    };
    set((state) => ({ queue: [...state.queue, item] }));
    return item.id;
  },
  dismiss: (id) =>
    set((state) => ({ queue: state.queue.filter((t) => t.id !== id) })),
  clear: () => set({ queue: [] }),
}));

/** Imperative helper so stores/services can trigger toasts without a hook. */
export function showToast(input: ToastInput): string {
  return useToastStore.getState().show(input);
}

export function dismissToast(id: string): void {
  useToastStore.getState().dismiss(id);
}
