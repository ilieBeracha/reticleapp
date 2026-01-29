// ============================================================================
// USE OPEN WEATHER HOOK
// ============================================================================
//
// Hook for fetching weather data from OpenWeatherMap using IP-based geolocation.
// Returns DecodedWeather format compatible with WeatherDisplay components.
//
// Uses ip-api.com (free, no API key) for approximate location from IP address.
//
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

import type { DecodedWeather } from '@/services/session/watchTypes';
import type { OpenWeatherResponse } from '@/services/weather/types';
import { decodeOpenWeather } from '@/services/weather/openWeatherDecoder';
import { fetchCurrentWeather, isConfigured } from '@/services/weather/openWeatherService';

// ============================================================================
// TYPES
// ============================================================================

interface UseOpenWeatherOptions {
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
  /** Cache duration in minutes (default: 15) */
  cacheDurationMinutes?: number;
  /** Skip if no API key configured (default: true) */
  skipIfNotConfigured?: boolean;
}

interface UseOpenWeatherReturn {
  /** Decoded weather data (null if not available) */
  weather: DecodedWeather | null;
  /** Raw OpenWeatherMap response */
  rawData: OpenWeatherResponse | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current location coordinates */
  location: { latitude: number; longitude: number } | null;
  /** City name from IP geolocation */
  cityName: string | null;
  /** Whether API key is configured */
  isApiConfigured: boolean;
  /** Manually trigger a weather fetch */
  refetch: () => Promise<void>;
}

// ============================================================================
// IP GEOLOCATION
// ============================================================================

interface IpApiCoResponse {
  ip: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_code: string;
  country_name: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  country_calling_code: string;
  currency: string;
  languages: string;
  asn: string;
  org: string;
  error?: boolean;
  reason?: string;
}

/**
 * Get approximate location from IP address using ipapi.co (HTTPS, free, no API key).
 * Free tier: 1000 requests/day.
 */
async function getLocationFromIp(): Promise<{
  latitude: number;
  longitude: number;
  city: string;
}> {
  const response = await fetch('https://ipapi.co/json/');

  if (!response.ok) {
    throw new Error('Failed to fetch IP geolocation');
  }

  const data: IpApiCoResponse = await response.json();

  if (data.error) {
    throw new Error(data.reason || 'IP geolocation failed');
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city,
  };
}

// ============================================================================
// CACHE
// ============================================================================

interface WeatherCache {
  data: OpenWeatherResponse;
  timestamp: number;
  latitude: number;
  longitude: number;
}

let weatherCache: WeatherCache | null = null;

/**
 * Check if cached data is still valid.
 */
function isCacheValid(
  cache: WeatherCache | null,
  lat: number,
  lon: number,
  maxAgeMinutes: number
): boolean {
  if (!cache) return false;

  const age = Date.now() - cache.timestamp;
  const maxAge = maxAgeMinutes * 60 * 1000;

  // Check age
  if (age > maxAge) return false;

  // Check location hasn't changed significantly (within ~1km)
  const latDiff = Math.abs(cache.latitude - lat);
  const lonDiff = Math.abs(cache.longitude - lon);
  const locationChanged = latDiff > 0.01 || lonDiff > 0.01;

  return !locationChanged;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for fetching weather data from OpenWeatherMap.
 *
 * Handles:
 * - IP-based geolocation (no permissions needed)
 * - Fetching weather from OpenWeatherMap
 * - Caching to avoid repeated API calls
 * - Transforming to DecodedWeather format
 *
 * @param options - Configuration options
 * @returns Weather data and controls
 *
 * @example
 * ```tsx
 * function SessionWeather() {
 *   const { weather, loading, error, refetch } = useOpenWeather();
 *
 *   if (loading) return <ActivityIndicator />;
 *   if (error) return <Text>{error}</Text>;
 *   if (!weather) return null;
 *
 *   return <WeatherCard weather={weather} />;
 * }
 * ```
 */
export function useOpenWeather(
  options: UseOpenWeatherOptions = {}
): UseOpenWeatherReturn {
  const {
    autoFetch = true,
    cacheDurationMinutes = 15,
    skipIfNotConfigured = true,
  } = options;

  // State
  const [weather, setWeather] = useState<DecodedWeather | null>(null);
  const [rawData, setRawData] = useState<OpenWeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  // Refs
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  // Check if API is configured
  const isApiConfigured = isConfigured();

  /**
   * Fetch weather data.
   */
  const refetch = useCallback(async (): Promise<void> => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) return;

    // Skip if not configured
    if (skipIfNotConfigured && !isApiConfigured) {
      setError('OpenWeatherMap API key not configured');
      return;
    }

    fetchInProgress.current = true;
    setLoading(true);
    setError(null);

    try {
      // Get location from IP
      const geoData = await getLocationFromIp();
      const { latitude, longitude, city } = geoData;

      if (isMounted.current) {
        setLocation({ latitude, longitude });
        setCityName(city);
      }

      // Check cache
      if (
        isCacheValid(weatherCache, latitude, longitude, cacheDurationMinutes)
      ) {
        if (isMounted.current) {
          setRawData(weatherCache!.data);
          setWeather(decodeOpenWeather(weatherCache!.data));
          setLoading(false);
        }
        fetchInProgress.current = false;
        return;
      }

      // Fetch from API
      const result = await fetchCurrentWeather(latitude, longitude);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update cache
      weatherCache = {
        data: result.data,
        timestamp: Date.now(),
        latitude,
        longitude,
      };

      // Update state
      if (isMounted.current) {
        setRawData(result.data);
        setWeather(decodeOpenWeather(result.data));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch weather';
      if (isMounted.current) {
        setError(message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      fetchInProgress.current = false;
    }
  }, [cacheDurationMinutes, skipIfNotConfigured, isApiConfigured]);

  // Auto-fetch on mount
  useEffect(() => {
    isMounted.current = true;

    if (autoFetch && isApiConfigured) {
      refetch();
    }

    return () => {
      isMounted.current = false;
    };
  }, [autoFetch, isApiConfigured, refetch]);

  return {
    weather,
    rawData,
    loading,
    error,
    location,
    cityName,
    isApiConfigured,
    refetch,
  };
}

/**
 * Clear the weather cache (useful for testing or forcing fresh data).
 */
export function clearWeatherCache(): void {
  weatherCache = null;
}
