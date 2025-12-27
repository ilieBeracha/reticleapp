/**
 * Pure helper functions for Active Session Screen
 * No React dependencies, no side effects
 */

import { ACCURACY_THRESHOLDS, COLORS } from './activeSession.constants';
import type { DrillProgress, NextTargetPlan } from './activeSession.types';

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Formats seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates elapsed seconds from a start timestamp
 */
export function calculateElapsedSeconds(startedAt: string): number {
  const startTime = new Date(startedAt).getTime();
  return Math.floor((Date.now() - startTime) / 1000);
}

// ============================================================================
// ACCURACY & STATS
// ============================================================================

/**
 * Calculates accuracy percentage from shots and hits
 */
export function calculateAccuracy(totalShots: number, totalHits: number): number {
  if (totalShots <= 0) return 0;
  return Math.round((totalHits / totalShots) * 100);
}

/**
 * Gets the color for accuracy based on value and optional goal
 */
export function getAccuracyColor(
  accuracy: number,
  minAccuracyPercent?: number | null
): string {
  if (minAccuracyPercent) {
    if (accuracy >= minAccuracyPercent) return COLORS.accent;
    if (accuracy >= minAccuracyPercent * 0.8) return COLORS.warning;
    return COLORS.error;
  }
  
  if (accuracy >= ACCURACY_THRESHOLDS.high) return COLORS.accent;
  if (accuracy >= ACCURACY_THRESHOLDS.medium) return COLORS.warning;
  return COLORS.accent; // Default color for low accuracy
}

// ============================================================================
// DRILL PROGRESS CALCULATION
// ============================================================================

interface DrillConfig {
  strings_count?: number | null;
  target_count?: number | null;
  target_type?: string | null;
  rounds_per_shooter?: number | null;
  min_accuracy_percent?: number | null;
  time_limit_seconds?: number | null;
}

/**
 * Calculates drill progress from session state
 */
export function calculateDrillProgress(
  drill: DrillConfig | null,
  totalShots: number,
  targetsCount: number,
  accuracy: number,
  elapsedTime: number
): DrillProgress | null {
  if (!drill) return null;

  // === Drill semantics (IMPORTANT) ===
  // - strings_count = how many rounds/repetitions
  // - tactical: rounds_per_shooter = bullets per round (per entry)
  // - paper(scan): rounds_per_shooter = MAX allowed shots cap (default: infinite)
  const rounds = drill.strings_count && drill.strings_count > 0 ? drill.strings_count : 1;
  const targetsPerRound = drill.target_count && drill.target_count > 0 ? drill.target_count : 1;
  const isPaper = drill.target_type === 'paper';
  const bulletsPerRound = drill.rounds_per_shooter;

  // If target_count is set, drills may require multiple target entries per round/string.
  const requiredTargets = rounds * targetsPerRound;
  const requiredRounds = isPaper ? 0 : (bulletsPerRound ?? 0) * requiredTargets;

  const shotsProgress =
    !isPaper && requiredRounds > 0 
      ? Math.min(100, Math.round((totalShots / requiredRounds) * 100)) 
      : 0;
  const targetsProgress = requiredTargets > 0 
    ? Math.min(100, Math.round((targetsCount / requiredTargets) * 100)) 
    : 0;

  const isComplete = isPaper
    ? targetsCount >= requiredTargets
    : totalShots >= requiredRounds && targetsCount >= requiredTargets;
  const meetsAccuracy = !drill.min_accuracy_percent || accuracy >= drill.min_accuracy_percent;
  const meetsTime = !drill.time_limit_seconds || elapsedTime <= drill.time_limit_seconds;

  return {
    rounds,
    targetsPerRound,
    bulletsPerRound: bulletsPerRound ?? null,
    requiredRounds,
    requiredTargets,
    shotsProgress,
    targetsProgress,
    isComplete,
    meetsAccuracy,
    meetsTime,
    overTime: drill.time_limit_seconds ? elapsedTime > drill.time_limit_seconds : false,
    isPaper,
  };
}

/**
 * Calculates next target planning info
 */
export function calculateNextTargetPlan(
  drillProgress: DrillProgress | null,
  drill: DrillConfig | null,
  totalShots: number,
  targetsCount: number
): NextTargetPlan | null {
  if (!drillProgress || !drill) return null;

  const remainingTargets = Math.max(0, drillProgress.requiredTargets - targetsCount);
  
  if (drill.target_type === 'paper') {
    // Paper drills are target-count based; shots are detected from scan
    return { remainingShots: 0, remainingTargets, nextBullets: 0 };
  }

  const remainingShots = Math.max(0, drillProgress.requiredRounds - totalShots);

  if (remainingShots <= 0 || remainingTargets <= 0) {
    return { remainingShots, remainingTargets, nextBullets: 0 };
  }

  // Drill contract: fixed bullets per round
  const nextBullets = remainingTargets === 1
    ? remainingShots
    : Math.min(remainingShots, drillProgress.bulletsPerRound ?? 0);

  return { remainingShots, remainingTargets, nextBullets };
}

/**
 * Checks if drill limit has been reached
 */
export function isDrillLimitReached(
  drill: DrillConfig | null,
  nextTargetPlan: NextTargetPlan | null
): boolean {
  if (!drill || !nextTargetPlan) return false;
  
  return drill.target_type === 'paper'
    ? nextTargetPlan.remainingTargets <= 0
    : nextTargetPlan.remainingShots <= 0 || nextTargetPlan.remainingTargets <= 0;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

interface Target {
  distance_m?: number | null;
}

/**
 * Gets default distance from session context
 */
export function getDefaultDistance(
  targets: Target[],
  drill: DrillConfig | null
): number {
  // Session-first: prefer the most recent target distance if available
  const last = targets.length > 0 ? targets[targets.length - 1] : null;
  if (last?.distance_m) return last.distance_m;

  
  // Default fallback
  return 100;
}

// ============================================================================
// WATCH PAYLOAD
// ============================================================================

interface SessionForPayload {
  id: string;
  drill_name?: string | null;
  watch_controlled?: boolean;
  drill_config?: {
    name?: string | null;
    drill_goal?: string | null;
    target_type?: string | null;
    input_method?: string | null;
    distance_m?: number | null;
    rounds_per_shooter?: number | null;
    time_limit_seconds?: number | null;
    par_time_seconds?: number | null;
    strings_count?: number | null;
  } | null;
}

/**
 * Builds the payload to send to watch for SESSION_START
 */
export function buildWatchSessionPayload(
  session: SessionForPayload,
  autoDetect: boolean = true,
  sensitivity: number = 0.5
) {
  const drillConfig = session.drill_config;
  return {
    sessionId: session.id,
    drillName: drillConfig?.name || session.drill_name || 'Training Session',
    drillGoal: drillConfig?.drill_goal || 'practice',
    drillType: drillConfig?.target_type || 'tactical',
    inputMethod: drillConfig?.input_method || 'manual',
    watchMode: session.watch_controlled ? 'primary' : 'supplementary',
    distance: drillConfig?.distance_m || 0,
    rounds: drillConfig?.rounds_per_shooter || 0,
    timeLimit: drillConfig?.time_limit_seconds || 0,
    parTime: drillConfig?.par_time_seconds || 0,
    strings: drillConfig?.strings_count || 1,
    startedAt: Date.now(),
    autoDetect,
    sensitivity,
  };
}

// ============================================================================
// MESSAGE BUILDERS
// ============================================================================

interface DrillProgressForMessage {
  requiredRounds: number;
  requiredTargets: number;
}

/**
 * Builds the end session confirmation message
 */
export function buildEndSessionMessage(
  hasDrill: boolean,
  drill: DrillConfig | null,
  drillProgress: DrillProgressForMessage | null,
  meetsRequirements: boolean,
  totalShots: number,
  targetsCount: number,
  accuracy: number,
  elapsedTime: number
): { title: string; message: string } {
  if (!hasDrill || !drill || !drillProgress || meetsRequirements) {
    return {
      title: 'End Session?',
      message: `${targetsCount} target${targetsCount !== 1 ? 's' : ''} logged • ${formatTime(elapsedTime)} elapsed`,
    };
  }

  const lines = [
    `This drill has requirements that are not met yet.`,
    ``,
    ...(drill.target_type === 'paper'
      ? [
          `Targets: ${targetsCount}/${drillProgress.requiredTargets}`,
        ]
      : [
          `Shots: ${totalShots}/${drillProgress.requiredRounds}`,
          `Targets: ${targetsCount}/${drillProgress.requiredTargets}`,
        ]),
    ...(drill.min_accuracy_percent
      ? [`Accuracy: ${accuracy}% (min ${drill.min_accuracy_percent}%)`]
      : []),
    ...(drill.time_limit_seconds
      ? [`Time: ${formatTime(elapsedTime)} (limit ${formatTime(drill.time_limit_seconds)})`]
      : []),
    ``,
    `Ending now will NOT count as a drill completion.`,
  ];

  return {
    title: 'End Drill Early?',
    message: lines.join('\n'),
  };
}

