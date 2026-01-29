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
