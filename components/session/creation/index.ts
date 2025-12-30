/**
 * Session Creation Module
 * 
 * 2-step session creation flow following the mental model:
 * 1. Intent - What am I going to do?
 * 2. Context - Under what conditions?
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

// Components (only 2 steps now)
export { SessionContextStep } from './SessionContextStep';
export { SessionIntentStep } from './SessionIntentStep';
// SessionMeasurementStep removed - watch/phone handled by SessionPrepView, scan/manual by activeSession

