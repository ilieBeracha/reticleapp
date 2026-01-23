/**
 * WeeklyProgressRing Component
 *
 * Visual circular progress indicator showing weekly goal completion.
 * Animates on mount and provides engaging visual feedback.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Target, TrendingUp } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { Colors, WeeklyStats } from '../UnifiedHomePage.types';

interface WeeklyProgressRingProps {
  stats: WeeklyStats;
  colors: Colors;
  weeklyGoal?: number; // Target sessions per week
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SIZE = 100;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WeeklyProgressRing({ stats, colors, weeklyGoal = 5 }: WeeklyProgressRingProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const completionPercent = Math.min((stats.sessions / weeklyGoal) * 100, 100);

  useEffect(() => {
    progress.value = withTiming(completionPercent / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [completionPercent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  };

  const isGoalMet = stats.sessions >= weeklyGoal;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)}>
      <AnimatedTouchable
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }, cardAnimStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Left: Progress Ring */}
        <View style={s.ringContainer}>
          <Svg width={SIZE} height={SIZE} style={s.svg}>
            {/* Background circle */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={colors.border}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={isGoalMet ? colors.green : colors.primary}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedProps}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
          <View style={s.ringCenter}>
            <Text style={[s.ringValue, { color: colors.text }]}>{stats.sessions}</Text>
            <Text style={[s.ringLabel, { color: colors.textMuted }]}>of {weeklyGoal}</Text>
          </View>
        </View>

        {/* Right: Stats & Info */}
        <View style={s.content}>
          <View style={s.header}>
            <Text style={[s.title, { color: colors.text }]}>Weekly Goal</Text>
            {isGoalMet && (
              <View style={[s.badge, { backgroundColor: `${colors.green}15` }]}>
                <Text style={[s.badgeText, { color: colors.green }]}>Complete!</Text>
              </View>
            )}
          </View>

          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Target size={14} color={colors.indigo} />
              <Text style={[s.statValue, { color: colors.text }]}>{stats.shots.toLocaleString()}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>shots</Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.statItem}>
              <TrendingUp size={14} color={colors.green} />
              <Text style={[s.statValue, { color: colors.text }]}>{stats.accuracy}%</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>avg</Text>
            </View>
          </View>

          <View style={s.progressTextRow}>
            <Text style={[s.progressText, { color: colors.textMuted }]}>
              {isGoalMet ? 'Great work this week!' : `${weeklyGoal - stats.sessions} more to hit your goal`}
            </Text>
            <ChevronRight size={16} color={colors.textMuted} style={{ opacity: 0.5 }} />
          </View>
        </View>
      </AnimatedTouchable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 16,
  },
  ringContainer: {
    position: 'relative',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: -2,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 16,
    marginHorizontal: 12,
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
