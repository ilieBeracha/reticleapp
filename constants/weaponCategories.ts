/**
 * Weapon Category Configuration
 *
 * Each category defines the "personality" of the training experience:
 * - Default distances that make sense
 * - Drill types that are relevant
 * - Target types commonly used
 * - Positions typically trained
 * - Time expectations
 *
 * The category you're shooting with shapes what you see and how
 * your results are interpreted.
 */

import type { DrillGoal, WeaponCategory } from '@/types/workspace';

// ============================================================================
// CATEGORY CONFIGURATION TYPES
// ============================================================================

export interface CategoryDistanceRange {
  /** Minimum practical distance (meters) */
  min: number;
  /** Maximum practical distance (meters) */
  max: number;
  /** Default/common training distances */
  presets: number[];
  /** The "zeroing" distance for this category */
  zeroDistance: number;
}

export interface CategoryDrillDefaults {
  /** Primary drill goal */
  primaryGoal: DrillGoal;
  /** Secondary drill goals */
  secondaryGoals: DrillGoal[];
  /** Default target type */
  targetType: 'paper' | 'tactical';
  /** Common positions */
  positions: string[];
  /** Default position */
  defaultPosition: string;
  /** Typical rounds per drill */
  roundsPerDrill: number;
  /** Typical strings/entries */
  stringsCount: number;
}

export interface CategoryTimeExpectations {
  /** Expected time per shot (seconds) - for pacing */
  avgShotTime: number;
  /** Good split time (ms) */
  goodSplit: number;
  /** Excellent split time (ms) */
  excellentSplit: number;
  /** Time limit multiplier (rounds × this = reasonable time limit) */
  timeLimitMultiplier: number;
}

export interface CategoryScoringContext {
  /** What's considered excellent dispersion (cm) at zero distance */
  excellentDispersion: number;
  /** What's considered good dispersion (cm) at zero distance */
  goodDispersion: number;
  /** Accuracy expectations (%) for achievement drills */
  expectedAccuracy: number;
  /** Distance affects scoring - multiplier per 100m */
  distanceMultiplier: number;
}

export interface CategoryConfig {
  /** Display name */
  label: string;
  /** Short description */
  description: string;
  /** Icon name (for UI) */
  icon: string;
  /** Distance configuration */
  distances: CategoryDistanceRange;
  /** Drill defaults */
  drillDefaults: CategoryDrillDefaults;
  /** Time expectations */
  timing: CategoryTimeExpectations;
  /** Scoring context */
  scoring: CategoryScoringContext;
  /** Quick start presets for this category */
  quickPresets: QuickPreset[];
}

export interface QuickPreset {
  id: string;
  name: string;
  description: string;
  drillGoal: DrillGoal;
  targetType: 'paper' | 'tactical';
  distance: number;
  rounds: number;
  position: string;
  /** Time limit in seconds (null = no limit) */
  timeLimit: number | null;
}

// ============================================================================
// CATEGORY CONFIGURATIONS
// ============================================================================

export const CATEGORY_CONFIGS: Record<WeaponCategory, CategoryConfig> = {
  precision_rifle: {
    label: 'Precision Rifle',
    description: 'Long-range accuracy and consistency',
    icon: 'crosshairs',
    distances: {
      min: 100,
      max: 1000,
      presets: [100, 200, 300, 400, 500, 600, 800, 1000],
      zeroDistance: 100,
    },
    drillDefaults: {
      primaryGoal: 'grouping',
      secondaryGoals: ['engagement'],
      targetType: 'paper',
      positions: ['prone', 'prone_supported', 'sitting', 'kneeling'],
      defaultPosition: 'prone',
      roundsPerDrill: 5,
      stringsCount: 1,
    },
    timing: {
      avgShotTime: 30, // Slow, deliberate
      goodSplit: 15000,
      excellentSplit: 10000,
      timeLimitMultiplier: 60, // 5 rounds × 60 = 5 min
    },
    scoring: {
      excellentDispersion: 1.0, // Sub-MOA at 100m
      goodDispersion: 2.5,
      expectedAccuracy: 95,
      distanceMultiplier: 1.5, // Harder at distance
    },
    quickPresets: [
      {
        id: 'pr-zero-100',
        name: 'Zero Confirm',
        description: 'Confirm zero at 100m',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 100,
        rounds: 3,
        position: 'prone_supported',
        timeLimit: null,
      },
      {
        id: 'pr-group-100',
        name: '100m Grouping',
        description: '5-shot group at 100m',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 100,
        rounds: 5,
        position: 'prone',
        timeLimit: null,
      },
      {
        id: 'pr-group-200',
        name: '200m Grouping',
        description: '5-shot group at 200m',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 200,
        rounds: 5,
        position: 'prone',
        timeLimit: null,
      },
      {
        id: 'pr-cold-bore',
        name: 'Cold Bore',
        description: 'First round accuracy',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 100,
        rounds: 1,
        position: 'prone',
        timeLimit: null,
      },
    ],
  },

  rifle: {
    label: 'Rifle',
    description: 'Versatile medium to long range',
    icon: 'target',
    distances: {
      min: 25,
      max: 500,
      presets: [25, 50, 100, 200, 300],
      zeroDistance: 100,
    },
    drillDefaults: {
      primaryGoal: 'grouping',
      secondaryGoals: ['engagement'],
      targetType: 'paper',
      positions: ['prone', 'kneeling', 'standing', 'sitting'],
      defaultPosition: 'prone',
      roundsPerDrill: 5,
      stringsCount: 1,
    },
    timing: {
      avgShotTime: 15,
      goodSplit: 5000,
      excellentSplit: 3000,
      timeLimitMultiplier: 30,
    },
    scoring: {
      excellentDispersion: 3.0,
      goodDispersion: 6.0,
      expectedAccuracy: 90,
      distanceMultiplier: 1.3,
    },
    quickPresets: [
      {
        id: 'r-zero-100',
        name: 'Zero Check',
        description: 'Confirm zero at 100m',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 100,
        rounds: 3,
        position: 'prone',
        timeLimit: null,
      },
      {
        id: 'r-qual-25',
        name: 'Qualification',
        description: 'Standard qual at 25m',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 25,
        rounds: 10,
        position: 'standing',
        timeLimit: 60,
      },
    ],
  },

  carbine: {
    label: 'Carbine',
    description: 'Close to medium range, dynamic',
    icon: 'zap',
    distances: {
      min: 10,
      max: 300,
      presets: [10, 25, 50, 100, 150, 200],
      zeroDistance: 50,
    },
    drillDefaults: {
      primaryGoal: 'engagement',
      secondaryGoals: ['grouping'],
      targetType: 'tactical',
      positions: ['standing', 'kneeling', 'prone'],
      defaultPosition: 'standing',
      roundsPerDrill: 10,
      stringsCount: 2,
    },
    timing: {
      avgShotTime: 3,
      goodSplit: 1500,
      excellentSplit: 800,
      timeLimitMultiplier: 6,
    },
    scoring: {
      excellentDispersion: 5.0,
      goodDispersion: 10.0,
      expectedAccuracy: 85,
      distanceMultiplier: 1.2,
    },
    quickPresets: [
      {
        id: 'c-zero-50',
        name: 'Zero Check',
        description: 'Confirm zero at 50m',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 50,
        rounds: 3,
        position: 'standing',
        timeLimit: null,
      },
      {
        id: 'c-drill-25',
        name: 'Combat Drill',
        description: 'Rapid engagement at 25m',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 25,
        rounds: 10,
        position: 'standing',
        timeLimit: 20,
      },
      {
        id: 'c-trans-drill',
        name: 'Transitions',
        description: 'Multiple target transitions',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 15,
        rounds: 6,
        position: 'standing',
        timeLimit: 10,
      },
    ],
  },

  smg: {
    label: 'SMG',
    description: 'Close range, high cadence',
    icon: 'zap',
    distances: {
      min: 5,
      max: 150,
      presets: [5, 10, 15, 25, 50, 100],
      zeroDistance: 25,
    },
    drillDefaults: {
      primaryGoal: 'engagement',
      secondaryGoals: ['grouping'],
      targetType: 'tactical',
      positions: ['standing', 'kneeling'],
      defaultPosition: 'standing',
      roundsPerDrill: 12,
      stringsCount: 3,
    },
    timing: {
      avgShotTime: 2,
      goodSplit: 900,
      excellentSplit: 500,
      timeLimitMultiplier: 4,
    },
    scoring: {
      excellentDispersion: 6.0,
      goodDispersion: 12.0,
      expectedAccuracy: 80,
      distanceMultiplier: 1.3,
    },
    quickPresets: [
      {
        id: 'smg-zero-25',
        name: 'Zero Check',
        description: 'Confirm zero at 25m',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 25,
        rounds: 3,
        position: 'standing',
        timeLimit: null,
      },
      {
        id: 'smg-drill-10',
        name: 'Close Drill',
        description: 'Fast engagement at 10m',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 10,
        rounds: 12,
        position: 'standing',
        timeLimit: 12,
      },
    ],
  },

  pistol: {
    label: 'Pistol',
    description: 'Close range, quick engagement',
    icon: 'circle-dot',
    distances: {
      min: 3,
      max: 50,
      presets: [3, 5, 7, 10, 15, 25],
      zeroDistance: 15,
    },
    drillDefaults: {
      primaryGoal: 'engagement',
      secondaryGoals: ['grouping'],
      targetType: 'tactical',
      positions: ['standing', 'kneeling'],
      defaultPosition: 'standing',
      roundsPerDrill: 10,
      stringsCount: 2,
    },
    timing: {
      avgShotTime: 2,
      goodSplit: 800,
      excellentSplit: 400,
      timeLimitMultiplier: 3,
    },
    scoring: {
      excellentDispersion: 5.0,
      goodDispersion: 10.0,
      expectedAccuracy: 80,
      distanceMultiplier: 1.5, // Pistol accuracy degrades fast with distance
    },
    quickPresets: [
      {
        id: 'p-group-7',
        name: 'Grouping',
        description: '5-shot group at 7m',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 7,
        rounds: 5,
        position: 'standing',
        timeLimit: null,
      },
      {
        id: 'p-bill-drill',
        name: 'Bill Drill',
        description: '6 shots, 7m, fast',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 7,
        rounds: 6,
        position: 'standing',
        timeLimit: 3,
      },
      {
        id: 'p-el-pres',
        name: 'El Presidente',
        description: 'Classic drill',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 10,
        rounds: 12,
        position: 'standing',
        timeLimit: 10,
      },
      {
        id: 'p-draw-fire',
        name: 'Draw & Fire',
        description: 'Draw to first shot',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 5,
        rounds: 1,
        position: 'standing',
        timeLimit: 2,
      },
    ],
  },

  shotgun: {
    label: 'Shotgun',
    description: 'Close range, high impact',
    icon: 'shield',
    distances: {
      min: 5,
      max: 50,
      presets: [5, 10, 15, 25],
      zeroDistance: 25,
    },
    drillDefaults: {
      primaryGoal: 'engagement',
      secondaryGoals: [],
      targetType: 'tactical',
      positions: ['standing', 'kneeling'],
      defaultPosition: 'standing',
      roundsPerDrill: 5,
      stringsCount: 1,
    },
    timing: {
      avgShotTime: 3,
      goodSplit: 1500,
      excellentSplit: 1000,
      timeLimitMultiplier: 5,
    },
    scoring: {
      excellentDispersion: 15.0, // Spread pattern
      goodDispersion: 25.0,
      expectedAccuracy: 90,
      distanceMultiplier: 2.0, // Very distance dependent
    },
    quickPresets: [
      {
        id: 's-breach',
        name: 'Breach Drill',
        description: 'Close range engagement',
        drillGoal: 'engagement',
        targetType: 'tactical',
        distance: 5,
        rounds: 4,
        position: 'standing',
        timeLimit: 5,
      },
    ],
  },

  other: {
    label: 'Other',
    description: 'Non-standard weapon system',
    icon: 'asterisk',
    distances: {
      min: 5,
      max: 500,
      presets: [10, 25, 50, 100, 200],
      zeroDistance: 50,
    },
    drillDefaults: {
      primaryGoal: 'grouping',
      secondaryGoals: ['engagement'],
      targetType: 'paper',
      positions: ['standing', 'kneeling', 'prone'],
      defaultPosition: 'standing',
      roundsPerDrill: 5,
      stringsCount: 1,
    },
    timing: {
      avgShotTime: 10,
      goodSplit: 5000,
      excellentSplit: 2000,
      timeLimitMultiplier: 15,
    },
    scoring: {
      excellentDispersion: 5.0,
      goodDispersion: 10.0,
      expectedAccuracy: 85,
      distanceMultiplier: 1.0,
    },
    quickPresets: [
      {
        id: 'other-quick',
        name: 'Quick Practice',
        description: 'General practice session',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 25,
        rounds: 5,
        position: 'standing',
        timeLimit: null,
      },
    ],
  },

  any: {
    label: 'Any Weapon',
    description: 'General training',
    icon: 'asterisk',
    distances: {
      min: 5,
      max: 500,
      presets: [10, 25, 50, 100, 200],
      zeroDistance: 50,
    },
    drillDefaults: {
      primaryGoal: 'grouping',
      secondaryGoals: ['engagement'],
      targetType: 'paper',
      positions: ['standing', 'kneeling', 'prone'],
      defaultPosition: 'standing',
      roundsPerDrill: 5,
      stringsCount: 1,
    },
    timing: {
      avgShotTime: 10,
      goodSplit: 5000,
      excellentSplit: 2000,
      timeLimitMultiplier: 15,
    },
    scoring: {
      excellentDispersion: 5.0,
      goodDispersion: 10.0,
      expectedAccuracy: 85,
      distanceMultiplier: 1.0,
    },
    quickPresets: [
      {
        id: 'any-quick',
        name: 'Quick Practice',
        description: 'General practice session',
        drillGoal: 'grouping',
        targetType: 'paper',
        distance: 25,
        rounds: 5,
        position: 'standing',
        timeLimit: null,
      },
    ],
  },
};

// ============================================================================
// SIMPLE CATEGORY LIST (derived from CATEGORY_CONFIGS)
// ============================================================================

/**
 * Simple weapon category list for pickers/selects.
 * This is the SINGLE SOURCE OF TRUTH for weapon category options.
 *
 * Derived from CATEGORY_CONFIGS to ensure consistency.
 */
export const WEAPON_CATEGORIES: { value: WeaponCategory; label: string }[] = (
  Object.entries(CATEGORY_CONFIGS) as [WeaponCategory, CategoryConfig][]
).map(([value, config]) => ({
  value,
  label: config.label,
}));

/**
 * Get category label by value
 */
export function getCategoryLabel(category: WeaponCategory | null | undefined): string {
  if (!category) return 'Unknown';
  return CATEGORY_CONFIGS[category]?.label || category;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration for a weapon category
 */
export function getCategoryConfig(category: WeaponCategory | null | undefined): CategoryConfig {
  return CATEGORY_CONFIGS[category || 'any'] || CATEGORY_CONFIGS.any;
}

/**
 * Get appropriate distances for a category
 */
export function getCategoryDistances(category: WeaponCategory | null | undefined): number[] {
  return getCategoryConfig(category).distances.presets;
}

/**
 * Get the default/zero distance for a category
 */
export function getCategoryZeroDistance(category: WeaponCategory | null | undefined): number {
  return getCategoryConfig(category).distances.zeroDistance;
}

/**
 * Check if a distance is appropriate for a category
 */
export function isDistanceAppropriate(category: WeaponCategory | null | undefined, distance: number): boolean {
  const config = getCategoryConfig(category);
  return distance >= config.distances.min && distance <= config.distances.max;
}

/**
 * Get quick presets for a category
 */
export function getCategoryPresets(category: WeaponCategory | null | undefined): QuickPreset[] {
  return getCategoryConfig(category).quickPresets;
}

/**
 * Get drill defaults for a category
 */
export function getCategoryDrillDefaults(category: WeaponCategory | null | undefined): CategoryDrillDefaults {
  return getCategoryConfig(category).drillDefaults;
}

/**
 * Evaluate dispersion quality based on category and distance
 */
export function evaluateDispersion(
  category: WeaponCategory | null | undefined,
  distance: number,
  dispersionCm: number
): 'excellent' | 'good' | 'average' | 'needs_work' {
  const config = getCategoryConfig(category);
  const zeroDistance = config.distances.zeroDistance;

  // Adjust thresholds for distance (farther = more lenient)
  const distanceFactor = Math.max(1, distance / zeroDistance);
  const adjustedExcellent = config.scoring.excellentDispersion * distanceFactor;
  const adjustedGood = config.scoring.goodDispersion * distanceFactor;

  if (dispersionCm <= adjustedExcellent) return 'excellent';
  if (dispersionCm <= adjustedGood) return 'good';
  if (dispersionCm <= adjustedGood * 1.5) return 'average';
  return 'needs_work';
}

/**
 * Evaluate split time quality based on category
 */
export function evaluateSplitTime(
  category: WeaponCategory | null | undefined,
  splitMs: number
): 'excellent' | 'good' | 'average' | 'slow' {
  const config = getCategoryConfig(category);

  if (splitMs <= config.timing.excellentSplit) return 'excellent';
  if (splitMs <= config.timing.goodSplit) return 'good';
  if (splitMs <= config.timing.goodSplit * 1.5) return 'average';
  return 'slow';
}

/**
 * Get suggested time limit for a drill based on category and rounds
 */
export function getSuggestedTimeLimit(category: WeaponCategory | null | undefined, rounds: number): number {
  const config = getCategoryConfig(category);
  return rounds * config.timing.timeLimitMultiplier;
}

/**
 * Build a DrillConfig from a category preset
 */
export function presetToDrillConfig(preset: QuickPreset, category: WeaponCategory) {
  return {
    name: preset.name,
    drill_goal: preset.drillGoal,
    target_type: preset.targetType,
    distance_m: preset.distance,
    rounds_per_shooter: preset.rounds,
    time_limit_seconds: preset.timeLimit,
    position: preset.position,
    weapon_category: category,
  };
}
