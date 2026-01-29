/**
 * WeeklyStatsCard Component
 *
 * Displays weekly shooting statistics in a compact, visually appealing card.
 * Tappable to navigate to session history. Shows placeholder when no sessions.
 */

import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Clock, Crosshair, Flame, Target, TrendingUp } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { STREAK_DISPLAY_THRESHOLD } from '../UnifiedHomePage.constants';
import { formatDuration } from '../UnifiedHomePage.helpers';
import type { WeeklyStatsCardProps } from '../UnifiedHomePage.types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function getSessionDurationMs(session: WeeklyStatsCardProps['sessionsData'][number]): number {
  if (!session.started_at || !session.ended_at) return 0;
  const start = new Date(session.started_at).getTime();
  const end = new Date(session.ended_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return end - start;
}

function getNormalizedDispersionAt100mCm(session: WeeklyStatsCardProps['sessionsData'][number]): number | null {
  const dispersionCm = session.stats?.best_dispersion_cm ?? null;
  if (dispersionCm == null || dispersionCm <= 0) return null;

  const distanceM = session.stats?.avg_distance_m ?? session.drill_config?.distance_m ?? null;
  if (distanceM == null || distanceM <= 0) return null;

  return dispersionCm * (100 / distanceM);
}

export function WeeklyStatsCard({ stats, streak, colors, sessionsData }: WeeklyStatsCardProps) {
  const { t } = useTranslation();
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
  const completedSessions = useMemo(() => {
    return sessionsData.filter((s) => s.status === 'completed');
  }, [sessionsData]);

  const hasAnySessionsThisWeek = stats.sessions > 0;

  if (!hasAnySessionsThisWeek) {
    return (
      <AnimatedTouchable
        entering={FadeInDown.duration(350).delay(150)}
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }, animStyle]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={s.emptyHeader}>
          <View style={s.headerRow}>
            <Text style={[s.title, { color: colors.text }]}>{t('home.thisWeek')}</Text>
            <DirectionalChevron size={16} color={colors.textMuted} style={{ opacity: 0.5 }} />
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
          <Text style={[s.emptyMessage, { color: colors.textMuted }]}>{t('home.noSessionsThisWeek')}</Text>
        </View>
      </AnimatedTouchable>
    );
  }

  const viewStats = useMemo(() => {
    let shots = 0;
    let hits = 0;
    let totalTimeMs = 0;
    let dispersionAt100mSum = 0;
    let dispersionAt100mCount = 0;

    completedSessions.forEach((session) => {
      const sShots = session.stats?.shots_fired ?? 0;
      const sHits = session.stats?.hits_total ?? 0;
      shots += sShots;
      hits += sHits;
      totalTimeMs += getSessionDurationMs(session);

      const d100 = getNormalizedDispersionAt100mCm(session);
      if (d100 != null) {
        dispersionAt100mSum += d100;
        dispersionAt100mCount++;
      }
    });

    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : null;
    const totalTimeMinutes = totalTimeMs > 0 ? Math.round(totalTimeMs / 60000) : 0;
    const avgGroupAt100m =
      dispersionAt100mCount > 0 ? `${(dispersionAt100mSum / dispersionAt100mCount).toFixed(1)}cm` : '—';

    return {
      sessions: completedSessions.length,
      shots,
      accuracy,
      totalTimeMinutes,
      avgGroupAt100m,
    };
  }, [completedSessions]);

  const displayShots = viewStats.sessions > 0 ? viewStats.shots.toLocaleString() : '—';
  const displayAccuracy = viewStats.sessions > 0 && viewStats.accuracy != null ? `${viewStats.accuracy}%` : '—';
  const displayTime = viewStats.sessions > 0 ? formatDuration(viewStats.totalTimeMinutes, t) : '—';

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
          <Text style={[s.title, { color: colors.text }]}>{t('home.thisWeek')}</Text>
          <View style={[s.sessionBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[s.sessionBadgeText, { color: colors.primary }]}>
              {t('home.sessionsCount', { count: viewStats.sessions })}
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
          <DirectionalChevron size={14} color={colors.textMuted} style={{ opacity: 0.5 }} />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        <StatItem
          icon={<Target size={14} color={colors.indigo} />}
          value={displayShots}
          label={t('session.shots')}
          colors={colors}
        />
        <StatItem
          icon={<TrendingUp size={14} color={colors.green} />}
          value={displayAccuracy}
          label={t('session.accuracy')}
          colors={colors}
        />
        <StatItem
          icon={<Crosshair size={14} color={colors.orange} />}
          value={viewStats.avgGroupAt100m}
          label={t('session.avgAt100m')}
          colors={colors}
        />
        <StatItem
          icon={<Clock size={14} color={colors.blue} />}
          value={displayTime}
          label={t('session.time')}
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
