/**
 * RecentSessionRow Component
 *
 * Clean session row with key metrics and press feedback.
 * Shows different stats for grouping vs engagement sessions.
 */

import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
import { isGroupingGoal } from '@/utils/drillGoal';
import { Crosshair, Heart, Target, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { formatTimeAgo } from '../UnifiedHomePage.helpers';
import type { RecentSessionRowProps } from '@/types/home';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function RecentSessionRow({ session, colors, onPress }: RecentSessionRowProps) {
  const { t } = useTranslation();
  const isTeam = session.origin === 'team';
  const hasWatchData = session.sourceSession?.watch_controlled ?? false;
  const isGrouping = isGroupingGoal(session.drillGoal);
  const isSquadOrGroup = session.isSquadEngagement || session.isGroupEngagement;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const timeAgo = session.endedAt
    ? formatTimeAgo(session.endedAt, t)
    : session.startedAt
      ? formatTimeAgo(session.startedAt, t)
      : '';

  const shots = session.stats?.shots || 0;
  const hits = session.stats?.hits || 0;
  const accuracy = session.stats?.accuracy;
  const bestDispersion = session.stats?.bestDispersion;
  const participantCount = session.stats?.participantCount;

  // Icon color: squad/group = blue, grouping = orange, engagement = indigo
  const iconColor = isSquadOrGroup ? colors.blue : isGrouping ? colors.orange : colors.indigo;

  return (
    <AnimatedTouchable
      style={[s.row, animStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Icon - different for squad/group, grouping, and solo engagement */}
      <View style={[s.icon, { backgroundColor: `${iconColor}12` }]}>
        {isSquadOrGroup ? (
          <Users size={15} color={iconColor} />
        ) : isGrouping ? (
          <Target size={15} color={iconColor} />
        ) : (
          <Crosshair size={15} color={iconColor} />
        )}
      </View>

      {/* Content */}
      <View style={s.content}>
        <View style={s.titleRow}>
          <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
            {session.drillName || (isTeam ? t('home.teamSession') : t('home.practice'))}
          </Text>
          {/* Training context (if session came from a scheduled training) */}
          {session.trainingTitle && (
            <Text style={[s.trainingTitle, { color: colors.textMuted }]} numberOfLines={1}>
              {session.trainingTitle}
            </Text>
          )}
          {hasWatchData && <Heart size={12} color="#EF4444" fill="#EF4444" style={{ opacity: 0.8 }} />}
        </View>

        {/* Stats row - different for squad/group, grouping, and solo engagement */}
        <View style={s.statsRow}>
          {isSquadOrGroup ? (
            // SQUAD/GROUP: Show participant count + total shots (NO accuracy)
            <>
              {participantCount !== undefined && participantCount > 0 && (
                <Text style={[s.stat, { color: colors.blue }]}>{t('home.shooters', { count: participantCount })}</Text>
              )}
              {shots > 0 && (
                <>
                  <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
                  <Text style={[s.stat, { color: colors.textMuted }]}>{t('session.shotsCount', { count: shots })}</Text>
                </>
              )}
            </>
          ) : isGrouping ? (
            // GROUPING: Show shots + best dispersion (NO accuracy)
            <>
              {shots > 0 && (
                <Text style={[s.stat, { color: colors.textMuted }]}>{t('session.shotsCount', { count: shots })}</Text>
              )}
              {bestDispersion !== undefined && bestDispersion > 0 && (
                <>
                  <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
                  <Text style={[s.stat, { color: colors.orange }]}>
                    {t('session.dispersionCm', { value: bestDispersion.toFixed(1) })}
                  </Text>
                </>
              )}
            </>
          ) : (
            // SOLO ENGAGEMENT: Show hits + accuracy
            <>
              {shots > 0 && (
                <Text style={[s.stat, { color: colors.textMuted }]}>{t('session.hitsOfShots', { hits, shots })}</Text>
              )}
              {accuracy !== undefined && accuracy > 0 && (
                <>
                  <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
                  <Text style={[s.stat, { color: accuracy >= 70 ? colors.green : colors.textMuted }]}>{accuracy}%</Text>
                </>
              )}
            </>
          )}
        </View>
      </View>

      {/* Right side */}
      <View style={s.right}>
        <Text style={[s.time, { color: colors.textMuted }]}>{timeAgo}</Text>
        <DirectionalChevron size={14} color={colors.border} />
      </View>
    </AnimatedTouchable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  trainingTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  stat: {
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 5,
    opacity: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  time: {
    fontSize: 10,
    fontWeight: '500',
  },
});
