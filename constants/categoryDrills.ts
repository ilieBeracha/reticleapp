/**
 * Category-Specific Drills
 * 
 * Each weapon category has its own set of REAL drills with:
 * - Specific requirements that must be met
 * - Evaluation criteria for pass/fail
 * - Scoring rules
 * - Progression paths
 * 
 * Sessions MUST follow these drills. This isn't just configuration -
 * it's the structure that defines what training means for each category.
 */

import type { WeaponCategory } from '@/types/workspace';

// ============================================================================
// DRILL STRUCTURE TYPES
// ============================================================================

/** Drill difficulty levels */
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Drill type categories */
export type DrillType = 
  | 'zeroing'      // Confirm/adjust zero
  | 'grouping'     // Measure consistency
  | 'qualification' // Standard qual course
  | 'speed'        // Timed drills
  | 'accuracy'     // Precision shooting
  | 'transition'   // Multiple targets
  | 'movement'     // Shoot & move
  | 'stress'       // Under physical stress
  | 'diagnostic'   // Identify issues
  | 'competition'; // Match-style drills

/** Result evaluation */
export type PassFailCriteria = {
  /** Minimum accuracy percentage to pass */
  minAccuracyPct?: number;
  /** Maximum dispersion in cm to pass */
  maxDispersionCm?: number;
  /** Maximum time in seconds to pass */
  maxTimeSeconds?: number;
  /** Minimum hits required */
  minHits?: number;
  /** All shots must be within this many cm of POA */
  maxOffsetCm?: number;
};

/** Scoring tiers */
export interface ScoringTier {
  name: string;
  color: string;
  /** Criteria to achieve this tier (all must be met) */
  criteria: {
    accuracyPct?: number;
    dispersionCm?: number;
    timeSeconds?: number;
  };
}

/** A structured drill definition */
export interface CategoryDrill {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Drill type */
  type: DrillType;
  /** Difficulty level */
  difficulty: DrillDifficulty;
  /** Which category this drill belongs to */
  category: WeaponCategory;
  
  // =========================================================================
  // REQUIREMENTS - What the shooter MUST do
  // =========================================================================
  
  /** Required distance(s) in meters */
  distances: number[];
  /** Required number of rounds */
  rounds: number;
  /** Required position(s) */
  positions: string[];
  /** Number of strings/stages */
  strings: number;
  /** Time limit per string (null = no limit) */
  timeLimitPerString: number | null;
  /** Total time limit (null = no limit) */
  totalTimeLimit: number | null;
  /** Target type required */
  targetType: 'paper' | 'tactical' | 'steel';
  /** Par time in seconds (for speed drills) */
  parTime: number | null;
  
  // =========================================================================
  // EVALUATION - How results are judged
  // =========================================================================
  
  /** What determines pass/fail */
  passFailCriteria: PassFailCriteria | null;
  /** Scoring tiers (best to worst) */
  scoringTiers: ScoringTier[];
  /** Primary metric to display */
  primaryMetric: 'dispersion' | 'accuracy' | 'time' | 'hits' | 'score';
  /** Secondary metrics to show */
  secondaryMetrics: ('dispersion' | 'accuracy' | 'time' | 'hits' | 'score')[];
  
  // =========================================================================
  // INSTRUCTIONS
  // =========================================================================
  
  /** Step-by-step instructions */
  instructions: string[];
  /** Safety notes */
  safetyNotes: string[];
  /** Tips for better performance */
  tips: string[];
  
  // =========================================================================
  // METADATA
  // =========================================================================
  
  /** Is this a standard/official drill? */
  isStandard: boolean;
  /** Source/origin of the drill */
  source?: string;
  /** Tags for filtering */
  tags: string[];
}

// ============================================================================
// PRECISION RIFLE DRILLS
// ============================================================================

export const PRECISION_RIFLE_DRILLS: CategoryDrill[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // ZEROING DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pr-zero-confirm',
    name: 'Zero Confirmation',
    description: 'Confirm your rifle is properly zeroed at 100m',
    type: 'zeroing',
    difficulty: 'beginner',
    category: 'precision_rifle',
    distances: [100],
    rounds: 3,
    positions: ['prone_supported'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      maxDispersionCm: 3.0, // ~1 MOA
      maxOffsetCm: 2.5,     // Within 1 inch of POA
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { dispersionCm: 1.5 } },
      { name: 'Qualified', color: '#3B82F6', criteria: { dispersionCm: 3.0 } },
      { name: 'Needs Work', color: '#F59E0B', criteria: { dispersionCm: 5.0 } },
    ],
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Set up at exactly 100 meters',
      'Use a stable supported position',
      'Fire 3 rounds at the target center',
      'Measure group size and offset from POA',
    ],
    safetyNotes: ['Ensure range is clear before firing'],
    tips: [
      'Let barrel cool between shots if needed',
      'Use consistent cheek weld and grip',
      'Follow through on each shot',
    ],
    isStandard: true,
    source: 'Standard Marksmanship',
    tags: ['zeroing', 'fundamentals', 'required'],
  },
  
  {
    id: 'pr-cold-bore',
    name: 'Cold Bore Shot',
    description: 'First round accuracy from a cold barrel - the shot that matters most',
    type: 'diagnostic',
    difficulty: 'intermediate',
    category: 'precision_rifle',
    distances: [100],
    rounds: 1,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: 60,
    totalTimeLimit: 60,
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      maxOffsetCm: 2.5, // Within 1 inch of POA
    },
    scoringTiers: [
      { name: 'Perfect', color: '#10B981', criteria: { dispersionCm: 1.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 2.5 } },
      { name: 'Acceptable', color: '#F59E0B', criteria: { dispersionCm: 5.0 } },
    ],
    primaryMetric: 'accuracy',
    secondaryMetrics: ['time'],
    instructions: [
      'Rifle must be at ambient temperature (cold)',
      'Set up at 100 meters',
      'You have 60 seconds from assuming position',
      'Fire ONE round only',
      'Measure distance from POA',
    ],
    safetyNotes: ['Ensure range is clear'],
    tips: [
      'This tests your true zero',
      'Track cold bore shots over time',
      'Note temperature and conditions',
    ],
    isStandard: true,
    source: 'Sniper Training',
    tags: ['cold-bore', 'diagnostic', 'single-shot'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUPING DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pr-5-shot-group',
    name: '5-Shot Group',
    description: 'Standard 5-round group to measure rifle and shooter capability',
    type: 'grouping',
    difficulty: 'beginner',
    category: 'precision_rifle',
    distances: [100],
    rounds: 5,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 300, // 5 minutes
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      maxDispersionCm: 5.0, // ~1.7 MOA - reasonable for most shooters
    },
    scoringTiers: [
      { name: 'Sub-MOA', color: '#10B981', criteria: { dispersionCm: 2.9 } },
      { name: '1 MOA', color: '#3B82F6', criteria: { dispersionCm: 3.0 } },
      { name: '1.5 MOA', color: '#F59E0B', criteria: { dispersionCm: 4.5 } },
      { name: '2 MOA', color: '#EF4444', criteria: { dispersionCm: 6.0 } },
    ],
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Set up at 100 meters in prone position',
      'Fire 5 rounds at the target center',
      'Take your time - focus on fundamentals',
      'Measure extreme spread (ES) of group',
    ],
    safetyNotes: ['Clear chamber when done'],
    tips: [
      'Consistent breathing rhythm',
      'Same trigger press every time',
      'Don\'t chase your shots',
    ],
    isStandard: true,
    source: 'Standard Marksmanship',
    tags: ['grouping', 'fundamentals', 'benchmark'],
  },

  {
    id: 'pr-10-shot-group',
    name: '10-Shot Group',
    description: 'Extended group for true precision assessment',
    type: 'grouping',
    difficulty: 'intermediate',
    category: 'precision_rifle',
    distances: [100],
    rounds: 10,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 600, // 10 minutes
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      maxDispersionCm: 6.0,
    },
    scoringTiers: [
      { name: 'Excellent', color: '#10B981', criteria: { dispersionCm: 3.5 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 5.0 } },
      { name: 'Average', color: '#F59E0B', criteria: { dispersionCm: 7.0 } },
    ],
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Set up at 100 meters',
      'Fire 10 rounds, maintaining focus throughout',
      'This tests consistency over more rounds',
    ],
    safetyNotes: [],
    tips: [
      '10-shot groups are more statistically valid',
      'Watch for fatigue affecting later shots',
    ],
    isStandard: true,
    tags: ['grouping', 'endurance', 'benchmark'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DISTANCE PROGRESSION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pr-distance-200',
    name: '200m Qualification',
    description: 'Demonstrate accuracy at 200 meters',
    type: 'qualification',
    difficulty: 'intermediate',
    category: 'precision_rifle',
    distances: [200],
    rounds: 5,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 300,
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      maxDispersionCm: 6.0, // ~1 MOA at 200m
      minAccuracyPct: 100,  // All hits on target
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { dispersionCm: 4.0 } },
      { name: 'Qualified', color: '#3B82F6', criteria: { dispersionCm: 6.0 } },
    ],
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Confirm 100m zero before starting',
      'Apply proper elevation adjustment for 200m',
      'Fire 5 rounds',
    ],
    safetyNotes: [],
    tips: ['Wind becomes more significant at distance'],
    isStandard: true,
    tags: ['distance', 'qualification'],
  },

  {
    id: 'pr-distance-300',
    name: '300m Qualification',
    description: 'Demonstrate accuracy at 300 meters',
    type: 'qualification',
    difficulty: 'advanced',
    category: 'precision_rifle',
    distances: [300],
    rounds: 5,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 300,
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      maxDispersionCm: 9.0, // ~1 MOA at 300m
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { dispersionCm: 6.0 } },
      { name: 'Qualified', color: '#3B82F6', criteria: { dispersionCm: 9.0 } },
    ],
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Apply proper DOPE for 300m',
      'Account for wind',
      'Fire 5 rounds',
    ],
    safetyNotes: [],
    tips: ['Use a wind meter if available'],
    isStandard: true,
    tags: ['distance', 'qualification'],
  },
];

// ============================================================================
// PISTOL DRILLS
// ============================================================================

export const PISTOL_DRILLS: CategoryDrill[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // FUNDAMENTALS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'p-bullseye-25',
    name: 'Bullseye 25',
    description: 'Slow-fire accuracy at 25 yards',
    type: 'accuracy',
    difficulty: 'beginner',
    category: 'pistol',
    distances: [23], // 25 yards ≈ 23m
    rounds: 10,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 300,
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      minAccuracyPct: 80,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 95 } },
      { name: 'Sharpshooter', color: '#3B82F6', criteria: { accuracyPct: 85 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { accuracyPct: 70 } },
    ],
    primaryMetric: 'accuracy',
    secondaryMetrics: ['dispersion'],
    instructions: [
      'Stand at 25 yards',
      'Fire 10 rounds, one shot at a time',
      'Focus on sight alignment and trigger press',
    ],
    safetyNotes: ['Finger off trigger until on target'],
    tips: ['Don\'t rush - this is about precision'],
    isStandard: true,
    tags: ['fundamentals', 'accuracy', 'slow-fire'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SPEED DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'p-bill-drill',
    name: 'Bill Drill',
    description: 'Draw and fire 6 rounds as fast as possible with all hits',
    type: 'speed',
    difficulty: 'intermediate',
    category: 'pistol',
    distances: [7],
    rounds: 6,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 4,
    totalTimeLimit: 4,
    targetType: 'tactical',
    parTime: 2.0,
    passFailCriteria: {
      minAccuracyPct: 100, // All 6 must hit A-zone
      maxTimeSeconds: 4.0,
    },
    scoringTiers: [
      { name: 'Master', color: '#10B981', criteria: { timeSeconds: 2.0, accuracyPct: 100 } },
      { name: 'Expert', color: '#3B82F6', criteria: { timeSeconds: 2.5, accuracyPct: 100 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { timeSeconds: 3.5, accuracyPct: 100 } },
    ],
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy', 'hits'],
    instructions: [
      'Start from concealment or ready position',
      'On signal, draw and fire 6 rounds',
      'All 6 must hit the A-zone',
      'Time stops on 6th shot',
    ],
    safetyNotes: ['Safe draw technique', 'Finger indexed until on target'],
    tips: [
      'Speed comes from efficiency, not rushing',
      'Smooth draw = fast draw',
      'See what you need to see',
    ],
    isStandard: true,
    source: 'Bill Wilson',
    tags: ['speed', 'draw', 'classic'],
  },

  {
    id: 'p-el-presidente',
    name: 'El Presidente',
    description: 'Classic drill: Turn, draw, engage 3 targets, reload, re-engage',
    type: 'speed',
    difficulty: 'advanced',
    category: 'pistol',
    distances: [10],
    rounds: 12,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 10,
    totalTimeLimit: 10,
    targetType: 'tactical',
    parTime: 10.0,
    passFailCriteria: {
      minHits: 12,
      maxTimeSeconds: 10.0,
    },
    scoringTiers: [
      { name: 'Grandmaster', color: '#10B981', criteria: { timeSeconds: 5.0, accuracyPct: 100 } },
      { name: 'Master', color: '#3B82F6', criteria: { timeSeconds: 7.0, accuracyPct: 100 } },
      { name: 'Expert', color: '#F59E0B', criteria: { timeSeconds: 10.0, accuracyPct: 100 } },
    ],
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy', 'hits'],
    instructions: [
      'Start facing uprange (back to targets)',
      '3 targets at 10m, 1 meter apart',
      'On signal: Turn, draw, fire 2 on each target',
      'Slide lock reload',
      'Fire 2 more on each target',
    ],
    safetyNotes: ['Safe 180° turn', 'Muzzle discipline during reload'],
    tips: ['Reload while moving to first target', 'Transitions matter'],
    isStandard: true,
    source: 'Jeff Cooper',
    tags: ['speed', 'reload', 'transitions', 'classic'],
  },

  {
    id: 'p-mozambique',
    name: 'Mozambique Drill',
    description: '2 to the body, 1 to the head - failure to stop drill',
    type: 'speed',
    difficulty: 'intermediate',
    category: 'pistol',
    distances: [7],
    rounds: 3,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 3,
    totalTimeLimit: 3,
    targetType: 'tactical',
    parTime: 2.5,
    passFailCriteria: {
      minHits: 3,
      maxTimeSeconds: 3.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 2.0, accuracyPct: 100 } },
      { name: 'Qualified', color: '#3B82F6', criteria: { timeSeconds: 2.5, accuracyPct: 100 } },
    ],
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Start from ready or draw',
      'Fire 2 rounds to chest (A-zone)',
      'Transition to head, fire 1 round',
      'Time stops on 3rd shot',
    ],
    safetyNotes: [],
    tips: ['The head shot requires a pause to aim'],
    isStandard: true,
    source: 'Mike Rousseau',
    tags: ['speed', 'failure-drill', 'defensive'],
  },

  {
    id: 'p-draw-first-shot',
    name: 'Draw to First Shot',
    description: 'Clean draw and single accurate shot',
    type: 'speed',
    difficulty: 'beginner',
    category: 'pistol',
    distances: [5],
    rounds: 1,
    positions: ['standing'],
    strings: 5,
    timeLimitPerString: 2,
    totalTimeLimit: null,
    targetType: 'tactical',
    parTime: 1.5,
    passFailCriteria: {
      minAccuracyPct: 100,
      maxTimeSeconds: 2.0,
    },
    scoringTiers: [
      { name: 'Fast', color: '#10B981', criteria: { timeSeconds: 1.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 1.5 } },
      { name: 'Acceptable', color: '#F59E0B', criteria: { timeSeconds: 2.0 } },
    ],
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'From concealment or ready',
      'Draw and fire 1 accurate shot',
      'Repeat 5 times',
      'Record each time',
    ],
    safetyNotes: ['Safe draw technique'],
    tips: ['Build consistency before building speed'],
    isStandard: true,
    tags: ['draw', 'fundamentals', 'benchmark'],
  },
];

// ============================================================================
// CARBINE DRILLS
// ============================================================================

export const CARBINE_DRILLS: CategoryDrill[] = [
  {
    id: 'c-zero-50',
    name: '50m Zero Confirmation',
    description: 'Confirm carbine zero at 50 meters',
    type: 'zeroing',
    difficulty: 'beginner',
    category: 'carbine',
    distances: [50],
    rounds: 3,
    positions: ['prone', 'supported'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    targetType: 'paper',
    parTime: null,
    passFailCriteria: {
      maxDispersionCm: 5.0,
      maxOffsetCm: 3.0,
    },
    scoringTiers: [
      { name: 'Perfect', color: '#10B981', criteria: { dispersionCm: 2.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 4.0 } },
    ],
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Set up at 50 meters',
      'Use stable supported position',
      'Fire 3 rounds at center',
    ],
    safetyNotes: [],
    tips: ['50m zero is versatile for CQB to 200m'],
    isStandard: true,
    tags: ['zeroing', 'fundamentals'],
  },

  {
    id: 'c-cadence-drill',
    name: 'Cadence Drill',
    description: 'Controlled pairs with consistent rhythm',
    type: 'speed',
    difficulty: 'intermediate',
    category: 'carbine',
    distances: [25],
    rounds: 10,
    positions: ['standing'],
    strings: 5,
    timeLimitPerString: 3,
    totalTimeLimit: null,
    targetType: 'tactical',
    parTime: 1.5,
    passFailCriteria: {
      minAccuracyPct: 90,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 1.0, accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 1.5, accuracyPct: 90 } },
    ],
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy'],
    instructions: [
      'Fire 2 rounds per string',
      '5 strings total',
      'Maintain consistent split times',
    ],
    safetyNotes: [],
    tips: ['Same cadence every time builds consistency'],
    isStandard: true,
    tags: ['speed', 'fundamentals'],
  },
];

// ============================================================================
// ALL DRILLS BY CATEGORY
// ============================================================================

export const DRILLS_BY_CATEGORY: Record<WeaponCategory, CategoryDrill[]> = {
  precision_rifle: PRECISION_RIFLE_DRILLS,
  rifle: PRECISION_RIFLE_DRILLS, // Use PR drills as base
  carbine: CARBINE_DRILLS,
  pistol: PISTOL_DRILLS,
  shotgun: [], // TODO: Add shotgun drills
  any: [...PRECISION_RIFLE_DRILLS.slice(0, 3), ...PISTOL_DRILLS.slice(0, 3)],
};

// ============================================================================
// DRILL HELPERS
// ============================================================================

/**
 * Get all drills for a category
 */
export function getCategoryDrills(category: WeaponCategory): CategoryDrill[] {
  return DRILLS_BY_CATEGORY[category] || [];
}

/**
 * Get drills by type within a category
 */
export function getDrillsByType(
  category: WeaponCategory,
  type: DrillType
): CategoryDrill[] {
  return getCategoryDrills(category).filter(d => d.type === type);
}

/**
 * Get drills by difficulty
 */
export function getDrillsByDifficulty(
  category: WeaponCategory,
  difficulty: DrillDifficulty
): CategoryDrill[] {
  return getCategoryDrills(category).filter(d => d.difficulty === difficulty);
}

/**
 * Get a specific drill by ID
 */
export function getDrillById(drillId: string): CategoryDrill | null {
  for (const drills of Object.values(DRILLS_BY_CATEGORY)) {
    const found = drills.find(d => d.id === drillId);
    if (found) return found;
  }
  return null;
}

/**
 * Group drills by type for display
 */
export function groupDrillsByType(
  category: WeaponCategory
): Record<DrillType, CategoryDrill[]> {
  const drills = getCategoryDrills(category);
  const grouped: Partial<Record<DrillType, CategoryDrill[]>> = {};
  
  for (const drill of drills) {
    if (!grouped[drill.type]) {
      grouped[drill.type] = [];
    }
    grouped[drill.type]!.push(drill);
  }
  
  return grouped as Record<DrillType, CategoryDrill[]>;
}

/**
 * Evaluate a session result against a drill's criteria
 */
export function evaluateDrillResult(
  drill: CategoryDrill,
  result: {
    dispersionCm?: number;
    accuracyPct?: number;
    timeSeconds?: number;
    hits?: number;
    totalShots?: number;
  }
): {
  passed: boolean;
  tier: ScoringTier | null;
  feedback: string[];
} {
  const feedback: string[] = [];
  let passed = true;
  
  const criteria = drill.passFailCriteria;
  if (criteria) {
    if (criteria.maxDispersionCm && result.dispersionCm !== undefined) {
      if (result.dispersionCm > criteria.maxDispersionCm) {
        passed = false;
        feedback.push(`Dispersion ${result.dispersionCm.toFixed(1)}cm exceeds max ${criteria.maxDispersionCm}cm`);
      }
    }
    
    if (criteria.minAccuracyPct && result.accuracyPct !== undefined) {
      if (result.accuracyPct < criteria.minAccuracyPct) {
        passed = false;
        feedback.push(`Accuracy ${result.accuracyPct.toFixed(0)}% below required ${criteria.minAccuracyPct}%`);
      }
    }
    
    if (criteria.maxTimeSeconds && result.timeSeconds !== undefined) {
      if (result.timeSeconds > criteria.maxTimeSeconds) {
        passed = false;
        feedback.push(`Time ${result.timeSeconds.toFixed(1)}s exceeds limit ${criteria.maxTimeSeconds}s`);
      }
    }
    
    if (criteria.minHits && result.hits !== undefined) {
      if (result.hits < criteria.minHits) {
        passed = false;
        feedback.push(`${result.hits} hits, need ${criteria.minHits}`);
      }
    }
  }
  
  // Find achieved tier
  let achievedTier: ScoringTier | null = null;
  for (const tier of drill.scoringTiers) {
    let meetsTier = true;
    
    if (tier.criteria.dispersionCm && result.dispersionCm !== undefined) {
      if (result.dispersionCm > tier.criteria.dispersionCm) meetsTier = false;
    }
    if (tier.criteria.accuracyPct && result.accuracyPct !== undefined) {
      if (result.accuracyPct < tier.criteria.accuracyPct) meetsTier = false;
    }
    if (tier.criteria.timeSeconds && result.timeSeconds !== undefined) {
      if (result.timeSeconds > tier.criteria.timeSeconds) meetsTier = false;
    }
    
    if (meetsTier) {
      achievedTier = tier;
      break; // First match is best tier
    }
  }
  
  if (passed && achievedTier) {
    feedback.push(`Achieved: ${achievedTier.name}`);
  }
  
  return { passed, tier: achievedTier, feedback };
}


