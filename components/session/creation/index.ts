/**
 * Session Creation Module
 *
 * 3-step session creation flow:
 * 1. Intent - What's my goal?
 * 2. Weapon - Which weapon?
 * 3. Context - Session details (distance, rounds, drill)
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

// Components (3 steps)
export { SessionContextStep } from './SessionContextStep';
export { SessionIntentStep } from './SessionIntentStep';
export { SessionWeaponStep } from './SessionWeaponStep';

