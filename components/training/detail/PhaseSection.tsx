/**
 * PhaseSection Component
 * Collapsible phase section with timeline integration
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Check, ChevronRight, Crosshair, Target, Trophy } from 'lucide-react-native';
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
        {/* Timeline Column */}
        <TimelineNode status={status} isLast={isLast} colors={colors} />

        {/* Content Column */}
        <View style={styles.content}>
          {/* Phase Header */}
          <TouchableOpacity
            style={[
              styles.header,
              {
                backgroundColor: isActive ? statusColor + '10' : colors.card,
                borderColor: isActive ? statusColor + '30' : 'transparent',
                borderWidth: isActive ? 1 : 0,
              },
            ]}
            onPress={() => !isLocked && setExpanded(!expanded)}
            activeOpacity={isLocked ? 1 : 0.7}
            disabled={isLocked}
          >
            <View style={[styles.iconWrap, { backgroundColor: statusColor + '15' }]}>
              <PhaseIcon size={16} color={statusColor} />
            </View>

            <View style={styles.titleWrap}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: isLocked ? colors.textMuted : colors.text }]}>
                  {title}
                </Text>
                {status === 'completed' && (
                  <View style={[styles.completedBadge, { backgroundColor: colors.green + '20' }]}>
                    <Check size={10} color={colors.green} strokeWidth={3} />
                  </View>
                )}
                {status === 'active' && (
                  <View style={[styles.activeBadge, { backgroundColor: colors.primary + '20' }]}>
                    <LiveDot size={5} />
                    <Text style={[styles.activeBadgeText, { color: colors.primary }]}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
            </View>

            {!isLocked && (
              <ChevronRight
                size={18}
                color={colors.textMuted}
                style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
              />
            )}
          </TouchableOpacity>

          {/* Phase Content */}
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
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
    opacity: 0.7,
  },
  completedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  children: {
    marginTop: 14,
  },
});
