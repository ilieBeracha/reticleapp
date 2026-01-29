/**
 * Universal Drills Library
 *
 * Drills are now universal templates with recommended weapon categories.
 * Each drill defines:
 * - What action to perform (structure)
 * - Suggested defaults for configurable values
 * - How to evaluate results
 * - Which weapon categories it's best suited for
 */

import type { WeaponCategory } from '@/types/workspace';

// ============================================================================
// DRILL STRUCTURE TYPES
// ============================================================================

/** Drill difficulty levels */
export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/** Drill type categories */
export type DrillType =
  | 'zeroing' // Confirm/adjust zero
  | 'grouping' // Measure consistency
  | 'qualification' // Standard qual course
  | 'speed' // Timed drills
  | 'accuracy' // Precision shooting
  | 'transition' // Multiple targets
  | 'movement' // Shoot & move
  | 'stress' // Under physical stress
  | 'diagnostic' // Identify issues
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

/** Suggested defaults for configurable values */
export interface DrillDefaults {
  /** Suggested distance in meters */
  distance?: number;
  /** Suggested number of rounds */
  rounds?: number;
  /** Suggested position */
  position?: string;
  /** Suggested time limit in seconds */
  timeLimit?: number | null;
  /** Suggested number of strings/stages */
  strings?: number;
}

/** A structured drill definition - universal template for an action */
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

  // =========================================================================
  // CATEGORY RECOMMENDATIONS
  // =========================================================================

  /** Which weapon categories this drill is recommended for */
  recommendedCategories: WeaponCategory[];

  // =========================================================================
  // STRUCTURE - What defines this drill (not changeable)
  // =========================================================================

  /** Target type for this drill */
  targetType: 'paper' | 'tactical' | 'steel';
  /** Primary metric to evaluate */
  primaryMetric: 'dispersion' | 'accuracy' | 'time' | 'hits' | 'score';
  /** Secondary metrics to show */
  secondaryMetrics: ('dispersion' | 'accuracy' | 'time' | 'hits' | 'score')[];

  // =========================================================================
  // DEFAULTS - Suggested starting values (user can change)
  // =========================================================================

  /** Suggested defaults for configurable parameters */
  defaults: DrillDefaults;

  // =========================================================================
  // EVALUATION - How results are judged (scales with user config)
  // =========================================================================

  /** What determines pass/fail (optional) */
  passFailCriteria: PassFailCriteria | null;
  /** Scoring tiers (best to worst) */
  scoringTiers: ScoringTier[];

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

  // =========================================================================
  // LEGACY - For backwards compatibility (will be removed)
  // =========================================================================
  /** @deprecated */
  category: WeaponCategory;
  /** @deprecated Use defaults.distance */
  distances: number[];
  /** @deprecated Use defaults.rounds */
  rounds: number;
  /** @deprecated Use defaults.position */
  positions: string[];
  /** @deprecated Use defaults.strings */
  strings: number;
  /** @deprecated Use defaults.timeLimit */
  timeLimitPerString: number | null;
  /** @deprecated Use defaults.timeLimit */
  totalTimeLimit: number | null;
  /** @deprecated */
  parTime: number | null;
}

// ============================================================================
// UNIVERSAL DRILLS - All drills with category recommendations
// ============================================================================

export const ALL_DRILLS: CategoryDrill[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // ZEROING DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'zero-confirm',
    name: 'Zero Confirmation',
    description: 'Confirm your weapon is properly zeroed',
    type: 'zeroing',
    difficulty: 'beginner',
    recommendedCategories: ['precision_rifle', 'rifle', 'carbine', 'pistol'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 50,
      rounds: 3,
      position: 'prone_supported',
      timeLimit: null,
      strings: 1,
    },
    passFailCriteria: {
      maxDispersionCm: 5.0,
      maxOffsetCm: 3.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { dispersionCm: 2.0 } },
      { name: 'Qualified', color: '#3B82F6', criteria: { dispersionCm: 4.0 } },
      { name: 'Needs Work', color: '#F59E0B', criteria: { dispersionCm: 6.0 } },
    ],
    instructions: [
      'Use a stable supported position',
      'Fire rounds at the target center',
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
    category: 'any',
    distances: [50],
    rounds: 3,
    positions: ['prone_supported'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    parTime: null,
  },

  {
    id: 'cold-bore',
    name: 'Cold Bore Shot',
    description: 'First round accuracy from a cold barrel',
    type: 'diagnostic',
    difficulty: 'intermediate',
    recommendedCategories: ['precision_rifle', 'rifle', 'carbine'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: ['time'],
    defaults: {
      distance: 100,
      rounds: 1,
      position: 'prone',
      timeLimit: 60,
      strings: 1,
    },
    passFailCriteria: {
      maxOffsetCm: 2.5,
    },
    scoringTiers: [
      { name: 'Perfect', color: '#10B981', criteria: { dispersionCm: 1.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 2.5 } },
      { name: 'Acceptable', color: '#F59E0B', criteria: { dispersionCm: 5.0 } },
    ],
    instructions: [
      'Weapon should be at ambient temperature (cold)',
      'Fire ONE round only',
      'Measure distance from POA',
    ],
    safetyNotes: ['Ensure range is clear'],
    tips: ['This tests your true zero', 'Track cold bore shots over time', 'Note temperature and conditions'],
    isStandard: true,
    source: 'Sniper Training',
    tags: ['cold-bore', 'diagnostic', 'single-shot'],
    category: 'precision_rifle',
    distances: [100],
    rounds: 1,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: 60,
    totalTimeLimit: 60,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUPING DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: '3-shot-group',
    name: '3-Shot Group',
    description: 'Quick group for zero verification',
    type: 'grouping',
    difficulty: 'beginner',
    recommendedCategories: ['precision_rifle', 'rifle', 'carbine', 'pistol'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 50,
      rounds: 3,
      position: 'prone',
      timeLimit: 120,
      strings: 1,
    },
    passFailCriteria: {
      maxDispersionCm: 5.0,
    },
    scoringTiers: [
      { name: 'Excellent', color: '#10B981', criteria: { dispersionCm: 2.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 3.5 } },
      { name: 'Acceptable', color: '#F59E0B', criteria: { dispersionCm: 5.0 } },
    ],
    instructions: ['Fire 3 rounds at the target center', 'Focus on fundamentals', 'Measure extreme spread'],
    safetyNotes: ['Clear chamber when done'],
    tips: ['3-shot groups are quick but less statistically valid'],
    isStandard: true,
    source: 'Standard Marksmanship',
    tags: ['grouping', 'fundamentals', 'quick'],
    category: 'any',
    distances: [50],
    rounds: 3,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 120,
    parTime: null,
  },

  {
    id: '5-shot-group',
    name: '5-Shot Group',
    description: 'Standard group for accuracy assessment',
    type: 'grouping',
    difficulty: 'beginner',
    recommendedCategories: ['precision_rifle', 'rifle', 'carbine', 'pistol'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 100,
      rounds: 5,
      position: 'prone',
      timeLimit: 300,
      strings: 1,
    },
    passFailCriteria: {
      maxDispersionCm: 5.0,
    },
    scoringTiers: [
      { name: 'Sub-MOA', color: '#10B981', criteria: { dispersionCm: 2.9 } },
      { name: '1 MOA', color: '#3B82F6', criteria: { dispersionCm: 3.0 } },
      { name: '1.5 MOA', color: '#F59E0B', criteria: { dispersionCm: 4.5 } },
      { name: '2 MOA', color: '#EF4444', criteria: { dispersionCm: 6.0 } },
    ],
    instructions: [
      'Fire rounds at the target center',
      'Take your time - focus on fundamentals',
      'Measure extreme spread (ES) of group',
    ],
    safetyNotes: ['Clear chamber when done'],
    tips: ['Consistent breathing rhythm', 'Same trigger press every time', "Don't chase your shots"],
    isStandard: true,
    source: 'Standard Marksmanship',
    tags: ['grouping', 'fundamentals', 'benchmark'],
    category: 'precision_rifle',
    distances: [100],
    rounds: 5,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 300,
    parTime: null,
  },

  {
    id: '10-shot-group',
    name: '10-Shot Group',
    description: 'Extended group for true precision assessment',
    type: 'grouping',
    difficulty: 'intermediate',
    recommendedCategories: ['precision_rifle', 'rifle', 'carbine'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 100,
      rounds: 10,
      position: 'prone',
      timeLimit: 600,
      strings: 1,
    },
    passFailCriteria: {
      maxDispersionCm: 6.0,
    },
    scoringTiers: [
      { name: 'Excellent', color: '#10B981', criteria: { dispersionCm: 3.5 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 5.0 } },
      { name: 'Average', color: '#F59E0B', criteria: { dispersionCm: 7.0 } },
    ],
    instructions: ['Fire rounds maintaining focus throughout', 'This tests consistency over more rounds'],
    safetyNotes: [],
    tips: ['10-shot groups are more statistically valid', 'Watch for fatigue affecting later shots'],
    isStandard: true,
    tags: ['grouping', 'endurance', 'benchmark'],
    category: 'precision_rifle',
    distances: [100],
    rounds: 10,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 600,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ACCURACY DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'slow-fire-accuracy',
    name: 'Slow-Fire Accuracy',
    description: 'Precision shooting with focus on fundamentals',
    type: 'accuracy',
    difficulty: 'beginner',
    recommendedCategories: ['pistol', 'carbine', 'rifle'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: ['dispersion'],
    defaults: {
      distance: 15,
      rounds: 10,
      position: 'standing',
      timeLimit: null,
      strings: 1,
    },
    passFailCriteria: {
      minAccuracyPct: 80,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 95 } },
      { name: 'Sharpshooter', color: '#3B82F6', criteria: { accuracyPct: 85 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { accuracyPct: 70 } },
    ],
    instructions: ['Fire rounds one at a time', 'Focus on sight alignment and trigger press'],
    safetyNotes: ['Finger off trigger until on target'],
    tips: ["Don't rush - this is about precision"],
    isStandard: true,
    tags: ['fundamentals', 'accuracy', 'slow-fire'],
    category: 'pistol',
    distances: [15],
    rounds: 10,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    parTime: null,
  },

  {
    id: 'bulls-eye',
    name: 'Bulls-Eye',
    description: 'Classic target shooting for score',
    type: 'accuracy',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'rifle', 'precision_rifle'],
    targetType: 'paper',
    primaryMetric: 'score',
    secondaryMetrics: ['accuracy', 'dispersion'],
    defaults: {
      distance: 25,
      rounds: 10,
      position: 'standing',
      timeLimit: 600,
      strings: 1,
    },
    passFailCriteria: {
      minAccuracyPct: 70,
    },
    scoringTiers: [
      { name: 'Master', color: '#10B981', criteria: { accuracyPct: 95 } },
      { name: 'Expert', color: '#3B82F6', criteria: { accuracyPct: 85 } },
      { name: 'Sharpshooter', color: '#F59E0B', criteria: { accuracyPct: 75 } },
    ],
    instructions: ['Fire rounds at bullseye target', 'Score based on ring value', 'Take your time for each shot'],
    safetyNotes: [],
    tips: ['Consistent sight picture is key', 'Focus on trigger control'],
    isStandard: true,
    source: 'NRA Bullseye',
    tags: ['accuracy', 'score', 'competition'],
    category: 'pistol',
    distances: [25],
    rounds: 10,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 600,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SPEED DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'speed-shoot',
    name: 'Speed Shoot',
    description: 'Fire rounds as fast as possible with all hits',
    type: 'speed',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy', 'hits'],
    defaults: {
      distance: 7,
      rounds: 6,
      position: 'standing',
      timeLimit: 4,
      strings: 1,
    },
    passFailCriteria: {
      minAccuracyPct: 100,
      maxTimeSeconds: 4.0,
    },
    scoringTiers: [
      { name: 'Master', color: '#10B981', criteria: { timeSeconds: 2.0, accuracyPct: 100 } },
      { name: 'Expert', color: '#3B82F6', criteria: { timeSeconds: 2.5, accuracyPct: 100 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { timeSeconds: 3.5, accuracyPct: 100 } },
    ],
    instructions: ['On signal, engage target', 'All shots must hit', 'Time stops on last shot'],
    safetyNotes: ['Safe draw technique', 'Finger indexed until on target'],
    tips: ['Speed comes from efficiency, not rushing', 'Smooth is fast'],
    isStandard: true,
    tags: ['speed', 'classic'],
    category: 'pistol',
    distances: [7],
    rounds: 6,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 4,
    totalTimeLimit: 4,
    parTime: 2.0,
  },

  {
    id: 'cadence-drill',
    name: 'Cadence Drill',
    description: 'Controlled pairs with consistent rhythm',
    type: 'speed',
    difficulty: 'intermediate',
    recommendedCategories: ['carbine', 'pistol', 'rifle'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 25,
      rounds: 10,
      position: 'standing',
      timeLimit: 3,
      strings: 5,
    },
    passFailCriteria: {
      minAccuracyPct: 90,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 1.0, accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 1.5, accuracyPct: 90 } },
    ],
    instructions: ['Fire controlled pairs', 'Maintain consistent split times'],
    safetyNotes: [],
    tips: ['Same cadence every time builds consistency'],
    isStandard: true,
    tags: ['speed', 'fundamentals', 'pairs'],
    category: 'carbine',
    distances: [25],
    rounds: 10,
    positions: ['standing'],
    strings: 5,
    timeLimitPerString: 3,
    totalTimeLimit: null,
    parTime: 1.5,
  },

  {
    id: 'bill-drill',
    name: 'Bill Drill',
    description: '6 shots to body as fast as possible',
    type: 'speed',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy', 'hits'],
    defaults: {
      distance: 7,
      rounds: 6,
      position: 'standing',
      timeLimit: 4,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 6,
      maxTimeSeconds: 4.0,
    },
    scoringTiers: [
      { name: 'Master', color: '#10B981', criteria: { timeSeconds: 2.0, accuracyPct: 100 } },
      { name: 'Expert', color: '#3B82F6', criteria: { timeSeconds: 2.5, accuracyPct: 100 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { timeSeconds: 3.0, accuracyPct: 100 } },
    ],
    instructions: ['From draw, fire 6 rounds to chest', 'All hits must be in A-zone'],
    safetyNotes: ['Practice safe draw'],
    tips: ['Focus on recoil management', 'Let the sights settle briefly'],
    isStandard: true,
    source: 'Bill Wilson',
    tags: ['speed', 'draw', 'classic'],
    category: 'pistol',
    distances: [7],
    rounds: 6,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 4,
    totalTimeLimit: 4,
    parTime: 2.0,
  },

  {
    id: 'failure-drill',
    name: 'Failure Drill',
    description: 'Body shots followed by head shot',
    type: 'speed',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 7,
      rounds: 3,
      position: 'standing',
      timeLimit: 3,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 3,
      maxTimeSeconds: 3.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 2.0, accuracyPct: 100 } },
      { name: 'Qualified', color: '#3B82F6', criteria: { timeSeconds: 2.5, accuracyPct: 100 } },
    ],
    instructions: ['Fire 2 rounds to body', 'Transition to head, fire 1 round'],
    safetyNotes: [],
    tips: ['The head shot requires a pause to aim'],
    isStandard: true,
    source: 'Mozambique Drill',
    tags: ['speed', 'failure-drill', 'defensive'],
    category: 'pistol',
    distances: [7],
    rounds: 3,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 3,
    totalTimeLimit: 3,
    parTime: 2.5,
  },

  {
    id: 'draw-and-fire',
    name: 'Draw and Fire',
    description: 'Single shot from concealment or holster',
    type: 'speed',
    difficulty: 'beginner',
    recommendedCategories: ['pistol'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 5,
      rounds: 1,
      position: 'standing',
      timeLimit: 2,
      strings: 5,
    },
    passFailCriteria: {
      minHits: 1,
      maxTimeSeconds: 2.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 1.0, accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 1.5, accuracyPct: 100 } },
    ],
    instructions: ['Start with hands at sides', 'On signal, draw and fire one round'],
    safetyNotes: ['Safe draw technique'],
    tips: ['Smooth draw wins'],
    isStandard: true,
    tags: ['speed', 'draw', 'fundamentals'],
    category: 'pistol',
    distances: [5],
    rounds: 1,
    positions: ['standing'],
    strings: 5,
    timeLimitPerString: 2,
    totalTimeLimit: null,
    parTime: 1.5,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSITION DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'target-transition',
    name: 'Target Transition',
    description: 'Engage multiple targets with smooth transitions',
    type: 'transition',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine', 'shotgun'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy', 'hits'],
    defaults: {
      distance: 10,
      rounds: 6,
      position: 'standing',
      timeLimit: 6,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 6,
      maxTimeSeconds: 6.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 3.0, accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 4.5, accuracyPct: 100 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { timeSeconds: 6.0, accuracyPct: 100 } },
    ],
    instructions: ['Engage 3 targets, 2 rounds each', 'Smooth transitions between targets'],
    safetyNotes: ['Muzzle discipline during transitions'],
    tips: ['Eyes lead the gun', "Don't outrun your sights"],
    isStandard: true,
    tags: ['transition', 'multiple-targets'],
    category: 'pistol',
    distances: [10],
    rounds: 6,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 6,
    totalTimeLimit: 6,
    parTime: 4.0,
  },

  {
    id: 'el-presidente',
    name: 'El Presidente',
    description: 'Classic transition and reload drill',
    type: 'transition',
    difficulty: 'advanced',
    recommendedCategories: ['pistol', 'carbine'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy', 'hits'],
    defaults: {
      distance: 10,
      rounds: 12,
      position: 'standing',
      timeLimit: 10,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 12,
      maxTimeSeconds: 10.0,
    },
    scoringTiers: [
      { name: 'Grandmaster', color: '#10B981', criteria: { timeSeconds: 5.0, accuracyPct: 100 } },
      { name: 'Master', color: '#3B82F6', criteria: { timeSeconds: 7.0, accuracyPct: 100 } },
      { name: 'Expert', color: '#F59E0B', criteria: { timeSeconds: 10.0, accuracyPct: 100 } },
    ],
    instructions: [
      'Start facing away from 3 targets',
      'On signal, turn and engage each target with 2 rounds',
      'Reload and re-engage each target with 2 rounds',
    ],
    safetyNotes: ['Muzzle discipline during reload and turn'],
    tips: ['Reload while transitioning', 'Smooth turn saves time'],
    isStandard: true,
    source: 'Jeff Cooper',
    tags: ['transition', 'reload', 'classic', 'competition'],
    category: 'pistol',
    distances: [10],
    rounds: 12,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 10,
    totalTimeLimit: 10,
    parTime: 10.0,
  },

  {
    id: 'reload-drill',
    name: 'Reload Drill',
    description: 'Practice emergency and tactical reloads',
    type: 'transition',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine', 'rifle'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['hits'],
    defaults: {
      distance: 7,
      rounds: 6,
      position: 'standing',
      timeLimit: 8,
      strings: 3,
    },
    passFailCriteria: {
      minHits: 6,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 4.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 6.0 } },
    ],
    instructions: ['Fire 2 rounds', 'Perform reload', 'Fire 2 more rounds'],
    safetyNotes: ['Safe magazine handling'],
    tips: ['Index the magazine consistently', 'Eyes stay on target'],
    isStandard: true,
    tags: ['reload', 'manipulation', 'fundamentals'],
    category: 'pistol',
    distances: [7],
    rounds: 6,
    positions: ['standing'],
    strings: 3,
    timeLimitPerString: 8,
    totalTimeLimit: null,
    parTime: 5.0,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STRESS DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'run-and-gun',
    name: 'Run and Gun',
    description: 'Shoot after physical exertion',
    type: 'stress',
    difficulty: 'advanced',
    recommendedCategories: ['pistol', 'carbine', 'rifle'],
    targetType: 'tactical',
    primaryMetric: 'hits',
    secondaryMetrics: ['time', 'accuracy'],
    defaults: {
      distance: 15,
      rounds: 10,
      position: 'standing',
      timeLimit: 30,
      strings: 1,
    },
    passFailCriteria: {
      minAccuracyPct: 70,
    },
    scoringTiers: [
      { name: 'Elite', color: '#10B981', criteria: { accuracyPct: 90 } },
      { name: 'Expert', color: '#3B82F6', criteria: { accuracyPct: 80 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { accuracyPct: 70 } },
    ],
    instructions: [
      'Complete physical exercise (sprints, burpees, etc.)',
      'Immediately engage targets',
      'Focus on controlling breathing and heart rate',
    ],
    safetyNotes: ['Extra attention to muzzle discipline when fatigued'],
    tips: ['Slow your breathing', 'Take an extra moment if needed'],
    isStandard: true,
    tags: ['stress', 'physical', 'tactical'],
    category: 'pistol',
    distances: [15],
    rounds: 10,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 30,
    totalTimeLimit: 30,
    parTime: null,
  },

  {
    id: 'timed-stress',
    name: 'Timed Stress Drill',
    description: 'Accuracy under time pressure',
    type: 'stress',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine', 'rifle', 'precision_rifle'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: ['time', 'hits'],
    defaults: {
      distance: 25,
      rounds: 5,
      position: 'standing',
      timeLimit: 10,
      strings: 1,
    },
    passFailCriteria: {
      minAccuracyPct: 80,
      maxTimeSeconds: 10.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 5.0, accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 8.0, accuracyPct: 90 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { timeSeconds: 10.0, accuracyPct: 80 } },
    ],
    instructions: ['On signal, fire all rounds', 'Must complete within time limit', 'Accuracy still counts'],
    safetyNotes: [],
    tips: ["Don't rush the first shot", 'Smooth trigger press under pressure'],
    isStandard: true,
    tags: ['stress', 'timed', 'accuracy'],
    category: 'any',
    distances: [25],
    rounds: 5,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 10,
    totalTimeLimit: 10,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUALIFICATION DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'basic-qual',
    name: 'Basic Qualification',
    description: 'Demonstrate competency at various distances',
    type: 'qualification',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine', 'rifle'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: ['hits'],
    defaults: {
      distance: 25,
      rounds: 20,
      position: 'standing',
      timeLimit: 300,
      strings: 4,
    },
    passFailCriteria: {
      minAccuracyPct: 70,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 90 } },
      { name: 'Sharpshooter', color: '#3B82F6', criteria: { accuracyPct: 80 } },
      { name: 'Qualified', color: '#F59E0B', criteria: { accuracyPct: 70 } },
    ],
    instructions: ['Fire 5 rounds at each stage', 'Score based on accuracy percentage'],
    safetyNotes: [],
    tips: ['Take your time', 'Focus on fundamentals'],
    isStandard: true,
    tags: ['qualification', 'fundamentals'],
    category: 'any',
    distances: [25],
    rounds: 20,
    positions: ['standing'],
    strings: 4,
    timeLimitPerString: null,
    totalTimeLimit: 300,
    parTime: null,
  },

  {
    id: 'distance-qual',
    name: 'Distance Qualification',
    description: 'Demonstrate accuracy at extended range',
    type: 'qualification',
    difficulty: 'intermediate',
    recommendedCategories: ['precision_rifle', 'rifle', 'carbine'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 200,
      rounds: 5,
      position: 'prone',
      timeLimit: 300,
      strings: 1,
    },
    passFailCriteria: {
      maxDispersionCm: 10.0,
      minAccuracyPct: 100,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { dispersionCm: 5.0 } },
      { name: 'Qualified', color: '#3B82F6', criteria: { dispersionCm: 8.0 } },
    ],
    instructions: ['Confirm zero before starting', 'Apply proper elevation adjustment', 'Account for wind'],
    safetyNotes: [],
    tips: ['Wind becomes more significant at distance'],
    isStandard: true,
    tags: ['distance', 'qualification'],
    category: 'precision_rifle',
    distances: [200],
    rounds: 5,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 300,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DIAGNOSTIC DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'trigger-control',
    name: 'Trigger Control Check',
    description: 'Diagnose trigger issues',
    type: 'diagnostic',
    difficulty: 'beginner',
    recommendedCategories: ['pistol', 'carbine', 'rifle', 'precision_rifle'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 10,
      rounds: 5,
      position: 'standing',
      timeLimit: null,
      strings: 1,
    },
    passFailCriteria: null,
    scoringTiers: [
      { name: 'Excellent', color: '#10B981', criteria: { dispersionCm: 3.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 5.0 } },
      { name: 'Work Needed', color: '#F59E0B', criteria: { dispersionCm: 8.0 } },
    ],
    instructions: ['Fire slowly and deliberately', 'Focus ONLY on trigger press', 'Analyze shot pattern for issues'],
    safetyNotes: [],
    tips: [
      'Shots low-left (right-handed): likely jerking trigger',
      'Shots low: anticipating recoil',
      'Shots scattered: inconsistent grip',
    ],
    isStandard: true,
    tags: ['diagnostic', 'fundamentals', 'trigger'],
    category: 'pistol',
    distances: [10],
    rounds: 5,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    parTime: null,
  },

  {
    id: 'ball-dummy',
    name: 'Ball and Dummy Drill',
    description: 'Identify flinching and anticipation',
    type: 'diagnostic',
    difficulty: 'beginner',
    recommendedCategories: ['pistol', 'carbine'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: [],
    defaults: {
      distance: 7,
      rounds: 10,
      position: 'standing',
      timeLimit: null,
      strings: 1,
    },
    passFailCriteria: null,
    scoringTiers: [],
    instructions: [
      'Mix live rounds with snap caps',
      'Fire without knowing which is which',
      'Watch for movement on dummy rounds',
    ],
    safetyNotes: ['Treat all rounds as live'],
    tips: ['Any movement on dummy round indicates flinch'],
    isStandard: true,
    tags: ['diagnostic', 'flinch', 'fundamentals'],
    category: 'pistol',
    distances: [7],
    rounds: 10,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    parTime: null,
  },

  {
    id: 'one-hole',
    name: 'One Hole Drill',
    description: 'All shots through the same hole',
    type: 'diagnostic',
    difficulty: 'advanced',
    recommendedCategories: ['precision_rifle', 'rifle'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: [],
    defaults: {
      distance: 100,
      rounds: 5,
      position: 'prone_supported',
      timeLimit: null,
      strings: 1,
    },
    passFailCriteria: {
      maxDispersionCm: 1.5,
    },
    scoringTiers: [
      { name: 'Perfect', color: '#10B981', criteria: { dispersionCm: 0.5 } },
      { name: 'Excellent', color: '#3B82F6', criteria: { dispersionCm: 1.0 } },
    ],
    instructions: ['Use maximum stability', 'All shots must be through essentially the same hole'],
    safetyNotes: [],
    tips: ['Tests rifle capability and shooter fundamentals'],
    isStandard: true,
    tags: ['diagnostic', 'precision', 'grouping'],
    category: 'precision_rifle',
    distances: [100],
    rounds: 5,
    positions: ['prone_supported'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SHOTGUN SPECIFIC DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pattern-check',
    name: 'Pattern Check',
    description: 'Check shotgun pattern spread',
    type: 'diagnostic',
    difficulty: 'beginner',
    recommendedCategories: ['shotgun'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 15,
      rounds: 3,
      position: 'standing',
      timeLimit: null,
      strings: 1,
    },
    passFailCriteria: null,
    scoringTiers: [],
    instructions: ['Fire at large paper target', 'Measure pattern spread', 'Note POI vs POA'],
    safetyNotes: [],
    tips: ['Different chokes = different patterns', 'Test your defensive load'],
    isStandard: true,
    tags: ['pattern', 'diagnostic', 'shotgun'],
    category: 'shotgun',
    distances: [15],
    rounds: 3,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: null,
    parTime: null,
  },

  {
    id: 'slug-accuracy',
    name: 'Slug Accuracy',
    description: 'Test slug accuracy and zero',
    type: 'accuracy',
    difficulty: 'intermediate',
    recommendedCategories: ['shotgun'],
    targetType: 'paper',
    primaryMetric: 'dispersion',
    secondaryMetrics: ['accuracy'],
    defaults: {
      distance: 50,
      rounds: 5,
      position: 'standing',
      timeLimit: 120,
      strings: 1,
    },
    passFailCriteria: {
      maxDispersionCm: 15.0,
    },
    scoringTiers: [
      { name: 'Excellent', color: '#10B981', criteria: { dispersionCm: 8.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { dispersionCm: 12.0 } },
      { name: 'Acceptable', color: '#F59E0B', criteria: { dispersionCm: 15.0 } },
    ],
    instructions: ['Use rifled slugs or sabot rounds', 'Fire at designated target', 'Measure group size'],
    safetyNotes: ['Know your load'],
    tips: ['Slugs are affected by barrel type'],
    isStandard: true,
    tags: ['accuracy', 'slugs', 'shotgun'],
    category: 'shotgun',
    distances: [50],
    rounds: 5,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: null,
    totalTimeLimit: 120,
    parTime: null,
  },

  {
    id: 'select-slug',
    name: 'Select Slug Drill',
    description: 'Transition from buckshot to slug',
    type: 'transition',
    difficulty: 'advanced',
    recommendedCategories: ['shotgun'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['hits', 'accuracy'],
    defaults: {
      distance: 25,
      rounds: 4,
      position: 'standing',
      timeLimit: 15,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 4,
      maxTimeSeconds: 15.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 8.0, accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 12.0, accuracyPct: 100 } },
    ],
    instructions: [
      'Fire 2 rounds buckshot at close target',
      'Perform select-slug load',
      'Engage distant target with 2 slugs',
    ],
    safetyNotes: ['Safe ammunition handling'],
    tips: ['Practice the select-slug technique dry'],
    isStandard: true,
    tags: ['transition', 'tactical', 'shotgun'],
    category: 'shotgun',
    distances: [25],
    rounds: 4,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 15,
    totalTimeLimit: 15,
    parTime: 10.0,
  },

  {
    id: 'shotgun-reload',
    name: 'Shotgun Reload',
    description: 'Fast shell loading technique',
    type: 'speed',
    difficulty: 'intermediate',
    recommendedCategories: ['shotgun'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['hits'],
    defaults: {
      distance: 10,
      rounds: 8,
      position: 'standing',
      timeLimit: 20,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 8,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 12.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 16.0 } },
    ],
    instructions: ['Fire 4 rounds', 'Reload 4 shells', 'Fire 4 more rounds'],
    safetyNotes: ['Safe shell handling'],
    tips: ['Consistent loading technique is key'],
    isStandard: true,
    tags: ['reload', 'speed', 'shotgun'],
    category: 'shotgun',
    distances: [10],
    rounds: 8,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 20,
    totalTimeLimit: 20,
    parTime: 15.0,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MOVEMENT DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'advance-shoot',
    name: 'Advance and Shoot',
    description: 'Move forward while engaging target',
    type: 'movement',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine', 'shotgun'],
    targetType: 'tactical',
    primaryMetric: 'hits',
    secondaryMetrics: ['time', 'accuracy'],
    defaults: {
      distance: 15,
      rounds: 6,
      position: 'standing',
      timeLimit: 10,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 4,
      maxTimeSeconds: 10.0,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 6.0, accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 8.0, accuracyPct: 80 } },
    ],
    instructions: ['Start at 15m', 'Advance toward target while firing', 'Stop at 5m mark'],
    safetyNotes: ['Safe movement with loaded weapon', 'Muzzle downrange'],
    tips: ['Shoot when both feet planted or in smooth gait'],
    isStandard: true,
    tags: ['movement', 'tactical'],
    category: 'pistol',
    distances: [15],
    rounds: 6,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 10,
    totalTimeLimit: 10,
    parTime: null,
  },

  {
    id: 'lateral-move',
    name: 'Lateral Movement',
    description: 'Move side to side while shooting',
    type: 'movement',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol', 'carbine'],
    targetType: 'tactical',
    primaryMetric: 'hits',
    secondaryMetrics: ['time', 'accuracy'],
    defaults: {
      distance: 10,
      rounds: 8,
      position: 'standing',
      timeLimit: 12,
      strings: 2,
    },
    passFailCriteria: {
      minHits: 6,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { accuracyPct: 75 } },
    ],
    instructions: ['Move laterally while engaging', '4 rounds moving left, 4 moving right'],
    safetyNotes: ['Watch footing', 'Keep muzzle pointed safely'],
    tips: ['Small steps maintain stability'],
    isStandard: true,
    tags: ['movement', 'lateral', 'tactical'],
    category: 'pistol',
    distances: [10],
    rounds: 8,
    positions: ['standing'],
    strings: 2,
    timeLimitPerString: 6,
    totalTimeLimit: 12,
    parTime: null,
  },

  {
    id: 'retreat-shoot',
    name: 'Retreat and Shoot',
    description: 'Move backward while engaging',
    type: 'movement',
    difficulty: 'advanced',
    recommendedCategories: ['pistol', 'carbine'],
    targetType: 'tactical',
    primaryMetric: 'hits',
    secondaryMetrics: ['time', 'accuracy'],
    defaults: {
      distance: 5,
      rounds: 6,
      position: 'standing',
      timeLimit: 10,
      strings: 1,
    },
    passFailCriteria: {
      minHits: 4,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 100, timeSeconds: 6.0 } },
      { name: 'Good', color: '#3B82F6', criteria: { accuracyPct: 75 } },
    ],
    instructions: ['Start at 5m', 'Move backward while engaging', 'End at 15m'],
    safetyNotes: ['Watch footing', 'Be aware of obstacles behind'],
    tips: ['Glance back periodically', 'Smaller steps = better stability'],
    isStandard: true,
    tags: ['movement', 'retreat', 'tactical'],
    category: 'pistol',
    distances: [5],
    rounds: 6,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 10,
    totalTimeLimit: 10,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // POSITION DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'position-change',
    name: 'Position Change',
    description: 'Fire from multiple positions',
    type: 'accuracy',
    difficulty: 'intermediate',
    recommendedCategories: ['rifle', 'precision_rifle', 'carbine'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: ['time', 'dispersion'],
    defaults: {
      distance: 100,
      rounds: 9,
      position: 'prone',
      timeLimit: 180,
      strings: 3,
    },
    passFailCriteria: {
      minAccuracyPct: 80,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 95, timeSeconds: 120 } },
      { name: 'Good', color: '#3B82F6', criteria: { accuracyPct: 85, timeSeconds: 150 } },
    ],
    instructions: ['3 rounds prone', '3 rounds seated', '3 rounds standing'],
    safetyNotes: ['Safe transitions between positions'],
    tips: ['Build stable positions quickly'],
    isStandard: true,
    tags: ['positions', 'accuracy', 'fundamentals'],
    category: 'rifle',
    distances: [100],
    rounds: 9,
    positions: ['prone', 'seated', 'standing'],
    strings: 3,
    timeLimitPerString: 60,
    totalTimeLimit: 180,
    parTime: null,
  },

  {
    id: 'barricade-drill',
    name: 'Barricade Drill',
    description: 'Shoot from cover positions',
    type: 'accuracy',
    difficulty: 'advanced',
    recommendedCategories: ['rifle', 'carbine', 'precision_rifle'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: ['time', 'dispersion'],
    defaults: {
      distance: 100,
      rounds: 8,
      position: 'standing',
      timeLimit: 120,
      strings: 4,
    },
    passFailCriteria: {
      minAccuracyPct: 75,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 95 } },
      { name: 'Good', color: '#3B82F6', criteria: { accuracyPct: 85 } },
    ],
    instructions: [
      '2 rounds strong-side standing',
      '2 rounds weak-side standing',
      '2 rounds strong-side kneeling',
      '2 rounds weak-side kneeling',
    ],
    safetyNotes: ['Maintain muzzle awareness around cover'],
    tips: ['Use the barricade for support'],
    isStandard: true,
    source: 'PRS',
    tags: ['barricade', 'positions', 'practical'],
    category: 'precision_rifle',
    distances: [100],
    rounds: 8,
    positions: ['standing', 'kneeling'],
    strings: 4,
    timeLimitPerString: 30,
    totalTimeLimit: 120,
    parTime: null,
  },

  {
    id: 'kneeling-drill',
    name: 'Kneeling Drill',
    description: 'Accuracy from kneeling position',
    type: 'accuracy',
    difficulty: 'beginner',
    recommendedCategories: ['rifle', 'carbine', 'pistol'],
    targetType: 'paper',
    primaryMetric: 'accuracy',
    secondaryMetrics: ['dispersion'],
    defaults: {
      distance: 25,
      rounds: 5,
      position: 'kneeling',
      timeLimit: 60,
      strings: 1,
    },
    passFailCriteria: {
      minAccuracyPct: 80,
    },
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { accuracyPct: 90 } },
    ],
    instructions: ['Assume kneeling position', 'Fire rounds at target'],
    safetyNotes: [],
    tips: ['Plant the elbow on the knee for stability'],
    isStandard: true,
    tags: ['positions', 'kneeling', 'fundamentals'],
    category: 'rifle',
    distances: [25],
    rounds: 5,
    positions: ['kneeling'],
    strings: 1,
    timeLimitPerString: 60,
    totalTimeLimit: 60,
    parTime: null,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMPETITION DRILLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'uspsa-classifier',
    name: 'USPSA Style Stage',
    description: 'Competition-style course of fire',
    type: 'competition',
    difficulty: 'advanced',
    recommendedCategories: ['pistol'],
    targetType: 'tactical',
    primaryMetric: 'score',
    secondaryMetrics: ['time', 'accuracy'],
    defaults: {
      distance: 15,
      rounds: 16,
      position: 'standing',
      timeLimit: 30,
      strings: 1,
    },
    passFailCriteria: null,
    scoringTiers: [
      { name: 'Grandmaster', color: '#10B981', criteria: { timeSeconds: 12.0, accuracyPct: 95 } },
      { name: 'Master', color: '#3B82F6', criteria: { timeSeconds: 15.0, accuracyPct: 90 } },
      { name: 'A Class', color: '#F59E0B', criteria: { timeSeconds: 20.0, accuracyPct: 85 } },
    ],
    instructions: ['Engage all targets as per stage design', 'Score = points minus time penalties'],
    safetyNotes: ['180 rule', 'Finger off trigger during movement'],
    tips: ['Plan your stage before starting'],
    isStandard: true,
    source: 'USPSA',
    tags: ['competition', 'uspsa', 'practical'],
    category: 'pistol',
    distances: [15],
    rounds: 16,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 30,
    totalTimeLimit: 30,
    parTime: null,
  },

  {
    id: 'prs-stage',
    name: 'PRS Style Stage',
    description: 'Precision rifle competition stage',
    type: 'competition',
    difficulty: 'advanced',
    recommendedCategories: ['precision_rifle', 'rifle'],
    targetType: 'steel',
    primaryMetric: 'hits',
    secondaryMetrics: ['time'],
    defaults: {
      distance: 300,
      rounds: 10,
      position: 'prone',
      timeLimit: 90,
      strings: 1,
    },
    passFailCriteria: null,
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { accuracyPct: 100 } },
      { name: 'Good', color: '#3B82F6', criteria: { accuracyPct: 80 } },
    ],
    instructions: ['Engage targets within time limit', 'Score = total hits'],
    safetyNotes: [],
    tips: ['Know your DOPE', 'Wind reading is critical'],
    isStandard: true,
    source: 'PRS',
    tags: ['competition', 'prs', 'precision'],
    category: 'precision_rifle',
    distances: [300],
    rounds: 10,
    positions: ['prone'],
    strings: 1,
    timeLimitPerString: 90,
    totalTimeLimit: 90,
    parTime: null,
  },

  {
    id: '3-gun-stage',
    name: '3-Gun Style Stage',
    description: 'Multi-gun competition stage',
    type: 'competition',
    difficulty: 'expert',
    recommendedCategories: ['carbine', 'pistol', 'shotgun'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['hits', 'accuracy'],
    defaults: {
      distance: 25,
      rounds: 20,
      position: 'standing',
      timeLimit: 60,
      strings: 1,
    },
    passFailCriteria: null,
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 30.0, accuracyPct: 95 } },
      { name: 'Good', color: '#3B82F6', criteria: { timeSeconds: 45.0, accuracyPct: 85 } },
    ],
    instructions: ['Engage targets with appropriate weapon', 'Manage transitions between platforms'],
    safetyNotes: ['Safe weapon transitions', 'Proper gun grounding'],
    tips: ['Smooth transitions win matches'],
    isStandard: true,
    source: '3-Gun',
    tags: ['competition', '3-gun', 'multi-gun'],
    category: 'carbine',
    distances: [25],
    rounds: 20,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 60,
    totalTimeLimit: 60,
    parTime: null,
  },

  {
    id: 'idpa-stage',
    name: 'IDPA Style Stage',
    description: 'Defensive pistol competition',
    type: 'competition',
    difficulty: 'intermediate',
    recommendedCategories: ['pistol'],
    targetType: 'tactical',
    primaryMetric: 'time',
    secondaryMetrics: ['accuracy', 'hits'],
    defaults: {
      distance: 10,
      rounds: 12,
      position: 'standing',
      timeLimit: 30,
      strings: 1,
    },
    passFailCriteria: null,
    scoringTiers: [
      { name: 'Expert', color: '#10B981', criteria: { timeSeconds: 15.0, accuracyPct: 100 } },
      { name: 'Sharpshooter', color: '#3B82F6', criteria: { timeSeconds: 20.0, accuracyPct: 90 } },
    ],
    instructions: ['Use cover when available', 'Engage threats in tactical priority'],
    safetyNotes: ['Use cover properly'],
    tips: ['Pie the corners', 'Reload behind cover'],
    isStandard: true,
    source: 'IDPA',
    tags: ['competition', 'idpa', 'defensive'],
    category: 'pistol',
    distances: [10],
    rounds: 12,
    positions: ['standing'],
    strings: 1,
    timeLimitPerString: 30,
    totalTimeLimit: 30,
    parTime: null,
  },
];

// ============================================================================
// LEGACY EXPORTS - For backwards compatibility
// ============================================================================

export const PRECISION_RIFLE_DRILLS = ALL_DRILLS.filter((d) => d.recommendedCategories.includes('precision_rifle'));

export const PISTOL_DRILLS = ALL_DRILLS.filter((d) => d.recommendedCategories.includes('pistol'));

export const CARBINE_DRILLS = ALL_DRILLS.filter((d) => d.recommendedCategories.includes('carbine'));

export const SHOTGUN_DRILLS = ALL_DRILLS.filter((d) => d.recommendedCategories.includes('shotgun'));

export const RIFLE_DRILLS = ALL_DRILLS.filter((d) => d.recommendedCategories.includes('rifle'));

// ============================================================================
// ALL DRILLS BY CATEGORY - Now uses recommendedCategories
// ============================================================================

export const DRILLS_BY_CATEGORY: Record<WeaponCategory, CategoryDrill[]> = {
  precision_rifle: ALL_DRILLS.filter((d) => d.recommendedCategories.includes('precision_rifle')),
  rifle: ALL_DRILLS.filter((d) => d.recommendedCategories.includes('rifle')),
  carbine: ALL_DRILLS.filter((d) => d.recommendedCategories.includes('carbine')),
  // SMGs share most practical drills with carbines/pistols (close-range, high cadence)
  smg: ALL_DRILLS.filter(
    (d) => d.recommendedCategories.includes('carbine') || d.recommendedCategories.includes('pistol')
  ),
  pistol: ALL_DRILLS.filter((d) => d.recommendedCategories.includes('pistol')),
  shotgun: ALL_DRILLS.filter((d) => d.recommendedCategories.includes('shotgun')),
  // "Other" = allow full library (non-standard platforms)
  other: ALL_DRILLS,
  any: ALL_DRILLS, // Any category can use all drills
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
 * Get drills recommended for a specific category
 */
export function getDrillsForCategory(category: WeaponCategory): CategoryDrill[] {
  if (category === 'any') return ALL_DRILLS;
  return ALL_DRILLS.filter((d) => d.recommendedCategories.includes(category));
}

/**
 * Get drills by type within a category
 */
export function getDrillsByType(category: WeaponCategory, type: DrillType): CategoryDrill[] {
  return getCategoryDrills(category).filter((d) => d.type === type);
}

/**
 * Get drills by difficulty
 */
export function getDrillsByDifficulty(category: WeaponCategory, difficulty: DrillDifficulty): CategoryDrill[] {
  return getCategoryDrills(category).filter((d) => d.difficulty === difficulty);
}

/**
 * Get a specific drill by ID
 */
export function getDrillById(drillId: string): CategoryDrill | null {
  return ALL_DRILLS.find((d) => d.id === drillId) || null;
}

/**
 * Group drills by type for display
 */
export function groupDrillsByType(category: WeaponCategory): Record<DrillType, CategoryDrill[]> {
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
