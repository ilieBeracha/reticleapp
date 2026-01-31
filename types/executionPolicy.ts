/**
 * Execution Policy Types
 *
 * Drill configuration is always locked - soldiers can only change weapon.
 * All other parameters are set by commander and cannot be modified.
 */

/**
 * Execution policy - Always locked.
 * Soldiers execute drills EXACTLY as defined by commander.
 * Only weapon selection is editable.
 *
 * @deprecated Legacy types 'guided' and 'free' kept for backward compatibility
 *             but all new drills use 'locked' only.
 */
export type ExecutionPolicy = 'locked' | 'guided' | 'free';
