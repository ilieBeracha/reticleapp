/**
 * AI Explanation Block
 *
 * Renders AI-generated explanations for insights.
 * Displays loading, success, and error states.
 *
 * RULES:
 * - Never auto-loads (user must click "Why?")
 * - Never shows AI-generated numbers
 * - Never changes engine-decided labels
 * - Failure is silent (better than contradiction)
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { AIContextResponse, AIExplanation } from './ai-context.contract';

// ============================================================================
// PROPS
// ============================================================================

interface AIExplanationBlockProps {
  /** The AI response (null if not requested yet) */
  response: AIContextResponse | null;
  /** Whether the explanation is loading */
  loading: boolean;
  /** Error message if request failed */
  error: string | null;
  /** Callback to request explanation */
  onRequestExplanation: () => void;
  /** Whether to show the "Why?" button (default true) */
  showTrigger?: boolean;
  /** Compact mode for smaller cards */
  compact?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIExplanationBlock({
  response,
  loading,
  error,
  onRequestExplanation,
  showTrigger = true,
  compact = false,
}: AIExplanationBlockProps) {
  const colors = useColors();

  // State: Idle (not requested yet)
  if (!response && !loading && showTrigger) {
    return (
      <TouchableOpacity
        style={[styles.whyButton, { backgroundColor: `${colors.primary}10` }]}
        onPress={onRequestExplanation}
        activeOpacity={0.7}
      >
        <Ionicons name="help-circle-outline" size={14} color={colors.primary} />
        <Text style={[styles.whyText, { color: colors.primary }]}>
          Why?
        </Text>
      </TouchableOpacity>
    );
  }

  // State: Loading
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Explaining…
        </Text>
      </View>
    );
  }

  // State: Error or Failed Guardrails
  if (error || (response && !response.success)) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Explanation unavailable for this insight.
        </Text>
      </View>
    );
  }

  // State: Success
  if (response?.success && response.explanation) {
    return (
      <ExplanationContent
        explanation={response.explanation}
        confidenceNote={response.confidence_note}
        colors={colors}
        compact={compact}
      />
    );
  }

  return null;
}

// ============================================================================
// EXPLANATION CONTENT
// ============================================================================

interface ExplanationContentProps {
  explanation: AIExplanation;
  confidenceNote?: string;
  colors: ReturnType<typeof useColors>;
  compact?: boolean;
}

function ExplanationContent({
  explanation,
  confidenceNote,
  colors,
  compact,
}: ExplanationContentProps) {
  const hasFactors = explanation.possible_factors && explanation.possible_factors.length > 0;
  const hasConsiderations = explanation.considerations && explanation.considerations.length > 0;

  return (
    <View style={[styles.explanationContainer, { backgroundColor: colors.background }]}>
      {/* AI Label */}
      <View style={styles.aiLabelRow}>
        <View style={[styles.aiLabel, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="sparkles" size={10} color={colors.primary} />
          <Text style={[styles.aiLabelText, { color: colors.primary }]}>AI Explanation</Text>
        </View>
      </View>

      {/* Main explanation text */}
      <Text style={[styles.explanationText, { color: colors.text }, compact && styles.explanationTextCompact]}>
        {explanation.text}
      </Text>

      {/* Possible factors */}
      {hasFactors && !compact && (
        <View style={styles.factorsContainer}>
          <Text style={[styles.factorsLabel, { color: colors.textMuted }]}>
            Possible factors:
          </Text>
          {explanation.possible_factors!.map((factor, index) => (
            <View key={index} style={styles.factorRow}>
              <View style={[styles.factorBullet, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.factorText, { color: colors.textMuted }]}>
                {factor}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Considerations */}
      {hasConsiderations && !compact && (
        <View style={styles.considerationsContainer}>
          {explanation.considerations!.map((consideration, index) => (
            <View key={index} style={[styles.considerationRow, { backgroundColor: `${colors.primary}08` }]}>
              <Ionicons name="bulb-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.considerationText, { color: colors.textMuted }]}>
                {consideration}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Confidence note */}
      {confidenceNote && (
        <Text style={[styles.confidenceNote, { color: colors.textMuted }]}>
          {confidenceNote}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// INLINE WHY BUTTON (for card headers)
// ============================================================================

interface WhyButtonProps {
  onPress: () => void;
  loading?: boolean;
  hasExplanation?: boolean;
}

export function WhyButton({ onPress, loading, hasExplanation }: WhyButtonProps) {
  const colors = useColors();

  if (loading) {
    return (
      <View style={[styles.whyButtonInline, { backgroundColor: `${colors.primary}10` }]}>
        <ActivityIndicator size={10} color={colors.primary} />
      </View>
    );
  }

  if (hasExplanation) {
    return (
      <View style={[styles.whyButtonInline, { backgroundColor: `${colors.green}15` }]}>
        <Ionicons name="checkmark" size={12} color={colors.green} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.whyButtonInline, { backgroundColor: `${colors.primary}10` }]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.whyButtonInlineText, { color: colors.primary }]}>?</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Why button (standalone)
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  whyText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Why button (inline for headers)
  whyButtonInline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyButtonInlineText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },

  // Error state
  errorContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Explanation content
  explanationContainer: {
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  aiLabelRow: {
    flexDirection: 'row',
  },
  aiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  aiLabelText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  explanationTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Factors
  factorsContainer: {
    gap: 4,
    marginTop: 4,
  },
  factorsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 4,
  },
  factorBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 5,
  },
  factorText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },

  // Considerations
  considerationsContainer: {
    gap: 6,
    marginTop: 4,
  },
  considerationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  considerationText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
    fontStyle: 'italic',
  },

  // Confidence note
  confidenceNote: {
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default AIExplanationBlock;
