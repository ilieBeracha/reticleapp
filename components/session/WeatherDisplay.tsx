/**
 * Weather Display Components
 * 
 * Reusable components for displaying weather data in session views.
 * Includes both compact badge and full card variants.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { DecodedWeather } from '@/services/session/watchTypes';
import {
  formatConditionName,
  formatWeatherDisplay,
  getWeatherBadgeColor,
  getWindIndicator,
} from '@/services/session/weatherDecoder';
import { Cloud, Droplets, Gauge, Sun, Thermometer, Wind } from 'lucide-react-native';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface WeatherBadgeProps {
  /** Decoded weather data from watch */
  weather: DecodedWeather | null;
  /** Compact mode - just icon and condition */
  compact?: boolean;
}

interface WeatherCardProps {
  /** Decoded weather data from watch */
  weather: DecodedWeather | null;
  /** Use metric or imperial units */
  units?: 'metric' | 'imperial';
}

// ============================================================================
// WEATHER BADGE (Compact - for lists)
// ============================================================================

export const WeatherBadge = memo(function WeatherBadge({ 
  weather, 
  compact = false 
}: WeatherBadgeProps) {
  const colors = useColors();
  
  if (!weather) return null;
  
  const badgeColor = getWeatherBadgeColor(weather.conditionSeverity);
  const windInfo = getWindIndicator(weather.windImpact);
  const conditionIcon = getConditionIcon(weather.condition);
  
  if (compact) {
    // Ultra-compact: just icon and temp
    return (
      <View style={[styles.badgeCompact, { backgroundColor: `${badgeColor}15` }]}>
        {conditionIcon}
        {weather.temperatureC != null && (
          <Text style={[styles.badgeCompactText, { color: badgeColor }]}>
            {Math.round(weather.temperatureC)}°
          </Text>
        )}
      </View>
    );
  }
  
  return (
    <View style={[styles.badge, { backgroundColor: `${badgeColor}15` }]}>
      {conditionIcon}
      <View style={styles.badgeContent}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>
          {weather.condition ? formatConditionName(weather.condition) : 'Weather'}
        </Text>
        {weather.windSpeedMps != null && weather.windSpeedMps > 1 && (
          <Text style={[styles.badgeSubtext, { color: colors.textMuted }]}>
            {weather.windSpeedMps.toFixed(1)} m/s {weather.windDirection || ''}
          </Text>
        )}
      </View>
      {/* Wind impact indicator */}
      {weather.windImpact !== 'calm' && (
        <View style={[styles.windBadge, { backgroundColor: `${windInfo.color}20` }]}>
          <Wind size={10} color={windInfo.color} />
        </View>
      )}
    </View>
  );
});

// ============================================================================
// WEATHER CARD (Full - for detail pages)
// ============================================================================

export const WeatherCard = memo(function WeatherCard({ 
  weather, 
  units = 'metric' 
}: WeatherCardProps) {
  const colors = useColors();
  
  if (!weather) return null;
  
  const badgeColor = getWeatherBadgeColor(weather.conditionSeverity);
  const windInfo = getWindIndicator(weather.windImpact);
  const conditionIcon = getConditionIcon(weather.condition, 24);
  
  // Temperature display
  const temp = units === 'imperial' 
    ? weather.temperatureF 
    : weather.temperatureC;
  const tempUnit = units === 'imperial' ? '°F' : '°C';
  
  // Wind display
  const windSpeed = units === 'imperial'
    ? weather.windSpeedMph
    : weather.windSpeedMps;
  const windUnit = units === 'imperial' ? 'mph' : 'm/s';
  
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.conditionIconBg, { backgroundColor: `${badgeColor}20` }]}>
          {conditionIcon}
        </View>
        <View style={styles.cardHeaderContent}>
          <Text style={[styles.conditionText, { color: colors.text }]}>
            {weather.condition ? formatConditionName(weather.condition) : 'Weather Conditions'}
          </Text>
          <View style={[styles.severityBadge, { backgroundColor: `${badgeColor}20` }]}>
            <Text style={[styles.severityText, { color: badgeColor }]}>
              {weather.conditionSeverity.charAt(0).toUpperCase() + weather.conditionSeverity.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Temperature */}
        {temp != null && (
          <WeatherStat
            icon={<Thermometer size={16} color={colors.orange} />}
            label="Temperature"
            value={`${Math.round(temp)}${tempUnit}`}
            colors={colors}
          />
        )}
        
        {/* Wind */}
        {windSpeed != null && windSpeed > 0 && (
          <WeatherStat
            icon={<Wind size={16} color={windInfo.color} />}
            label={`Wind (${windInfo.label})`}
            value={`${windSpeed.toFixed(1)} ${windUnit} ${weather.windDirection || ''}`}
            colors={colors}
            highlight={weather.windImpact === 'moderate' || weather.windImpact === 'strong'}
          />
        )}
        
        {/* Humidity */}
        {weather.humidity != null && (
          <WeatherStat
            icon={<Droplets size={16} color={colors.blue} />}
            label="Humidity"
            value={`${weather.humidity}%`}
            colors={colors}
          />
        )}
        
        {/* Pressure */}
        {weather.pressureHpa != null && (
          <WeatherStat
            icon={<Gauge size={16} color={colors.textMuted} />}
            label="Pressure"
            value={`${weather.pressureHpa} hPa`}
            colors={colors}
          />
        )}
      </View>
      
      {/* Wind Impact Warning */}
      {(weather.windImpact === 'moderate' || weather.windImpact === 'strong') && (
        <View style={[styles.windWarning, { backgroundColor: `${windInfo.color}15` }]}>
          <Wind size={14} color={windInfo.color} />
          <Text style={[styles.windWarningText, { color: windInfo.color }]}>
            {weather.windImpact === 'strong' 
              ? 'Strong wind - expect significant bullet drift'
              : 'Moderate wind - adjust for drift'}
          </Text>
        </View>
      )}
    </View>
  );
});

// ============================================================================
// INLINE WEATHER DISPLAY (For session summary)
// ============================================================================

export const WeatherInline = memo(function WeatherInline({ 
  weather 
}: { weather: DecodedWeather | null }) {
  const colors = useColors();
  
  if (!weather) return null;
  
  const displayText = formatWeatherDisplay(weather, 'metric');
  
  return (
    <View style={styles.inline}>
      <Cloud size={12} color={colors.textMuted} />
      <Text style={[styles.inlineText, { color: colors.textMuted }]}>
        {displayText}
      </Text>
    </View>
  );
});

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface WeatherStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
}

function WeatherStat({ icon, label, value, colors, highlight }: WeatherStatProps) {
  return (
    <View style={[
      styles.stat, 
      { backgroundColor: highlight ? `${colors.orange}10` : colors.background }
    ]}>
      {icon}
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

/**
 * Get weather condition icon based on condition string.
 */
function getConditionIcon(condition: string | null, size = 16): React.ReactNode {
  const iconProps = { size, strokeWidth: 2 };
  
  // Default gray color - will be overridden by parent styling if needed
  const color = '#6B7280';
  
  if (!condition) {
    return <Cloud {...iconProps} color={color} />;
  }
  
  // Map conditions to icons
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('clear') || lowerCondition.includes('fair')) {
    return <Sun {...iconProps} color="#F59E0B" />;
  }
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
    return <Droplets {...iconProps} color="#3B82F6" />;
  }
  if (lowerCondition.includes('wind')) {
    return <Wind {...iconProps} color="#6B7280" />;
  }
  if (lowerCondition.includes('cloud')) {
    return <Cloud {...iconProps} color="#9CA3AF" />;
  }
  
  return <Cloud {...iconProps} color={color} />;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Badge (compact)
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  badgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeCompactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeContent: {
    flex: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeSubtext: {
    fontSize: 10,
    marginTop: 1,
  },
  windBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Card (full)
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  conditionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderContent: {
    flex: 1,
    gap: 4,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: '45%',
    flex: 1,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
  },
  windWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  windWarningText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  
  // Inline
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineText: {
    fontSize: 11,
  },
});

