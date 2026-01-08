/**
 * Session Creation Module
 *
 * 2-step session creation flow:
 * 1. Intent - What's my goal? (grouping/engagement)
 * 2. Details - Session configuration (weapon, distance, bullets)
 *
 * Weapon selection is a sheet within the Details step, not a separate step.
 *
 * After form submission:
 * - SessionPrepView handles watch/phone selection
 * - activeSession.tsx handles scan/manual (based on drill config)
 */

// Types
export * from './sessionCreation.types';

// Constants
export * from './sessionCreation.constants';

// Hook
export { useSessionCreation } from './useSessionCreation';
export type { UseSessionCreationOptions, UseSessionCreationReturn } from './useSessionCreation';

// Components (2 steps)
export { SessionContextStep } from './SessionContextStep';
export { SessionIntentStep } from './SessionIntentStep';

// Note: SessionWeaponStep is still available but no longer used as a separate step
// Weapon selection is now integrated as a sheet in the Details step
export { SessionWeaponStep } from './SessionWeaponStep';

