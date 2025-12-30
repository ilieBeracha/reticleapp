/**
 * Session Creation Constants
 * 
 * Purpose options, presets, and UI configuration
 */

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
    id: 'achievement',
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
  {
    id: 'zeroing',
    label: 'Zeroing',
    description: 'Confirm or adjust rifle zero',
    icon: 'focus',
    color: '#10B981', // Green
    defaults: {
      targetType: 'paper',
      distance: 100,
      shotsPlanned: 3,
      position: 'prone',
    },
  },
  {
    id: 'physical',
    label: 'Physical Drill',
    description: 'Stress & pulse-based training',
    icon: 'heart-pulse',
    color: '#EF4444', // Red
    defaults: {
      targetType: 'tactical',
      distance: 15,
      shotsPlanned: 10,
      position: 'standing',
      timeLimit: 60,
    },
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Configure everything manually',
    icon: 'settings-2',
    color: '#8B5CF6', // Purple
    defaults: {},
  },
];

// ============================================================================
// DISTANCE PRESETS BY PURPOSE
// ============================================================================

export const DISTANCE_PRESETS: Record<SessionPurpose, number[]> = {
  grouping: [25, 50, 100, 200, 300],
  achievement: [7, 15, 25, 50, 100],
  zeroing: [25, 50, 100, 200, 300],
  physical: [5, 7, 15, 25],
  custom: [7, 15, 25, 50, 100, 200],
};

// ============================================================================
// SHOTS PRESETS BY PURPOSE
// ============================================================================

export const SHOTS_PRESETS: Record<SessionPurpose, number[]> = {
  grouping: [3, 5, 10, 20],
  achievement: [5, 10, 20, 30],
  zeroing: [1, 3, 5],
  physical: [6, 10, 15, 20],
  custom: [3, 5, 10, 20, 30],
};

// ============================================================================
// POSITION OPTIONS
// ============================================================================

export const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'any', label: 'Any Position' },
  { value: 'standing', label: 'Standing' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'prone', label: 'Prone' },
  { value: 'seated', label: 'Seated' },
  { value: 'supported', label: 'Supported' },
];

// ============================================================================
// TIME LIMIT PRESETS (seconds)
// ============================================================================

export const TIME_PRESETS: (number | null)[] = [null, 30, 60, 120, 300];

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

export function purposeToDrillGoal(purpose: SessionPurpose): 'grouping' | 'achievement' {
  switch (purpose) {
    case 'grouping':
    case 'zeroing':
      return 'grouping';
    case 'achievement':
    case 'physical':
    case 'custom':
    default:
      return 'achievement';
  }
}

// ============================================================================
// GET PURPOSE OPTION BY ID
// ============================================================================

export function getPurposeOption(id: SessionPurpose): PurposeOption | undefined {
  return PURPOSE_OPTIONS.find((p) => p.id === id);
}

