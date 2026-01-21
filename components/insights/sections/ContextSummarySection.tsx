/**
 * Context Summary Section
 *
 * Shows context profiles in a list format with expandable details.
 * Profiles are sorted by priority: struggling first, then by confidence.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import type {
  ComputedContextProfiles,
  ConfidenceLevel,
  ContextProfile,
  ContextQuadrant,
} from '../insights.types';
import { ContextProfileRow } from '../components';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// PROPS
// ============================================================================

interface ContextSummarySectionProps {
  profiles: ContextProfile[];
  summary: ComputedContextProfiles['summary'];
  onViewEvidence?: (profile: ContextProfile) => void;
  onViewAll?: () => void;
  maxVisible?: number;
}

// ============================================================================
// SORTING
// ============================================================================

const QUADRANT_PRIORITY: Record<ContextQuadrant, number> = {
  struggling: 0,
  hits_loose: 1,
  tight_misses: 1,
  strong_both: 2,
  engagement_only: 3,
  grouping_only: 3,
  insufficient_data: 4,
};

const CONFIDENCE_PRIORITY: Record<ConfidenceLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function getMaxAbsDelta(profile: ContextProfile): number {
  const engDelta = profile.engagement ? Math.abs(profile.engagement.delta) : 0;
  const grpDelta = profile.grouping ? Math.abs(profile.grouping.delta) : 0;
  return Math.max(engDelta, grpDelta);
}

function sortProfiles(profiles: ContextProfile[]): ContextProfile[] {
  return [...profiles].sort((a, b) => {
    const quadrantDiff = QUADRANT_PRIORITY[a.quadrant] - QUADRANT_PRIORITY[b.quadrant];
    if (quadrantDiff !== 0) return quadrantDiff;
    const confDiff = CONFIDENCE_PRIORITY[a.confidence] - CONFIDENCE_PRIORITY[b.confidence];
    if (confDiff !== 0) return confDiff;
    return getMaxAbsDelta(b) - getMaxAbsDelta(a);
  });
}

// ============================================================================
// STAT BADGE COMPONENT
// ============================================================================

interface StatBadgeProps {
  count: number;
  label: string;
  color: string;
  bgColor: string;
}

function StatBadge({ count, label, color, bgColor }: StatBadgeProps) {
  if (count === 0) return null;
  return (
    <View style={[styles.statBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// SUMMARY STATS
// ============================================================================

interface SummaryStatsProps {
  summary: ComputedContextProfiles['summary'];
  colors: ReturnType<typeof useColors>;
}

function SummaryStats({ summary, colors }: SummaryStatsProps) {
  const { strongBothCount, hitsLooseCount, tightMissesCount, strugglingCount, totalContexts } =
    summary;

  const attentionCount = hitsLooseCount + tightMissesCount;

  if (totalContexts === 0) {
    return (
      <Text style={[styles.buildingText, { color: colors.textMuted }]}>
        Building...
      </Text>
    );
  }

  return (
    <View style={styles.statsRow}>
      <StatBadge
        count={strugglingCount}
        label="focus"
        color={colors.red}
        bgColor={`${colors.red}12`}
      />
      <StatBadge
        count={attentionCount}
        label="review"
        color={colors.yellow || '#F59E0B'}
        bgColor={`${colors.yellow || '#F59E0B'}12`}
      />
      <StatBadge
        count={strongBothCount}
        label="solid"
        color={colors.green}
        bgColor={`${colors.green}12`}
      />
    </View>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.emptyState, { backgroundColor: `${colors.textMuted}06` }]}>
      <Grid3X3 size={20} color={colors.textMuted} strokeWidth={1.5} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Train in different positions and distances to see context patterns
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContextSummarySection({
  profiles,
  summary,
  onViewEvidence,
  onViewAll,
  maxVisible = 5,
}: ContextSummarySectionProps) {
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);

  const relevantProfiles = sortProfiles(
    profiles.filter((p) => p.quadrant !== 'insufficient_data')
  );

  const visibleProfiles = isExpanded
    ? relevantProfiles
    : relevantProfiles.slice(0, maxVisible);

  const hasMore = relevantProfiles.length > maxVisible;
  const hiddenCount = relevantProfiles.length - maxVisible;

  const handleViewEvidence = useCallback(
    (profile: ContextProfile) => {
      if (onViewEvidence) {
        onViewEvidence(profile);
      }
    },
    [onViewEvidence]
  );

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded((prev) => !prev);
    if (!isExpanded && onViewAll) {
      onViewAll();
    }
  }, [isExpanded, onViewAll]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}10` }]}>
            <Grid3X3 size={14} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Context Analysis
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              {relevantProfiles.length} context{relevantProfiles.length !== 1 ? 's' : ''} tracked
            </Text>
          </View>
        </View>
        
        <SummaryStats summary={summary} colors={colors} />
      </View>

      {/* Profile List */}
      {relevantProfiles.length > 0 && (
        <>
          <View style={styles.profilesContainer}>
            {visibleProfiles.map((profile) => (
              <ContextProfileRow
                key={profile.keyString}
                profile={profile}
                onViewEvidence={
                  onViewEvidence ? () => handleViewEvidence(profile) : undefined
                }
              />
            ))}
          </View>
          
          {/* Expand/Collapse */}
          {hasMore && (
            <TouchableOpacity
              style={[styles.expandButton, { borderColor: `${colors.border}40` }]}
              onPress={handleToggleExpand}
              activeOpacity={0.7}
            >
              <Text style={[styles.expandText, { color: colors.textMuted }]}>
                {isExpanded ? 'Show less' : `+${hiddenCount} more`}
              </Text>
              {isExpanded ? (
                <ChevronUp size={14} color={colors.textMuted} strokeWidth={2} />
              ) : (
                <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Empty State */}
      {relevantProfiles.length === 0 && <EmptyState colors={colors} />}
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

  // Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    gap: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    letterSpacing: -0.1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statCount: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  buildingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Profiles
  profilesContainer: {
    gap: 8,
  },

  // Expand button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },

  // Empty state
  emptyState: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ContextSummarySection;
