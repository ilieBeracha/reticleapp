/**
 * Recommendations Section
 *
 * Action-oriented suggestions based on analysis.
 * "What should I do next — concretely?"
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  HelpCircle,
  Lightbulb,
  Plus,
  Target
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Recommendation, RecommendationPriority, RecommendationType } from '../insights.types';

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

// ============================================================================
// TYPE ICONS & COLORS
// ============================================================================

const TYPE_CONFIG: Record<
  RecommendationType,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  drill: { icon: 'fitness', label: 'Focus Drill' },
  loadout: { icon: 'hardware-chip', label: 'Loadout' },
  mental: { icon: 'bulb', label: 'Mental' },
  position: { icon: 'body', label: 'Position' },
  structure: { icon: 'calendar', label: 'Structure' },
};

const PRIORITY_CONFIG: Record<
  RecommendationPriority,
  { color: string; label: string }
> = {
  high: { color: '#EF4444', label: 'High priority' },
  medium: { color: '#F59E0B', label: 'Recommended' },
  low: { color: '#6B7280', label: 'Optional' },
};

// ============================================================================
// RECOMMENDATION CARD COMPONENT
// ============================================================================

interface RecommendationCardProps {
  recommendation: Recommendation;
  onPress?: () => void;
  onAddToTrainingPlan?: () => void;
  onShowEvidence?: () => void;
  colors: ReturnType<typeof useColors>;
}

function RecommendationCard({
  recommendation,
  onPress,
  onAddToTrainingPlan,
  onShowEvidence,
  colors,
}: RecommendationCardProps) {
  const typeConfig = TYPE_CONFIG[recommendation.type];
  const priorityConfig = PRIORITY_CONFIG[recommendation.priority];

  return (
    <TouchableOpacity
      style={[styles.recommendationCard, { backgroundColor: colors.card }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Priority accent */}
      <View style={[styles.priorityAccent, { backgroundColor: priorityConfig.color }]} />

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeIconContainer, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name={typeConfig.icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={[styles.recommendationTitle, { color: colors.text }]}>
                {recommendation.title}
              </Text>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: `${priorityConfig.color}15` },
                ]}
              >
                <View
                  style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]}
                />
                <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                  {priorityConfig.label}
                </Text>
              </View>
            </View>
            <Text style={[styles.typeLabel, { color: colors.textMuted }]}>
              {typeConfig.label}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: colors.text }]}>
          {recommendation.description}
        </Text>

        {/* Goal (if present) */}
        {recommendation.goal && (
          <View style={[styles.goalContainer, { backgroundColor: colors.background }]}>
            <Target size={14} color={colors.primary} />
            <Text style={[styles.goalText, { color: colors.textMuted }]}>
              Goal: {recommendation.goal}
            </Text>
          </View>
        )}

        {/* Drill prescription (if present) */}
        {recommendation.drill && (
          <View style={[styles.drillContainer, { backgroundColor: colors.background }]}>
            <View style={styles.drillRow}>
              {recommendation.drill.position && (
                <View style={styles.drillItem}>
                  <Text style={[styles.drillLabel, { color: colors.textMuted }]}>
                    Position
                  </Text>
                  <Text style={[styles.drillValue, { color: colors.text }]}>
                    {recommendation.drill.position}
                  </Text>
                </View>
              )}
              {recommendation.drill.distance && (
                <View style={styles.drillItem}>
                  <Text style={[styles.drillLabel, { color: colors.textMuted }]}>
                    Distance
                  </Text>
                  <Text style={[styles.drillValue, { color: colors.text }]}>
                    {recommendation.drill.distance}m
                  </Text>
                </View>
              )}
              {recommendation.drill.rounds && (
                <View style={styles.drillItem}>
                  <Text style={[styles.drillLabel, { color: colors.textMuted }]}>
                    Rounds
                  </Text>
                  <Text style={[styles.drillValue, { color: colors.text }]}>
                    {recommendation.drill.rounds}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Reason */}
        <View style={styles.reasonContainer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.reasonText, { color: colors.textMuted }]}>
            {recommendation.reason}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          {onAddToTrainingPlan && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAddToTrainingPlan();
              }}
            >
              <Plus size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Add to Plan</Text>
            </TouchableOpacity>
          )}
          {onShowEvidence && recommendation.evidenceIds.length > 0 && (
            <TouchableOpacity
              style={[styles.evidenceButton, { backgroundColor: colors.background }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onShowEvidence();
              }}
            >
              <HelpCircle size={14} color={colors.textMuted} />
              <Text style={[styles.evidenceButtonText, { color: colors.textMuted }]}>
                Why this?
              </Text>
            </TouchableOpacity>
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
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Lightbulb size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No recommendations yet
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Keep training and we'll suggest ways to improve
      </Text>
    </View>
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
  const colors = useColors();
  const visibleRecommendations = recommendations.slice(0, maxVisible);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Lightbulb size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recommendations
          </Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          What to do next
        </Text>
      </View>

      {visibleRecommendations.length > 0 ? (
        <View style={styles.cardsContainer}>
          {visibleRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onPress={
                onRecommendationPress
                  ? () => onRecommendationPress(recommendation)
                  : undefined
              }
              onAddToTrainingPlan={
                onAddToTrainingPlan
                  ? () => onAddToTrainingPlan(recommendation)
                  : undefined
              }
              onShowEvidence={
                onShowEvidence ? () => onShowEvidence(recommendation) : undefined
              }
              colors={colors}
            />
          ))}
          {recommendations.length > maxVisible && (
            <Text style={[styles.moreText, { color: colors.textMuted }]}>
              +{recommendations.length - maxVisible} more recommendations
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
    gap: 12,
  },

  // Recommendation card
  recommendationCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
  },
  priorityAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 12,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  typeLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Description
  description: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Goal
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goalText: {
    flex: 1,
    fontSize: 12,
  },

  // Drill prescription
  drillContainer: {
    padding: 10,
    borderRadius: 8,
  },
  drillRow: {
    flexDirection: 'row',
    gap: 16,
  },
  drillItem: {
    gap: 2,
  },
  drillLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  drillValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Reason
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  evidenceButtonText: {
    fontSize: 13,
    fontWeight: '500',
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

export default RecommendationsSection;
