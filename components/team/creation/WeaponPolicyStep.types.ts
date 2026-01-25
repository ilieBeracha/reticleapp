/**
 * Weapon Policy Step Types
 *
 * Types for the weapon policy selection component
 * used during team creation.
 */

import type { WeaponPolicy } from '@/constants/weaponPolicy';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface WeaponPolicyStepProps {
  /** Currently selected weapon policy */
  value: WeaponPolicy;
  /** Callback when policy changes */
  onChange: (policy: WeaponPolicy) => void;
  /** Optional disabled state */
  disabled?: boolean;
  /** Hide the header section (when context is provided by parent) */
  hideHeader?: boolean;
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

export interface PolicyCardProps {
  policy: WeaponPolicy;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}
