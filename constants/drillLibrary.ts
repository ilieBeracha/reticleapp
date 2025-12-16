/**
 * DRILL LIBRARY - Prebuilt drill templates
 *
 * Read-only library of curated drill packages.
 * Commanders can duplicate to create custom versions.
 *
 * 12 Templates across 4 types:
 * - Zeroing (2): Zero Check, Cold Bore
 * - Grouping (3): 5-Shot, 10-Shot, 3-Position
 * - Timed (4): Bill Drill, El Presidente, Failure Drill, Par Time
 * - Qualification (3): Basic, Timed, Advanced
 */

import type { DrillTemplate } from '@/types/drillTypes';

// ============================================================================
// ZEROING TEMPLATES (2)
// ============================================================================

const ZEROING_TEMPLATES: DrillTemplate[] = [
  {
    id: 'lib_zeroing_100m',
    drillType: 'zeroing',
    source: 'library',
    name: '100m Zero Check',
    description: 'Standard 3-shot zero confirmation at 100 meters. Use to verify zero before training.',
    goal: 'Confirm rifle zero is accurate',
    defaults: {
      distance: 100,
      shots: 3,
      position: 'prone',
    },
    constraints: {
      lockedParams: ['shots'],
    },
    difficulty: 'beginner',
    tags: ['zero', 'confirmation', 'precision'],
  },
  {
    id: 'lib_zeroing_cold_bore',
    drillType: 'zeroing',
    source: 'library',
    name: 'Cold Bore',
    description: 'Single shot from a cold barrel. Tests first-round accuracy and shooter readiness.',
    goal: 'Verify cold bore point of impact',
    defaults: {
      distance: 100,
      shots: 1,
      position: 'prone',
    },
    constraints: {
      lockedParams: ['shots'],
      allowedDistances: [50, 100, 200, 300],
    },
    difficulty: 'intermediate',
    tags: ['cold bore', 'precision', 'first shot'],
  },
];

// ============================================================================
// GROUPING TEMPLATES (3)
// ============================================================================

const GROUPING_TEMPLATES: DrillTemplate[] = [
  {
    id: 'lib_grouping_5shot',
    drillType: 'grouping',
    source: 'library',
    name: '5-Shot Group',
    description: 'Standard 5-shot group to measure rifle/shooter precision. Industry standard test.',
    goal: 'Measure baseline precision',
    defaults: {
      distance: 100,
      shots: 5,
      position: 'prone',
      targetSize: 'standard',
      strings: 1,
    },
    constraints: {
      lockedParams: ['shots'],
    },
    difficulty: 'beginner',
    tags: ['precision', 'baseline', 'standard'],
  },
  {
    id: 'lib_grouping_10shot',
    drillType: 'grouping',
    source: 'library',
    name: '10-Shot Group',
    description: 'Extended 10-shot group for more statistically significant precision data.',
    goal: 'Detailed precision analysis',
    defaults: {
      distance: 100,
      shots: 10,
      position: 'prone',
      targetSize: 'standard',
      strings: 1,
    },
    constraints: {
      lockedParams: ['shots'],
    },
    difficulty: 'intermediate',
    tags: ['precision', 'extended', 'analysis'],
  },
  {
    id: 'lib_grouping_positional',
    drillType: 'grouping',
    source: 'library',
    name: '3-Position Groups',
    description: 'Shoot groups from prone, kneeling, and standing. Tests positional consistency.',
    goal: 'Compare precision across positions',
    defaults: {
      distance: 100,
      shots: 5,
      position: 'prone', // First position
      targetSize: 'standard',
      strings: 3, // One per position
    },
    constraints: {
      lockedParams: ['shots', 'strings'],
    },
    difficulty: 'advanced',
    tags: ['positional', 'comparison', 'multi-position'],
  },
];

// ============================================================================
// TIMED TEMPLATES (4)
// ============================================================================

const TIMED_TEMPLATES: DrillTemplate[] = [
  {
    id: 'lib_timed_bill',
    drillType: 'timed',
    source: 'library',
    name: 'Bill Drill',
    description: 'Classic speed drill: 6 shots on 1 target as fast as possible. Par time 2 seconds.',
    goal: 'Develop rapid target engagement',
    defaults: {
      distance: 7,
      shots: 6,
      parTime: 2,
      timeLimit: null,
      targetCount: 1,
      strings: 1,
    },
    constraints: {
      lockedParams: ['shots', 'targetCount'],
      allowedDistances: [5, 7, 10],
    },
    difficulty: 'intermediate',
    tags: ['speed', 'classic', 'bill drill'],
  },
  {
    id: 'lib_timed_presidente',
    drillType: 'timed',
    source: 'library',
    name: 'El Presidente',
    description: 'Start facing away. Turn, engage 3 targets with 2 shots each, reload, repeat. Classic competition drill.',
    goal: 'Master transitions and reloads under time',
    defaults: {
      distance: 10,
      shots: 12, // 2 per target x 3 targets x 2 strings
      parTime: 10,
      timeLimit: null,
      targetCount: 3,
      strings: 2,
    },
    constraints: {
      lockedParams: ['shots', 'targetCount', 'strings'],
    },
    difficulty: 'advanced',
    tags: ['competition', 'transitions', 'reload'],
  },
  {
    id: 'lib_timed_failure',
    drillType: 'timed',
    source: 'library',
    name: 'Failure Drill',
    description: 'Mozambique drill: 2 shots to body, 1 to head. Tests shot placement under speed.',
    goal: 'Accurate shot placement under time pressure',
    defaults: {
      distance: 7,
      shots: 3,
      parTime: 2,
      timeLimit: null,
      targetCount: 1,
      strings: 1,
    },
    constraints: {
      lockedParams: ['shots', 'targetCount'],
      allowedDistances: [3, 5, 7, 10],
    },
    difficulty: 'intermediate',
    tags: ['mozambique', 'failure drill', 'headshot'],
  },
  {
    id: 'lib_timed_par',
    drillType: 'timed',
    source: 'library',
    name: 'Par Time Challenge',
    description: 'Configurable par time drill. Set your own shots and par time to challenge yourself.',
    goal: 'Beat your par time consistently',
    defaults: {
      distance: 7,
      shots: 5,
      parTime: 3,
      timeLimit: null,
      targetCount: 1,
      strings: 5,
    },
    constraints: {
      // Fully configurable
    },
    difficulty: 'beginner',
    tags: ['par time', 'configurable', 'practice'],
  },
];

// ============================================================================
// QUALIFICATION TEMPLATES (3)
// ============================================================================

const QUALIFICATION_TEMPLATES: DrillTemplate[] = [
  {
    id: 'lib_qual_basic',
    drillType: 'qualification',
    source: 'library',
    name: 'Basic Marksmanship Qual',
    description: 'Standard 20-round qualification. 80% minimum to pass. No time limit.',
    goal: 'Verify basic marksmanship proficiency',
    defaults: {
      distance: 25,
      shots: 20,
      minScore: 80,
      timeLimit: null,
      position: null,
      strings: 1,
    },
    constraints: {
      lockedParams: ['shots', 'minScore'],
    },
    difficulty: 'beginner',
    tags: ['qualification', 'basic', 'marksmanship'],
  },
  {
    id: 'lib_qual_timed',
    drillType: 'qualification',
    source: 'library',
    name: 'Timed Qualification',
    description: '30-round timed qualification. 80% in 5 minutes. Tests speed and accuracy.',
    goal: 'Qualify under time pressure',
    defaults: {
      distance: 25,
      shots: 30,
      minScore: 80,
      timeLimit: 300, // 5 minutes
      position: null,
      strings: 1,
    },
    constraints: {
      lockedParams: ['shots', 'minScore', 'timeLimit'],
    },
    difficulty: 'intermediate',
    tags: ['qualification', 'timed', 'speed'],
  },
  {
    id: 'lib_qual_advanced',
    drillType: 'qualification',
    source: 'library',
    name: 'Advanced Qualification',
    description: '40-round multi-stage qualification. Multiple distances and positions. 85% to pass.',
    goal: 'Demonstrate advanced marksmanship',
    defaults: {
      distance: 50,
      shots: 40,
      minScore: 85,
      timeLimit: 600, // 10 minutes
      position: 'mixed',
      strings: 4,
    },
    constraints: {
      lockedParams: ['shots', 'minScore', 'strings'],
      allowedDistances: [25, 50, 100],
    },
    difficulty: 'advanced',
    tags: ['qualification', 'advanced', 'multi-stage'],
  },
];

// ============================================================================
// COMBINED LIBRARY
// ============================================================================

export const DRILL_LIBRARY: DrillTemplate[] = [
  ...ZEROING_TEMPLATES,
  ...GROUPING_TEMPLATES,
  ...TIMED_TEMPLATES,
  ...QUALIFICATION_TEMPLATES,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all library templates
 */
export function getLibraryTemplates(): DrillTemplate[] {
  return DRILL_LIBRARY;
}

/**
 * Get library templates by type
 */
export function getLibraryTemplatesByType(drillType: string): DrillTemplate[] {
  return DRILL_LIBRARY.filter((t) => t.drillType === drillType);
}

/**
 * Get a library template by ID
 */
export function getLibraryTemplate(id: string): DrillTemplate | undefined {
  return DRILL_LIBRARY.find((t) => t.id === id);
}

/**
 * Duplicate a library template for customization
 */
export function duplicateTemplate(
  template: DrillTemplate,
  options: {
    name: string;
    source: 'team' | 'personal';
    teamId?: string;
    createdBy?: string;
  }
): Omit<DrillTemplate, 'id'> {
  return {
    ...template,
    ...options,
    constraints: undefined, // Remove library constraints
  };
}

/**
 * Get templates grouped by type
 */
export function getTemplatesGroupedByType(): Record<string, DrillTemplate[]> {
  return {
    zeroing: ZEROING_TEMPLATES,
    grouping: GROUPING_TEMPLATES,
    timed: TIMED_TEMPLATES,
    qualification: QUALIFICATION_TEMPLATES,
  };
}
