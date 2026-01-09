/**
 * Drill Constants
 * 
 * Centralized constants for drill-related values.
 * Import these instead of using hardcoded strings.
 */

// =============================================================================
// DRILL GOALS
// =============================================================================

/**
 * DrillGoal values - Primary classification for drills/sessions
 * 
 * - 'grouping': Measure shot consistency/dispersion (scan-only, no hit %)
 * - 'engagement': Measure accuracy/hits (scan OR manual, tracks hit %)
 */
export const DRILL_GOAL = {
  GROUPING: 'grouping',
  ENGAGEMENT: 'engagement',
} as const;

export type DrillGoal = (typeof DRILL_GOAL)[keyof typeof DRILL_GOAL];

/** Array of all valid drill goals (for iteration/validation) */
export const DRILL_GOALS: DrillGoal[] = [DRILL_GOAL.GROUPING, DRILL_GOAL.ENGAGEMENT];

/** Helper to check if a value is a valid drill goal */
export function isValidDrillGoal(value: unknown): value is DrillGoal {
  return typeof value === 'string' && DRILL_GOALS.includes(value as DrillGoal);
}

/** Helper to check if drill goal is grouping */
export function isGroupingGoal(goal: string | null | undefined): boolean {
  return goal === DRILL_GOAL.GROUPING;
}

/** Helper to check if drill goal is engagement */
export function isEngagementGoal(goal: string | null | undefined): boolean {
  return goal === DRILL_GOAL.ENGAGEMENT;
}

// =============================================================================
// TARGET TYPES
// =============================================================================

/**
 * TargetType values - Physical target classification
 * 
 * - 'paper': Paper targets (scanned for grouping/accuracy analysis)
 * - 'tactical': Steel/reactive targets (manual hit entry)
 */
export const TARGET_TYPE = {
  PAPER: 'paper',
  TACTICAL: 'tactical',
} as const;

export type TargetType = (typeof TARGET_TYPE)[keyof typeof TARGET_TYPE];

/** Array of all valid target types */
export const TARGET_TYPES: TargetType[] = [TARGET_TYPE.PAPER, TARGET_TYPE.TACTICAL];

/** Helper to check if target type is paper */
export function isPaperTarget(type: string | null | undefined): boolean {
  return type === TARGET_TYPE.PAPER;
}

/** Helper to check if target type is tactical */
export function isTacticalTarget(type: string | null | undefined): boolean {
  return type === TARGET_TYPE.TACTICAL;
}

// =============================================================================
// PAPER TYPES
// =============================================================================

/**
 * PaperType values - Classification for paper target results
 * 
 * - 'grouping': Measuring shot consistency/dispersion
 * - 'achievement': Counting hits (legacy name for engagement)
 * - 'engagement': Counting hits (preferred name)
 */
export const PAPER_TYPE = {
  GROUPING: 'grouping',
  ACHIEVEMENT: 'achievement',
  ENGAGEMENT: 'engagement',
} as const;

export type PaperType = (typeof PAPER_TYPE)[keyof typeof PAPER_TYPE];

/** Array of all valid paper types */
export const PAPER_TYPES: PaperType[] = [
  PAPER_TYPE.GROUPING,
  PAPER_TYPE.ACHIEVEMENT,
  PAPER_TYPE.ENGAGEMENT,
];

/** Helper to check if paper type is grouping */
export function isGroupingPaper(type: string | null | undefined): boolean {
  return type === PAPER_TYPE.GROUPING;
}

/** Helper to check if paper type is engagement/achievement */
export function isEngagementPaper(type: string | null | undefined): boolean {
  return type === PAPER_TYPE.ACHIEVEMENT || type === PAPER_TYPE.ENGAGEMENT;
}

// =============================================================================
// INPUT METHODS
// =============================================================================

/**
 * InputMethod values - How results are entered
 */
export const INPUT_METHOD = {
  SCAN: 'scan',
  MANUAL: 'manual',
  WATCH: 'watch',
} as const;

export type InputMethod = (typeof INPUT_METHOD)[keyof typeof INPUT_METHOD];

/** Array of all valid input methods */
export const INPUT_METHODS: InputMethod[] = [
  INPUT_METHOD.SCAN,
  INPUT_METHOD.MANUAL,
  INPUT_METHOD.WATCH,
];

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DRILL_DEFAULTS = {
  DISTANCE_M: 25,
  ROUNDS_PER_SHOOTER: 5,
  STRINGS_COUNT: 1,
  TARGET_COUNT: 1,
} as const;
