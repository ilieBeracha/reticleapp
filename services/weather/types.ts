// ============================================================================
// OPENWEATHERMAP API TYPES
// ============================================================================
//
// Types for OpenWeatherMap Current Weather API response.
// API Docs: https://openweathermap.org/current
//
// ============================================================================

/**
 * OpenWeatherMap current weather API response.
 */
export interface OpenWeatherResponse {
  /** Coordinates */
  coord: {
    /** Longitude */
    lon: number;
    /** Latitude */
    lat: number;
  };
  /** Weather conditions array */
  weather: OpenWeatherCondition[];
  /** Internal parameter */
  base: string;
  /** Main weather data */
  main: {
    /** Temperature (Kelvin by default, Celsius with units=metric) */
    temp: number;
    /** Temperature feels like */
    feels_like: number;
    /** Minimum temperature */
    temp_min: number;
    /** Maximum temperature */
    temp_max: number;
    /** Atmospheric pressure (hPa) */
    pressure: number;
    /** Humidity percentage */
    humidity: number;
    /** Pressure at sea level (hPa) */
    sea_level?: number;
    /** Pressure at ground level (hPa) */
    grnd_level?: number;
  };
  /** Visibility in meters (max 10km) */
  visibility: number;
  /** Wind data */
  wind: {
    /** Wind speed (m/s with units=metric) */
    speed: number;
    /** Wind direction in degrees (meteorological) */
    deg: number;
    /** Wind gust (m/s) */
    gust?: number;
  };
  /** Cloudiness data */
  clouds: {
    /** Cloudiness percentage */
    all: number;
  };
  /** Rain data (optional) */
  rain?: {
    /** Rain volume for last 1 hour (mm) */
    '1h'?: number;
    /** Rain volume for last 3 hours (mm) */
    '3h'?: number;
  };
  /** Snow data (optional) */
  snow?: {
    /** Snow volume for last 1 hour (mm) */
    '1h'?: number;
    /** Snow volume for last 3 hours (mm) */
    '3h'?: number;
  };
  /** Unix timestamp of data calculation (UTC) */
  dt: number;
  /** System data */
  sys: {
    /** Internal type */
    type?: number;
    /** Internal id */
    id?: number;
    /** Country code */
    country: string;
    /** Sunrise time (Unix UTC) */
    sunrise: number;
    /** Sunset time (Unix UTC) */
    sunset: number;
  };
  /** Timezone shift from UTC in seconds */
  timezone: number;
  /** City ID */
  id: number;
  /** City name */
  name: string;
  /** Internal cod */
  cod: number;
}

/**
 * Weather condition from OpenWeatherMap.
 */
export interface OpenWeatherCondition {
  /** Weather condition id */
  id: number;
  /** Group of weather parameters (Rain, Snow, Clouds, etc.) */
  main: OpenWeatherConditionMain;
  /** Weather condition description */
  description: string;
  /** Weather icon id */
  icon: string;
}

/**
 * Main weather condition groups from OpenWeatherMap.
 * Maps to our DecodedWeather condition categories.
 */
export type OpenWeatherConditionMain =
  | 'Thunderstorm'
  | 'Drizzle'
  | 'Rain'
  | 'Snow'
  | 'Mist'
  | 'Smoke'
  | 'Haze'
  | 'Dust'
  | 'Fog'
  | 'Sand'
  | 'Ash'
  | 'Squall'
  | 'Tornado'
  | 'Clear'
  | 'Clouds';

/**
 * OpenWeatherMap API error response.
 */
export interface OpenWeatherError {
  cod: string | number;
  message: string;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Configuration for OpenWeatherMap service.
 */
export interface OpenWeatherConfig {
  /** API key for OpenWeatherMap */
  apiKey: string;
  /** Units: 'metric' (Celsius, m/s), 'imperial' (Fahrenheit, mph), 'standard' (Kelvin) */
  units?: 'metric' | 'imperial' | 'standard';
  /** Language for descriptions */
  lang?: string;
}

/**
 * Result from fetching weather.
 */
export interface FetchWeatherResult {
  success: true;
  data: OpenWeatherResponse;
}

/**
 * Error from fetching weather.
 */
export interface FetchWeatherError {
  success: false;
  error: string;
  code?: number;
}

export type FetchWeatherResponse = FetchWeatherResult | FetchWeatherError;
