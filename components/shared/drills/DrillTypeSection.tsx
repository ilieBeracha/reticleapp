/**
 * Drill Type Section Component
 *
 * Collapsible section displaying drills grouped by type.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { DrillTemplate, DrillType } from '@/types/drillTypes';
import * as Haptics from 'expo-haptics';
import { Award, ChevronDown, ChevronRight, Clock, Target } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { DrillCard } from './DrillCard';

// ============================================================================
// TYPES
// ============================================================================

interface DrillTypeSectionProps {
  drillType: DrillType;
  templates: DrillTemplate[];
  defaultExpanded?: boolean;
  onViewTemplate?: (template: DrillTemplate) => void;
  onDuplicateTemplate?: (template: DrillTemplate) => void;
  onUseTemplate?: (template: DrillTemplate) => void;
  compactCards?: boolean;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const TYPE_ICONS: Record<string, any> = {
  zeroing: Target,
  grouping: Target,
  timed: Clock,
  qualification: Award,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillTypeSection({
  drillType,
  templates,
  defaultExpanded = true,
  onViewTemplate,
  onDuplicateTemplate,
  onUseTemplate,
  compactCards = false,
}: DrillTypeSectionProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = TYPE_ICONS[drillType.id] || Target;

  const toggleExpanded = () => {
    Haptics.selectionAsync();
    setExpanded(!expanded);
  };

  return (
    <Animated.View layout={Layout.springify()} style={styles.container}>
      {/* Section Header */}
      <TouchableOpacity
        style={[styles.header, { borderBottomColor: expanded ? colors.border : 'transparent' }]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBadge, { backgroundColor: drillType.color + '15' }]}>
          <Icon size={20} color={drillType.color} />
        </View>

        <View style={styles.headerContent}>
          <Text style={[styles.typeName, { color: colors.text }]}>{drillType.name}</Text>
          <Text style={[styles.typeCount, { color: colors.textMuted }]}>
            {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          </Text>
        </View>

        <View style={[styles.chevron, { backgroundColor: colors.secondary }]}>
          {expanded ? (
            <ChevronDown size={18} color={colors.textMuted} />
          ) : (
            <ChevronRight size={18} color={colors.textMuted} />
          )}
        </View>
      </TouchableOpacity>

      {/* Templates */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.content}
        >
          {/* Type Description */}
          <Text style={[styles.description, { color: colors.textMuted }]}>{drillType.description}</Text>

          {/* Template Cards */}
          <View style={styles.templateList}>
            {templates.map((template, index) => (
              <DrillCard
                key={template.id}
                template={template}
                index={index}
                compact={compactCards}
                onView={onViewTemplate ? () => onViewTemplate(template) : undefined}
                onDuplicate={onDuplicateTemplate ? () => onDuplicateTemplate(template) : undefined}
                onUse={onUseTemplate ? () => onUseTemplate(template) : undefined}
              />
            ))}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerContent: {
    flex: 1,
    gap: 2,
  },

  typeName: {
    fontSize: 17,
    fontWeight: '700',
  },

  typeCount: {
    fontSize: 13,
  },

  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingTop: 16,
  },

  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  templateList: {
    gap: 0,
  },
});
