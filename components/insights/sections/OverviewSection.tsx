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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  ChevronRight,
  Crosshair,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type {
  ConfidenceLevel,
  FocusItem,
  OverviewStatus,
  TrendSummary,
  TrustItem,
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
  /** Callback when "View Details" is pressed */
  onViewDetails?: () => void;
}

// ============================================================================
// CONFIDENCE BADGE
// ============================================================================

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  colors: ReturnType<typeof useColors>;
}

function ConfidenceBadge({ confidence, colors }: ConfidenceBadgeProps) {
  const config = {
    high: { label: 'High', color: colors.green },
    medium: { label: 'Med', color: colors.textMuted },
    low: { label: 'Low', color: colors.textMuted },
  }[confidence];

  return (
    <Text style={[styles.confidenceText, { color: config.color }]}>
      {config.label} conf.
    </Text>
  );
}

// ============================================================================
// METRIC BLOCK (Accuracy or Grouping)
// ============================================================================

interface MetricBlockProps {
  title: string;
  summary: TrendSummary;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function MetricBlock({ title, summary, onPress, colors }: MetricBlockProps) {
  const isImproving = summary.direction === 'improving';
  const isDeclining = summary.direction === 'declining';
  const statusColor = isImproving
    ? colors.green
    : isDeclining
    ? colors.red
    : colors.textMuted;

  const DirectionIcon = isImproving
    ? TrendingUp
    : isDeclining
    ? TrendingDown
    : null;

  // Format delta display
  const deltaPrefix = summary.delta > 0 ? '+' : '';
  const deltaDisplay = `${deltaPrefix}${summary.delta}${summary.unit}`;

  // For grouping, negative delta is good (tighter groups)
  const displayDelta = title === 'GROUPING' 
    ? (summary.delta < 0 ? `${Math.abs(summary.delta)}${summary.unit} tighter` : `${summary.delta}${summary.unit} looser`)
    : deltaDisplay;

  return (
    <TouchableOpacity
      style={[styles.metricBlock, { backgroundColor: colors.background }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.metricTitle, { color: colors.textMuted }]}>{title}</Text>

      <View style={styles.metricValueRow}>
        <Text style={[styles.metricValue, { color: colors.text }]}>
          {summary.currentValue}
          <Text style={[styles.metricUnit, { color: colors.textMuted }]}>
            {summary.unit}
          </Text>
        </Text>
        {DirectionIcon && summary.delta !== 0 && (
          <View style={[styles.deltaContainer, { backgroundColor: `${statusColor}15` }]}>
            <DirectionIcon size={12} color={statusColor} />
            <Text style={[styles.deltaText, { color: statusColor }]}>
              {displayDelta}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metricFooter}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {summary.direction.charAt(0).toUpperCase() + summary.direction.slice(1)}
          </Text>
        </View>
        <ConfidenceBadge confidence={summary.confidence} colors={colors} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// FOCUS LINE
// ============================================================================

interface FocusLineProps {
  focusItem: FocusItem;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function FocusLine({ focusItem, onPress, colors }: FocusLineProps) {
  return (
    <TouchableOpacity
      style={styles.focusLine}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.focusIcon, { backgroundColor: `${colors.red}15` }]}>
        <Target size={12} color={colors.red} />
      </View>
      <View style={styles.focusContent}>
        <Text style={[styles.focusLabel, { color: colors.textMuted }]}>FOCUS</Text>
        <Text style={[styles.focusText, { color: colors.text }]} numberOfLines={1}>
          {focusItem.label} — {focusItem.reason}
        </Text>
      </View>
      {onPress && <ChevronRight size={14} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

// ============================================================================
// TRUST LINE
// ============================================================================

interface TrustLineProps {
  trustItem: TrustItem;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function TrustLine({ trustItem, onPress, colors }: TrustLineProps) {
  return (
    <TouchableOpacity
      style={styles.trustLine}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.trustIcon, { backgroundColor: `${colors.green}15` }]}>
        <Shield size={12} color={colors.green} />
      </View>
      <View style={styles.trustContent}>
        <Text style={[styles.trustLabel, { color: colors.textMuted }]}>TRUST</Text>
        <Text style={[styles.trustText, { color: colors.text }]} numberOfLines={1}>
          {trustItem.label} — {trustItem.primaryValue}
        </Text>
      </View>
      {onPress && <ChevronRight size={14} color={colors.textMuted} />}
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
        <Ionicons name="hourglass-outline" size={16} color={colors.primary} />
        <Text style={[styles.lowDataTitle, { color: colors.text }]}>
          Building Your Baseline
        </Text>
      </View>
      <Text style={[styles.lowDataText, { color: colors.textMuted }]}>
        Complete {sessionsNeeded} more session{sessionsNeeded !== 1 ? 's' : ''} to unlock performance insights
      </Text>
      <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.textMuted }]}>
        {sessionCount} of {totalNeeded} sessions
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
  onViewDetails,
}: OverviewSectionProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Crosshair size={14} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Training Overview
          </Text>
        </View>
        <Text style={[styles.sessionCount, { color: colors.textMuted }]}>
          {status.sessionCount} session{status.sessionCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Content */}
      {status.hasEnoughData ? (
        <>
          {/* Metric Blocks */}
          <View style={styles.metricsRow}>
            {status.accuracy && (
              <MetricBlock
                title="ACCURACY"
                summary={status.accuracy}
                onPress={onAccuracyPress}
                colors={colors}
              />
            )}
            {status.grouping && (
              <MetricBlock
                title="GROUPING"
                summary={status.grouping}
                onPress={onGroupingPress}
                colors={colors}
              />
            )}
            {!status.accuracy && !status.grouping && (
              <View style={[styles.noMetricsContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.noMetricsText, { color: colors.textMuted }]}>
                  No trend data available yet
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Focus & Trust Lines */}
          {status.focusItem && (
            <FocusLine
              focusItem={status.focusItem}
              onPress={onFocusPress}
              colors={colors}
            />
          )}
          {status.trustItem && (
            <TrustLine
              trustItem={status.trustItem}
              onPress={onTrustPress}
              colors={colors}
            />
          )}
          {!status.focusItem && !status.trustItem && (
            <View style={styles.noInsightsContainer}>
              <Text style={[styles.noInsightsText, { color: colors.textMuted }]}>
                Continue training to identify strengths and focus areas
              </Text>
            </View>
          )}

          {/* View Details Button */}
          {onViewDetails && (
            <TouchableOpacity
              style={[styles.viewDetailsButton, { backgroundColor: colors.background }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onViewDetails();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewDetailsText, { color: colors.primary }]}>
                View Details
              </Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
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
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sessionCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBlock: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: '500',
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: 2,
  },

  // Focus Line
  focusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  focusIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusContent: {
    flex: 1,
    gap: 1,
  },
  focusLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  focusText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Trust Line
  trustLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  trustIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustContent: {
    flex: 1,
    gap: 1,
  },
  trustLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trustText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // No data states
  noMetricsContainer: {
    flex: 1,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMetricsText: {
    fontSize: 12,
    textAlign: 'center',
  },
  noInsightsContainer: {
    paddingVertical: 8,
  },
  noInsightsText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // View Details Button
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Low Data State
  lowDataContainer: {
    gap: 12,
  },
  lowDataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  lowDataTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  lowDataText: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default OverviewSection;
