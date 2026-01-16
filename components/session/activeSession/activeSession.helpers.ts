/**
 * Pure helper functions for Active Session Screen
 * No React dependencies, no side effects
 */

import { deriveDetectionConfig, type DetectionConfig } from '@/utils/detectionSensitivity';
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
  target_type?: string | null;
  bullets?: number | null;
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
  // - strings_count = how many entries/repetitions
  // - bullets = shots required per entry
  const strings = drill.strings_count && drill.strings_count > 0 ? drill.strings_count : 1;
  const isPaper = drill.target_type === 'paper';
  const bulletsPerString = drill.bullets;

  const requiredTargets = strings;
  const requiredBullets = isPaper ? 0 : (bulletsPerString ?? 0) * strings;

  const shotsProgress =
    !isPaper && requiredBullets > 0 
      ? Math.min(100, Math.round((totalShots / requiredBullets) * 100)) 
      : 0;
  const targetsProgress = requiredTargets > 0 
    ? Math.min(100, Math.round((targetsCount / requiredTargets) * 100)) 
    : 0;

  const isComplete = isPaper
    ? targetsCount >= requiredTargets
    : totalShots >= requiredBullets && targetsCount >= requiredTargets;
  const meetsTime = !drill.time_limit_seconds || elapsedTime <= drill.time_limit_seconds;

  return {
    strings,
    bulletsPerString: bulletsPerString ?? null,
    requiredBullets,
    requiredTargets,
    shotsProgress,
    targetsProgress,
    isComplete,
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

  const remainingShots = Math.max(0, drillProgress.requiredBullets - totalShots);

  if (remainingShots <= 0 || remainingTargets <= 0) {
    return { remainingShots, remainingTargets, nextBullets: 0 };
  }

  // Drill contract: fixed bullets per string
  const nextBullets = remainingTargets === 1
    ? remainingShots
    : Math.min(remainingShots, drillProgress.bulletsPerString ?? 0);

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
    bullets?: number | null;
    time_limit_seconds?: number | null;
    strings_count?: number | null;
    /** User-calibrated detection sensitivity in G-force */
    detection_sensitivity?: number | null;
  } | null;
}

/**
 * Weapon info for detection sensitivity derivation
 */
export interface WeaponForDetection {
  category?: string | null;
  caliber?: string | null;
  has_suppressor?: boolean;
  has_muzzle_brake?: boolean;
  custom_sensitivity?: number | null;
}

/**
 * Options for building watch session payload
 */
export interface WatchPayloadOptions {
  /** Enable automatic shot detection (default: true) */
  autoDetect?: boolean;
  /** Manual sensitivity override (G-force). If not set, derived from weapon */
  sensitivity?: number;
  /** Enable shot marking feature on watch (default: false) */
  emkv?: boolean;
  /** Vibrate on shot detection (default: true) */
  vrcv?: boolean;
  /** Weapon info for auto-deriving sensitivity */
  weapon?: WeaponForDetection | null;
}

/**
 * Builds the payload to send to watch for SESSION_START
 * 
 * Watch expects:
 * - drillType: "timed" | "grouping" | "zeroing" | "qualification"
 * - inputMethod: "manual" | "scan" | "both"
 * - rounds: shots per string (0 = unlimited)
 * - strings: number of strings/stages
 * - watchMode: "primary" (shot counter) | "supplementary" (timer only)
 * - detection: { sensitivity, minThreshold, maxThreshold, cooldownMs, profile }
 * - emkv: enable shot marking feature
 * - vrcv: vibrate on shot detection
 */
export function buildWatchSessionPayload(
  session: SessionForPayload,
  options: WatchPayloadOptions = {}
) {
  const {
    autoDetect = true,
    sensitivity: manualSensitivity,
    emkv = false,
    vrcv = true,
    weapon,
  } = options;
  
  const drillConfig = session.drill_config;
  
  // bullets per string (0 = unlimited)
  const bulletsPerString = drillConfig?.bullets || 0;
  const strings = drillConfig?.strings_count || 1;
  
  // Priority for custom sensitivity:
  // 1. Manual override from options.sensitivity
  // 2. User-calibrated value saved in drill_config.detection_sensitivity
  // 3. Weapon-based derivation (via weapon.custom_sensitivity)
  // 4. Default fallback based on weapon category/caliber
  const savedCustomSensitivity = drillConfig?.detection_sensitivity;
  
  // Derive detection config
  let detectionConfig: DetectionConfig;
  if (manualSensitivity !== undefined) {
    // Manual override from options - highest priority
    detectionConfig = {
      sensitivity: manualSensitivity,
      minThreshold: manualSensitivity * 0.5,
      maxThreshold: manualSensitivity * 3.0,
      cooldownMs: 300,  // Safe minimum - recoil settles in ~200ms
      profile: 'rifle',
      description: 'Manual',
    };
  } else if (savedCustomSensitivity !== undefined && savedCustomSensitivity !== null) {
    // User-calibrated sensitivity saved in session
    // IMPORTANT: Clamp to safe range (watch calibration uses 1.5-10.0G)
    // Values below 1.0G cause constant false positives and can crash the watch
    const clampedSensitivity = Math.max(1.0, Math.min(10.0, savedCustomSensitivity));
    if (clampedSensitivity !== savedCustomSensitivity) {
      console.warn(`[Payload] ⚠️ Clamping sensitivity from ${savedCustomSensitivity}G to ${clampedSensitivity}G (safe range: 1.0-10.0G)`);
    }
    
    const profile = weapon?.category === 'handgun' ? 'handgun' : 
                    weapon?.category === 'shotgun' ? 'shotgun' : 'rifle';
    detectionConfig = {
      sensitivity: clampedSensitivity,
      minThreshold: clampedSensitivity * 0.5, // 50% (matches watch's derivation)
      maxThreshold: clampedSensitivity * 3.0,
      cooldownMs: profile === 'handgun' ? 250 : profile === 'shotgun' ? 400 : 300,
      profile,
      description: 'Custom calibrated',
    };
    console.log(`[Payload] Using saved custom sensitivity: ${clampedSensitivity}G`);
  } else if (weapon) {
    // Derive from weapon properties (may include weapon.custom_sensitivity)
    detectionConfig = deriveDetectionConfig({
      category: weapon.category as any,
      caliber: weapon.caliber,
      hasSuppressor: weapon.has_suppressor,
      hasMuzzleBrake: weapon.has_muzzle_brake,
      customSensitivity: weapon.custom_sensitivity,
    });
  } else {
    // Default fallback
    detectionConfig = deriveDetectionConfig({});
  }
  
  // Map drill_goal to watch drillType
  const mapDrillType = (goal: string | null | undefined): string => {
    switch (goal) {
      case 'grouping': return 'grouping';
      case 'zeroing': return 'zeroing';
      case 'qualification': return 'qualification';
      case 'engagement':
      case 'physical':
      default:
        return 'timed'; // Default for tactical/achievement drills
    }
  };

  // Map input_method to watch format
  const mapInputMethod = (method: string | null | undefined): string => {
    switch (method) {
      case 'scan': return 'scan';
      case 'both': return 'both';
      case 'manual':
      default:
        return 'manual';
    }
  };

  // Build goal description string
  const buildGoalDescription = (): string => {
    const parts: string[] = [];
    if (bulletsPerString > 0) parts.push(`${bulletsPerString} shots`);
    if (drillConfig?.time_limit_seconds) {
      parts.push(`under ${drillConfig.time_limit_seconds}s`);
    }
    return parts.length > 0 ? parts.join(' ') : (drillConfig?.drill_goal || 'Practice');
  };
  
  return {
    sessionId: session.id,
    drillName: drillConfig?.name || session.drill_name || 'Training Session',
    drillGoal: buildGoalDescription(),
    drillType: mapDrillType(drillConfig?.drill_goal),
    inputMethod: mapInputMethod(drillConfig?.input_method),
    distance: drillConfig?.distance_m || 0,
    rounds: bulletsPerString,  // Watch expects "rounds" (bullets per string)
    strings,     // Number of strings/stages
    timeLimit: drillConfig?.time_limit_seconds || 0,
    parTime: 0,  // Legacy field, no longer used
    watchMode: session.watch_controlled ? 'primary' : 'supplementary',
    
    // Detection configuration (new enhanced format)
    autoDetect,
    detection: {
      sensitivity: detectionConfig.sensitivity,
      minThreshold: detectionConfig.minThreshold,
      maxThreshold: detectionConfig.maxThreshold,
      cooldownMs: detectionConfig.cooldownMs,
      profile: detectionConfig.profile,
    },
    
    // Legacy: Keep flat sensitivity for backwards compatibility
    sensitivity: detectionConfig.sensitivity,
    
    emkv,        // Shot marking feature
    vrcv,        // Vibrate on shot detection
  };
}

/**
 * Legacy overload for backwards compatibility
 * @deprecated Use buildWatchSessionPayload(session, options) instead
 */
export function buildWatchSessionPayloadLegacy(
  session: SessionForPayload,
  autoDetect: boolean = true,
  sensitivity: number = 3.5,
  emkv: boolean = false,
  vrcv: boolean = true
) {
  return buildWatchSessionPayload(session, {
    autoDetect,
    sensitivity,
    emkv,
    vrcv,
  });
}

// ============================================================================
// MESSAGE BUILDERS
// ============================================================================

interface DrillProgressForMessage {
  requiredBullets: number;
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
          `Shots: ${totalShots}/${drillProgress.requiredBullets}`,
          `Targets: ${targetsCount}/${drillProgress.requiredTargets}`,
        ]),
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

