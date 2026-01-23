/**
 * Weapon Policy Constants
 *
 * Centralized constants for team weapon policy configuration.
 * Import these instead of using hardcoded strings.
 */

// =============================================================================
// WEAPON POLICY
// =============================================================================

/**
 * WeaponPolicy values - Team-level weapon access configuration
 *
 * - 'personal': Members can bring/use their own personal weapons
 * - 'catalog': Members must choose from team's weapon catalog
 * - 'assigned': Weapons are assigned by commanders (no participation without assignment)
 */
export const WEAPON_POLICY = {
  PERSONAL: 'personal',
  CATALOG: 'catalog',
  ASSIGNED: 'assigned',
} as const;

export type WeaponPolicy = (typeof WEAPON_POLICY)[keyof typeof WEAPON_POLICY];

/** Array of all valid weapon policies (for iteration/validation) */
export const WEAPON_POLICIES: WeaponPolicy[] = [WEAPON_POLICY.PERSONAL, WEAPON_POLICY.CATALOG, WEAPON_POLICY.ASSIGNED];

/** Default weapon policy for new teams */
export const DEFAULT_WEAPON_POLICY: WeaponPolicy = WEAPON_POLICY.PERSONAL;

// =============================================================================
// HELPERS
// =============================================================================

/** Helper to check if a value is a valid weapon policy */
export function isValidWeaponPolicy(value: unknown): value is WeaponPolicy {
  return typeof value === 'string' && WEAPON_POLICIES.includes(value as WeaponPolicy);
}

/** Helper to check if policy allows personal weapons */
export function isPersonalPolicy(policy: string | null | undefined): boolean {
  return policy === WEAPON_POLICY.PERSONAL;
}

/** Helper to check if policy requires team catalog */
export function isCatalogPolicy(policy: string | null | undefined): boolean {
  return policy === WEAPON_POLICY.CATALOG;
}

/** Helper to check if policy requires assignment */
export function isAssignedPolicy(policy: string | null | undefined): boolean {
  return policy === WEAPON_POLICY.ASSIGNED;
}

/** Helper to check if user can participate without weapon assignment */
export function canParticipateWithoutAssignment(policy: string | null | undefined): boolean {
  return policy !== WEAPON_POLICY.ASSIGNED;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Weapon policy configuration with display metadata
 * Used for UI rendering (labels, descriptions, icons)
 */
export interface WeaponPolicyConfig {
  label: string;
  description: string;
  icon: string; // Ionicons name
  hint: string;
}

export const WEAPON_POLICY_CONFIG: Record<WeaponPolicy, WeaponPolicyConfig> = {
  [WEAPON_POLICY.PERSONAL]: {
    label: 'Bring Your Own',
    description: 'Members can use their personal weapons',
    icon: 'person-outline',
    hint: 'Flexible - members manage their own gear',
  },
  [WEAPON_POLICY.CATALOG]: {
    label: 'Team Catalog',
    description: 'Members choose from team weapon catalog',
    icon: 'list-outline',
    hint: 'Controlled - team manages available weapons',
  },
  [WEAPON_POLICY.ASSIGNED]: {
    label: 'Assigned Only',
    description: 'Weapons are assigned by commanders',
    icon: 'lock-closed-outline',
    hint: 'Strict - no participation without assignment',
  },
};

/** Get config for a weapon policy (with fallback to personal) */
export function getWeaponPolicyConfig(policy: WeaponPolicy | string | null | undefined): WeaponPolicyConfig {
  if (isValidWeaponPolicy(policy)) {
    return WEAPON_POLICY_CONFIG[policy];
  }
  return WEAPON_POLICY_CONFIG[DEFAULT_WEAPON_POLICY];
}
