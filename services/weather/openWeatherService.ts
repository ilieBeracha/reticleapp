// ============================================================================
// OPENWEATHERMAP SERVICE
// ============================================================================
//
// Service for fetching current weather data from OpenWeatherMap API.
// Uses the free Current Weather API: https://openweathermap.org/current
//
// ============================================================================

import type {
    FetchWeatherResponse,
    OpenWeatherConfig,
    OpenWeatherResponse,
} from '@/types/weather';

// ============================================================================
// CONSTANTS
// ============================================================================

const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Default configuration for OpenWeatherMap API.
 * Uses metric units (Celsius, m/s) for consistency with shooting analytics.
 */
const DEFAULT_CONFIG: Omit<OpenWeatherConfig, 'apiKey'> = {
  units: 'metric',
  lang: 'en',
};

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get the OpenWeatherMap API key from environment variables.
 * 
 * @returns API key or null if not configured
 */
export function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  return key && key.trim() !== '' ? key : null;
}

/**
 * Check if the OpenWeatherMap service is configured.
 * 
 * @returns true if API key is available
 */
export function isConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Fetch current weather data for given coordinates.
 * 
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param config - Optional configuration overrides
 * @returns Weather response or error
 * 
 * @example
 * ```ts
 * const result = await fetchCurrentWeather(32.0853, 34.7818);
 * if (result.success) {
 *   console.log(result.data.main.temp); // Temperature in Celsius
 * }
 * ```
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
  config?: Partial<OpenWeatherConfig>
): Promise<FetchWeatherResponse> {
  const apiKey = config?.apiKey ?? getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'OpenWeatherMap API key not configured. Set EXPO_PUBLIC_OPENWEATHER_API_KEY.',
    };
  }

  const { units, lang } = { ...DEFAULT_CONFIG, ...config };

  const params = new URLSearchParams({
    lat: latitude.toString(),
    lon: longitude.toString(),
    appid: apiKey,
    units: units ?? 'metric',
    lang: lang ?? 'en',
  });

  const url = `${BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message ?? `HTTP ${response.status}: ${response.statusText}`,
        code: response.status,
      };
    }

    const data: OpenWeatherResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to fetch weather: ${message}`,
    };
  }
}

/**
 * Fetch weather by city name (alternative method).
 * 
 * @param cityName - City name (e.g., "Tel Aviv", "New York,US")
 * @param config - Optional configuration overrides
 * @returns Weather response or error
 */
export async function fetchWeatherByCity(
  cityName: string,
  config?: Partial<OpenWeatherConfig>
): Promise<FetchWeatherResponse> {
  const apiKey = config?.apiKey ?? getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'OpenWeatherMap API key not configured. Set EXPO_PUBLIC_OPENWEATHER_API_KEY.',
    };
  }

  const { units, lang } = { ...DEFAULT_CONFIG, ...config };

  const params = new URLSearchParams({
    q: cityName,
    appid: apiKey,
    units: units ?? 'metric',
    lang: lang ?? 'en',
  });

  const url = `${BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message ?? `HTTP ${response.status}: ${response.statusText}`,
        code: response.status,
      };
    }

    const data: OpenWeatherResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to fetch weather: ${message}`,
    };
  }
}
