/**
 * Session Context Types
 *
 * WHO owns the session.
 *
 * Context determines:
 * - Where results are stored
 * - Who can see the session
 * - What config editing is allowed
 */

/**
 * Session ownership context
 *
 * - solo: Personal session (team_id: null, training_id: null)
 * - training: Team training session (team_id: uuid, training_id: uuid)
 */
export type SessionContext = 'solo' | 'training';

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
