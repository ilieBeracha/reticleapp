/**
 * Detailed Breakdown Section (Accordion)
 *
 * Collapsible wrapper for Strengths, Weaknesses, and Trends sections.
 * Keeps the primary view scannable while providing full access to details.
 *
 * ARCHITECTURE:
 * - Each section is collapsed by default
 * - Headers show count badges
 * - Expand reveals the full section component
 * - All evidence/AI integration preserved when expanded
 *
 * CONSTRAINTS:
 * - Must not break existing section functionality
 * - Must maintain evidence access
 * - Must remain accessible (no hiding important data)
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react-native';
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

import type { StrengthCard, TrendData, WeaknessCard } from '../insights.types';
import { StrengthsSection } from './StrengthsSection';
import { TrendsSection } from './TrendsSection';
import { WeaknessesSection } from './WeaknessesSection';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// PROPS
// ============================================================================

interface DetailedBreakdownSectionProps {
  /** Strengths data */
  strengths: StrengthCard[];
  /** Weaknesses data */
  weaknesses: WeaknessCard[];
  /** Trends data */
  trends: TrendData[];
  /** Callback when a strength is pressed */
  onStrengthPress?: (strength: StrengthCard) => void;
  /** Callback when a weakness is pressed */
  onWeaknessPress?: (weakness: WeaknessCard) => void;
  /** Callback when a trend is pressed */
  onTrendPress?: (trend: TrendData) => void;
  /** Initially expanded sections */
  initialExpanded?: ('strengths' | 'weaknesses' | 'trends')[];
}

// ============================================================================
// ACCORDION ITEM
// ============================================================================

interface AccordionItemProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  iconBgColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  emptyText: string;
  colors: ReturnType<typeof useColors>;
}

function AccordionItem({
  title,
  count,
  icon,
  iconBgColor,
  isExpanded,
  onToggle,
  children,
  emptyText,
  colors,
}: AccordionItemProps) {
  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle]);

  const hasContent = count > 0;

  return (
    <View style={[styles.accordionItem, { backgroundColor: colors.card }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.accordionIcon, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        <View style={styles.accordionTitleContainer}>
          <Text style={[styles.accordionTitle, { color: colors.text }]}>{title}</Text>
          {hasContent ? (
            <View style={[styles.countBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.countText, { color: colors.textMuted }]}>{count}</Text>
            </View>
          ) : (
            <Text style={[styles.buildingText, { color: colors.textMuted }]}>building...</Text>
          )}
        </View>
        {isExpanded ? (
          <ChevronDown size={18} color={colors.textMuted} />
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View style={styles.accordionContent}>
          {hasContent ? (
            children
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{emptyText}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DetailedBreakdownSection({
  strengths,
  weaknesses,
  trends,
  onStrengthPress,
  onWeaknessPress,
  onTrendPress,
  initialExpanded = [],
}: DetailedBreakdownSectionProps) {
  const colors = useColors();

  // Expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(initialExpanded)
  );

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          DETAILED BREAKDOWN
        </Text>
      </View>

      {/* Accordion Items */}
      <View style={styles.accordionContainer}>
        {/* Strengths */}
        <AccordionItem
          title="Strengths"
          count={strengths.length}
          icon={<Shield size={14} color={colors.green} />}
          iconBgColor={`${colors.green}15`}
          isExpanded={expandedSections.has('strengths')}
          onToggle={() => toggleSection('strengths')}
          emptyText="Keep training to identify what you do best"
          colors={colors}
        >
          <StrengthsSection
            strengths={strengths}
            onStrengthPress={onStrengthPress}
            maxVisible={10}
            hideHeader
          />
        </AccordionItem>

        {/* Weaknesses */}
        <AccordionItem
          title="Weaknesses"
          count={weaknesses.length}
          icon={<AlertTriangle size={14} color={colors.red} />}
          iconBgColor={`${colors.red}15`}
          isExpanded={expandedSections.has('weaknesses')}
          onToggle={() => toggleSection('weaknesses')}
          emptyText="Your performance is consistent across all areas"
          colors={colors}
        >
          <WeaknessesSection
            weaknesses={weaknesses}
            onWeaknessPress={onWeaknessPress}
            maxVisible={10}
            hideHeader
          />
        </AccordionItem>

        {/* Trends */}
        <AccordionItem
          title="Trend Analysis"
          count={trends.length}
          icon={<Activity size={14} color={colors.primary} />}
          iconBgColor={`${colors.primary}15`}
          isExpanded={expandedSections.has('trends')}
          onToggle={() => toggleSection('trends')}
          emptyText="Continue training to see trends emerge over time"
          colors={colors}
        >
          <TrendsSection
            trends={trends}
            onTrendPress={onTrendPress}
            maxVisible={10}
            hideHeader
          />
        </AccordionItem>
      </View>
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
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Accordion container
  accordionContainer: {
    gap: 8,
  },

  // Accordion item
  accordionItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  accordionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buildingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Accordion content
  accordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
});

export default DetailedBreakdownSection;
