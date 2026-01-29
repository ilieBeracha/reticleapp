/**
 * Session Context Utilities
 *
 * Runtime functions for session context derivation.
 */

import type { SessionContext } from '@/types/sessionContext';

/**
 * Derive session context from IDs
 */
export function deriveSessionContext(
  teamId: string | null | undefined,
  trainingId: string | null | undefined
): SessionContext {
  if (teamId && trainingId) {
    return 'training';
  }
  return 'solo';
}

/**
 * Check if session is in training context
 */
export function isTrainingSession(
  teamId: string | null | undefined,
  trainingId: string | null | undefined
): boolean {
  return deriveSessionContext(teamId, trainingId) === 'training';
}

/**
 * Check if session is solo (personal)
 */
export function isSoloSession(
  teamId: string | null | undefined,
  trainingId: string | null | undefined
): boolean {
  return deriveSessionContext(teamId, trainingId) === 'solo';
}
