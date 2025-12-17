/**
 * store/_shared/asyncState.ts
 *
 * Shared patterns for Zustand stores doing async loading.
 * This is intentionally tiny and opt-in: stores can adopt it gradually.
 */

export type AsyncState = {
  loading: boolean;
  initialized: boolean;
  error: string | null;
};

export const defaultAsyncState: AsyncState = {
  loading: false,
  initialized: false,
  error: null,
};

/**
 * Helper to decide whether to show a loading spinner on first load.
 * Many stores want to avoid flicker after initialization.
 */
export function shouldShowInitialLoading(initialized: boolean): boolean {
  return !initialized;
}






