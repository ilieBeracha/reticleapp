/**
 * Standard Drill Templates
 * 
 * Universal templates available for quick selection in training creation.
 * These are not saved to database - they're inline configurations.
 */

import type { DrillGoal, ShootingPosition, TargetType } from '@/types/workspace';

export interface StandardDrillTemplate {
  id: string;
  name: string;
  description: string;
  drill_goal: DrillGoal;
  target_type: TargetType;
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds: number | null;
  strings_count: number;
  position?: ShootingPosition;
  category: 'zeroing' | 'grouping' | 'speed' | 'accuracy';
}

export const STANDARD_DRILL_TEMPLATES: StandardDrillTemplate[] = [
  // ============================================================================
  // ZEROING
  // ============================================================================
  {
    id: 'zeroing-100',
    name: 'Zeroing 100m',
    description: 'Confirm or adjust zero at 100m',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 100,
    rounds_per_shooter: 3,
    time_limit_seconds: null,
    strings_count: 1,
    position: 'prone',
    category: 'zeroing',
  },
  {
    id: 'zeroing-50',
    name: 'Zeroing 50m',
    description: 'Quick zero check at 50m',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 50,
    rounds_per_shooter: 3,
    time_limit_seconds: null,
    strings_count: 1,
    position: 'prone',
    category: 'zeroing',
  },
  {
    id: 'zeroing-200',
    name: 'Zeroing 200m',
    description: 'Long range zero confirmation',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 200,
    rounds_per_shooter: 3,
    time_limit_seconds: null,
    strings_count: 1,
    position: 'prone',
    category: 'zeroing',
  },

  // ============================================================================
  // GROUPING
  // ============================================================================
  {
    id: 'grouping-50',
    name: 'Grouping 50m',
    description: 'Precision grouping at 50m',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 50,
    rounds_per_shooter: 5,
    time_limit_seconds: null,
    strings_count: 1,
    category: 'grouping',
  },
  {
    id: 'grouping-100',
    name: 'Grouping 100m',
    description: 'Standard grouping at 100m',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 100,
    rounds_per_shooter: 5,
    time_limit_seconds: null,
    strings_count: 1,
    category: 'grouping',
  },
  {
    id: 'grouping-200',
    name: 'Grouping 200m',
    description: 'Long range grouping',
    drill_goal: 'grouping',
    target_type: 'paper',
    distance_m: 200,
    rounds_per_shooter: 5,
    time_limit_seconds: null,
    strings_count: 1,
    position: 'prone',
    category: 'grouping',
  },

  // ============================================================================
  // SPEED / ENGAGEMENT
  // ============================================================================
  {
    id: 'speed-7',
    name: 'Speed Drill 7m',
    description: 'Close range engagement',
    drill_goal: 'engagement',
    target_type: 'tactical',
    distance_m: 7,
    rounds_per_shooter: 10,
    time_limit_seconds: 30,
    strings_count: 1,
    position: 'standing',
    category: 'speed',
  },
  {
    id: 'speed-15',
    name: 'Speed Drill 15m',
    description: 'Medium range timed engagement',
    drill_goal: 'engagement',
    target_type: 'tactical',
    distance_m: 15,
    rounds_per_shooter: 10,
    time_limit_seconds: 45,
    strings_count: 1,
    category: 'speed',
  },
  {
    id: 'speed-25',
    name: 'Speed Drill 25m',
    description: 'Extended range timed',
    drill_goal: 'engagement',
    target_type: 'tactical',
    distance_m: 25,
    rounds_per_shooter: 10,
    time_limit_seconds: 60,
    strings_count: 1,
    category: 'speed',
  },

  // ============================================================================
  // ACCURACY / MARKSMANSHIP
  // ============================================================================
  {
    id: 'accuracy-50',
    name: 'Accuracy 50m',
    description: 'Precision accuracy drill',
    drill_goal: 'engagement',
    target_type: 'paper',
    distance_m: 50,
    rounds_per_shooter: 10,
    time_limit_seconds: 120,
    strings_count: 1,
    category: 'accuracy',
  },
  {
    id: 'accuracy-100',
    name: 'Accuracy 100m',
    description: 'Standard accuracy test',
    drill_goal: 'engagement',
    target_type: 'paper',
    distance_m: 100,
    rounds_per_shooter: 10,
    time_limit_seconds: 180,
    strings_count: 1,
    category: 'accuracy',
  },
];

/**
 * Get standard templates by category
 */
export function getTemplatesByCategory(category: StandardDrillTemplate['category']): StandardDrillTemplate[] {
  return STANDARD_DRILL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get a specific template by ID
 */
export function getTemplateById(id: string): StandardDrillTemplate | undefined {
  return STANDARD_DRILL_TEMPLATES.find(t => t.id === id);
}
