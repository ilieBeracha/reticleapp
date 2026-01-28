/**
 * Strengths Section
 *
 * Shows areas where user performs above baseline.
 * "What should I trust myself with?"
 *
 * AI Explanation:
 * - Each card has a "Why?" button
 * - Explanations load on demand (never auto-load)
 * - Cached per insight ID
 *
 * SEMANTIC CLARITY (v2.0):
 * - Grouping metrics now labeled as "Best Group" not "Grouping"
 * - Uses context-aware thresholds from engine
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Shield, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AIExplanationBlock, WhyButton } from '../AIExplanationBlock';
import { useAIExplanations, type ExplanationParams } from '../AIExplanationProvider';
import type { ConfidenceLevel, StrengthCard } from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface StrengthsSectionProps {
  strengths: StrengthCard[];
  onStrengthPress?: (strength: StrengthCard) => void;
  maxVisible?: number;
  /** Hide section header (for use inside accordion) */
  hideHeader?: boolean;
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  position: 'body',
  distance: 'resize',
  weapon: 'hardware-chip',
  stress: 'heart',
  consistency: 'analytics',
  first_shot: 'flash',
};

// ============================================================================
// CONFIDENCE BADGE
// ============================================================================

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  colors: ReturnType<typeof useColors>;
}

function ConfidenceBadge({ confidence, colors }: ConfidenceBadgeProps) {
  const { t } = useTranslation();
  const config = {
    high: { label: t('insights.confidence.high'), color: colors.green },
    medium: { label: t('insights.confidence.medium'), color: colors.textMuted },
    low: { label: t('insights.confidence.low'), color: colors.textMuted },
  }[confidence];

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: `${config.color}15` }]}>
      <View style={[styles.confidenceDot, { backgroundColor: config.color }]} />
      <Text style={[styles.confidenceText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ============================================================================
// STRENGTH CARD COMPONENT
// ============================================================================

interface StrengthCardItemProps {
  strength: StrengthCard;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function StrengthCardItem({ strength, onPress, colors }: StrengthCardItemProps) {
  const { t } = useTranslation();
  const iconName = CATEGORY_ICONS[strength.category] || 'checkmark-circle';
  const { getExplanation, isLoading, getError, requestExplanation } = useAIExplanations();
  
  const insightId = strength.id;
  const explanation = getExplanation(insightId);
  const loading = isLoading(insightId);
  const error = getError(insightId);

  const handleRequestExplanation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const isGrouping = strength.metric.unit === 'cm';
    const params: ExplanationParams = {
      insight_type: 'strength',
      metric_type: isGrouping ? 'grouping' : 'accuracy',
      decided_values: {
        current_value: strength.metric.value,
        baseline_value: strength.metric.baseline ?? strength.metric.value,
        is_significant: Math.abs(strength.metric.delta) > (isGrouping ? 0.5 : 5),
        direction: strength.metric.direction,
        confidence: strength.metric.confidence,
        data_points: strength.metric.dataPoints,
        unit: (strength.metric.unit as '%' | 'cm' | 's' | '') || '%',
      },
      context: {
        evidence_session_ids: strength.evidenceIds || [],
        category_label: strength.label,
        engine_context: strength.context,
      },
    };
    
    requestExplanation(insightId, params);
  };

  return (
    <TouchableOpacity
      style={[styles.strengthCard, { backgroundColor: colors.card }]}
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
      <View style={[styles.accentBar, { backgroundColor: colors.green }]} />

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.green}15` }]}>
            <Ionicons name={iconName} size={16} color={colors.green} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.strengthLabel, { color: colors.text }]}>
              {strength.label}
            </Text>
            <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
              {strength.category.charAt(0).toUpperCase() + strength.category.slice(1)}
            </Text>
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

        {/* Value & Context */}
        <View style={styles.valueSection}>
          <View style={styles.primaryValueRow}>
            <Text style={[styles.primaryValue, { color: colors.green }]}>
              {strength.primaryValue}
            </Text>
            {strength.metric.direction === 'up' && (
              <View style={[styles.deltaBadge, { backgroundColor: `${colors.green}15` }]}>
                <TrendingUp size={12} color={colors.green} />
                <Text style={[styles.deltaText, { color: colors.green }]}>
                  +{Math.abs(Math.round(strength.metric.delta))}
                  {strength.metric.unit || '%'}
                </Text>
              </View>
            )}
          </View>
          {strength.context && (
            <Text style={[styles.contextText, { color: colors.textMuted }]}>
              {strength.context}
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <ConfidenceBadge confidence={strength.metric.confidence} colors={colors} />
          <Text style={[styles.dataPointsText, { color: colors.textMuted }]}>
            {t('insights.shots', { count: strength.metric.dataPoints })}
          </Text>
        </View>

        {/* AI Explanation (appears after "Why?" is clicked) */}
        {(explanation || loading) && (
          <AIExplanationBlock
            response={explanation}
            loading={loading}
            error={error}
            onRequestExplanation={handleRequestExplanation}
            showTrigger={false}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.green}10` }]}>
        <Shield size={24} color={colors.green} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('insights.strengths.building')}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        {t('insights.strengths.keepTraining')}
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StrengthsSection({
  strengths,
  onStrengthPress,
  maxVisible = 5,
  hideHeader = false,
}: StrengthsSectionProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const visibleStrengths = strengths.slice(0, maxVisible);

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.sectionHeader}>
          <View style={styles.titleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: `${colors.green}15` }]}>
              <Shield size={14} color={colors.green} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('insights.detailedBreakdown.strengths')}
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {t('insights.strengths.whatYouCanTrust')}
          </Text>
        </View>
      )}

      {visibleStrengths.length > 0 ? (
        <View style={styles.cardsContainer}>
          {visibleStrengths.map((strength) => (
            <StrengthCardItem
              key={strength.id}
              strength={strength}
              onPress={onStrengthPress ? () => onStrengthPress(strength) : undefined}
              colors={colors}
            />
          ))}
          {strengths.length > maxVisible && (
            <Text style={[styles.moreText, { color: colors.textMuted }]}>
              {t('insights.strengths.more', { count: strengths.length - maxVisible })}
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
    gap: 10,
  },

  // Strength card
  strengthCard: {
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
  strengthLabel: {
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
    justifyContent: 'space-between',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dataPointsText: {
    fontSize: 11,
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

export default StrengthsSection;
