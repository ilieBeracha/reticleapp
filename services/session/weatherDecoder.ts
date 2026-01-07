// ============================================================================
// WEATHER DECODER
// ============================================================================
//
// Decodes compact weather data from watch and provides analysis utilities.
// Weather is critical for shooting analytics - wind, temperature, and pressure
// directly affect bullet trajectory and shooter performance.
//
// ============================================================================

import type { DecodedWeather, WatchWeatherPayload } from './watchTypes';

// ============================================================================
// CONDITION CATEGORIES (for analytics)
// ============================================================================

/**
 * Weather condition categories for shooting analytics.
 * Grouped by impact on shooting performance.
 */
export const CONDITION_CATEGORIES = {
  /** Perfect conditions - minimal impact on shooting */
  ideal: ['Clear', 'Fair'],
  /** Good conditions - slight impact possible */
  good: ['PartlyCloudy', 'MostlyCloudy', 'Cloudy'],
  /** Challenging conditions - noticeable impact on shooting */
  challenging: ['Windy', 'LightRain', 'Drizzle', 'Fog', 'Hazy', 'Dust', 'Smoke'],
  /** Difficult conditions - significant impact on accuracy */
  difficult: ['Rain', 'HeavyRain', 'Snow', 'LightSnow', 'ScatteredShowers', 'ScatteredThunderstorms'],
  /** Extreme conditions - shooting not recommended */
  extreme: ['HeavySnow', 'Thunderstorms', 'Tornado', 'Hurricane', 'TropicalStorm', 'Hail', 'Sandstorm', 'VolcanicAsh', 'Ice', 'Squall', 'Sand'],
} as const;

// ============================================================================
// WIND IMPACT THRESHOLDS (m/s)
// ============================================================================

/**
 * Wind speed thresholds for impact assessment.
 * Based on typical ballistic impact on bullet trajectory.
 */
export const WIND_THRESHOLDS = {
  /** < 2 m/s: Minimal bullet drift */
  calm: 2,
  /** 2-5 m/s: Noticeable drift at distance */
  light: 5,
  /** 5-8 m/s: Significant drift, holdoff needed */
  moderate: 8,
  /** > 8 m/s: Challenging conditions */
  strong: Infinity,
} as const;

// ============================================================================
// DECODER FUNCTIONS
// ============================================================================

/**
 * Decode weather payload from watch to human-readable format.
 * Handles both compact format (t, h, ws) and verbose format (temp, hum, press).
 * 
 * @param weather - Weather payload from watch (any format)
 * @returns Decoded weather with calculated values and assessments
 */
export function decodeWeather(weather: WatchWeatherPayload | null | undefined): DecodedWeather | null {
  if (!weather) return null;
  
  // Safety check - weather must be an object
  if (typeof weather !== 'object') {
    console.warn('[WeatherDecoder] Invalid weather payload (not an object):', typeof weather);
    return null;
  }

  try {
    // Handle both compact (t) and verbose (temp) formats
    // Compact format: t is Celsius × 10, Verbose format: temp is raw Celsius
    let temperatureC: number | null = null;
    if (weather.temp != null) {
      // Verbose format: raw Celsius
      temperatureC = weather.temp;
    } else if (weather.t != null) {
      // Compact format: Celsius × 10
      temperatureC = weather.t / 10;
    }
    const temperatureF = temperatureC != null ? (temperatureC * 9) / 5 + 32 : null;

    // Handle both compact (ws) and verbose (wind) formats
    // Compact format: ws is m/s × 10, Verbose format: wind is raw m/s
    let windSpeedMps: number | null = null;
    if (weather.wind != null) {
      // Verbose format: raw m/s
      windSpeedMps = weather.wind;
    } else if (weather.ws != null) {
      // Compact format: m/s × 10
      windSpeedMps = weather.ws / 10;
    }
    const windSpeedMph = windSpeedMps != null ? windSpeedMps * 2.237 : null;
    const windSpeedKph = windSpeedMps != null ? windSpeedMps * 3.6 : null;

    // Humidity: both formats use direct value
    const humidity = weather.hum ?? weather.h ?? null;
    
    // Wind direction: both formats
    const windDirection = weather.windDir ?? weather.wd ?? null;
    
    // Wind bearing: only compact format
    const windBearing = weather.wb ?? null;
    
    // Pressure: both formats use direct hPa value
    const pressureHpa = weather.press ?? weather.p ?? null;
    
    // Condition: both formats
    const condition = weather.cond ?? weather.c ?? null;

    // Calculate assessments
    const windImpact = getWindImpact(windSpeedMps);
    const conditionSeverity = getConditionSeverity(condition);

    return {
      temperatureC,
      temperatureF,
      humidity,
      windSpeedMps,
      windSpeedMph,
      windSpeedKph,
      windDirection,
      windBearing,
      pressureHpa,
      condition,
      windImpact,
      conditionSeverity,
    };
  } catch (error) {
    console.error('[WeatherDecoder] Error decoding weather:', error);
    return null;
  }
}

/**
 * Assess wind impact on shooting based on speed.
 * 
 * @param windSpeedMps - Wind speed in meters per second
 * @returns Impact category: calm | light | moderate | strong
 */
export function getWindImpact(windSpeedMps: number | null): 'calm' | 'light' | 'moderate' | 'strong' {
  if (windSpeedMps == null || windSpeedMps < WIND_THRESHOLDS.calm) {
    return 'calm';
  }
  if (windSpeedMps < WIND_THRESHOLDS.light) {
    return 'light';
  }
  if (windSpeedMps < WIND_THRESHOLDS.moderate) {
    return 'moderate';
  }
  return 'strong';
}

/**
 * Assess condition severity for shooting.
 * 
 * @param condition - Weather condition string from Garmin
 * @returns Severity category: ideal | good | challenging | difficult | extreme
 */
export function getConditionSeverity(
  condition: string | null
): 'ideal' | 'good' | 'challenging' | 'difficult' | 'extreme' {
  if (!condition || condition === 'Unknown') {
    return 'good'; // Default to good if unknown
  }

  for (const [severity, conditions] of Object.entries(CONDITION_CATEGORIES)) {
    if ((conditions as readonly string[]).includes(condition)) {
      return severity as keyof typeof CONDITION_CATEGORIES;
    }
  }

  return 'good'; // Default fallback
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format weather for display in UI.
 * 
 * @param weather - Decoded weather data
 * @param units - Temperature unit preference
 * @returns Formatted weather string
 */
export function formatWeatherDisplay(
  weather: DecodedWeather | null,
  units: 'metric' | 'imperial' = 'metric'
): string {
  if (!weather) return 'Weather unavailable';

  const parts: string[] = [];

  // Temperature
  if (units === 'imperial' && weather.temperatureF != null) {
    parts.push(`${weather.temperatureF.toFixed(0)}°F`);
  } else if (weather.temperatureC != null) {
    parts.push(`${weather.temperatureC.toFixed(0)}°C`);
  }

  // Wind
  if (weather.windSpeedMps != null && weather.windSpeedMps > 0) {
    const windSpeed = units === 'imperial'
      ? `${weather.windSpeedMph?.toFixed(0)} mph`
      : `${weather.windSpeedMps.toFixed(1)} m/s`;
    const direction = weather.windDirection || '';
    parts.push(`Wind ${windSpeed} ${direction}`.trim());
  }

  // Condition
  if (weather.condition && weather.condition !== 'Unknown') {
    parts.push(formatConditionName(weather.condition));
  }

  return parts.join(' • ') || 'Weather unavailable';
}

/**
 * Convert condition string to display-friendly name.
 */
export function formatConditionName(condition: string): string {
  // Convert CamelCase to spaced words
  return condition.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get weather badge color based on severity.
 */
export function getWeatherBadgeColor(severity: DecodedWeather['conditionSeverity']): string {
  switch (severity) {
    case 'ideal':
      return '#10B981'; // Green
    case 'good':
      return '#3B82F6'; // Blue
    case 'challenging':
      return '#F59E0B'; // Amber
    case 'difficult':
      return '#EF4444'; // Red
    case 'extreme':
      return '#7C3AED'; // Purple
    default:
      return '#6B7280'; // Gray
  }
}

/**
 * Get wind impact indicator for shooting UI.
 */
export function getWindIndicator(impact: DecodedWeather['windImpact']): {
  label: string;
  color: string;
  icon: 'wind-calm' | 'wind-light' | 'wind-moderate' | 'wind-strong';
} {
  switch (impact) {
    case 'calm':
      return { label: 'Calm', color: '#10B981', icon: 'wind-calm' };
    case 'light':
      return { label: 'Light wind', color: '#3B82F6', icon: 'wind-light' };
    case 'moderate':
      return { label: 'Moderate wind', color: '#F59E0B', icon: 'wind-moderate' };
    case 'strong':
      return { label: 'Strong wind', color: '#EF4444', icon: 'wind-strong' };
  }
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

/**
 * Check if weather conditions are suitable for precision shooting.
 */
export function isPrecisionConditions(weather: DecodedWeather | null): boolean {
  if (!weather) return true; // Assume OK if no data

  // Check wind
  if (weather.windImpact === 'strong' || weather.windImpact === 'moderate') {
    return false;
  }

  // Check condition severity
  if (weather.conditionSeverity === 'difficult' || weather.conditionSeverity === 'extreme') {
    return false;
  }

  return true;
}

/**
 * Get weather-adjusted expectations for analytics.
 * Can be used to normalize performance comparisons.
 */
export function getWeatherDifficultyMultiplier(weather: DecodedWeather | null): number {
  if (!weather) return 1.0;

  let multiplier = 1.0;

  // Wind impact
  switch (weather.windImpact) {
    case 'light':
      multiplier *= 1.05;
      break;
    case 'moderate':
      multiplier *= 1.15;
      break;
    case 'strong':
      multiplier *= 1.30;
      break;
  }

  // Condition severity
  switch (weather.conditionSeverity) {
    case 'challenging':
      multiplier *= 1.05;
      break;
    case 'difficult':
      multiplier *= 1.15;
      break;
    case 'extreme':
      multiplier *= 1.30;
      break;
  }

  return multiplier;
}

