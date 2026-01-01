/**
 * useWeaponCategory Hook
 * 
 * Provides category-aware context for the training experience.
 * The weapon category shapes what you see, what defaults apply,
 * and how your performance is evaluated.
 */

import {
    CATEGORY_CONFIGS,
    type CategoryConfig,
    type QuickPreset,
    evaluateDispersion,
    evaluateSplitTime,
    getCategoryConfig,
    getCategoryDistances,
    getCategoryDrillDefaults,
    getCategoryPresets,
    getCategoryZeroDistance,
    getSuggestedTimeLimit,
    isDistanceAppropriate,
    presetToDrillConfig,
} from '@/constants/weaponCategories';
import type { DrillConfig } from '@/services/session/types';
import type { WeaponCategory } from '@/types/workspace';
import { useCallback, useMemo } from 'react';

interface UseWeaponCategoryResult {
  /** Current category config */
  config: CategoryConfig;
  
  /** Appropriate distances for this category */
  distances: number[];
  
  /** Default zeroing distance */
  zeroDistance: number;
  
  /** Quick start presets for this category */
  presets: QuickPreset[];
  
  /** Check if a distance makes sense for this category */
  isDistanceValid: (distance: number) => boolean;
  
  /** Get default drill config for this category */
  getDefaultDrillConfig: (overrides?: Partial<DrillConfig>) => DrillConfig;
  
  /** Convert a preset to a full drill config */
  presetToConfig: (preset: QuickPreset) => DrillConfig;
  
  /** Evaluate dispersion quality for this category */
  evaluateDispersion: (distance: number, dispersionCm: number) => 'excellent' | 'good' | 'average' | 'needs_work';
  
  /** Evaluate split time quality for this category */
  evaluateSplit: (splitMs: number) => 'excellent' | 'good' | 'average' | 'slow';
  
  /** Get suggested time limit based on rounds */
  getSuggestedTimeLimit: (rounds: number) => number;
}

/**
 * Hook for category-aware training experience
 * 
 * @param category - The weapon category (from selected weapon or drill)
 */
export function useWeaponCategory(
  category: WeaponCategory | null | undefined
): UseWeaponCategoryResult {
  const config = useMemo(() => getCategoryConfig(category), [category]);
  const distances = useMemo(() => getCategoryDistances(category), [category]);
  const zeroDistance = useMemo(() => getCategoryZeroDistance(category), [category]);
  const presets = useMemo(() => getCategoryPresets(category), [category]);
  const drillDefaults = useMemo(() => getCategoryDrillDefaults(category), [category]);
  
  const isDistanceValid = useCallback(
    (distance: number) => isDistanceAppropriate(category, distance),
    [category]
  );
  
  const getDefaultDrillConfig = useCallback(
    (overrides?: Partial<DrillConfig>): DrillConfig => ({
      name: 'Practice',
      drill_goal: drillDefaults.primaryGoal,
      target_type: drillDefaults.targetType,
      distance_m: zeroDistance,
      rounds_per_shooter: drillDefaults.roundsPerDrill,
      time_limit_seconds: null,
      strings_count: drillDefaults.stringsCount,
      ...overrides,
    }),
    [drillDefaults, zeroDistance]
  );
  
  const presetToConfig = useCallback(
    (preset: QuickPreset): DrillConfig => 
      presetToDrillConfig(preset, category || 'any') as DrillConfig,
    [category]
  );
  
  const evalDispersion = useCallback(
    (distance: number, dispersionCm: number) => 
      evaluateDispersion(category, distance, dispersionCm),
    [category]
  );
  
  const evalSplit = useCallback(
    (splitMs: number) => evaluateSplitTime(category, splitMs),
    [category]
  );
  
  const getTimeLimit = useCallback(
    (rounds: number) => getSuggestedTimeLimit(category, rounds),
    [category]
  );
  
  return {
    config,
    distances,
    zeroDistance,
    presets,
    isDistanceValid,
    getDefaultDrillConfig,
    presetToConfig,
    evaluateDispersion: evalDispersion,
    evaluateSplit: evalSplit,
    getSuggestedTimeLimit: getTimeLimit,
  };
}

/**
 * Get all available categories
 */
export function useAllCategories() {
  return useMemo(() => {
    return Object.entries(CATEGORY_CONFIGS).map(([key, config]) => ({
      value: key as WeaponCategory,
      label: config.label,
      description: config.description,
      icon: config.icon,
    }));
  }, []);
}

/**
 * Get category label for display
 */
export function getCategoryLabel(category: WeaponCategory | null | undefined): string {
  return getCategoryConfig(category).label;
}

/**
 * Get category icon name
 */
export function getCategoryIcon(category: WeaponCategory | null | undefined): string {
  return getCategoryConfig(category).icon;
}


