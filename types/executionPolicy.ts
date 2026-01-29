/**
 * Execution Policy Types
 *
 * HOW STRICT drill configuration must be followed.
 *
 * This is about config freedom during execution.
 * Training decides strictness, not execution mode.
 */

/**
 * Execution policy - Commander's intent for how strictly a drill must be followed.
 *
 * - locked: Military qualification - execute EXACTLY as defined (no editing)
 * - guided: Training drill - defaults provided, adjustments allowed
 * - free: Open practice - drill is just a label, full freedom
 */
export type ExecutionPolicy = 'locked' | 'guided' | 'free';
