/**
 * WeeklyStatsCard Component
 * 
 * Displays weekly shooting statistics in a compact, visually appealing card.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Crosshair, Flame, Target, TrendingUp } from 'lucide-react-native';
import { STREAK_DISPLAY_THRESHOLD } from '../UnifiedHomePage.constants';
import { formatDuration } from '../UnifiedHomePage.helpers';
import type { WeeklyStatsCardProps } from '../UnifiedHomePage.types';

export function WeeklyStatsCard({ stats, streak, colors }: WeeklyStatsCardProps) {
  if (stats.sessions === 0) return null;

  return (
    <View style={[localStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header with streak */}
      <View style={localStyles.header}>
        <View style={localStyles.headerLeft}>
          <Text style={[localStyles.title, { color: colors.text }]}>This Week</Text>
          <View style={[localStyles.sessionBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[localStyles.sessionBadgeText, { color: colors.primary }]}>
              {stats.sessions} session{stats.sessions !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        {streak >= STREAK_DISPLAY_THRESHOLD && (
          <View style={localStyles.streakBadge}>
            <Flame size={14} color="#F97316" fill="#F97316" />
            <Text style={localStyles.streakText}>{streak} day streak</Text>
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={localStyles.statsGrid}>
        <StatItem
          icon={<Target size={16} color={colors.indigo} />}
          value={stats.shots.toLocaleString()}
          label="Shots"
          colors={colors}
        />
        <StatItem
          icon={<TrendingUp size={16} color={colors.green} />}
          value={`${stats.accuracy}%`}
          label="Accuracy"
          colors={colors}
        />
        <StatItem
          icon={<Crosshair size={16} color={colors.orange} />}
          value={stats.bestGroup}
          label="Best Group"
          colors={colors}
        />
        <StatItem
          icon={<Clock size={16} color={colors.blue} />}
          value={formatDuration(stats.totalTimeMinutes)}
          label="Time"
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
    <View style={localStyles.stat}>
      <View style={localStyles.statHeader}>
        {icon}
        <Text style={[localStyles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[localStyles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sessionBadge: {
    paddingHorizontal: 8,
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
    gap: 5,
    backgroundColor: '#F9731610',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderRadius: 10,
    padding: 12,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});

