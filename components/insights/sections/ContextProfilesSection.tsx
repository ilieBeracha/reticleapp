/**
 * Context Profiles Section
 *
 * Shows the connection between engagement (hit rate) and grouping (precision)
 * across different training contexts.
 *
 * ARCHITECTURE:
 * - Displays 2x2 quadrant classification (strong_both, hits_loose, tight_misses, struggling)
 * - Each context shows deltas vs baseline for both engagement and grouping
 * - Fully deterministic — NO AI-generated content
 *
 * QUADRANT MEANINGS:
 * - strong_both: Good hits + tight groups → Optimal performance
 * - hits_loose: Good hits + loose groups → Converting but mechanics need work
 * - tight_misses: Bad hits + tight groups → Precise but check zero/placement
 * - struggling: Bad hits + loose groups → Fundamental review needed
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  CheckCircle,
  Crosshair,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { ContextProfile, ContextQuadrant } from '../insights.types';

// ============================================================================
// PROPS
// ============================================================================

interface ContextProfilesSectionProps {
  profiles: ContextProfile[];
  onProfilePress?: (profile: ContextProfile) => void;
  maxVisible?: number;
}

// ============================================================================
// QUADRANT CONFIG
// ============================================================================

interface QuadrantConfig {
  label: string;
  description: string;
  icon: typeof CheckCircle;
  color: (colors: ReturnType<typeof useColors>) => string;
  bgColor: (colors: ReturnType<typeof useColors>) => string;
}

const QUADRANT_CONFIG: Record<ContextQuadrant, QuadrantConfig> = {
  strong_both: {
    label: 'Strong',
    description: 'Good hits + tight groups',
    icon: CheckCircle,
    color: (c) => c.green,
    bgColor: (c) => `${c.green}15`,
  },
  hits_loose: {
    label: 'Hits but Loose',
    description: 'Converting but mechanics need work',
    icon: Target,
    color: (c) => c.yellow || '#F59E0B',
    bgColor: (c) => `${c.yellow || '#F59E0B'}15`,
  },
  tight_misses: {
    label: 'Tight but Missing',
    description: 'Precise but check zero/placement',
    icon: Crosshair,
    color: (c) => c.yellow || '#F59E0B',
    bgColor: (c) => `${c.yellow || '#F59E0B'}15`,
  },
  struggling: {
    label: 'Needs Work',
    description: 'Both metrics below baseline',
    icon: AlertTriangle,
    color: (c) => c.red,
    bgColor: (c) => `${c.red}15`,
  },
  engagement_only: {
    label: 'Engagement Only',
    description: 'No grouping data available',
    icon: Target,
    color: (c) => c.textMuted,
    bgColor: (c) => `${c.textMuted}15`,
  },
  grouping_only: {
    label: 'Grouping Only',
    description: 'No engagement data available',
    icon: Crosshair,
    color: (c) => c.textMuted,
    bgColor: (c) => `${c.textMuted}15`,
  },
  insufficient_data: {
    label: 'Insufficient Data',
    description: 'Need more sessions',
    icon: AlertTriangle,
    color: (c) => c.textMuted,
    bgColor: (c) => `${c.textMuted}10`,
  },
};

// ============================================================================
// PROFILE CARD COMPONENT
// ============================================================================

interface ProfileCardProps {
  profile: ContextProfile;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}

function ProfileCard({ profile, onPress, colors }: ProfileCardProps) {
  const config = QUADRANT_CONFIG[profile.quadrant];
  const Icon = config.icon;
  const accentColor = config.color(colors);
  const bgColor = config.bgColor(colors);

  return (
    <TouchableOpacity
      style={[styles.profileCard, { backgroundColor: colors.card }]}
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

      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
            <Icon size={16} color={accentColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.contextLabel, { color: colors.text }]}>
              {profile.label}
            </Text>
            <Text style={[styles.quadrantLabel, { color: accentColor }]}>
              {config.label}
            </Text>
          </View>
          {profile.isPreliminary && (
            <View style={[styles.preliminaryBadge, { backgroundColor: `${colors.textMuted}15` }]}>
              <Text style={[styles.preliminaryText, { color: colors.textMuted }]}>
                Preliminary
              </Text>
            </View>
          )}
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          {/* Engagement metric */}
          {profile.engagement && (
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Accuracy
              </Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {Math.round(profile.engagement.accuracy)}%
                </Text>
                <View
                  style={[
                    styles.deltaBadge,
                    {
                      backgroundColor:
                        profile.engagement.delta >= 0
                          ? `${colors.green}15`
                          : `${colors.red}15`,
                    },
                  ]}
                >
                  {profile.engagement.delta >= 0 ? (
                    <TrendingUp size={10} color={colors.green} />
                  ) : (
                    <TrendingDown size={10} color={colors.red} />
                  )}
                  <Text
                    style={[
                      styles.deltaText,
                      { color: profile.engagement.delta >= 0 ? colors.green : colors.red },
                    ]}
                  >
                    {profile.engagement.delta >= 0 ? '+' : ''}
                    {Math.round(profile.engagement.delta)}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.baselineText, { color: colors.textMuted }]}>
                vs {Math.round(profile.engagement.baselineAccuracy)}% baseline
              </Text>
            </View>
          )}

          {/* Divider */}
          {profile.engagement && profile.grouping && (
            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          )}

          {/* Grouping metric */}
          {profile.grouping && (
            <View style={styles.metricBlock}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Best Group
              </Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {profile.grouping.medianBestGroup.toFixed(1)}cm
                </Text>
                <View
                  style={[
                    styles.deltaBadge,
                    {
                      backgroundColor:
                        profile.grouping.delta >= 0
                          ? `${colors.green}15`
                          : `${colors.red}15`,
                    },
                  ]}
                >
                  {/* Inverted: positive delta = tighter = better */}
                  {profile.grouping.delta >= 0 ? (
                    <TrendingUp size={10} color={colors.green} />
                  ) : (
                    <TrendingDown size={10} color={colors.red} />
                  )}
                  <Text
                    style={[
                      styles.deltaText,
                      { color: profile.grouping.delta >= 0 ? colors.green : colors.red },
                    ]}
                  >
                    {profile.grouping.delta >= 0 ? '' : '+'}
                    {Math.abs(profile.grouping.delta).toFixed(1)}cm
                  </Text>
                </View>
              </View>
              <Text style={[styles.baselineText, { color: colors.textMuted }]}>
                vs {profile.grouping.baselineMedianBestGroup.toFixed(1)}cm baseline
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={[styles.descriptionText, { color: colors.textMuted }]}>
          {config.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// SUMMARY COMPONENT
// ============================================================================

interface SummaryProps {
  profiles: ContextProfile[];
  colors: ReturnType<typeof useColors>;
}

function Summary({ profiles, colors }: SummaryProps) {
  const counts = {
    strong_both: profiles.filter((p) => p.quadrant === 'strong_both').length,
    hits_loose: profiles.filter((p) => p.quadrant === 'hits_loose').length,
    tight_misses: profiles.filter((p) => p.quadrant === 'tight_misses').length,
    struggling: profiles.filter((p) => p.quadrant === 'struggling').length,
  };

  const total = counts.strong_both + counts.hits_loose + counts.tight_misses + counts.struggling;
  if (total === 0) return null;

  return (
    <View style={[styles.summaryContainer, { backgroundColor: colors.card }]}>
      <Text style={[styles.summaryTitle, { color: colors.textMuted }]}>
        CONTEXT BREAKDOWN
      </Text>
      <View style={styles.summaryGrid}>
        {counts.strong_both > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {counts.strong_both}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Strong
            </Text>
          </View>
        )}
        {counts.hits_loose > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.yellow || '#F59E0B' }]} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {counts.hits_loose}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Hits/Loose
            </Text>
          </View>
        )}
        {counts.tight_misses > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.yellow || '#F59E0B' }]} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {counts.tight_misses}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Tight/Miss
            </Text>
          </View>
        )}
        {counts.struggling > 0 && (
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.red }]} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {counts.struggling}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Needs Work
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Crosshair size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Building Context Profiles
      </Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Train in different positions and distances to see how your accuracy and grouping connect
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContextProfilesSection({
  profiles,
  onProfilePress,
  maxVisible = 4,
}: ContextProfilesSectionProps) {
  const colors = useColors();

  // Filter out insufficient_data profiles and sort by importance
  const relevantProfiles = profiles
    .filter((p) => p.quadrant !== 'insufficient_data')
    .sort((a, b) => {
      // Priority: struggling > hits_loose/tight_misses > strong_both > others
      const priority: Record<ContextQuadrant, number> = {
        struggling: 0,
        hits_loose: 1,
        tight_misses: 1,
        strong_both: 2,
        engagement_only: 3,
        grouping_only: 3,
        insufficient_data: 4,
      };
      return priority[a.quadrant] - priority[b.quadrant];
    });

  const visibleProfiles = relevantProfiles.slice(0, maxVisible);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Crosshair size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Context Profiles
          </Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
          Accuracy ↔ Grouping connection by context
        </Text>
      </View>

      {/* Summary */}
      {relevantProfiles.length > 0 && <Summary profiles={relevantProfiles} colors={colors} />}

      {/* Profile cards */}
      {visibleProfiles.length > 0 ? (
        <View style={styles.cardsContainer}>
          {visibleProfiles.map((profile) => (
            <ProfileCard
              key={profile.keyString}
              profile={profile}
              onPress={onProfilePress ? () => onProfilePress(profile) : undefined}
              colors={colors}
            />
          ))}
          {relevantProfiles.length > maxVisible && (
            <Text style={[styles.moreText, { color: colors.textMuted }]}>
              +{relevantProfiles.length - maxVisible} more contexts
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

  // Summary
  summaryContainer: {
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
  },

  // Cards
  cardsContainer: {
    gap: 10,
  },

  // Profile card
  profileCard: {
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
  contextLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  quadrantLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  preliminaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  preliminaryText: {
    fontSize: 9,
    fontWeight: '600',
  },

  // Metrics row
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metricBlock: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '600',
  },
  baselineText: {
    fontSize: 10,
  },

  // Description
  descriptionText: {
    fontSize: 12,
    fontStyle: 'italic',
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

export default ContextProfilesSection;
