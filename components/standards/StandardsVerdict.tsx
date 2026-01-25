/**
 * StandardsVerdict
 *
 * Displays the PASS/FAIL verdict with full breakdown.
 * This is purely display - the verdict is ALREADY decided by the engine.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { AppliedModifier, SessionVerdict } from '@/services/standards';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface StandardsVerdictProps {
  verdict: SessionVerdict | null;
  compact?: boolean;
}

// ============================================================================
// COMPACT BADGE (for lists)
// ============================================================================

function VerdictBadge({
  passed,
  noStandard,
  invalidated,
  overridden,
  colors,
}: {
  passed: boolean;
  noStandard: boolean;
  invalidated?: boolean;
  overridden?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  if (noStandard) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
        <AlertCircle size={12} color={colors.textMuted} />
        <Text style={[styles.badgeText, { color: colors.textMuted }]}>No Standard</Text>
      </View>
    );
  }

  if (invalidated) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.yellow + '20' }]}>
        <AlertCircle size={12} color={colors.yellow} />
        <Text style={[styles.badgeText, { color: colors.yellow }]}>INVALID</Text>
      </View>
    );
  }

  const Icon = passed ? CheckCircle : XCircle;
  const bgColor = passed ? colors.green + '20' : colors.red + '20';
  const textColor = passed ? colors.green : colors.red;
  const label = overridden ? 'FAIL (Override)' : passed ? 'PASS' : 'FAIL';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Icon size={12} color={textColor} />
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// FULL BREAKDOWN (for detail views)
// ============================================================================

function ModifierRow({
  modifier,
  drillGoal,
  colors,
}: {
  modifier: AppliedModifier;
  drillGoal: 'grouping' | 'engagement';
  colors: ReturnType<typeof useColors>;
}) {
  const penalty =
    drillGoal === 'grouping' ? `+${modifier.grouping_penalty_cm}cm` : `-${modifier.accuracy_penalty_pct}%`;

  return (
    <View style={styles.modifierRow}>
      <Text style={[styles.modifierName, { color: colors.textMuted }]}>{modifier.name}</Text>
      <Text style={[styles.modifierPenalty, { color: colors.orange }]}>{penalty}</Text>
    </View>
  );
}

function FullBreakdown({ verdict, colors }: { verdict: SessionVerdict; colors: ReturnType<typeof useColors> }) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = verdict.verdict_breakdown;
  const drillGoal = breakdown.base?.expected_grouping_cm !== undefined ? 'grouping' : 'engagement';

  const Icon = verdict.passed ? CheckCircle : XCircle;
  const accentColor = verdict.passed ? colors.green : colors.red;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: accentColor }]}>
      {/* Header */}
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Icon size={24} color={accentColor} />
          <View>
            <Text style={[styles.verdictTitle, { color: accentColor }]}>
              {verdict.passed ? 'STANDARD MET' : 'STANDARD NOT MET'}
            </Text>
            <Text style={[styles.standardName, { color: colors.textMuted }]}>
              {breakdown.base?.name || 'Unknown Standard'}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={colors.textMuted} />
        ) : (
          <ChevronDown size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Summary Line */}
      <View style={[styles.summaryLine, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.summaryText, { color: colors.text }]}>{breakdown.comparison}</Text>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.details}>
          {/* Base Standard */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Base Standard</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>
              {drillGoal === 'grouping'
                ? `${breakdown.base?.expected_grouping_cm}cm`
                : `${breakdown.base?.expected_accuracy_pct}%`}
            </Text>
          </View>

          {/* Modifiers */}
          {breakdown.modifiers.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Condition Modifiers Applied</Text>
              {breakdown.modifiers.map((mod) => (
                <ModifierRow key={mod.id} modifier={mod} drillGoal={drillGoal} colors={colors} />
              ))}
            </View>
          )}

          {/* Effective Threshold */}
          <View style={[styles.section, styles.effectiveSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Effective Threshold</Text>
            <Text style={[styles.effectiveValue, { color: colors.text }]}>
              {drillGoal === 'grouping' ? `${verdict.effective_grouping_cm}cm` : `${verdict.effective_accuracy_pct}%`}
            </Text>
          </View>

          {/* Your Result */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Your Result</Text>
            <Text style={[styles.resultValue, { color: accentColor }]}>
              {drillGoal === 'grouping' ? `${verdict.actual_grouping_cm}cm` : `${verdict.actual_accuracy_pct}%`}
            </Text>
          </View>

          {/* Calculation */}
          <View style={[styles.calculation, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.calculationText, { color: colors.textMuted }]}>{breakdown.calculation}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StandardsVerdict({ verdict, compact = false }: StandardsVerdictProps) {
  const colors = useColors();

  // No verdict stored
  if (!verdict) {
    if (compact) return null;
    return (
      <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
        <AlertCircle size={12} color={colors.textMuted} />
        <Text style={[styles.badgeText, { color: colors.textMuted }]}>Not Evaluated</Text>
      </View>
    );
  }

  // No matching standard was found
  const noStandard = !verdict.base_standard_id;

  // Check if overridden (from breakdown comparison text)
  const isOverridden = verdict.verdict_breakdown?.comparison?.includes('Overridden');

  if (compact) {
    return <VerdictBadge passed={verdict.passed} noStandard={noStandard} overridden={isOverridden} colors={colors} />;
  }

  // No standard - simple message
  if (noStandard) {
    return (
      <View style={[styles.noStandardCard, { backgroundColor: colors.card }]}>
        <AlertCircle size={20} color={colors.textMuted} />
        <Text style={[styles.noStandardText, { color: colors.textMuted }]}>
          No performance standard set for this drill configuration
        </Text>
      </View>
    );
  }

  // Full breakdown
  return <FullBreakdown verdict={verdict} colors={colors} />;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Badge (compact)
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card (full)
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  standardName: {
    fontSize: 13,
    marginTop: 2,
  },

  // Summary line
  summaryLine: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  // Details
  details: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  effectiveSection: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  effectiveValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
  },

  // Modifier row
  modifierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modifierName: {
    fontSize: 14,
  },
  modifierPenalty: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Calculation
  calculation: {
    padding: 12,
    borderRadius: 8,
  },
  calculationText: {
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  // No standard card
  noStandardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  noStandardText: {
    flex: 1,
    fontSize: 14,
  },
});
