/**
 * Execution Policy Utilities
 *
 * Runtime functions for execution policy management.
 */

import type { ExecutionPolicy } from '@/types/executionPolicy';

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
