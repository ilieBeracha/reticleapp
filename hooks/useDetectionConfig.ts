/**
 * useDetectionConfig
 * 
 * Elegantly derives shot detection sensitivity from weapon properties.
 * Automatically calibrates for different firearms, suppressors, and brakes.
 * 
 * @example
 * ```tsx
 * function SessionPrepView({ weaponId }) {
 *   const { config, sensitivity, setSensitivity, isAuto, resetToAuto } = useDetectionConfig({
 *     weaponId,
 *   });
 *   
 *   // config is ready to pass to buildWatchSessionPayload
 *   const payload = buildWatchSessionPayload(session, { 
 *     weapon: config.weapon 
 *   });
 * }
 * ```
 */

import { getWeaponById } from '@/services/weaponService';
import {
  deriveDetectionConfig,
  findClosestPreset,
  type DetectionConfig,
  type SensitivityPresetId,
  type WeaponDetectionInput,
} from '@/utils/detectionSensitivity';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseDetectionConfigOptions {
  /** Weapon ID to fetch and derive config from */
  weaponId?: string | null;
  /** Weapon category (if already known, skips fetch) */
  weaponCategory?: string | null;
  /** Weapon caliber (if already known, skips fetch) */
  caliber?: string | null;
  /** Initial manual override */
  initialSensitivity?: number | null;
}

export interface UseDetectionConfigReturn {
  /** Full detection config (ready for watch payload) */
  config: DetectionConfig;
  
  /** Current sensitivity value */
  sensitivity: number;
  
  /** Set manual sensitivity override */
  setSensitivity: (value: number) => void;
  
  /** Whether using auto-derived sensitivity */
  isAuto: boolean;
  
  /** Reset to auto-derived sensitivity */
  resetToAuto: () => void;
  
  /** Currently closest preset */
  closestPreset: SensitivityPresetId;
  
  /** Select a preset */
  selectPreset: (presetId: SensitivityPresetId) => void;
  
  /** Weapon info for payload building */
  weapon: WeaponDetectionInput;
  
  /** Loading state */
  loading: boolean;
  
  /** Description of current config source */
  description: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDetectionConfig(
  options: UseDetectionConfigOptions = {}
): UseDetectionConfigReturn {
  const { weaponId, weaponCategory, caliber, initialSensitivity } = options;
  
  // State
  const [loading, setLoading] = useState(!!weaponId);
  const [weaponData, setWeaponData] = useState<{
    category?: string | null;
    caliber?: string | null;
    hasSuppressor?: boolean;
    hasMuzzleBrake?: boolean;
  }>({
    category: weaponCategory,
    caliber: caliber,
  });
  const [manualSensitivity, setManualSensitivity] = useState<number | null>(
    initialSensitivity ?? null
  );
  
  // Fetch weapon details if needed
  useEffect(() => {
    if (!weaponId) {
      setLoading(false);
      return;
    }
    
    // If we already have category and caliber, skip fetch
    if (weaponCategory && caliber) {
      setWeaponData({ category: weaponCategory, caliber });
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    
    async function loadWeapon() {
      try {
        const weapon = await getWeaponById(weaponId!);
        if (weapon && !cancelled) {
          setWeaponData({
            category: weapon.category,
            caliber: weapon.caliber,
            hasSuppressor: weapon.has_suppressor,
            hasMuzzleBrake: weapon.has_muzzle_brake,
          });
        }
      } catch (error) {
        console.warn('[useDetectionConfig] Failed to fetch weapon:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadWeapon();
    
    return () => {
      cancelled = true;
    };
  }, [weaponId, weaponCategory, caliber]);
  
  // Build weapon input for detection derivation
  const weaponInput = useMemo((): WeaponDetectionInput => ({
    category: weaponData.category as any,
    caliber: weaponData.caliber,
    hasSuppressor: weaponData.hasSuppressor,
    hasMuzzleBrake: weaponData.hasMuzzleBrake,
    customSensitivity: manualSensitivity,
  }), [weaponData, manualSensitivity]);
  
  // Derive auto config from weapon
  const autoConfig = useMemo(() => {
    return deriveDetectionConfig({
      category: weaponData.category as any,
      caliber: weaponData.caliber,
      hasSuppressor: weaponData.hasSuppressor,
      hasMuzzleBrake: weaponData.hasMuzzleBrake,
    });
  }, [weaponData]);
  
  // Build final config (manual override or auto)
  const config = useMemo((): DetectionConfig => {
    if (manualSensitivity !== null) {
      return {
        sensitivity: manualSensitivity,
        minThreshold: manualSensitivity * 0.5,
        maxThreshold: manualSensitivity * 3.0,
        cooldownMs: autoConfig.cooldownMs,
        profile: autoConfig.profile,
        description: 'Manual',
      };
    }
    return autoConfig;
  }, [manualSensitivity, autoConfig]);
  
  // Derived values
  const isAuto = manualSensitivity === null;
  const sensitivity = config.sensitivity;
  const closestPreset = findClosestPreset(sensitivity);
  const description = isAuto ? autoConfig.description : 'Manual override';
  
  // Actions
  const setSensitivity = useCallback((value: number) => {
    setManualSensitivity(value);
  }, []);
  
  const resetToAuto = useCallback(() => {
    setManualSensitivity(null);
  }, []);
  
  const selectPreset = useCallback((presetId: SensitivityPresetId) => {
    const presets = {
      light: 2.0,
      medium: 3.5,
      heavy: 4.5,
      shotgun: 5.5,
    };
    setManualSensitivity(presets[presetId]);
  }, []);
  
  return {
    config,
    sensitivity,
    setSensitivity,
    isAuto,
    resetToAuto,
    closestPreset,
    selectPreset,
    weapon: weaponInput,
    loading,
    description,
  };
}

export default useDetectionConfig;

