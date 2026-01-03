/**
 * WeeklyStatsCard Component
 * 
 * Displays weekly shooting statistics in a compact card.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Clock, Crosshair, Flame, Target, TrendingUp } from 'lucide-react-native';
import { styles } from '../UnifiedHomePage.styles';
import { STREAK_DISPLAY_THRESHOLD } from '../UnifiedHomePage.constants';
import { formatDuration } from '../UnifiedHomePage.helpers';
import type { WeeklyStatsCardProps } from '../UnifiedHomePage.types';

export function WeeklyStatsCard({ stats, streak, colors }: WeeklyStatsCardProps) {
  if (stats.sessions === 0) return null;

  return (
    <View style={[styles.weeklyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header with streak */}
      <View style={styles.weeklyHeader}>
        <Text style={[styles.weeklyTitle, { color: colors.text }]}>This Week</Text>
        <View style={styles.weeklyHeaderRight}>
          {streak >= STREAK_DISPLAY_THRESHOLD && (
            <View style={[styles.streakBadge, { backgroundColor: '#F9731615' }]}>
              <Flame size={12} color="#F97316" />
              <Text style={styles.streakText}>{streak}d</Text>
            </View>
          )}
          <Text style={[styles.weeklySessionCount, { color: colors.textMuted }]}>
            {stats.sessions} session{stats.sessions !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.weeklyStatsRow}>
        <StatItem
          icon={<Target size={14} color={colors.indigo} />}
          value={stats.shots.toLocaleString()}
          label="shots"
          colors={colors}
        />
        <View style={[styles.weeklyStatDivider, { backgroundColor: colors.border }]} />
        <StatItem
          icon={<TrendingUp size={14} color={colors.green} />}
          value={`${stats.accuracy}%`}
          label="accuracy"
          colors={colors}
        />
        <View style={[styles.weeklyStatDivider, { backgroundColor: colors.border }]} />
        <StatItem
          icon={<Crosshair size={14} color={colors.orange} />}
          value={stats.bestGroup}
          label="best"
          colors={colors}
        />
        <View style={[styles.weeklyStatDivider, { backgroundColor: colors.border }]} />
        <StatItem
          icon={<Clock size={14} color={colors.blue} />}
          value={formatDuration(stats.totalTimeMinutes)}
          label="time"
          colors={colors}
        />
      </View>
    </View>
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
    <View style={styles.weeklyStat}>
      {icon}
      <Text style={[styles.weeklyStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.weeklyStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

