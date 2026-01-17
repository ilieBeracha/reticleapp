/**
 * Totals Section
 *
 * Performance snapshot with horizontal metric cards.
 * Shows immediate situational awareness: "What is my current performance state?"
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { TotalsMetric } from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface TotalsSectionProps {
  metrics: TotalsMetric[];
  onMetricPress?: (metric: TotalsMetric) => void;
  isLoading?: boolean;
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  metric: TotalsMetric;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function MetricCard({ metric, onPress, colors }: MetricCardProps) {
  const hasTrend = metric.trend && metric.trend !== 'stable';
  const trendColor =
    metric.trend === 'up' ? colors.green : metric.trend === 'down' ? colors.red : colors.textMuted;

  return (
    <TouchableOpacity
      style={[styles.metricCard, { backgroundColor: colors.card }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Value */}
      <View style={styles.valueRow}>
        <Text style={[styles.metricValue, { color: colors.text }]}>
          {typeof metric.value === 'number'
            ? metric.value.toLocaleString()
            : metric.value}
        </Text>
        {metric.unit && (
          <Text style={[styles.metricUnit, { color: colors.textMuted }]}>
            {metric.unit}
          </Text>
        )}
      </View>

      {/* Label */}
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
        {metric.label}
      </Text>

      {/* Subtitle / Trend */}
      {(metric.subtitle || hasTrend) && (
        <View style={styles.subtitleRow}>
          {metric.subtitle && (
            <Text style={[styles.metricSubtitle, { color: colors.textMuted }]}>
              {metric.subtitle}
            </Text>
          )}
          {hasTrend && (
            <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
              {metric.trend === 'up' ? (
                <TrendingUp size={10} color={trendColor} />
              ) : (
                <TrendingDown size={10} color={trendColor} />
              )}
              {metric.trendDelta !== undefined && (
                <Text style={[styles.trendText, { color: trendColor }]}>
                  {metric.trendDelta > 0 ? '+' : ''}
                  {metric.trendDelta}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Tap indicator */}
      {onPress && (
        <View style={styles.tapIndicator}>
          <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// SKELETON CARD
// ============================================================================

function SkeletonCard({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.metricCard, styles.skeletonCard, { backgroundColor: colors.card }]}>
      <View
        style={[styles.skeletonValue, { backgroundColor: colors.border }]}
      />
      <View
        style={[styles.skeletonLabel, { backgroundColor: colors.border }]}
      />
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TotalsSection({ metrics, onMetricPress, isLoading }: TotalsSectionProps) {
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          PERFORMANCE SNAPSHOT
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} colors={colors} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        PERFORMANCE SNAPSHOT
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            onPress={
              onMetricPress && metric.evidenceIds.length > 0
                ? () => onMetricPress(metric)
                : undefined
            }
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 20,
  },

  // Metric card
  metricCard: {
    minWidth: 100,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metricSubtitle: {
    fontSize: 10,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tapIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    opacity: 0.5,
  },

  // Skeleton
  skeletonCard: {
    minWidth: 100,
    height: 80,
  },
  skeletonValue: {
    width: 50,
    height: 24,
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
});

export default TotalsSection;
