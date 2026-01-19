/**
 * Trends Section
 *
 * Shows performance changes over time.
 * "Am I improving or decaying — and why?"
 *
 * AI Explanation:
 * - Each card has a "Why?" button
 * - Explanations load on demand (never auto-load)
 * - Cached per insight ID
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Activity,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AIExplanationBlock, WhyButton } from '../AIExplanationBlock';
import { useAIExplanations, type ExplanationParams } from '../AIExplanationProvider';
import type { TrendData, TrendDataPoint, TrendDirection } from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface TrendsSectionProps {
  trends: TrendData[];
  onTrendPress?: (trend: TrendData) => void;
  maxVisible?: number;
  /** Hide section header (for use inside accordion) */
  hideHeader?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_WIDTH = Dimensions.get('window').width - 80;
const CHART_HEIGHT = 60;

// ============================================================================
// MINI CHART COMPONENT
// ============================================================================

interface MiniChartProps {
  dataPoints: TrendDataPoint[];
  direction: TrendDirection;
  colors: ReturnType<typeof useColors>;
}

function MiniChart({ dataPoints, direction, colors }: MiniChartProps) {
  if (dataPoints.length < 2) {
    return (
      <View style={[styles.chartContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.noDataText, { color: colors.textMuted }]}>
          Not enough data
        </Text>
      </View>
    );
  }

  // Determine chart color based on direction
  const chartColor =
    direction === 'improving'
      ? colors.green
      : direction === 'declining'
      ? colors.red
      : colors.primary;

  // Calculate chart bounds
  const values = dataPoints.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Calculate points for SVG path
  const pointWidth = CHART_WIDTH / (dataPoints.length - 1);
  const points = dataPoints.map((point, index) => {
    const x = index * pointWidth;
    const y = CHART_HEIGHT - ((point.value - minValue) / range) * CHART_HEIGHT;
    return { x, y };
  });

  // Create SVG path
  const pathData = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Create area fill path
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <View style={[styles.chartContainer, { backgroundColor: colors.background }]}>
      {/* Simple visualization using Views instead of SVG for React Native */}
      <View style={styles.chartInner}>
        {/* Trend line approximation using absolute positioned dots */}
        {points.map((point, index) => (
          <View
            key={index}
            style={[
              styles.chartDot,
              {
                left: point.x - 3,
                bottom: CHART_HEIGHT - point.y - 3,
                backgroundColor: chartColor,
              },
            ]}
          />
        ))}
        
        {/* Connecting lines */}
        {points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1];
          const length = Math.sqrt(
            Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
          );
          const angle =
            Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);

          return (
            <View
              key={`line-${index}`}
              style={[
                styles.chartLine,
                {
                  width: length,
                  left: point.x,
                  bottom: CHART_HEIGHT - point.y - 1,
                  backgroundColor: chartColor,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                },
              ]}
            />
          );
        })}

        {/* Y-axis labels */}
        <Text style={[styles.chartLabel, styles.chartLabelTop, { color: colors.textMuted }]}>
          {Math.round(maxValue)}
        </Text>
        <Text style={[styles.chartLabel, styles.chartLabelBottom, { color: colors.textMuted }]}>
          {Math.round(minValue)}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// TREND CARD COMPONENT
// ============================================================================

interface TrendCardProps {
  trend: TrendData;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function TrendCard({ trend, onPress, colors }: TrendCardProps) {
  const isImproving = trend.direction === 'improving';
  const isDeclining = trend.direction === 'declining';
  const accentColor = isImproving
    ? colors.green
    : isDeclining
    ? colors.red
    : colors.primary;

  const TrendIcon = isImproving
    ? TrendingUp
    : isDeclining
    ? TrendingDown
    : Activity;

  const magnitudeUnit = trend.metricType === 'grouping' ? 'cm' : '%';
  const magnitudeSign = isImproving ? (trend.metricType === 'grouping' ? '-' : '+') : '';

  const { getExplanation, isLoading, getError, requestExplanation } = useAIExplanations();
  
  const insightId = trend.id;
  const explanation = getExplanation(insightId);
  const loading = isLoading(insightId);
  const error = getError(insightId);

  const handleRequestExplanation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const isGrouping = trend.metricType === 'grouping';
    
    // Get first and last data points for baseline comparison
    const firstValue = trend.dataPoints[0]?.value ?? 0;
    const lastValue = trend.dataPoints[trend.dataPoints.length - 1]?.value ?? 0;
    
    // Map trend direction to metric direction
    let metricDirection: 'up' | 'down' | 'stable' = 'stable';
    if (isImproving) {
      metricDirection = isGrouping ? 'down' : 'up'; // For grouping, improving = tighter = down
    } else if (isDeclining) {
      metricDirection = isGrouping ? 'up' : 'down';
    }
    
    const params: ExplanationParams = {
      insight_type: 'trend',
      metric_type: isGrouping ? 'grouping' : 'accuracy',
      decided_values: {
        current_value: lastValue,
        baseline_value: firstValue,
        is_significant: Math.abs(trend.magnitude) > (isGrouping ? 1 : 5),
        direction: metricDirection,
        confidence: trend.confidence || 'medium',
        data_points: trend.dataPoints.length,
        unit: isGrouping ? 'cm' : '%',
      },
      context: {
        evidence_session_ids: trend.evidenceIds || [],
        category_label: trend.label,
        engine_context: `${trend.direction} trend (${magnitudeSign}${Math.abs(trend.magnitude)}${magnitudeUnit}) over ${trend.timeWindow}. ${trend.trigger || ''}`,
      },
    };
    
    requestExplanation(insightId, params);
  };

  return (
    <TouchableOpacity
      style={[styles.trendCard, { backgroundColor: colors.card }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.trendIconContainer, { backgroundColor: `${accentColor}15` }]}>
          <TrendIcon size={18} color={accentColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.trendLabel, { color: colors.text }]}>
            {trend.label}
          </Text>
          <View style={styles.directionRow}>
            <View style={[styles.directionBadge, { backgroundColor: `${accentColor}15` }]}>
              <Text style={[styles.directionText, { color: accentColor }]}>
                {magnitudeSign}
                {Math.abs(trend.magnitude)}
                {magnitudeUnit} {trend.timeWindow}
              </Text>
            </View>
          </View>
        </View>
        <WhyButton
          onPress={handleRequestExplanation}
          loading={loading}
          hasExplanation={!!explanation?.success}
        />
        {onPress && (
          <ChevronRight size={16} color={colors.textMuted} />
        )}
      </View>

      {/* Chart */}
      <MiniChart
        dataPoints={trend.dataPoints}
        direction={trend.direction}
        colors={colors}
      />

      {/* Trigger / Context */}
      {trend.trigger && (
        <View style={[styles.triggerContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="information-circle" size={14} color={colors.textMuted} />
          <Text style={[styles.triggerText, { color: colors.textMuted }]}>
            {trend.trigger}
          </Text>
        </View>
      )}

      {/* AI Explanation (appears after "Why?" is clicked) */}
      {(explanation || loading) && (
        <AIExplanationBlock
          response={explanation}
          loading={loading}
          error={error}
          onRequestExplanation={handleRequestExplanation}
          showTrigger={false}
          compact
        />
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Activity size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Tracking your progress
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Continue training to see trends emerge over time
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TrendsSection({
  trends,
  onTrendPress,
  maxVisible = 3,
  hideHeader = false,
}: TrendsSectionProps) {
  const colors = useColors();
  const visibleTrends = trends.slice(0, maxVisible);

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Activity size={14} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Trends
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            How your performance is changing
          </Text>
        </View>
      )}

      {visibleTrends.length > 0 ? (
        <View style={styles.cardsContainer}>
          {visibleTrends.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              onPress={onTrendPress ? () => onTrendPress(trend) : undefined}
              colors={colors}
            />
          ))}
          {trends.length > maxVisible && (
            <Text style={[styles.moreText, { color: colors.textMuted }]}>
              +{trends.length - maxVisible} more trends
            </Text>
          )}
        </View>
      ) : (
        !hideHeader && <EmptyState colors={colors} />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  // Section header
  sectionHeader: {
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginLeft: 36,
  },

  // Cards
  cardsContainer: {
    gap: 12,
  },

  // Trend card
  trendCard: {
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trendIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  trendLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  directionRow: {
    flexDirection: 'row',
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  directionText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Chart
  chartContainer: {
    height: CHART_HEIGHT + 20,
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
  },
  chartInner: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  chartDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chartLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  chartLabel: {
    position: 'absolute',
    fontSize: 9,
    right: 0,
  },
  chartLabelTop: {
    top: 0,
  },
  chartLabelBottom: {
    bottom: 0,
  },
  noDataText: {
    fontSize: 11,
    textAlign: 'center',
  },

  // Trigger
  triggerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 12,
  },

  // More text
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 12,
  },
  emptyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default TrendsSection;
