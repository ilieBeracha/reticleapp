/**
 * DRILL TYPES - Package-based drill system
 *
 * Drills are organized into typed packages that define:
 * - Structure & behavior
 * - Required/optional parameters
 * - Scoring model
 * - Input method
 */

// ============================================================================
// DRILL TYPE IDS
// ============================================================================

export type DrillTypeId = 'zeroing' | 'grouping' | 'timed' | 'qualification';

// ============================================================================
// SCORING MODELS
// ============================================================================

export type ScoringModel =
  | 'dispersion' // Group size only (MOA, inches)
  | 'hits' // Hit count / accuracy %
  | 'hits_time' // Hits + time penalty
  | 'score' // Point-based scoring
  | 'pass_fail'; // Binary pass/fail

// ============================================================================
// INPUT METHODS
// ============================================================================

export type InputMethod = 'scan' | 'manual' | 'both';

// ============================================================================
// PARAMETER CONSTRAINTS
// ============================================================================

export interface ParamConstraint {
  type: 'range' | 'options' | 'boolean';
  min?: number;
  max?: number;
  options?: (number | string)[];
  unit?: string;
  locked?: boolean; // Can't be changed at runtime
}

// ============================================================================
// DRILL TYPE DEFINITION
// ============================================================================

export interface DrillType {
  id: DrillTypeId;
  name: string;
  description: string;
  icon: string;

  // Parameter schema
  requiredParams: string[];
  optionalParams: string[];
  paramDefaults: Record<string, number | string | boolean | null>;
  paramConstraints: Record<string, ParamConstraint>;

  // Behavior
  scoringModel: ScoringModel;
  inputMethod: InputMethod;

  // UI hints
  color: string;
  configSections: ConfigSection[];
}

export interface ConfigSection {
  id: string;
  title: string;
  params: string[];
}

// ============================================================================
// DRILL TEMPLATE (Library + Custom)
// ============================================================================

export type TemplateSource = 'library' | 'team' | 'personal';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface DrillTemplate {
  id: string;
  drillType: DrillTypeId;

  // Ownership
  source: TemplateSource;
  teamId?: string;
  createdBy?: string;

  // Content
  name: string;
  description: string;
  goal: string; // Training goal, e.g. "Improve trigger control"

  // Configuration
  defaults: Record<string, number | string | boolean | null>;
  constraints?: TemplateConstraints;

  // Metadata
  difficulty: DifficultyLevel;
  tags: string[];
}

export interface TemplateConstraints {
  lockedParams?: string[]; // Params that can't be changed
  allowedDistances?: number[];
  allowedPositions?: string[];
  minShots?: number;
  maxShots?: number;
  minTime?: number;
  maxTime?: number;
}

// ============================================================================
// DRILL INSTANCE (Runtime configuration)
// ============================================================================

export interface DrillInstance {
  templateId: string;
  drillType: DrillTypeId;
  params: Record<string, number | string | boolean | null>;
}

// ============================================================================
// CORE DRILL TYPES - DEFINITIONS
// ============================================================================

export const DRILL_TYPES: Record<DrillTypeId, DrillType> = {
  // ─────────────────────────────────────────────────────────────────────────
  // ZEROING - Confirm/adjust rifle zero
  // ─────────────────────────────────────────────────────────────────────────
  zeroing: {
    id: 'zeroing',
    name: 'Zeroing',
    description: 'Confirm or adjust rifle zero at distance',
    icon: 'crosshair',
    color: '#10B981', // Green

    requiredParams: ['distance', 'shots'],
    optionalParams: ['position'],
    paramDefaults: {
      distance: 100,
      shots: 3,
      position: 'prone',
    },
    paramConstraints: {
      distance: {
        type: 'options',
        options: [25, 50, 100, 200, 300],
        unit: 'm',
      },
      shots: {
        type: 'options',
        options: [1, 3, 5],
      },
      position: {
        type: 'options',
        options: ['prone', 'bench', 'supported'],
      },
    },

    scoringModel: 'dispersion',
    inputMethod: 'scan',

    configSections: [
      { id: 'basic', title: 'Basic Setup', params: ['distance', 'shots'] },
      { id: 'position', title: 'Position', params: ['position'] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GROUPING - Measure precision/dispersion
  // ─────────────────────────────────────────────────────────────────────────
  grouping: {
    id: 'grouping',
    name: 'Grouping',
    description: 'Measure shot group size and precision',
    icon: 'target',
    color: '#3B82F6', // Blue

    requiredParams: ['distance', 'shots'],
    optionalParams: ['position', 'targetSize', 'strings'],
    paramDefaults: {
      distance: 100,
      shots: 5,
      position: 'prone',
      targetSize: 'standard',
      strings: 1,
    },
    paramConstraints: {
      distance: {
        type: 'options',
        options: [25, 50, 100, 200, 300, 500],
        unit: 'm',
      },
      shots: {
        type: 'options',
        options: [3, 5, 10, 20],
      },
      position: {
        type: 'options',
        options: ['prone', 'kneeling', 'standing', 'seated', 'supported'],
      },
      targetSize: {
        type: 'options',
        options: ['small', 'standard', 'large'],
      },
      strings: {
        type: 'options',
        options: [1, 2, 3, 5],
      },
    },

    scoringModel: 'dispersion',
    inputMethod: 'scan',

    configSections: [
      { id: 'basic', title: 'Basic Setup', params: ['distance', 'shots', 'strings'] },
      { id: 'position', title: 'Position', params: ['position'] },
      { id: 'target', title: 'Target', params: ['targetSize'] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIMED - Speed/stress drills with time component
  // ─────────────────────────────────────────────────────────────────────────
  timed: {
    id: 'timed',
    name: 'Timed',
    description: 'Speed drills with time limits or par times',
    icon: 'clock',
    color: '#F59E0B', // Amber

    requiredParams: ['distance', 'shots'],
    optionalParams: ['parTime', 'timeLimit', 'targetCount', 'strings'],
    paramDefaults: {
      distance: 7,
      shots: 6,
      parTime: null,
      timeLimit: null,
      targetCount: 1,
      strings: 1,
    },
    paramConstraints: {
      distance: {
        type: 'options',
        options: [3, 5, 7, 10, 15, 25],
        unit: 'm',
      },
      shots: {
        type: 'range',
        min: 1,
        max: 30,
      },
      parTime: {
        type: 'range',
        min: 1,
        max: 60,
        unit: 's',
      },
      timeLimit: {
        type: 'range',
        min: 5,
        max: 300,
        unit: 's',
      },
      targetCount: {
        type: 'options',
        options: [1, 2, 3, 4, 6],
      },
      strings: {
        type: 'options',
        options: [1, 2, 3, 5, 10],
      },
    },

    scoringModel: 'hits_time',
    inputMethod: 'manual',

    configSections: [
      { id: 'basic', title: 'Basic Setup', params: ['distance', 'shots', 'strings'] },
      { id: 'timing', title: 'Timing', params: ['parTime', 'timeLimit'] },
      { id: 'targets', title: 'Targets', params: ['targetCount'] },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUALIFICATION - Pass/fail tests
  // ─────────────────────────────────────────────────────────────────────────
  qualification: {
    id: 'qualification',
    name: 'Qualification',
    description: 'Scored qualification or assessment',
    icon: 'award',
    color: '#8B5CF6', // Purple

    requiredParams: ['distance', 'shots', 'minScore'],
    optionalParams: ['timeLimit', 'position', 'strings'],
    paramDefaults: {
      distance: 25,
      shots: 20,
      minScore: 80,
      timeLimit: null,
      position: null,
      strings: 1,
    },
    paramConstraints: {
      distance: {
        type: 'options',
        options: [7, 15, 25, 50, 100],
        unit: 'm',
      },
      shots: {
        type: 'options',
        options: [10, 20, 30, 40, 50],
      },
      minScore: {
        type: 'range',
        min: 50,
        max: 100,
        unit: '%',
      },
      timeLimit: {
        type: 'range',
        min: 30,
        max: 600,
        unit: 's',
      },
      position: {
        type: 'options',
        options: ['prone', 'kneeling', 'standing', 'mixed'],
      },
      strings: {
        type: 'options',
        options: [1, 2, 3, 4, 5],
      },
    },

    scoringModel: 'pass_fail',
    inputMethod: 'both',

    configSections: [
      { id: 'basic', title: 'Basic Setup', params: ['distance', 'shots', 'strings'] },
      { id: 'scoring', title: 'Scoring', params: ['minScore'] },
      { id: 'constraints', title: 'Constraints', params: ['timeLimit', 'position'] },
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get drill type by ID
 */
export function getDrillType(id: DrillTypeId): DrillType {
  return DRILL_TYPES[id];
}

/**
 * Get all drill types as array
 */
export function getAllDrillTypes(): DrillType[] {
  return Object.values(DRILL_TYPES);
}

/**
 * Check if a param is required for a drill type
 */
export function isParamRequired(drillType: DrillTypeId, param: string): boolean {
  return DRILL_TYPES[drillType].requiredParams.includes(param);
}

/**
 * Get default params for a drill type
 */
export function getDefaultParams(drillType: DrillTypeId): Record<string, any> {
  return { ...DRILL_TYPES[drillType].paramDefaults };
}

/**
 * Validate params against drill type constraints
 */
export function validateParams(
  drillType: DrillTypeId,
  params: Record<string, any>
): { valid: boolean; errors: string[] } {
  const type = DRILL_TYPES[drillType];
  const errors: string[] = [];

  // Check required params
  for (const param of type.requiredParams) {
    if (params[param] === undefined || params[param] === null) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Validate constraints
  for (const [param, value] of Object.entries(params)) {
    const constraint = type.paramConstraints[param];
    if (!constraint) continue;

    if (constraint.type === 'range') {
      if (typeof value === 'number') {
        if (constraint.min !== undefined && value < constraint.min) {
          errors.push(`${param} must be at least ${constraint.min}`);
        }
        if (constraint.max !== undefined && value > constraint.max) {
          errors.push(`${param} must be at most ${constraint.max}`);
        }
      }
    } else if (constraint.type === 'options') {
      if (constraint.options && !constraint.options.includes(value as any)) {
        errors.push(`${param} must be one of: ${constraint.options.join(', ')}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
