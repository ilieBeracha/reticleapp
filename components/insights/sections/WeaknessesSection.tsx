/**
 * Weaknesses Section
 *
 * Shows areas where user performs below baseline or has high variance.
 * "What is limiting my ceiling right now?"
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, ChevronRight, TrendingDown } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { WeaknessCard } from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface WeaknessesSectionProps {
  weaknesses: WeaknessCard[];
  onWeaknessPress?: (weakness: WeaknessCard) => void;
  maxVisible?: number;
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mechanical: 'construct',
  decision: 'bulb',
  stress: 'heart',
  position: 'body',
  weapon: 'hardware-chip',
  variance: 'pulse',
};

// ============================================================================
// SEVERITY INDICATOR
// ============================================================================

interface SeverityIndicatorProps {
  delta: number;
  variance: number | null;
  colors: ReturnType<typeof useColors>;
}

function SeverityIndicator({ delta, variance, colors }: SeverityIndicatorProps) {
  // Determine severity based on delta and variance
  const isHighSeverity = Math.abs(delta) >= 10 || (variance && variance >= 30);
  const baseColor = isHighSeverity ? colors.red : '#F59E0B'; // Red or Amber

  return (
    <View style={[styles.severityBadge, { backgroundColor: `${baseColor}15` }]}>
      {isHighSeverity ? (
        <AlertTriangle size={10} color={baseColor} />
      ) : (
        <TrendingDown size={10} color={baseColor} />
      )}
      <Text style={[styles.severityText, { color: baseColor }]}>
        {isHighSeverity ? 'High priority' : 'Attention needed'}
      </Text>
    </View>
  );
}

// ============================================================================
// VARIANCE INDICATOR
// ============================================================================

interface VarianceIndicatorProps {
  variance: number;
  colors: ReturnType<typeof useColors>;
}

function VarianceIndicator({ variance, colors }: VarianceIndicatorProps) {
  const isHigh = variance >= 30;
  const color = isHigh ? colors.red : '#F59E0B';

  return (
    <View style={[styles.varianceBadge, { backgroundColor: `${color}10` }]}>
      <Ionicons name="pulse" size={12} color={color} />
      <Text style={[styles.varianceText, { color }]}>
        {variance}% variance
      </Text>
    </View>
  );
}

// ============================================================================
// WEAKNESS CARD COMPONENT
// ============================================================================

interface WeaknessCardItemProps {
  weakness: WeaknessCard;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function WeaknessCardItem({ weakness, onPress, colors }: WeaknessCardItemProps) {
  const iconName = CATEGORY_ICONS[weakness.category] || 'warning';
  const isHighSeverity = Math.abs(weakness.metric.delta) >= 10 || (weakness.variance && weakness.variance >= 30);
  const accentColor = isHighSeverity ? colors.red : '#F59E0B';

  return (
    <TouchableOpacity
      style={[styles.weaknessCard, { backgroundColor: colors.card }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}15` }]}>
            <Ionicons name={iconName} size={16} color={accentColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.weaknessLabel, { color: colors.text }]}>
              {weakness.label}
            </Text>
            <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
              {weakness.category === 'variance'
                ? 'Consistency Issue'
                : weakness.category.charAt(0).toUpperCase() + weakness.category.slice(1)}
            </Text>
          </View>
          {onPress && (
            <ChevronRight size={16} color={colors.textMuted} />
          )}
        </View>

        {/* Value & Context */}
        <View style={styles.valueSection}>
          <View style={styles.primaryValueRow}>
            <Text style={[styles.primaryValue, { color: accentColor }]}>
              {weakness.primaryValue}
            </Text>
            {weakness.metric.direction === 'down' && weakness.metric.delta !== 0 && (
              <View style={[styles.deltaBadge, { backgroundColor: `${accentColor}15` }]}>
                <TrendingDown size={12} color={accentColor} />
                <Text style={[styles.deltaText, { color: accentColor }]}>
                  {Math.round(weakness.metric.delta)}
                  {weakness.metric.unit || '%'}
                </Text>
              </View>
            )}
          </View>
          {weakness.context && (
            <Text style={[styles.contextText, { color: colors.textMuted }]}>
              {weakness.context}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <SeverityIndicator
            delta={weakness.metric.delta}
            variance={weakness.variance}
            colors={colors}
          />
          {weakness.variance && weakness.variance > 0 && (
            <VarianceIndicator variance={weakness.variance} colors={colors} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.green}10` }]}>
        <Ionicons name="checkmark-circle" size={24} color={colors.green} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No significant weaknesses
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Your performance is consistent across all areas
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeaknessesSection({
  weaknesses,
  onWeaknessPress,
  maxVisible = 5,
}: WeaknessesSectionProps) {
  const colors = useColors();
  const visibleWeaknesses = weaknesses.slice(0, maxVisible);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.red}15` }]}>
            <AlertTriangle size={14} color={colors.red} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Weaknesses
          </Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          What's limiting your ceiling
        </Text>
      </View>

      {visibleWeaknesses.length > 0 ? (
        <View style={styles.cardsContainer}>
          {visibleWeaknesses.map((weakness) => (
            <WeaknessCardItem
              key={weakness.id}
              weakness={weakness}
              onPress={onWeaknessPress ? () => onWeaknessPress(weakness) : undefined}
              colors={colors}
            />
          ))}
          {weaknesses.length > maxVisible && (
            <Text style={[styles.moreText, { color: colors.textMuted }]}>
              +{weaknesses.length - maxVisible} more areas to improve
            </Text>
          )}
        </View>
      ) : (
        <EmptyState colors={colors} />
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
    gap: 10,
  },

  // Weakness card
  weaknessCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 10,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  weaknessLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Value section
  valueSection: {
    gap: 4,
  },
  primaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contextText: {
    fontSize: 13,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  varianceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  varianceText: {
    fontSize: 10,
    fontWeight: '600',
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

export default WeaknessesSection;
