/**
 * DrillChapter Component
 * Larger drill card with preview option
 * Shows drill details, position, target type, and optional historical stats
 */

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
  AlertCircle,
  Check, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Crosshair, 
  Play, 
  Target, 
  Ruler,
  User,
  TrendingUp,
  BarChart3,
} from 'lucide-react-native';
import type { DrillChapterProps } from './types';

// Position labels
const POSITION_LABELS: Record<string, string> = {
  prone: 'Prone',
  sitting: 'Sitting',
  kneeling: 'Kneeling',
  standing: 'Standing',
  barricade: 'Barricade',
};

// Target type labels
const TARGET_LABELS: Record<string, string> = {
  paper: 'Paper Target',
  steel: 'Steel Target',
  ipsc: 'IPSC Target',
  silhouette: 'Silhouette',
};

export function DrillChapter({
  drill,
  chapterNumber,
  isCompleted,
  canStart,
  onStart,
  isStarting,
  colors,
  hasWeapon = true,
  similarStats,
}: DrillChapterProps) {
  const [expanded, setExpanded] = useState(false);
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? colors.green : '#F59E0B';
  const goalLabel = isGrouping ? 'Grouping' : 'Engagement';
  const GoalIcon = isGrouping ? Crosshair : Target;

  // Can only start if has weapon
  const canActuallyStart = canStart && hasWeapon;

  // Completed drills have distinct muted styling
  const completedBg = colors.textMuted + '10';
  const completedBorder = colors.textMuted + '25';
  
  // Position and target type from drill config
  const position = drill.config?.position || drill.position;
  const targetType = drill.config?.target_type || drill.target_type || 'paper';
  const isTimed = !!(drill.config?.time_limit_seconds || drill.time_limit_seconds);

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
            <View style={styles.subtitleRow}>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {drill.distance_m || drill.config?.distance_m}m · {drill.rounds_per_shooter || drill.config?.rounds} rds
              </Text>
              {position && (
                <View style={[styles.positionTag, { backgroundColor: colors.secondary }]}>
                  <User size={10} color={colors.textMuted} />
                  <Text style={[styles.positionText, { color: colors.textMuted }]}>
                    {POSITION_LABELS[position] || position}
                  </Text>
                </View>
              )}
              {isTimed && (
                <View style={[styles.timedTag, { backgroundColor: colors.orange + '15' }]}>
                  <Clock size={10} color={colors.orange} />
                </View>
              )}
            </View>
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
                <Text style={[styles.statValue, { color: colors.text }]}>{drill.distance_m || drill.config?.distance_m}m</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.secondary }]}>
                <Target size={14} color={colors.textMuted} />
                <Text style={[styles.statValue, { color: colors.text }]}>{drill.rounds_per_shooter || drill.config?.rounds}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rounds</Text>
              </View>
              {(drill.time_limit_seconds || drill.config?.time_limit_seconds) ? (
                <View style={[styles.statItem, { backgroundColor: colors.secondary }]}>
                  <Clock size={14} color={colors.textMuted} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{drill.time_limit_seconds || drill.config?.time_limit_seconds}s</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Time</Text>
                </View>
              ) : null}
            </View>

            {/* Position & Target Row */}
            <View style={styles.detailsRow}>
              {position && (
                <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}>
                  <User size={12} color={colors.textMuted} />
                  <Text style={[styles.detailChipText, { color: colors.text }]}>
                    {POSITION_LABELS[position] || position}
                  </Text>
                </View>
              )}
              <View style={[styles.detailChip, { backgroundColor: colors.secondary }]}>
                <Target size={12} color={colors.textMuted} />
                <Text style={[styles.detailChipText, { color: colors.text }]}>
                  {TARGET_LABELS[targetType] || targetType}
                </Text>
              </View>
              <View style={[styles.detailChip, { backgroundColor: goalColor + '15' }]}>
                <GoalIcon size={12} color={goalColor} />
                <Text style={[styles.detailChipText, { color: goalColor }]}>{goalLabel}</Text>
              </View>
            </View>

            {/* Similar Stats (if available) */}
            {similarStats && (
              <View style={[styles.similarStatsCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                <View style={styles.similarStatsHeader}>
                  <TrendingUp size={14} color={colors.primary} />
                  <Text style={[styles.similarStatsTitle, { color: colors.primary }]}>Your Last Similar Session</Text>
                </View>
                <View style={styles.similarStatsRow}>
                  {similarStats.accuracy !== undefined && (
                    <View style={styles.similarStatItem}>
                      <Text style={[styles.similarStatValue, { color: colors.text }]}>{similarStats.accuracy}%</Text>
                      <Text style={[styles.similarStatLabel, { color: colors.textMuted }]}>Accuracy</Text>
                    </View>
                  )}
                  {similarStats.bestGroup !== undefined && (
                    <View style={styles.similarStatItem}>
                      <Text style={[styles.similarStatValue, { color: colors.text }]}>{similarStats.bestGroup}cm</Text>
                      <Text style={[styles.similarStatLabel, { color: colors.textMuted }]}>Best Group</Text>
                    </View>
                  )}
                  {similarStats.date && (
                    <View style={styles.similarStatItem}>
                      <Text style={[styles.similarStatValue, { color: colors.textMuted }]}>{similarStats.date}</Text>
                      <Text style={[styles.similarStatLabel, { color: colors.textMuted }]}>Date</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Action - show start or blocked state */}
            {canStart && !isCompleted && (
              hasWeapon ? (
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
              ) : (
                <View style={[styles.blockedBtn, { backgroundColor: colors.textMuted + '15' }]}>
                  <AlertCircle size={14} color={colors.textMuted} />
                  <Text style={[styles.blockedText, { color: colors.textMuted }]}>Assign weapon first</Text>
                </View>
              )
            )}
          </Animated.View>
        )}

        {/* Quick Start (when collapsed & can start & has weapon) */}
        {!expanded && canStart && hasWeapon && !isCompleted && (
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
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 13,
  },
  positionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timedTag: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
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
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailChipText: {
    fontSize: 12,
    fontWeight: '600',
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
  // Similar stats card
  similarStatsCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  similarStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  similarStatsTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  similarStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  similarStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  similarStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  similarStatLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  blockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  blockedText: {
    fontSize: 14,
    fontWeight: '600',
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
