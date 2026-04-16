/**
 * PersonalHeroSection Component
 *
 * Compact personal stats summary with animated streak flame and
 * weekly goal progress bar to make progress feel rewarding.
 */

import { ChevronRight, Flame, Trophy, User } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT_WEEKLY_GOAL = 5;

interface PersonalHeroSectionProps {
  sessions: number;
  accuracy: number;
  streak: number;
  totalShots: number;
  onViewInsights: () => void;
  weeklyGoal?: number;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
    green: string;
    orange: string;
  };
}

export function PersonalHeroSection({
  sessions,
  accuracy,
  streak,
  totalShots,
  onViewInsights,
  weeklyGoal = DEFAULT_WEEKLY_GOAL,
  colors,
}: PersonalHeroSectionProps) {
  const flameScale = useSharedValue(1);
  const barProgress = useSharedValue(0);

  const goalPct = Math.min(sessions / Math.max(weeklyGoal, 1), 1);
  const isGoalMet = sessions >= weeklyGoal;
  const streakActive = streak >= 3;

  useEffect(() => {
    barProgress.value = withTiming(goalPct, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [goalPct, barProgress]);

  useEffect(() => {
    if (streakActive) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(flameScale);
      flameScale.value = 1;
    }
    return () => cancelAnimation(flameScale);
  }, [streakActive, flameScale]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barProgress.value * 100}%`,
  }));

  const remaining = Math.max(weeklyGoal - sessions, 0);
  const progressColor = isGoalMet ? colors.green : '#F97316';

  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.container}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.identityRow}>
          <View style={[s.badge, { backgroundColor: colors.border }]}>
            <User size={15} color={colors.text} />
          </View>
          <View style={s.identityInfo}>
            <Text style={[s.title, { color: colors.text }]}>Personal Training</Text>
            <View style={s.metaRow}>
              {streak > 0 && (
                <>
                  <Animated.View style={flameStyle}>
                    <Flame
                      size={11}
                      color="#F97316"
                      fill={streakActive ? '#F97316' : 'transparent'}
                    />
                  </Animated.View>
                  <Text style={[s.metaText, { color: colors.textMuted }]}>{streak}d streak</Text>
                </>
              )}
              {streak > 0 && totalShots > 0 && (
                <View style={[s.metaDivider, { backgroundColor: colors.border }]} />
              )}
              {totalShots > 0 && (
                <Text style={[s.metaText, { color: colors.textMuted }]}>
                  {totalShots.toLocaleString()} shots
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={s.detailsBtn}
            onPress={onViewInsights}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[s.detailsBtnText, { color: colors.textMuted }]}>Insights</Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[s.statsStrip, { borderTopColor: colors.border }]}>
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{sessions}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>sessions</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {accuracy > 0 ? `${Math.round(accuracy)}%` : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>accuracy</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statValue, { color: colors.text }]}>{streak}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>day streak</Text>
          </View>
        </View>

        <View style={[s.goalWrap, { borderTopColor: colors.border }]}>
          <View style={s.goalHeader}>
            <Text style={[s.goalLabel, { color: colors.textMuted }]}>WEEKLY GOAL</Text>
            {isGoalMet ? (
              <View style={s.goalStatus}>
                <Trophy size={11} color={colors.green} fill={colors.green} />
                <Text style={[s.goalStatusText, { color: colors.green }]}>Crushed it</Text>
              </View>
            ) : (
              <Text style={[s.goalHint, { color: colors.textMuted }]}>
                {remaining} more to go
              </Text>
            )}
          </View>
          <View style={[s.goalTrack, { backgroundColor: colors.border }]}>
            <Animated.View style={[s.goalFill, { backgroundColor: progressColor }, barStyle]} />
          </View>
          <View style={s.goalFooter}>
            <Text style={[s.goalProgressText, { color: colors.textMuted }]}>
              {sessions} / {weeklyGoal}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 8,
    marginHorizontal: 4,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  goalWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  goalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  goalHint: {
    fontSize: 10,
    fontWeight: '500',
  },
  goalTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalFooter: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  goalProgressText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
