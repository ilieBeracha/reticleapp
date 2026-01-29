/**
 * Team Specialty Configuration
 *
 * Defines the team's PRIMARY training focus/identity.
 * This does NOT restrict what weapons members can use -
 * it's about the team's main emphasis and training style.
 *
 * Affects:
 * - Drill suggestions shown first
 * - Default distances
 * - Coach message context
 * - Feature relevance (e.g., squad engagement for certain specialties)
 */

import type { WeaponCategory } from '@/types/workspace';

// ============================================================================
// TEAM SPECIALTY TYPE
// ============================================================================

export type TeamSpecialty =
  | 'precision' // Sniper/DMR - long-range precision focus
  | 'tactical' // CQB/tactical - close quarters, carbine/SMG focus
  | 'pistol' // Pistol teams - defensive/competition pistol
  | 'all_around' // General purpose - balanced training
  | 'competition' // Competition shooting - IPSC/USPSA/3-gun
  | 'security'; // Security/protection - mixed close-mid range

export const TEAM_SPECIALTIES: TeamSpecialty[] = [
  'all_around',
  'precision',
  'tactical',
  'pistol',
  'competition',
  'security',
];

// ============================================================================
// SPECIALTY CONFIGURATION
// ============================================================================

export interface TeamSpecialtyConfig {
  /** i18n key for label */
  labelKey: string;
  /** i18n key for description */
  descriptionKey: string;
  /** Icon name (lucide) */
  icon: string;
  /** Primary weapon categories for this specialty */
  primaryCategories: WeaponCategory[];
  /** Default distances to show first (meters) */
  defaultDistances: number[];
  /** Accent color for badges/UI */
  color: string;
}

export const SPECIALTY_CONFIGS: Record<TeamSpecialty, TeamSpecialtyConfig> = {
  precision: {
    labelKey: 'teams.specialty.precision',
    descriptionKey: 'teams.specialty.precisionDesc',
    icon: 'crosshair',
    primaryCategories: ['precision_rifle', 'rifle'],
    defaultDistances: [100, 200, 300, 500, 800],
    color: '#6366F1', // Indigo
  },
  tactical: {
    labelKey: 'teams.specialty.tactical',
    descriptionKey: 'teams.specialty.tacticalDesc',
    icon: 'shield',
    primaryCategories: ['carbine', 'smg', 'pistol'],
    defaultDistances: [10, 15, 25, 50, 100],
    color: '#F97316', // Orange
  },
  pistol: {
    labelKey: 'teams.specialty.pistol',
    descriptionKey: 'teams.specialty.pistolDesc',
    icon: 'circle-dot',
    primaryCategories: ['pistol'],
    defaultDistances: [5, 7, 10, 15, 25],
    color: '#10B981', // Green
  },
  all_around: {
    labelKey: 'teams.specialty.allAround',
    descriptionKey: 'teams.specialty.allAroundDesc',
    icon: 'target',
    primaryCategories: ['rifle', 'carbine', 'pistol'],
    defaultDistances: [25, 50, 100, 200],
    color: '#3B82F6', // Blue
  },
  competition: {
    labelKey: 'teams.specialty.competition',
    descriptionKey: 'teams.specialty.competitionDesc',
    icon: 'trophy',
    primaryCategories: ['pistol', 'rifle', 'shotgun'],
    defaultDistances: [7, 10, 15, 25, 50],
    color: '#EAB308', // Yellow
  },
  security: {
    labelKey: 'teams.specialty.security',
    descriptionKey: 'teams.specialty.securityDesc',
    icon: 'shield-check',
    primaryCategories: ['pistol', 'carbine', 'smg'],
    defaultDistances: [5, 10, 15, 25],
    color: '#8B5CF6', // Purple
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get config for a specialty
 */
export function getSpecialtyConfig(specialty: TeamSpecialty | null | undefined): TeamSpecialtyConfig | null {
  if (!specialty) return null;
  return SPECIALTY_CONFIGS[specialty] || null;
}

/**
 * Get default distances for a specialty
 */
export function getSpecialtyDistances(specialty: TeamSpecialty | null | undefined): number[] {
  const config = getSpecialtyConfig(specialty);
  return config?.defaultDistances || [25, 50, 100];
}

/**
 * Check if a weapon category is primary for a specialty
 */
export function isPrimaryCategoryForSpecialty(
  specialty: TeamSpecialty | null | undefined,
  category: WeaponCategory
): boolean {
  const config = getSpecialtyConfig(specialty);
  if (!config) return false;
  return config.primaryCategories.includes(category);
}
