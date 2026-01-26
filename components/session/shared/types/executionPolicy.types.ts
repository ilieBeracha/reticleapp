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

/**
 * Check if config editing is allowed based on execution policy
 */
export function canEditConfig(policy: ExecutionPolicy | null | undefined): boolean {
  return policy !== 'locked';
}

/**
 * Get default execution policy
 */
export function getDefaultExecutionPolicy(): ExecutionPolicy {
  return 'free';
}

/**
 * Derive execution policy for session mode
 *
 * Training sessions default to 'guided' (can be overridden by drill)
 * Solo sessions default to 'free'
 */
export function deriveExecutionPolicy(
  isTraining: boolean,
  drillPolicy?: ExecutionPolicy | null
): ExecutionPolicy {
  // If drill specifies a policy, use it
  if (drillPolicy) {
    return drillPolicy;
  }
  // Training sessions default to guided
  if (isTraining) {
    return 'guided';
  }
  // Solo sessions are free by default
  return 'free';
}
