// ============================================================================
// OPENWEATHERMAP DECODER
// ============================================================================
//
// Transforms OpenWeatherMap API responses to the unified DecodedWeather format
// used throughout the app. This enables seamless integration with existing
// WeatherDisplay components.
//
// ============================================================================

import type { SessionWeatherData } from '@/types/session';
import type { DecodedWeather } from '@/types/session.watch';
import {
    getConditionSeverity,
    getWindImpact,
} from '@/services/session/weatherDecoder';

import type { OpenWeatherConditionMain, OpenWeatherResponse } from '@/types/weather';

// ============================================================================
// CONDITION MAPPING
// ============================================================================

/**
 * Maps OpenWeatherMap condition codes to our internal condition strings.
 * These match the Garmin WeatherCondition type for consistency.
 */
const CONDITION_MAP: Record<OpenWeatherConditionMain, string> = {
  Thunderstorm: 'Thunderstorms',
  Drizzle: 'Drizzle',
  Rain: 'Rain',
  Snow: 'Snow',
  Mist: 'Fog',
  Smoke: 'Smoke',
  Haze: 'Hazy',
  Dust: 'Dust',
  Fog: 'Fog',
  Sand: 'Sand',
  Ash: 'VolcanicAsh',
  Squall: 'Squall',
  Tornado: 'Tornado',
  Clear: 'Clear',
  Clouds: 'Cloudy',
};

/**
 * Maps cloudiness percentage to more specific condition.
 */
function getCloudCondition(cloudinessPercent: number): string {
  if (cloudinessPercent <= 10) return 'Clear';
  if (cloudinessPercent <= 25) return 'Fair';
  if (cloudinessPercent <= 50) return 'PartlyCloudy';
  if (cloudinessPercent <= 75) return 'MostlyCloudy';
  return 'Cloudy';
}

// ============================================================================
// WIND DIRECTION CONVERSION
// ============================================================================

/**
 * Converts wind bearing (degrees) to cardinal direction.
 * 
 * @param degrees - Wind direction in degrees (0-360)
 * @returns Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
function degreesToCardinal(degrees: number | undefined): string | null {
  if (degrees === undefined || degrees === null) return null;

  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;

  return directions[index];
}

// ============================================================================
// DECODER FUNCTION
// ============================================================================

/**
 * Decode OpenWeatherMap response to DecodedWeather format.
 * 
 * This transforms the OWM response to match the same format used by
 * the Garmin watch weather, enabling both to work with WeatherDisplay.
 * 
 * @param response - OpenWeatherMap API response
 * @returns DecodedWeather format for UI components
 * 
 * @example
 * ```ts
 * const result = await fetchCurrentWeather(lat, lon);
 * if (result.success) {
 *   const weather = decodeOpenWeather(result.data);
 *   // Use with <WeatherCard weather={weather} />
 * }
 * ```
 */
export function decodeOpenWeather(
  response: OpenWeatherResponse | null | undefined
): DecodedWeather | null {
  if (!response) return null;

  try {
    const { main, wind, weather, clouds } = response;

    // Temperature (already in Celsius when using units=metric)
    const temperatureC = main.temp;
    const temperatureF = (temperatureC * 9) / 5 + 32;

    // Humidity
    const humidity = main.humidity;

    // Wind (already in m/s when using units=metric)
    const windSpeedMps = wind.speed;
    const windSpeedMph = windSpeedMps * 2.237;
    const windSpeedKph = windSpeedMps * 3.6;
    const windBearing = wind.deg ?? null;
    const windDirection = degreesToCardinal(wind.deg);

    // Pressure
    const pressureHpa = main.pressure;

    // Condition - get from weather array or derive from clouds
    let condition: string;
    if (weather && weather.length > 0) {
      const mainCondition = weather[0].main;
      // For clouds, use cloudiness percentage for more granularity
      if (mainCondition === 'Clouds') {
        condition = getCloudCondition(clouds?.all ?? 50);
      } else {
        condition = CONDITION_MAP[mainCondition] ?? mainCondition;
      }
    } else {
      condition = getCloudCondition(clouds?.all ?? 0);
    }

    // Calculate assessments using existing functions from weatherDecoder
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
    console.error('[OpenWeatherDecoder] Error decoding weather:', error);
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a human-readable weather summary from OpenWeatherMap response.
 * 
 * @param response - OpenWeatherMap API response
 * @returns Summary string like "Clear, 22°C, light wind"
 */
export function getWeatherSummary(
  response: OpenWeatherResponse | null | undefined
): string {
  if (!response) return 'Weather unavailable';

  const { main, weather, wind } = response;
  const parts: string[] = [];

  // Condition
  if (weather && weather.length > 0) {
    parts.push(weather[0].description);
  }

  // Temperature
  parts.push(`${Math.round(main.temp)}°C`);

  // Wind if significant
  if (wind.speed > 2) {
    parts.push(`wind ${wind.speed.toFixed(1)} m/s`);
  }

  return parts.join(', ');
}

/**
 * Check if weather data is recent enough to use.
 * 
 * @param response - OpenWeatherMap API response
 * @param maxAgeMinutes - Maximum age in minutes (default: 30)
 * @returns true if data is fresh enough
 */
export function isWeatherFresh(
  response: OpenWeatherResponse | null | undefined,
  maxAgeMinutes = 30
): boolean {
  if (!response) return false;

  const dataTime = response.dt * 1000; // Convert to milliseconds
  const age = Date.now() - dataTime;
  const maxAge = maxAgeMinutes * 60 * 1000;

  return age < maxAge;
}

// ============================================================================
// SESSION WEATHER DATA CONVERSION
// ============================================================================

/**
 * Convert DecodedWeather to SessionWeatherData format for database storage.
 * 
 * @param weather - DecodedWeather from hook or decoder
 * @param source - Data source identifier
 * @returns SessionWeatherData for database storage
 * 
 * @example
 * ```ts
 * const { weather } = useOpenWeather();
 * const sessionWeather = toSessionWeatherData(weather, 'openweathermap');
 * await createSession({ ...config, weather: sessionWeather });
 * ```
 */
export function toSessionWeatherData(
  weather: DecodedWeather | null | undefined,
  source: 'openweathermap' | 'garmin_watch' | 'manual' = 'openweathermap'
): SessionWeatherData | null {
  if (!weather) return null;

  return {
    temperature_c: weather.temperatureC,
    temperature_f: weather.temperatureF,
    humidity: weather.humidity,
    wind_speed_mps: weather.windSpeedMps,
    wind_speed_mph: weather.windSpeedMph,
    wind_speed_kph: weather.windSpeedKph,
    wind_direction: weather.windDirection,
    wind_bearing: weather.windBearing,
    pressure_hpa: weather.pressureHpa,
    condition: weather.condition,
    wind_impact: weather.windImpact,
    condition_severity: weather.conditionSeverity,
    source,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Convert OpenWeatherMap response directly to SessionWeatherData.
 * Skips the DecodedWeather intermediate format.
 * 
 * @param response - OpenWeatherMap API response
 * @returns SessionWeatherData for database storage
 */
export function openWeatherToSessionData(
  response: OpenWeatherResponse | null | undefined
): SessionWeatherData | null {
  const decoded = decodeOpenWeather(response);
  return toSessionWeatherData(decoded, 'openweathermap');
}
