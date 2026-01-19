/**
 * PhaseSection Component
 * 
 * Clean phase section with prominent timeline integration.
 * Designed for a spread-out, immersive training journey.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Check, ChevronDown, ChevronUp, Crosshair, Target, Trophy } from 'lucide-react-native';
import { TimelineNode } from './TimelineNode';
import { LiveDot } from './AnimatedComponents';
import type { PhaseSectionProps, TrainingPhase } from './types';

const phaseIcons: Record<TrainingPhase, typeof Target> = {
  setup: Crosshair,
  execution: Target,
  debrief: Trophy,
};

export function PhaseSection({
  phase,
  title,
  subtitle,
  status,
  isLast = false,
  colors,
  children,
  defaultExpanded = true,
}: PhaseSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded && status !== 'locked');
  const isLocked = status === 'locked';
  const isActive = status === 'active';
  const isCompleted = status === 'completed';

  const PhaseIcon = phaseIcons[phase];

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return colors.green;
      case 'active':
        return colors.primary;
      case 'upcoming':
        return colors.textMuted;
      case 'locked':
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  const statusColor = getStatusColor();

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
      {/* Timeline + Content Row */}
      <View style={styles.row}>
        {/* Timeline Column - More Prominent */}
        <TimelineNode status={status} isLast={isLast} colors={colors} />

        {/* Content Column */}
        <View style={styles.content}>
          {/* Phase Header - Larger & More Prominent */}
          <TouchableOpacity
            style={[
              styles.header,
              {
                backgroundColor: isActive 
                  ? statusColor + '08' 
                  : isCompleted 
                    ? colors.green + '05'
                    : colors.card,
                borderColor: isActive 
                  ? statusColor + '20' 
                  : isCompleted
                    ? colors.green + '15'
                    : 'transparent',
                borderWidth: (isActive || isCompleted) ? 1 : 0,
              },
            ]}
            onPress={() => !isLocked && setExpanded(!expanded)}
            activeOpacity={isLocked ? 1 : 0.7}
            disabled={isLocked}
          >
            {/* Icon - Larger */}
            <View style={[styles.iconWrap, { backgroundColor: statusColor + '12' }]}>
              <PhaseIcon size={20} color={statusColor} />
            </View>

            {/* Title & Subtitle */}
            <View style={styles.titleWrap}>
              <View style={styles.titleRow}>
                <Text style={[
                  styles.title, 
                  { color: isLocked ? colors.textMuted : colors.text }
                ]}>
                  {title}
                </Text>
                {isCompleted && (
                  <View style={[styles.completedBadge, { backgroundColor: colors.green + '15' }]}>
                    <Check size={12} color={colors.green} strokeWidth={3} />
                  </View>
                )}
                {isActive && (
                  <View style={[styles.activeBadge, { backgroundColor: colors.primary + '15' }]}>
                    <LiveDot size={6} />
                    <Text style={[styles.activeBadgeText, { color: colors.primary }]}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
            </View>

            {/* Expand/Collapse */}
            {!isLocked && (
              <View style={[styles.expandBtn, { backgroundColor: colors.secondary }]}>
                {expanded ? (
                  <ChevronUp size={18} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={18} color={colors.textMuted} />
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Phase Content - More Spacing */}
          {expanded && !isLocked && children && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.children}>
              {children}
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  completedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  children: {
    marginTop: 20,
  },
});
