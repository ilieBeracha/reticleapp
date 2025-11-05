import { create } from "zustand";

interface OrganizationSwitchState {
  // State
  isSwitching: boolean;
  targetOrganizationId: string | null;
  targetOrganizationName: string | null;
  switchStartTime: number | null;

  // Actions
  startSwitch: (
    organizationId: string | null,
    organizationName: string
  ) => void;
  completeSwitch: () => void;
  cancelSwitch: () => void;
}

export const useOrganizationSwitchStore = create<OrganizationSwitchState>(
  (set) => ({
    // Initial state
    isSwitching: false,
    targetOrganizationId: null,
    targetOrganizationName: null,
    switchStartTime: null,

    // Actions
    startSwitch: (organizationId, organizationName) => {
      set({
        isSwitching: true,
        targetOrganizationId: organizationId,
        targetOrganizationName: organizationName,
        switchStartTime: Date.now(),
      });
    },

    completeSwitch: () => {
      set({
        isSwitching: false,
        targetOrganizationId: null,
        targetOrganizationName: null,
        switchStartTime: null,
      });
    },

    cancelSwitch: () => {
      set({
        isSwitching: false,
        targetOrganizationId: null,
        targetOrganizationName: null,
        switchStartTime: null,
      });
    },
  })
);

// Timing utilities for minimum duration enforcement
export const MINIMUM_SWITCH_DURATION = 2800; // ms - Extended to showcase the impressive loader
export const MAXIMUM_SWITCH_TIMEOUT = 10000; // ms (10 seconds)

/**
 * Calculate remaining time to meet minimum duration requirement
 * @param startTime - Timestamp when switch started (from Date.now())
 * @returns Remaining milliseconds to wait, or 0 if minimum duration already met
 */
export const calculateRemainingDuration = (
  startTime: number | null
): number => {
  if (!startTime) return 0;

  const elapsed = Date.now() - startTime;
  const remaining = MINIMUM_SWITCH_DURATION - elapsed;

  return Math.max(0, remaining);
};

/**
 * Wait for the remaining time to meet minimum duration
 * @param startTime - Timestamp when switch started
 * @returns Promise that resolves after remaining duration
 */
export const waitForMinimumDuration = async (
  startTime: number | null
): Promise<void> => {
  const remaining = calculateRemainingDuration(startTime);

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
};
