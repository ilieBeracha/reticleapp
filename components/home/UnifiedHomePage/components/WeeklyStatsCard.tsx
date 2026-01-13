/**
 * WeeklyStatsCard Component
 *
 * Displays weekly shooting statistics in a compact, visually appealing card.
 * Tappable to navigate to session history. Shows placeholder when no sessions.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Clock, Crosshair, Flame, Target, TrendingUp } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { STREAK_DISPLAY_THRESHOLD } from '../UnifiedHomePage.constants';
import { formatDuration } from '../UnifiedHomePage.helpers';
import type { WeeklyStatsCardProps } from '../UnifiedHomePage.types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function WeeklyStatsCard({ stats, streak, colors }: WeeklyStatsCardProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.98, {}, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  };

  // Empty state - no sessions this week
  if (stats.sessions === 0) {
    return (
      <AnimatedTouchable
        entering={FadeInDown.duration(350).delay(150)}
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }, animStyle]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={s.emptyHeader}>
          <View style={s.headerRow}>
            <Text style={[s.title, { color: colors.text }]}>This Week</Text>
            <ChevronRight size={16} color={colors.textMuted} style={{ opacity: 0.5 }} />
          </View>
        </View>
        <View style={s.emptyContent}>
          <View style={s.emptyStatsRow}>
            <View style={[s.emptyStat, { backgroundColor: colors.secondary }]}>
              <Target size={14} color={colors.textMuted} />
              <Text style={[s.emptyStatText, { color: colors.textMuted }]}>--</Text>
            </View>
            <View style={[s.emptyStat, { backgroundColor: colors.secondary }]}>
              <TrendingUp size={14} color={colors.textMuted} />
              <Text style={[s.emptyStatText, { color: colors.textMuted }]}>--</Text>
            </View>
            <View style={[s.emptyStat, { backgroundColor: colors.secondary }]}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={[s.emptyStatText, { color: colors.textMuted }]}>--</Text>
            </View>
          </View>
          <Text style={[s.emptyMessage, { color: colors.textMuted }]}>
            No practice sessions yet this week
          </Text>
        </View>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      entering={FadeInDown.duration(350).delay(150)}
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }, animStyle]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Header with streak */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={[s.title, { color: colors.text }]}>This Week</Text>
          <View style={[s.sessionBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[s.sessionBadgeText, { color: colors.primary }]}>
              {stats.sessions} session{stats.sessions !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          {streak >= STREAK_DISPLAY_THRESHOLD && (
            <View style={s.streakBadge}>
              <Flame size={12} color="#F97316" fill="#F97316" />
              <Text style={s.streakText}>{streak}</Text>
            </View>
          )}
          <ChevronRight size={14} color={colors.textMuted} style={{ opacity: 0.5 }} />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        <StatItem
          icon={<Target size={14} color={colors.indigo} />}
          value={stats.shots.toLocaleString()}
          label="Shots"
          colors={colors}
        />
        <StatItem
          icon={<TrendingUp size={14} color={colors.green} />}
          value={`${stats.accuracy}%`}
          label="Accuracy"
          colors={colors}
        />
        <StatItem
          icon={<Crosshair size={14} color={colors.orange} />}
          value={stats.bestGroup}
          label="Best Group"
          colors={colors}
        />
        <StatItem
          icon={<Clock size={14} color={colors.blue} />}
          value={formatDuration(stats.totalTimeMinutes)}
          label="Time"
          colors={colors}
        />
      </View>
    </AnimatedTouchable>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  colors: WeeklyStatsCardProps['colors'];
}

function StatItem({ icon, value, label, colors }: StatItemProps) {
  return (
    <View style={s.stat}>
      <View style={s.statHeader}>
        {icon}
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sessionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F9731615',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderRadius: 10,
    padding: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Empty state
  emptyHeader: {
    marginBottom: 10,
  },
  emptyContent: {
    gap: 10,
  },
  emptyStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStatText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 11,
    textAlign: 'center',
  },
});
