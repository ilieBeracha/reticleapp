/**
 * Session Constants
 *
 * Centralized constants for session-related values.
 * Import these instead of using hardcoded strings.
 */

// =============================================================================
// SESSION STATUS
// =============================================================================

/**
 * SessionStatus values - Current state of a session
 *
 * - 'pending': Created but not yet started (waiting for watch selection)
 * - 'active': In progress
 * - 'completed': Successfully finished
 * - 'cancelled': Aborted/cancelled
 */
export const SESSION_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

/** Array of all valid session statuses */
export const SESSION_STATUSES: SessionStatus[] = [
  SESSION_STATUS.PENDING,
  SESSION_STATUS.ACTIVE,
  SESSION_STATUS.COMPLETED,
  SESSION_STATUS.CANCELLED,
];

/** Helper to check if session is active */
export function isActiveSession(status: string | null | undefined): boolean {
  return status === SESSION_STATUS.ACTIVE;
}

/** Helper to check if session is pending */
export function isPendingSession(status: string | null | undefined): boolean {
  return status === SESSION_STATUS.PENDING;
}

/** Helper to check if session is completed */
export function isCompletedSession(status: string | null | undefined): boolean {
  return status === SESSION_STATUS.COMPLETED;
}

/** Helper to check if session is in a terminal state */
export function isTerminalStatus(status: string | null | undefined): boolean {
  return status === SESSION_STATUS.COMPLETED || status === SESSION_STATUS.CANCELLED;
}

// =============================================================================
// SESSION MODE
// =============================================================================

/**
 * SessionMode values - How the session is being conducted
 *
 * - 'solo': Individual practice
 * - 'group': Team/group training
 */
export const SESSION_MODE = {
  SOLO: 'solo',
  GROUP: 'group',
} as const;

export type SessionMode = (typeof SESSION_MODE)[keyof typeof SESSION_MODE];

/** Array of all valid session modes */
export const SESSION_MODES: SessionMode[] = [SESSION_MODE.SOLO, SESSION_MODE.GROUP];

/** Helper to check if session is solo */
export function isSoloSession(mode: string | null | undefined): boolean {
  return mode === SESSION_MODE.SOLO;
}

/** Helper to check if session is group */
export function isGroupSession(mode: string | null | undefined): boolean {
  return mode === SESSION_MODE.GROUP;
}

// =============================================================================
// TRAINING STATUS
// =============================================================================

/**
 * TrainingStatus values - State of a scheduled training
 */
export const TRAINING_STATUS = {
  PLANNED: 'planned',
  ONGOING: 'ongoing',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
} as const;

export type TrainingStatus = (typeof TRAINING_STATUS)[keyof typeof TRAINING_STATUS];

/** Array of all valid training statuses */
export const TRAINING_STATUSES: TrainingStatus[] = [
  TRAINING_STATUS.PLANNED,
  TRAINING_STATUS.ONGOING,
  TRAINING_STATUS.FINISHED,
  TRAINING_STATUS.CANCELLED,
];

// =============================================================================
// SESSION TIMEOUTS
// =============================================================================

export const SESSION_TIMEOUTS = {
  /** Sessions older than this are considered stale and auto-cancelled */
  STALE_SESSION_HOURS: 24,
  /** Convert hours to milliseconds */
  STALE_SESSION_MS: 24 * 60 * 60 * 1000,
} as const;
