/**
 * RecentSessionRow Component
 *
 * Clean session row with key metrics and press feedback.
 * Shows different stats for grouping vs engagement sessions.
 */

import { isGroupingGoal } from '@/utils/drillGoal';
import { ChevronRight, Crosshair, Heart, Target, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { formatTimeAgo } from '../UnifiedHomePage.helpers';
import type { RecentSessionRowProps } from '../UnifiedHomePage.types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function RecentSessionRow({ session, colors, onPress }: RecentSessionRowProps) {
  const isTeam = session.origin === 'team';
  const hasWatchData = session.sourceSession?.watch_controlled ?? false;
  const isGrouping = isGroupingGoal(session.drillGoal);
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
    ? formatTimeAgo(session.endedAt)
    : session.startedAt
      ? formatTimeAgo(session.startedAt)
      : '';

  const shots = session.stats?.shots || 0;
  const hits = session.stats?.hits || 0;
  const accuracy = session.stats?.accuracy;
  const bestDispersion = session.stats?.bestDispersion;

  const iconColor = isTeam ? colors.blue : isGrouping ? colors.orange : colors.indigo;

  return (
    <AnimatedTouchable
      style={[s.row, animStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {/* Icon - different for grouping vs engagement */}
      <View style={[s.icon, { backgroundColor: `${iconColor}12` }]}>
        {isTeam ? (
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
            {session.drillName || (isTeam ? 'Team Session' : 'Practice')}
          </Text>
          {hasWatchData && <Heart size={12} color="#EF4444" fill="#EF4444" style={{ opacity: 0.8 }} />}
        </View>

        {/* Stats row - different for grouping vs engagement */}
        <View style={s.statsRow}>
          {isGrouping ? (
            <>
              {shots > 0 && <Text style={[s.stat, { color: colors.textMuted }]}>{shots} shots</Text>}
              {bestDispersion !== undefined && bestDispersion > 0 && (
                <>
                  <View style={[s.dot, { backgroundColor: colors.textMuted }]} />
                  <Text style={[s.stat, { color: colors.orange }]}>{bestDispersion.toFixed(1)}cm</Text>
                </>
              )}
            </>
          ) : (
            <>
              {shots > 0 && (
                <Text style={[s.stat, { color: colors.textMuted }]}>
                  {hits}/{shots} hits
                </Text>
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
        <ChevronRight size={14} color={colors.border} />
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
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
