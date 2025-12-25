/**
 * Garmin Watch Integration Helpers
 *
 * Utilities for determining how the watch should behave based on drill type.
 */

import { DRILL_TYPES, type DrillTypeId, type InputMethod } from '@/types/drillTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Watch mode determines how the Garmin watch behaves during a session:
 *
 * - `primary`: Watch is the main input device.
 *   User taps watch to count shots. Watch enforces round limits.
 *   Used for: Timed drills, Manual drills, Tactical qualification.
 *
 * - `supplementary`: Watch is a passive timer.
 *   User may optionally tap for split times. No limit enforcement.
 *   Used for: Zeroing, Grouping, Paper qualification (scan-based).
 */
export type WatchMode = 'primary' | 'supplementary';

/**
 * Configuration sent to the watch when starting a session.
 */
export interface WatchSessionConfig {
  sessionId: string;
  drillName: string;
  drillType: DrillTypeId;
  inputMethod: InputMethod;
  watchMode: WatchMode;
  distance: number;
  rounds: number;
  timeLimit: number | null;
  parTime: number | null;
  strings: number;
  startedAt: number;
}

// ============================================================================
// WATCH MODE DERIVATION
// ============================================================================

/**
 * Derive the watch mode based on drill configuration.
 *
 * Logic:
 * - `inputMethod: 'manual'` → primary (watch counts shots)
 * - `inputMethod: 'scan'` → supplementary (phone scans, watch is timer)
 * - `inputMethod: 'both'` → depends on target_type:
 *   - `tactical` → primary
 *   - `paper` → supplementary
 *
 * @param drill - Drill configuration (from DB or drill type)
 * @returns 'primary' or 'supplementary'
 */
export function deriveWatchMode(drill: {
  drill_type?: string;
  target_type?: string;
  drill_goal?: string;
}): WatchMode {
  const drillTypeId = drill.drill_type as DrillTypeId | undefined;

  // If no drill type, default to supplementary (safer - doesn't block)
  if (!drillTypeId || !DRILL_TYPES[drillTypeId]) {
    return 'supplementary';
  }

  const drillType = DRILL_TYPES[drillTypeId];

  // Manual drills → Primary mode (watch is main input)
  if (drillType.inputMethod === 'manual') {
    return 'primary';
  }

  // Scan drills → Supplementary mode (phone is main input via camera)
  if (drillType.inputMethod === 'scan') {
    return 'supplementary';
  }

  // "both" mode → Check target type
  if (drillType.inputMethod === 'both') {
    // Tactical targets = manual shooting = primary mode
    if (drill.target_type === 'tactical') {
      return 'primary';
    }
    // Paper targets = scan-based = supplementary mode
    return 'supplementary';
  }

  // Default fallback
  return 'supplementary';
}

/**
 * Get the input method for a drill type.
 */
export function getInputMethod(drillTypeId: DrillTypeId): InputMethod {
  return DRILL_TYPES[drillTypeId]?.inputMethod ?? 'manual';
}

/**
 * Check if a drill type supports watch as primary input.
 */
export function supportsWatchAsPrimary(drillTypeId: DrillTypeId): boolean {
  const inputMethod = DRILL_TYPES[drillTypeId]?.inputMethod;
  return inputMethod === 'manual' || inputMethod === 'both';
}

/**
 * Get human-readable description of what the watch will do.
 */
export function getWatchModeDescription(watchMode: WatchMode): {
  title: string;
  subtitle: string;
  instruction: string;
} {
  if (watchMode === 'primary') {
    return {
      title: 'Shot Counter',
      subtitle: 'Watch will count your shots',
      instruction: 'Tap watch after each shot',
    };
  }

  return {
    title: 'Timer Only',
    subtitle: 'Timer runs on watch',
    instruction: 'Scan target when done',
  };
}

// ============================================================================
// WATCH SESSION CONFIG BUILDER
// ============================================================================

/**
 * Build the configuration payload to send to the watch when starting a session.
 *
 * @param sessionId - Database session ID
 * @param drill - Drill configuration from DB
 * @returns WatchSessionConfig ready to send via garminService
 */
export function buildWatchSessionConfig(
  sessionId: string,
  drill: {
    name: string;
    drill_type?: string;
    target_type?: string;
    distance_m: number;
    rounds_per_shooter: number;
    time_limit_seconds?: number | null;
    par_time_seconds?: number | null;
    strings_count?: number | null;
  }
): WatchSessionConfig {
  const drillTypeId = (drill.drill_type as DrillTypeId) || 'timed';
  const inputMethod = getInputMethod(drillTypeId);
  const watchMode = deriveWatchMode(drill);

  return {
    sessionId,
    drillName: drill.name,
    drillType: drillTypeId,
    inputMethod,
    watchMode,
    distance: drill.distance_m,
    rounds: drill.rounds_per_shooter,
    timeLimit: drill.time_limit_seconds ?? null,
    parTime: drill.par_time_seconds ?? null,
    strings: drill.strings_count ?? 1,
    startedAt: Date.now(),
  };
}

