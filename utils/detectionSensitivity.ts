/**
 * Shot Detection Sensitivity Configuration
 *
 * Provides weapon-aware sensitivity calibration for Garmin watch shot detection.
 * Different firearms produce vastly different recoil signatures:
 *
 * | Firearm Type          | Typical G-Force at Wrist |
 * |-----------------------|--------------------------|
 * | .22 LR pistol         | 1.5 - 3G                 |
 * | 9mm pistol            | 3 - 5G                   |
 * | .45 ACP               | 5 - 8G                   |
 * | 5.56 rifle (AR-15)    | 4 - 8G                   |
 * | 7.62x51 rifle         | 6 - 12G                  |
 * | 12ga shotgun          | 10 - 20G                 |
 *
 * Modifiers like suppressors and muzzle brakes significantly reduce felt recoil.
 */

import type { WeaponCategory } from '@/types/workspace';

// ============================================================================
// TYPES
// ============================================================================

export type CaliberClass =
  | 'rimfire' // .22 LR, etc.
  | 'light_pistol' // .380 ACP, .32 ACP
  | 'medium_pistol' // 9mm, .38 Special
  | 'heavy_pistol' // .40 S&W, .45 ACP, .357 Mag
  | 'light_rifle' // 5.56, .223, 5.45
  | 'medium_rifle' // 7.62x39, .300 BLK
  | 'heavy_rifle' // 7.62x51, .308, .30-06
  | 'magnum_rifle' // .338 Lapua, .50 BMG
  | 'shotgun' // 12ga, 20ga
  | 'unknown';

export interface DetectionConfig {
  /** Primary sensitivity threshold (G-force) */
  sensitivity: number;
  /** Minimum threshold - reject below this (false positive rejection) */
  minThreshold: number;
  /** Maximum expected peak - for normalization */
  maxThreshold: number;
  /** Minimum time between shots (ms) - prevents double-counting */
  cooldownMs: number;
  /** Weapon profile for detection algorithm */
  profile: 'handgun' | 'rifle' | 'shotgun';
  /** Description for UI */
  description: string;
}

export interface WeaponDetectionInput {
  /** Weapon category (pistol, rifle, etc.) */
  category?: WeaponCategory | null;
  /** Specific caliber string (e.g., "9mm", ".308 Win") */
  caliber?: string | null;
  /** Has suppressor attached */
  hasSuppressor?: boolean;
  /** Has muzzle brake/compensator attached */
  hasMuzzleBrake?: boolean;
  /** User-calibrated custom sensitivity */
  customSensitivity?: number | null;
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/** Sensitivity presets for quick selection UI */
export const SENSITIVITY_PRESETS = [
  {
    id: 'light',
    label: 'Light Recoil',
    description: '.22 LR, airsoft, testing',
    sensitivity: 0.8, // Very sensitive - detects light taps
    icon: 'feather',
    examples: ['.22 LR', 'Airsoft', 'Testing'],
  },
  {
    id: 'medium',
    label: 'Medium Recoil',
    description: '9mm, 5.56, standard pistol/rifle',
    sensitivity: 2.5,
    icon: 'target',
    examples: ['9mm', '5.56x45', '.40 S&W'],
  },
  {
    id: 'heavy',
    label: 'Heavy Recoil',
    description: '.45 ACP, 7.62, magnum',
    sensitivity: 4.0,
    icon: 'flame',
    examples: ['.45 ACP', '7.62x51', '.357 Mag'],
  },
  {
    id: 'shotgun',
    label: 'Shotgun',
    description: '12ga, 20ga - high impulse',
    sensitivity: 5.5,
    icon: 'shield',
    examples: ['12 Gauge', '20 Gauge'],
  },
] as const;

export type SensitivityPresetId = (typeof SENSITIVITY_PRESETS)[number]['id'];

// ============================================================================
// CALIBER → SENSITIVITY MAPPING
// ============================================================================

/**
 * Base sensitivity values by caliber.
 * These are starting points - actual values may need user calibration.
 */
const CALIBER_SENSITIVITY_MAP: Record<string, { sensitivity: number; class: CaliberClass }> = {
  // Rimfire
  '.22 LR': { sensitivity: 2.0, class: 'rimfire' },
  '.22 WMR': { sensitivity: 2.2, class: 'rimfire' },
  '.17 HMR': { sensitivity: 2.0, class: 'rimfire' },

  // Light Pistol
  '.25 ACP': { sensitivity: 2.0, class: 'light_pistol' },
  '.32 ACP': { sensitivity: 2.3, class: 'light_pistol' },
  '.380 ACP': { sensitivity: 2.5, class: 'light_pistol' },

  // Medium Pistol
  '9mm': { sensitivity: 3.2, class: 'medium_pistol' },
  '9x19': { sensitivity: 3.2, class: 'medium_pistol' },
  '9mm Luger': { sensitivity: 3.2, class: 'medium_pistol' },
  '9mm Parabellum': { sensitivity: 3.2, class: 'medium_pistol' },
  '.38 Special': { sensitivity: 3.0, class: 'medium_pistol' },
  '.38 Spl': { sensitivity: 3.0, class: 'medium_pistol' },

  // Heavy Pistol
  '.40 S&W': { sensitivity: 3.8, class: 'heavy_pistol' },
  '.45 ACP': { sensitivity: 4.2, class: 'heavy_pistol' },
  '.357 Magnum': { sensitivity: 4.5, class: 'heavy_pistol' },
  '.357 Mag': { sensitivity: 4.5, class: 'heavy_pistol' },
  '.44 Magnum': { sensitivity: 5.0, class: 'heavy_pistol' },
  '.44 Mag': { sensitivity: 5.0, class: 'heavy_pistol' },
  '10mm': { sensitivity: 4.0, class: 'heavy_pistol' },
  '10mm Auto': { sensitivity: 4.0, class: 'heavy_pistol' },

  // Light Rifle
  '5.56x45': { sensitivity: 3.5, class: 'light_rifle' },
  '5.56 NATO': { sensitivity: 3.5, class: 'light_rifle' },
  '.223 Rem': { sensitivity: 3.5, class: 'light_rifle' },
  '.223 Remington': { sensitivity: 3.5, class: 'light_rifle' },
  '5.45x39': { sensitivity: 3.3, class: 'light_rifle' },
  '.300 BLK': { sensitivity: 3.0, class: 'light_rifle' }, // Subsonic is softer
  '.300 Blackout': { sensitivity: 3.0, class: 'light_rifle' },

  // Medium Rifle
  '7.62x39': { sensitivity: 4.0, class: 'medium_rifle' },
  '6.5 Creedmoor': { sensitivity: 4.0, class: 'medium_rifle' },
  '6.5 CM': { sensitivity: 4.0, class: 'medium_rifle' },
  '6.5 Grendel': { sensitivity: 3.8, class: 'medium_rifle' },

  // Heavy Rifle
  '7.62x51': { sensitivity: 4.5, class: 'heavy_rifle' },
  '7.62 NATO': { sensitivity: 4.5, class: 'heavy_rifle' },
  '.308 Win': { sensitivity: 4.5, class: 'heavy_rifle' },
  '.308 Winchester': { sensitivity: 4.5, class: 'heavy_rifle' },
  '.30-06': { sensitivity: 4.8, class: 'heavy_rifle' },
  '.30-06 Springfield': { sensitivity: 4.8, class: 'heavy_rifle' },

  // Magnum Rifle
  '.338 Lapua': { sensitivity: 5.5, class: 'magnum_rifle' },
  '.338 Lapua Magnum': { sensitivity: 5.5, class: 'magnum_rifle' },
  '.300 Win Mag': { sensitivity: 5.2, class: 'magnum_rifle' },
  '.300 Winchester Magnum': { sensitivity: 5.2, class: 'magnum_rifle' },
  '.50 BMG': { sensitivity: 6.0, class: 'magnum_rifle' },

  // Shotgun
  '12 Gauge': { sensitivity: 5.5, class: 'shotgun' },
  '12ga': { sensitivity: 5.5, class: 'shotgun' },
  '20 Gauge': { sensitivity: 4.5, class: 'shotgun' },
  '20ga': { sensitivity: 4.5, class: 'shotgun' },
  '.410': { sensitivity: 3.5, class: 'shotgun' },
  '.410 Bore': { sensitivity: 3.5, class: 'shotgun' },
};

/**
 * Default sensitivity by weapon category when caliber is unknown.
 */
const CATEGORY_DEFAULT_SENSITIVITY: Record<WeaponCategory, number> = {
  pistol: 3.5,
  carbine: 3.5,
  rifle: 4.0,
  precision_rifle: 4.5,
  smg: 3.3,
  shotgun: 5.0,
  other: 3.5,
  any: 3.5,
};

/**
 * Detection profile by weapon category.
 */
const CATEGORY_PROFILE: Record<WeaponCategory, DetectionConfig['profile']> = {
  pistol: 'handgun',
  carbine: 'rifle',
  rifle: 'rifle',
  precision_rifle: 'rifle',
  smg: 'rifle',
  shotgun: 'shotgun',
  other: 'rifle',
  any: 'rifle',
};

/**
 * Cooldown (ms) by profile - minimum time between detected shots.
 * Prevents recoil oscillations from counting as multiple shots.
 *
 * IMPORTANT: These values must be long enough for recoil to settle!
 * A single gunshot recoil oscillates for 100-200ms on the accelerometer.
 * Previous values (60-120ms) caused double/triple detection.
 *
 * Even the fastest competition shooters have ~200ms+ splits.
 */
const PROFILE_COOLDOWN: Record<DetectionConfig['profile'], number> = {
  handgun: 250, // Fastest double-taps are ~200ms - safe margin
  rifle: 300, // Semi-auto + bolt action need more time
  shotgun: 400, // Pump/semi shotgun has longer recoil cycle
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Normalize a caliber string for lookup.
 * Handles variations like "9MM", "9 mm", "9x19mm".
 */
function normalizeCaliber(caliber: string): string {
  return caliber
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/(\d+)\s*x\s*(\d+)/gi, '$1x$2'); // "5.56 x 45" → "5.56x45"
}

/**
 * Look up sensitivity for a specific caliber.
 */
function getCaliberSensitivity(caliber: string | null | undefined): {
  sensitivity: number;
  class: CaliberClass;
} | null {
  if (!caliber) return null;

  const normalized = normalizeCaliber(caliber);

  // Try exact match first
  if (CALIBER_SENSITIVITY_MAP[normalized]) {
    return CALIBER_SENSITIVITY_MAP[normalized];
  }

  // Try case-insensitive match
  const lowerCaliber = normalized.toLowerCase();
  for (const [key, value] of Object.entries(CALIBER_SENSITIVITY_MAP)) {
    if (key.toLowerCase() === lowerCaliber) {
      return value;
    }
  }

  // Try partial match for common patterns
  for (const [key, value] of Object.entries(CALIBER_SENSITIVITY_MAP)) {
    if (lowerCaliber.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCaliber)) {
      return value;
    }
  }

  return null;
}

/**
 * Derive detection sensitivity configuration from weapon properties.
 *
 * Priority:
 * 1. User's custom calibrated sensitivity (if provided)
 * 2. Caliber-specific sensitivity (if caliber is known)
 * 3. Category default sensitivity
 *
 * Modifiers are applied:
 * - Suppressor: -30% (softer impulse)
 * - Muzzle brake: -40% (redirects gases, reduces felt recoil)
 */
export function deriveDetectionConfig(input: WeaponDetectionInput): DetectionConfig {
  const { category = 'any', caliber, hasSuppressor = false, hasMuzzleBrake = false, customSensitivity } = input;

  // Start with user's custom sensitivity if provided
  if (customSensitivity !== null && customSensitivity !== undefined) {
    const profile = CATEGORY_PROFILE[category ?? 'any'];
    return {
      sensitivity: customSensitivity,
      minThreshold: customSensitivity * 0.3, // 30% for more lenient detection
      maxThreshold: customSensitivity * 3.0,
      cooldownMs: PROFILE_COOLDOWN[profile],
      profile,
      description: 'Custom calibrated',
    };
  }

  // Try caliber-specific sensitivity
  const caliberData = getCaliberSensitivity(caliber);
  let baseSensitivity = caliberData?.sensitivity ?? CATEGORY_DEFAULT_SENSITIVITY[category ?? 'any'];
  let description = caliberData ? caliber! : `${category} default`;

  // Apply modifiers
  if (hasSuppressor) {
    baseSensitivity *= 0.7; // 30% reduction
    description += ' (suppressed)';
  }
  if (hasMuzzleBrake) {
    baseSensitivity *= 0.6; // 40% reduction
    description += ' (braked)';
  }

  // Determine profile
  const profile = CATEGORY_PROFILE[category ?? 'any'];

  // Build final config
  // minThreshold at 30% of sensitivity (was 50% - too aggressive for light recoil)
  // This allows shots that are slightly below the target threshold to still be considered
  return {
    sensitivity: Math.round(baseSensitivity * 10) / 10, // Round to 1 decimal
    minThreshold: Math.round(baseSensitivity * 0.3 * 10) / 10,
    maxThreshold: Math.round(baseSensitivity * 3.0 * 10) / 10,
    cooldownMs: PROFILE_COOLDOWN[profile],
    profile,
    description,
  };
}

/**
 * Get detection config from a sensitivity preset ID.
 */
export function getPresetConfig(presetId: SensitivityPresetId): DetectionConfig {
  const preset = SENSITIVITY_PRESETS.find((p) => p.id === presetId);

  if (!preset) {
    // Default to medium
    return getPresetConfig('medium');
  }

  const profile: DetectionConfig['profile'] =
    presetId === 'shotgun' ? 'shotgun' : presetId === 'heavy' ? 'rifle' : 'handgun';

  return {
    sensitivity: preset.sensitivity,
    minThreshold: preset.sensitivity * 0.3, // 30% for more lenient detection
    maxThreshold: preset.sensitivity * 3.0,
    cooldownMs: PROFILE_COOLDOWN[profile],
    profile,
    description: preset.label,
  };
}

/**
 * Find the best matching preset for a given sensitivity value.
 */
export function findClosestPreset(sensitivity: number): SensitivityPresetId {
  let closest: SensitivityPresetId = 'medium';
  let closestDiff = Infinity;

  for (const preset of SENSITIVITY_PRESETS) {
    const diff = Math.abs(preset.sensitivity - sensitivity);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = preset.id;
    }
  }

  return closest;
}

/**
 * Validate a sensitivity value is within acceptable range.
 */
export function validateSensitivity(sensitivity: number): {
  valid: boolean;
  warning?: string;
  clamped: number;
} {
  const MIN_SENSITIVITY = 0.5; // Allow very sensitive for testing
  const MAX_SENSITIVITY = 8.0;

  if (sensitivity < MIN_SENSITIVITY) {
    return {
      valid: false,
      warning: `Sensitivity too low (${sensitivity}G). May cause false positives.`,
      clamped: MIN_SENSITIVITY,
    };
  }

  if (sensitivity > MAX_SENSITIVITY) {
    return {
      valid: false,
      warning: `Sensitivity too high (${sensitivity}G). May miss light recoil.`,
      clamped: MAX_SENSITIVITY,
    };
  }

  return {
    valid: true,
    clamped: sensitivity,
  };
}

// ============================================================================
// CALIBRATION HELPERS
// ============================================================================

/**
 * Calculate adaptive threshold from observed shot peaks.
 * Used by watch during calibration mode.
 */
export function calculateAdaptiveThreshold(observedPeaks: number[], safetyMargin: number = 0.6): number {
  if (observedPeaks.length === 0) return 3.5; // Default

  // Filter outliers (shots that are way higher/lower than others)
  const sorted = [...observedPeaks].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = sorted.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);

  // Use median of filtered values
  const median = filtered[Math.floor(filtered.length / 2)] ?? sorted[Math.floor(sorted.length / 2)];

  // Set threshold at safetyMargin * median (allows for shot variation)
  return Math.round(median * safetyMargin * 10) / 10;
}

/**
 * Estimate expected peak G-force range for a caliber.
 * Useful for validation and UI hints.
 */
export function getExpectedPeakRange(caliber: string | null): {
  min: number;
  max: number;
  typical: number;
} {
  const caliberData = getCaliberSensitivity(caliber);

  if (!caliberData) {
    return { min: 2.0, max: 8.0, typical: 3.5 };
  }

  const base = caliberData.sensitivity;
  return {
    min: Math.round(base * 0.7 * 10) / 10,
    max: Math.round(base * 2.5 * 10) / 10,
    typical: base,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { CALIBER_SENSITIVITY_MAP, CATEGORY_DEFAULT_SENSITIVITY };
