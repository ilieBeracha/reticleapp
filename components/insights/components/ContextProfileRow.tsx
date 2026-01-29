/**
 * Context Profile Row (v2.2 - Cleaner Layout)
 *
 * Restructured for better readability:
 * - Line 1: Position + badges
 * - Line 2: Quadrant label (the key insight)
 * - Line 3: Context details (distance, weapon)
 * - Metrics stacked vertically on right
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  HelpCircle,
  Timer,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import type { ContextProfile, ContextQuadrant } from '@/types/insights';
import { useAIExplanations, type ExplanationParams } from '@/hooks/insights/useAIExplanations';
import { AIExplanationBlock } from '../AIExplanationBlock';
import { ContextQuadrantGlyph } from './ContextQuadrantGlyph';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// PROPS
// ============================================================================

interface ContextProfileRowProps {
  profile: ContextProfile;
  onViewEvidence?: () => void;
  initialExpanded?: boolean;
}

// ============================================================================
// QUADRANT LABELS
// ============================================================================

const getQuadrantLabels = (t: ReturnType<typeof useTranslation>['t']): Record<ContextQuadrant, string> => ({
  strong_both: t('insights.context.quadrants.strongBoth'),
  hits_loose: t('insights.context.quadrants.hitsLoose'),
  tight_misses: t('insights.context.quadrants.tightMisses'),
  struggling: t('insights.context.quadrants.struggling'),
  engagement_only: t('insights.context.quadrants.engagementOnly'),
  grouping_only: t('insights.context.quadrants.groupingOnly'),
  insufficient_data: t('insights.context.quadrants.insufficientData'),
});

const QUADRANT_LABEL_COLOR: Record<ContextQuadrant, 'green' | 'yellow' | 'red' | 'muted'> = {
  strong_both: 'green',
  hits_loose: 'yellow',
  tight_misses: 'yellow',
  struggling: 'red',
  engagement_only: 'muted',
  grouping_only: 'muted',
  insufficient_data: 'muted',
};

// ============================================================================
// HELPERS
// ============================================================================

function formatPosition(position: string | null, t: ReturnType<typeof useTranslation>['t']): string {
  if (!position) return t('insights.context.general');
  return position.charAt(0).toUpperCase() + position.slice(1);
}

function formatDistanceBucket(bucket: string | null): string | null {
  if (!bucket) return null;
  // Convert "short_range" → "Short range", "long_range" → "Long range"
  return bucket
    .split('_')
    .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function formatWeaponCategory(category: string | null): string | null {
  if (!category) return null;
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function getInsightType(quadrant: ContextQuadrant): 'strength' | 'weakness' | 'trend' {
  switch (quadrant) {
    case 'strong_both':
      return 'strength';
    case 'hits_loose':
    case 'tight_misses':
    case 'struggling':
      return 'weakness';
    default:
      return 'trend';
  }
}

// ============================================================================
// COMPACT METRIC (Right side)
// ============================================================================

interface CompactMetricProps {
  label: string;
  value: number;
  delta: number;
  unit: string;
  isGrouping?: boolean;
  colors: ReturnType<typeof useColors>;
}

function CompactMetric({ label, value, delta, unit, isGrouping = false, colors }: CompactMetricProps) {
  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < (isGrouping ? 0.3 : 2);

  // For grouping: lower is better, so positive delta is bad
  // For accuracy: higher is better, so positive delta is good
  const isGood = isGrouping ? delta < 0 : delta > 0;
  
  const deltaColor = isNeutral
    ? colors.textMuted
    : isGood
    ? colors.green
    : colors.red;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const displayValue = isGrouping ? value.toFixed(1) : Math.round(value);
  const displayDelta = isGrouping
    ? `${isPositive ? '+' : ''}${delta.toFixed(1)}`
    : `${isPositive ? '+' : ''}${Math.round(delta)}`;

  return (
    <View style={styles.compactMetric}>
      <Text style={[styles.compactMetricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.compactMetricValue, { color: colors.text }]}>
        {displayValue}
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>{unit}</Text>
      </Text>
      <View style={[styles.compactDelta, { backgroundColor: `${deltaColor}15` }]}>
        <Icon size={9} color={deltaColor} strokeWidth={2.5} />
        <Text style={[styles.compactDeltaText, { color: deltaColor }]}>{displayDelta}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// BASELINE CARD (Expanded View)
// ============================================================================

interface BaselineCardProps {
  label: string;
  current: number;
  baseline: number;
  unit: string;
  isGrouping?: boolean;
  colors: ReturnType<typeof useColors>;
}

function BaselineCard({ label, current, baseline, unit, isGrouping = false, colors }: BaselineCardProps) {
  const { t } = useTranslation();
  const delta = current - baseline;
  const isAbove = delta > 0;
  const isBelow = delta < 0;
  const isNeutral = Math.abs(delta) < (isGrouping ? 0.3 : 2);

  // For grouping, lower is better (tighter groups)
  const isGood = isGrouping ? isBelow : isAbove;

  const statusColor = isNeutral
    ? colors.textMuted
    : isGood
    ? colors.green
    : colors.red;

  const StatusIcon = isNeutral ? Minus : isAbove ? ArrowUp : ArrowDown;

  const formatValue = (val: number) => isGrouping ? val.toFixed(1) : Math.round(val).toString();
  const directionText = isNeutral
    ? t('insights.context.atBaseline')
    : isAbove
    ? t('insights.context.aboveBaseline')
    : t('insights.context.belowBaseline');

  return (
    <View style={[styles.baselineCard, { backgroundColor: `${colors.textMuted}06` }]}>
      <Text style={[styles.baselineCardLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <View style={styles.baselineValueRow}>
        <Text style={[styles.baselineCurrentValue, { color: colors.text }]}>
          {formatValue(current)}{unit}
        </Text>
        <View style={[styles.directionBadge, { backgroundColor: `${statusColor}15` }]}>
          <StatusIcon size={10} color={statusColor} strokeWidth={2.5} />
        </View>
      </View>
      <View style={styles.baselineCompareRow}>
        <Text style={[styles.baselineCompareText, { color: statusColor }]}>
          {directionText}
        </Text>
        <Text style={[styles.baselineRefValue, { color: colors.textMuted }]}>
          ({formatValue(baseline)}{unit})
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// EXPANDED DETAILS
// ============================================================================

interface ExpandedDetailsProps {
  profile: ContextProfile;
  onViewEvidence?: () => void;
  colors: ReturnType<typeof useColors>;
}

function ExpandedDetails({ profile, onViewEvidence, colors }: ExpandedDetailsProps) {
  const { t } = useTranslation();
  const { getExplanation, isLoading, getError, requestExplanation } = useAIExplanations();

  const insightId = `context-${profile.keyString}`;
  const explanation = getExplanation(insightId);
  const loading = isLoading(insightId);
  const error = getError(insightId);

  const handleRequestExplanation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const insightType = getInsightType(profile.quadrant);
    const isGrouping = !profile.engagement && !!profile.grouping;
    const primaryMetric = profile.engagement || profile.grouping;
    if (!primaryMetric) return;

    const evidenceIds = [
      ...(profile.engagement?.evidenceIds ?? []),
      ...(profile.grouping?.evidenceIds ?? []),
    ];

    const delta = profile.engagement?.delta ?? profile.grouping?.delta ?? 0;
    const direction: 'up' | 'down' | 'stable' =
      Math.abs(delta) < 1 ? 'stable' : delta > 0 ? 'up' : 'down';

    const params: ExplanationParams = {
      insight_type: insightType,
      metric_type: isGrouping ? 'grouping' : 'accuracy',
      decided_values: {
        current_value: profile.engagement
          ? profile.engagement.accuracy
          : profile.grouping?.medianBestGroup ?? 0,
        baseline_value: profile.engagement
          ? profile.engagement.baselineAccuracy
          : profile.grouping?.baselineMedianBestGroup ?? 0,
        is_significant: Math.abs(delta) > (isGrouping ? 0.5 : 5),
        direction,
        confidence: profile.confidence,
        data_points: profile.engagement?.sessions ?? profile.grouping?.sessions ?? 0,
        unit: isGrouping ? 'cm' : '%',
      },
      context: {
        evidence_session_ids: evidenceIds,
        category_label: profile.label,
        engine_context: `Context: ${profile.key.position || 'unknown'}, Quadrant: ${profile.quadrant}`,
      },
    };

    requestExplanation(insightId, params);
  }, [profile, insightId, requestExplanation]);

  return (
    <View style={[styles.expandedContainer, { borderTopColor: `${colors.border}40` }]}>
      {/* Baseline comparison */}
      <View style={styles.baselineSection}>
        <Text style={[styles.baselineSectionTitle, { color: colors.textMuted }]}>
          {t('insights.context.comparedToBaseline')}
        </Text>
        <View style={styles.baselineGrid}>
          {profile.engagement && (
            <BaselineCard
              label={t('session.accuracy')}
              current={profile.engagement.accuracy}
              baseline={profile.engagement.baselineAccuracy}
              unit="%"
              colors={colors}
            />
          )}
          {profile.grouping && (
            <BaselineCard
              label={t('session.bestGroup')}
              current={profile.grouping.medianBestGroup}
              baseline={profile.grouping.baselineMedianBestGroup}
              unit="cm"
              isGrouping
              colors={colors}
            />
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {onViewEvidence && (
          <TouchableOpacity
            style={[styles.evidenceButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onViewEvidence();
            }}
            activeOpacity={0.8}
          >
            <Eye size={14} color="#fff" strokeWidth={2} />
            <Text style={styles.evidenceButtonText}>{t('insights.evidence.title')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.whyButton, { backgroundColor: `${colors.textMuted}10` }]}
          onPress={handleRequestExplanation}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <>
              <HelpCircle size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={[styles.whyButtonText, { color: colors.textMuted }]}>{t('insights.why')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* AI Explanation */}
      {(explanation || loading || error) && (
        <View style={styles.explanationContainer}>
          <AIExplanationBlock
            response={explanation}
            loading={loading}
            error={error}
            onRequestExplanation={handleRequestExplanation}
            showTrigger={false}
          />
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContextProfileRow({
  profile,
  onViewEvidence,
  initialExpanded = false,
}: ContextProfileRowProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  const QUADRANT_LABELS = getQuadrantLabels(t);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded((prev) => !prev);
  }, []);

  const position = formatPosition(profile.key.position, t);
  const distance = formatDistanceBucket(profile.key.distanceBucket);
  const weapon = formatWeaponCategory(profile.key.weaponCategory);
  
  // Build context line: "Long range · Rifle"
  const contextParts = [distance, weapon].filter(Boolean);
  const contextLine = contextParts.length > 0 ? contextParts.join(' · ') : null;
  
  // Quadrant label
  const quadrantLabel = QUADRANT_LABELS[profile.quadrant];
  const labelColorKey = QUADRANT_LABEL_COLOR[profile.quadrant];
  const labelColor = {
    green: colors.green,
    yellow: colors.yellow || '#F59E0B',
    red: colors.red,
    muted: colors.textMuted,
  }[labelColorKey];

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Main row */}
      <TouchableOpacity
        style={styles.mainRow}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {/* Left: Glyph */}
        <View style={styles.glyphContainer}>
          <ContextQuadrantGlyph
            quadrant={profile.quadrant}
            confidence={profile.confidence}
            isPreliminary={profile.isPreliminary}
            size={36}
          />
        </View>

        {/* Middle: Info stack */}
        <View style={styles.infoContainer}>
          {/* Line 1: Position + badges */}
          <View style={styles.titleRow}>
            <Text style={[styles.positionText, { color: colors.text }]} numberOfLines={1}>
              {position}
            </Text>
            {profile.key.isTimed && (
              <View style={[styles.badge, { backgroundColor: `${colors.primary}15` }]}>
                <Timer size={10} color={colors.primary} strokeWidth={2.5} />
              </View>
            )}
            {profile.isPreliminary && (
              <View style={[styles.badge, { backgroundColor: `${colors.textMuted}15` }]}>
                <Text style={[styles.badgeText, { color: colors.textMuted }]}>{t('insights.context.estimated')}</Text>
              </View>
            )}
          </View>
          
          {/* Line 2: Quadrant label (key insight) */}
          <Text style={[styles.quadrantLabel, { color: labelColor }]} numberOfLines={1}>
            {quadrantLabel}
          </Text>
          
          {/* Line 3: Context details */}
          {contextLine && (
            <Text style={[styles.contextLine, { color: colors.textMuted }]} numberOfLines={1}>
              {contextLine}
            </Text>
          )}
        </View>

        {/* Right: Metrics stack + chevron */}
        <View style={styles.rightSection}>
          <View style={styles.metricsStack}>
            {profile.engagement && (
              <CompactMetric
                label={t('insights.context.acc')}
                value={profile.engagement.accuracy}
                delta={profile.engagement.delta}
                unit="%"
                colors={colors}
              />
            )}
            {profile.grouping && (
              <CompactMetric
                label={t('insights.context.grp')}
                value={profile.grouping.medianBestGroup}
                delta={profile.grouping.delta}
                unit="cm"
                isGrouping
                colors={colors}
              />
            )}
          </View>
          <View style={styles.chevronContainer}>
            {isExpanded ? (
              <ChevronUp size={16} color={colors.textMuted} strokeWidth={2} />
            ) : (
              <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <ExpandedDetails
          profile={profile}
          onViewEvidence={onViewEvidence}
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
    overflow: 'hidden',
  },

  // Main row
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 10,
  },

  // Glyph
  glyphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info section (left-middle)
  infoContainer: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quadrantLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  contextLine: {
    fontSize: 11,
    letterSpacing: -0.1,
    marginTop: 1,
  },

  // Right section
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricsStack: {
    gap: 4,
  },
  chevronContainer: {
    width: 20,
    alignItems: 'center',
  },

  // Compact metric
  compactMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    width: 22,
  },
  compactMetricValue: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
    minWidth: 28,
    textAlign: 'right',
  },
  compactDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 1,
    minWidth: 38,
  },
  compactDeltaText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Expanded section
  expandedContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },

  // Baseline section
  baselineSection: {
    gap: 10,
  },
  baselineSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  baselineGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  baselineCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  baselineCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  baselineValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  baselineCurrentValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  directionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baselineCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  baselineCompareText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  baselineRefValue: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  evidenceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  whyButtonText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Explanation
  explanationContainer: {
    marginTop: 2,
  },
});

export default ContextProfileRow;
