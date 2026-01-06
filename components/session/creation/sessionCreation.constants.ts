/**
 * Session Creation Constants
 * 
 * Purpose options, presets, and UI configuration
 */

import type { DrillGoal } from '@/types/workspace';
import type { Position, PurposeOption, SessionPurpose } from './sessionCreation.types';

// ============================================================================
// PURPOSE OPTIONS - "What am I going to do now?"
// ============================================================================

export const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    id: 'grouping',
    label: 'Grouping',
    description: 'Measure shot dispersion & consistency',
    icon: 'crosshair',
    color: '#3B82F6', // Blue
    defaults: {
      targetType: 'paper',
      distance: 100,
      shotsPlanned: 5,
      position: 'prone',
    },
  },
  {
    id: 'engagement',
    label: 'Hitting Targets',
    description: 'Zone-based scoring & hit tracking',
    icon: 'trophy',
    color: '#F59E0B', // Amber
    defaults: {
      targetType: 'tactical',
      distance: 25,
      shotsPlanned: 10,
      position: 'standing',
    },
  },
  
];

// ============================================================================
// DISTANCE PRESETS BY PURPOSE
// ============================================================================

export const DISTANCE_PRESETS: Record<SessionPurpose, number[]> = {
  grouping: [25, 50, 100, 200, 300],
  engagement: [7, 15, 25, 50, 100],
};

// ============================================================================
// SHOTS PRESETS BY PURPOSE
// ============================================================================

export const SHOTS_PRESETS: Record<SessionPurpose, number[]> = {
  grouping: [3, 5, 10, 20],
  engagement: [5, 10, 20, 30],
};

// ============================================================================
// POSITION OPTIONS
// ============================================================================

export const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'standing', label: 'Standing' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'prone', label: 'Prone' },
  { value: 'seated', label: 'Seated' },
];

// ============================================================================
// TIME LIMIT PRESETS (seconds)
// ============================================================================

export const TIME_PRESETS: number[] = [30, 60, 90, 120];

// ============================================================================
// UI COPY - Human-friendly questions (from mental model)
// ============================================================================

export const STEP_COPY = {
  intent: {
    headline: 'What am I going to do now?',
    subtext: 'Choose the purpose of this round. This helps us understand what matters most.',
  },
  context: {
    headline: 'Under what conditions?',
    subtext: 'Set the main parameters for this round. You can change them later if needed.',
  },
  measurement: {
    headline: 'How will this be measured?',
    subtext: 'Choose how shots, time, and physical data are collected.',
  },
  ready: {
    headline: 'Ready to start',
    subtext: 'Review your setup and begin when ready.',
  },
} as const;

// ============================================================================
// DRILL SOURCE LABELS
// ============================================================================

export const DRILL_SOURCE_LABELS = {
  quick: 'Quick Start',
  preset: 'My Saved Drills',
  library: 'Drill Library',
  custom: 'Configure Manually',
} as const;

// ============================================================================
// PURPOSE TO DRILL_GOAL MAPPING
// ============================================================================

export function purposeToDrillGoal(purpose: SessionPurpose): DrillGoal {
  switch (purpose) {
    case 'grouping':
      return 'grouping';
    case 'engagement':
    default:
      return 'engagement';
  }
}

// ============================================================================
// GET PURPOSE OPTION BY ID
// ============================================================================

export function getPurposeOption(id: SessionPurpose): PurposeOption | undefined {
  return PURPOSE_OPTIONS.find((p) => p.id === id);
}

