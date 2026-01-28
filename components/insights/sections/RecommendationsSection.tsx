/**
 * Recommendations Section (Redesigned)
 *
 * Clean, scannable action cards.
 * Priority-first design with clear actionability.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  ChevronRight,
  Crosshair,
  Lightbulb,
  Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Recommendation, RecommendationPriority } from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  onRecommendationPress?: (recommendation: Recommendation) => void;
  onAddToTrainingPlan?: (recommendation: Recommendation) => void;
  onShowEvidence?: (recommendation: Recommendation) => void;
  maxVisible?: number;
}

// Priority config kept for potential future use but not prominently displayed
const _PRIORITY_CONFIG: Record<RecommendationPriority, { label: string }> = {
  high: { label: 'Priority' },
  medium: { label: 'Suggested' },
  low: { label: 'Tip' },
};

// ============================================================================
// COMPACT RECOMMENDATION CARD
// ============================================================================

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
  onPress?: () => void;
  onShowEvidence?: () => void;
  colors: ReturnType<typeof useColors>;
}

function RecommendationCard({
  recommendation,
  index,
  onPress,
  onShowEvidence,
  colors,
}: RecommendationCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={0.7}
    >
      {/* Left: Number */}
      <View style={styles.cardLeft}>
        <Text style={[styles.cardNumber, { color: colors.textMuted }]}>{index + 1}</Text>
      </View>

      {/* Center: Content */}
      <View style={styles.cardCenter}>
        {/* Title */}
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {recommendation.title}
        </Text>

        {/* Reason - one line */}
        <Text style={[styles.cardReason, { color: colors.textMuted }]} numberOfLines={1}>
          {recommendation.reason}
        </Text>

        {/* Drill specs (if present) - compact inline */}
        {recommendation.drill && (
          <View style={styles.drillSpecs}>
            {recommendation.drill.position && (
              <View style={[styles.specChip, { backgroundColor: colors.background }]}>
                <Text style={[styles.specText, { color: colors.textMuted }]}>
                  {recommendation.drill.position}
                </Text>
              </View>
            )}
            {recommendation.drill.distance && (
              <View style={[styles.specChip, { backgroundColor: colors.background }]}>
                <Text style={[styles.specText, { color: colors.textMuted }]}>
                  {recommendation.drill.distance}m
                </Text>
              </View>
            )}
            {recommendation.drill.rounds && (
              <View style={[styles.specChip, { backgroundColor: colors.background }]}>
                <Text style={[styles.specText, { color: colors.textMuted }]}>
                  {recommendation.drill.rounds} rds
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Right: Action */}
      <TouchableOpacity
        style={styles.cardAction}
        onPress={() => {
          if (onShowEvidence && recommendation.evidenceIds.length > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onShowEvidence();
          } else if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronRight size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ============================================================================
// QUICK ACTION ROW (for high priority)
// ============================================================================

interface QuickActionProps {
  recommendation: Recommendation;
  onAddToTrainingPlan?: () => void;
  colors: ReturnType<typeof useColors>;
}

function QuickAction({ recommendation, onAddToTrainingPlan, colors }: QuickActionProps) {
  const { t } = useTranslation();
  if (recommendation.priority !== 'high' || !onAddToTrainingPlan) return null;

  return (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: colors.card }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAddToTrainingPlan();
      }}
      activeOpacity={0.7}
    >
      <Sparkles size={13} color={colors.primary} />
      <Text style={[styles.quickActionText, { color: colors.text }]} numberOfLines={1}>
        {t('insights.recommendations.addToTrainingPlan')}
      </Text>
      <ArrowRight size={13} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RecommendationsSection({
  recommendations,
  onRecommendationPress,
  onAddToTrainingPlan,
  onShowEvidence,
  maxVisible = 3,
}: RecommendationsSectionProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const visibleRecommendations = recommendations.slice(0, maxVisible);
  const highPriorityRec = visibleRecommendations.find((r) => r.priority === 'high');

  if (visibleRecommendations.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
        <Lightbulb size={20} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t('insights.recommendations.keepTraining')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Crosshair size={16} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('insights.recommendations.nextSteps')}</Text>
        <Text style={[styles.headerCount, { color: colors.textMuted }]}>
          {recommendations.length}
        </Text>
      </View>

      {/* Quick action for high priority */}
      {highPriorityRec && onAddToTrainingPlan && (
        <QuickAction
          recommendation={highPriorityRec}
          onAddToTrainingPlan={() => onAddToTrainingPlan(highPriorityRec)}
          colors={colors}
        />
      )}

      {/* Cards */}
      <View style={styles.cardList}>
        {visibleRecommendations.map((rec, i) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            index={i}
            onPress={onRecommendationPress ? () => onRecommendationPress(rec) : undefined}
            onShowEvidence={onShowEvidence ? () => onShowEvidence(rec) : undefined}
            colors={colors}
          />
        ))}
      </View>

      {/* More indicator */}
      {recommendations.length > maxVisible && (
        <Text style={[styles.moreText, { color: colors.textMuted }]}>
          {t('insights.recommendations.more', { count: recommendations.length - maxVisible })}
        </Text>
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
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  headerCount: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Quick action
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  quickActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

  // Card list
  cardList: {
    gap: 8,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingRight: 10,
  },
  cardLeft: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardCenter: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardReason: {
    fontSize: 12,
    lineHeight: 16,
  },
  drillSpecs: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  specChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  specText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardAction: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // More
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    paddingTop: 4,
  },

  // Empty
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 13,
  },
});

export default RecommendationsSection;
