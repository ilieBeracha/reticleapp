/**
 * Insights Constants
 *
 * Runtime constants for the Insights module.
 */

import type { InsightsFilters, ThresholdConfig } from '@/types/insights';

// Wind speed definitions (m/s)
export const WIND_BUCKETS = {
  calm: { min: 0, max: 2, label: 'Calm (<2 m/s)' },
  light: { min: 2, max: 5, label: 'Light (2-5 m/s)' },
  moderate: { min: 5, max: 10, label: 'Moderate (5-10 m/s)' },
  strong: { min: 10, max: Infinity, label: 'Strong (>10 m/s)' },
} as const;

// Time of day definitions (hours, 24h format)
export const TIME_OF_DAY_BUCKETS = {
  morning: { min: 5, max: 11, label: 'Morning (5-11)' },
  midday: { min: 11, max: 14, label: 'Midday (11-14)' },
  afternoon: { min: 14, max: 18, label: 'Afternoon (14-18)' },
  evening: { min: 18, max: 22, label: 'Evening (18-22)' },
} as const;

export const DEFAULT_FILTERS: InsightsFilters = {
  time: 'all',
  weaponId: null,
  weaponCategory: null,
  teamId: null,
  position: 'all',
  distance: 'all',
  drillType: 'all',
  stressOnly: false,
  timedOnly: false,
  // Environmental defaults
  wind: 'all',
  timeOfDay: 'all',
  environment: 'all',
  lighting: 'all',
};

// Distance bucket definitions (in meters)
export const DISTANCE_BUCKETS = {
  close: { min: 0, max: 25, label: '<=25m' },
  medium: { min: 25, max: 100, label: '25-100m' },
  long: { min: 100, max: 300, label: '100-300m' },
  precision: { min: 300, max: Infinity, label: '300m+' },
} as const;

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  accuracy: {
    absoluteFloor: 5,
    relativeFactor: 0.15,
  },
  grouping: {
    close: 0.3,
    medium: 0.5,
    long: 1.0,
    precision: 1.5,
    default: 0.5,
  },
  variance: 0.3,
};
