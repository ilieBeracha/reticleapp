/**
 * Context Summary Section (v3 - Grouped by severity)
 *
 * Groups profiles into "Needs Attention" and "Strong" clusters
 * for clearer visual hierarchy and scannability.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCallback, useMemo, useState } from 'react';
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
import { ContextProfileRow } from '../components/ContextProfileRow';

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

const ATTENTION_QUADRANTS: Set<ContextQuadrant> = new Set([
  'struggling',
  'hits_loose',
  'tight_misses',
]);

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.emptyState, { backgroundColor: `${colors.textMuted}06` }]}>
      <Grid3X3 size={20} color={colors.textMuted} strokeWidth={1.5} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        {t('insights.context.trainDifferentConditions')}
      </Text>
    </View>
  );
}

// ============================================================================
// PROFILE GROUP
// ============================================================================

interface ProfileGroupProps {
  label: string;
  count: number;
  accentColor: string;
  profiles: ContextProfile[];
  onViewEvidence?: (profile: ContextProfile) => void;
}

function ProfileGroup({ label, count, accentColor, profiles, onViewEvidence }: ProfileGroupProps) {
  const colors = useColors();
  if (profiles.length === 0) return null;

  return (
    <View style={styles.groupContainer}>
      <View style={styles.groupHeader}>
        <View style={[styles.groupAccent, { backgroundColor: accentColor }]} />
        <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{label}</Text>
        <View style={[styles.groupCount, { backgroundColor: `${accentColor}15` }]}>
          <Text style={[styles.groupCountText, { color: accentColor }]}>{count}</Text>
        </View>
      </View>
      <View style={styles.groupProfiles}>
        {profiles.map((profile) => (
          <ContextProfileRow
            key={profile.keyString}
            profile={profile}
            onViewEvidence={
              onViewEvidence ? () => onViewEvidence(profile) : undefined
            }
          />
        ))}
      </View>
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
  const { t } = useTranslation();
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);

  const relevantProfiles = useMemo(() =>
    sortProfiles(profiles.filter((p) => p.quadrant !== 'insufficient_data')),
    [profiles]
  );

  const visibleProfiles = isExpanded
    ? relevantProfiles
    : relevantProfiles.slice(0, maxVisible);

  const hasMore = relevantProfiles.length > maxVisible;
  const hiddenCount = relevantProfiles.length - maxVisible;

  // Split into attention vs strong groups
  const { attentionProfiles, strongProfiles } = useMemo(() => {
    const attention: ContextProfile[] = [];
    const strong: ContextProfile[] = [];
    for (const p of visibleProfiles) {
      if (ATTENTION_QUADRANTS.has(p.quadrant)) {
        attention.push(p);
      } else {
        strong.push(p);
      }
    }
    return { attentionProfiles: attention, strongProfiles: strong };
  }, [visibleProfiles]);

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
              {t('insights.context.title')}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              {t('insights.context.conditionsTracked', { count: relevantProfiles.length })}
            </Text>
          </View>
        </View>
      </View>

      {/* Grouped Profiles */}
      {relevantProfiles.length > 0 ? (
        <View style={styles.groupsContainer}>
          <ProfileGroup
            label={t('insights.context.needsAttention')}
            count={attentionProfiles.length}
            accentColor={attentionProfiles.some(p => p.quadrant === 'struggling') ? colors.red : (colors.yellow || '#F59E0B')}
            profiles={attentionProfiles}
            onViewEvidence={onViewEvidence}
          />
          <ProfileGroup
            label={t('insights.context.strong')}
            count={strongProfiles.length}
            accentColor={colors.green}
            profiles={strongProfiles}
            onViewEvidence={onViewEvidence}
          />

          {/* Expand/Collapse */}
          {hasMore && (
            <TouchableOpacity
              style={[styles.expandButton, { backgroundColor: `${colors.textMuted}08` }]}
              onPress={handleToggleExpand}
              activeOpacity={0.7}
            >
              <Text style={[styles.expandText, { color: colors.textMuted }]}>
                {isExpanded ? t('insights.context.showLess') : t('insights.context.moreConditions', { count: hiddenCount })}
              </Text>
              {isExpanded ? (
                <ChevronUp size={14} color={colors.textMuted} strokeWidth={2} />
              ) : (
                <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
              )}
            </TouchableOpacity>
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
    gap: 14,
  },

  // Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // Groups
  groupsContainer: {
    gap: 16,
  },
  groupContainer: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 2,
  },
  groupAccent: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  groupCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  groupCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupProfiles: {
    gap: 8,
  },

  // Expand button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
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
