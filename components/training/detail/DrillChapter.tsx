/**
 * DrillChapter Component
 * Larger drill card with preview option
 */

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Check, ChevronDown, ChevronUp, Clock, Crosshair, Play, Target, Ruler } from 'lucide-react-native';
import type { DrillChapterProps } from './types';

export function DrillChapter({
  drill,
  chapterNumber,
  isCompleted,
  canStart,
  onStart,
  isStarting,
  colors,
}: DrillChapterProps) {
  const [expanded, setExpanded] = useState(false);
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? colors.green : '#F59E0B';
  const goalLabel = isGrouping ? 'Grouping' : 'Engagement';
  const GoalIcon = isGrouping ? Crosshair : Target;

  // Completed drills have distinct muted styling
  const completedBg = colors.textMuted + '10';
  const completedBorder = colors.textMuted + '25';

  return (
    <Animated.View entering={FadeInDown.delay(chapterNumber * 80).duration(300)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isCompleted ? completedBg : colors.card,
            borderColor: isCompleted ? completedBorder : colors.border,
            opacity: isCompleted ? 0.7 : 1,
          },
        ]}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          {/* Left: Goal badge */}
          <View style={[styles.goalBadge, { backgroundColor: isCompleted ? colors.textMuted + '15' : goalColor + '15' }]}>
            <GoalIcon size={14} color={isCompleted ? colors.textMuted : goalColor} strokeWidth={2} />
          </View>

          {/* Center: Title & basic info */}
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: isCompleted ? colors.textMuted : colors.text }]} numberOfLines={1}>
              {drill.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {drill.distance_m}m · {drill.rounds_per_shooter} rds
            </Text>
          </View>

          {/* Right: Status or expand */}
          {isCompleted ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.textMuted + '20' }]}>
              <Check size={14} color={colors.textMuted} strokeWidth={2.5} />
            </View>
          ) : (
            <View style={styles.expandBtn}>
              {expanded ? (
                <ChevronUp size={18} color={colors.textMuted} />
              ) : (
                <ChevronDown size={18} color={colors.textMuted} />
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Expanded Preview */}
        {expanded && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.preview}>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: colors.secondary }]}>
                <Ruler size={14} color={colors.textMuted} />
                <Text style={[styles.statValue, { color: colors.text }]}>{drill.distance_m}m</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.secondary }]}>
                <Target size={14} color={colors.textMuted} />
                <Text style={[styles.statValue, { color: colors.text }]}>{drill.rounds_per_shooter}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rounds</Text>
              </View>
              {drill.time_limit_seconds ? (
                <View style={[styles.statItem, { backgroundColor: colors.secondary }]}>
                  <Clock size={14} color={colors.textMuted} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{drill.time_limit_seconds}s</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Time</Text>
                </View>
              ) : null}
            </View>

            {/* Goal Description */}
            <View style={[styles.goalRow, { borderTopColor: colors.border }]}>
              <View style={[styles.goalTag, { backgroundColor: goalColor + '15' }]}>
                <Text style={[styles.goalText, { color: goalColor }]}>{goalLabel}</Text>
              </View>
              <Text style={[styles.goalDesc, { color: colors.textMuted }]}>
                {isGrouping ? 'Focus on tight shot groups' : 'Hit targets accurately'}
              </Text>
            </View>

            {/* Action */}
            {canStart && !isCompleted && (
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.primary }]}
                onPress={onStart}
                disabled={isStarting}
              >
                {isStarting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Play size={16} color="#fff" fill="#fff" />
                    <Text style={styles.startText}>Start Drill</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Quick Start (when collapsed & can start) */}
        {!expanded && canStart && !isCompleted && (
          <TouchableOpacity
            style={[styles.quickStart, { borderTopColor: colors.border }]}
            onPress={onStart}
            disabled={isStarting}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Play size={14} color={colors.primary} fill={colors.primary} />
                <Text style={[styles.quickStartText, { color: colors.primary }]}>Start</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  goalBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  goalTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  goalText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalDesc: {
    flex: 1,
    fontSize: 12,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  startText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  quickStart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  quickStartText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
