/**
 * Overview Section (Training Overview Card)
 *
 * The primary component answering "Am I improving?" within 2 seconds.
 * Displays accuracy/grouping status, focus area, and trust area in a single card.
 *
 * ARCHITECTURE:
 * - All data is deterministic (from insights engine)
 * - No AI-generated content
 * - Evidence accessible via tap
 * - Low-data states are explicit and encouraging (not gamified)
 *
 * CONSTRAINTS:
 * - Must answer "Am I improving?" without scrolling
 * - Must show confidence levels
 * - Must provide evidence access
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type {
  ConfidenceLevel,
  OverviewStatus,
  TrendSummary,
} from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface OverviewSectionProps {
  /** Computed overview status from engine */
  status: OverviewStatus;
  /** Callback when accuracy block is pressed */
  onAccuracyPress?: () => void;
  /** Callback when grouping block is pressed */
  onGroupingPress?: () => void;
  /** Callback when focus item is pressed */
  onFocusPress?: () => void;
  /** Callback when trust item is pressed */
  onTrustPress?: () => void;
}

// ============================================================================
// CONFIDENCE DOT
// ============================================================================

function ConfidenceDot({ confidence, colors }: { confidence: ConfidenceLevel; colors: ReturnType<typeof useColors> }) {
  const color = confidence === 'high' ? colors.green : confidence === 'medium' ? colors.orange || '#F59E0B' : colors.textMuted;
  return <View style={[styles.confDot, { backgroundColor: color }]} />;
}

// ============================================================================
// METRIC CARD (enhanced trend display)
// ============================================================================

interface MetricCardProps {
  summary: TrendSummary;
  label: string;
  isGrouping?: boolean;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function MetricCard({ summary, label, isGrouping, onPress, colors }: MetricCardProps) {
  const isImproving = summary.direction === 'improving';
  const isDeclining = summary.direction === 'declining';
  const isStable = summary.direction === 'stable';
  const statusColor = isImproving ? colors.green : isDeclining ? colors.red : colors.textMuted;
  const Icon = isImproving ? TrendingUp : isDeclining ? TrendingDown : Minus;

  // Format delta - for grouping, negative is good
  const deltaAbs = Math.abs(summary.delta);
  const deltaText = isGrouping
    ? (summary.delta < 0 ? `-${deltaAbs}${summary.unit}` : `+${deltaAbs}${summary.unit}`)
    : (summary.delta > 0 ? `+${summary.delta}${summary.unit}` : `${summary.delta}${summary.unit}`);

  return (
    <TouchableOpacity
      style={[styles.metricCard, { backgroundColor: colors.card }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      {/* Top row: Label + Confidence */}
      <View style={styles.metricTop}>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
        <ConfidenceDot confidence={summary.confidence} colors={colors} />
      </View>

      {/* Main value */}
      <Text style={[styles.metricValue, { color: colors.text }]}>
        {summary.currentValue}
        <Text style={[styles.metricUnit, { color: colors.textMuted }]}>{summary.unit}</Text>
      </Text>

      {/* Delta row */}
      <View style={styles.metricBottom}>
        <View style={[styles.deltaChip, { backgroundColor: `${statusColor}12` }]}>
          <Icon size={10} color={statusColor} />
          <Text style={[styles.deltaText, { color: statusColor }]}>
            {isStable ? 'Stable' : deltaText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// INSIGHT ROW (Focus or Trust - minimal)
// ============================================================================

interface InsightRowProps {
  type: 'focus' | 'trust';
  label: string;
  detail: string;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function InsightRow({ type, label, detail, onPress, colors }: InsightRowProps) {
  const isFocus = type === 'focus';
  const accentColor = isFocus ? colors.orange || '#F59E0B' : colors.green;
  const Icon = isFocus ? AlertCircle : CheckCircle2;

  return (
    <TouchableOpacity
      style={styles.insightRow}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <Icon size={13} color={accentColor} />
      <Text style={[styles.insightLabel, { color: accentColor }]}>{isFocus ? 'Focus:' : 'Strong:'}</Text>
      <Text style={[styles.insightText, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// LOW DATA STATE
// ============================================================================

interface LowDataStateProps {
  sessionCount: number;
  sessionsNeeded: number;
  colors: ReturnType<typeof useColors>;
}

function LowDataState({ sessionCount, sessionsNeeded, colors }: LowDataStateProps) {
  const totalNeeded = sessionCount + sessionsNeeded;
  const progress = sessionCount / totalNeeded;

  return (
    <View style={styles.lowDataContainer}>
      <View style={[styles.lowDataHeader, { backgroundColor: `${colors.primary}10` }]}>
        <Clock size={13} color={colors.primary} />
        <Text style={[styles.lowDataTitle, { color: colors.text }]}>
          Building baseline
        </Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.textMuted }]}>
        {sessionsNeeded} more session{sessionsNeeded !== 1 ? 's' : ''} for insights
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OverviewSection({
  status,
  onAccuracyPress,
  onGroupingPress,
  onFocusPress,
  onTrustPress,
}: OverviewSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Content */}
      {status.hasEnoughData ? (
        <>
          {/* Quick stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Target size={12} color={colors.textMuted} />
              <Text style={[styles.statValue, { color: colors.text }]}>{status.sessionCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>sessions</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Zap size={12} color={colors.textMuted} />
              <Text style={[styles.statValue, { color: colors.text }]}>{status.shotCount.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>rounds</Text>
            </View>
          </View>

          {/* Metric Cards Row */}
          <View style={styles.metricsRow}>
            {status.accuracy && (
              <MetricCard
                summary={status.accuracy}
                label="Accuracy"
                onPress={onAccuracyPress}
                colors={colors}
              />
            )}
            {status.grouping && (
              <MetricCard
                summary={status.grouping}
                label="Grouping"
                isGrouping
                onPress={onGroupingPress}
                colors={colors}
              />
            )}
          </View>

          {/* Insights (Focus & Trust) */}
          {(status.focusItem || status.trustItem) && (
            <View style={[styles.insightsCard, { backgroundColor: colors.card }]}>
              {status.focusItem && (
                <InsightRow
                  type="focus"
                  label={status.focusItem.label}
                  detail={status.focusItem.reason}
                  onPress={onFocusPress}
                  colors={colors}
                />
              )}
              {status.focusItem && status.trustItem && (
                <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
              )}
              {status.trustItem && (
                <InsightRow
                  type="trust"
                  label={status.trustItem.label}
                  detail={status.trustItem.primaryValue}
                  onPress={onTrustPress}
                  colors={colors}
                />
              )}
            </View>
          )}
        </>
      ) : (
        <LowDataState
          sessionCount={status.sessionCount}
          sessionsNeeded={status.sessionsNeeded}
          colors={colors}
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 8,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    opacity: 0.3,
  },

  // Confidence dot
  confDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Insights Card
  insightsCard: {
    borderRadius: 10,
    padding: 10,
    gap: 0,
  },
  insightDivider: {
    height: 1,
    marginVertical: 6,
    opacity: 0.2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },

  // Low Data State
  lowDataContainer: {
    gap: 8,
  },
  lowDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  lowDataTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
  },
});

export default OverviewSection;
