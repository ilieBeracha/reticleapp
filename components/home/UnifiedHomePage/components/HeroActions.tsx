/**
 * HeroActions Component
 *
 * Compact actions section:
 * - Solo Session: 50% width - start/continue practice
 * - Quick Actions: 25% each - Weapons & Stats
 * - Team Coming Up: Only shows if there are trainings today
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { BarChart3, BookOpen, Calendar, ChevronRight, Play, Target } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { HomeSession } from '../../types';
import type { Colors } from '../UnifiedHomePage.types';

interface TodayTraining {
  id: string;
  title: string;
  status: string;
  scheduled_date?: string;
  scheduled_at?: string;
  team?: { name: string } | null;
}

interface HeroActionsProps {
  colors: Colors;
  // Solo session
  activeSession: HomeSession | null;
  hasActiveSession: boolean;
  starting: boolean;
  onStartSession: () => void;
  onActiveSessionPress: () => void;
  // Team
  todayTrainings: TodayTraining[];
  onTrainingPress: (training: TodayTraining) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function HeroActions({
  colors,
  activeSession,
  hasActiveSession,
  starting,
  onStartSession,
  onActiveSessionPress,
  todayTrainings,
  onTrainingPress,
}: HeroActionsProps) {
  const soloScale = useSharedValue(1);
  const weaponScale = useSharedValue(1);
  const statsScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  // Pulse animation for live indicator
  useEffect(() => {
    if (hasActiveSession || todayTrainings.some((t) => t.status === 'ongoing')) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [hasActiveSession, todayTrainings]);

  const soloAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: soloScale.value }],
  }));

  const weaponAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: weaponScale.value }],
  }));

  const statsAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statsScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handleSoloPressIn = () => {
    soloScale.value = withSpring(0.97);
  };
  const handleSoloPressOut = () => {
    soloScale.value = withSpring(1);
  };

  const handleSoloPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasActiveSession) {
      onActiveSessionPress();
    } else {
      onStartSession();
    }
  };

  const handleWeaponPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/weaponLibrary' as any);
  };

  const handleStatsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/stats' as any);
  };

  const handleTrainingItemPress = (training: TodayTraining) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTrainingPress(training);
  };

  const handleViewAllTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/(tabs)/team');
  };

  // Format time from scheduled_date or scheduled_at
  const formatTime = (training: TodayTraining) => {
    const dateString = training.scheduled_at || training.scheduled_date;
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasTodayTrainings = todayTrainings.length > 0;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={s.container}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ACTION ROW - Solo (50%) + Weapons (25%) + Stats (25%) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View style={s.actionRow}>
        {/* Solo Session - 50% */}
        <AnimatedTouchable
          style={[
            s.soloButton,
            {
              backgroundColor: hasActiveSession ? colors.green : colors.primary,
            },
            soloAnimStyle,
          ]}
          onPress={handleSoloPress}
          onPressIn={handleSoloPressIn}
          onPressOut={handleSoloPressOut}
          activeOpacity={1}
          disabled={starting}
        >
          <View style={s.soloIcon}>
            {hasActiveSession ? (
              <View style={s.liveIconContainer}>
                <Animated.View style={[s.livePulse, pulseStyle]} />
                <Play size={12} color="#fff" fill="#fff" />
              </View>
            ) : (
              <Target size={14} color="#fff" strokeWidth={2.5} />
            )}
          </View>
          <Text style={s.soloText} numberOfLines={1}>
            {hasActiveSession
              ? 'Continue'
              : 'Start Session'}
          </Text>
        </AnimatedTouchable>

        {/* Weapons - 25% */}
        <AnimatedTouchable
          style={[
            s.quickAction,
            { backgroundColor: colors.card, borderColor: colors.border },
            weaponAnimStyle,
          ]}
          onPress={handleWeaponPress}
          onPressIn={() => { weaponScale.value = withSpring(0.95); }}
          onPressOut={() => { weaponScale.value = withSpring(1); }}
          activeOpacity={1}
        >
          <View style={[s.quickIcon, { backgroundColor: `${colors.indigo}15` }]}>
            <BookOpen size={14} color={colors.indigo} />
          </View>
          <Text style={[s.quickLabel, { color: colors.text }]}>Weapons</Text>
        </AnimatedTouchable>

        {/* Stats - 25% */}
        <AnimatedTouchable
          style={[
            s.quickAction,
            { backgroundColor: colors.card, borderColor: colors.border },
            statsAnimStyle,
          ]}
          onPress={handleStatsPress}
          onPressIn={() => { statsScale.value = withSpring(0.95); }}
          onPressOut={() => { statsScale.value = withSpring(1); }}
          activeOpacity={1}
        >
          <View style={[s.quickIcon, { backgroundColor: `${colors.green}15` }]}>
            <BarChart3 size={14} color={colors.green} />
          </View>
          <Text style={[s.quickLabel, { color: colors.text }]}>Stats</Text>
        </AnimatedTouchable>
      </View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TEAM COMING UP - Only shows if there are today's trainings */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {hasTodayTrainings && (
        <View style={[s.comingUpSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.comingUpHeader}>
            <View style={s.comingUpTitleRow}>
              <Calendar size={12} color={colors.textMuted} />
              <Text style={[s.comingUpTitle, { color: colors.textMuted }]}>TODAY</Text>
            </View>
            {todayTrainings.length > 2 && (
              <TouchableOpacity onPress={handleViewAllTeam} activeOpacity={0.7}>
                <Text style={[s.viewAllText, { color: colors.primary }]}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.trainingsList}>
            {todayTrainings.slice(0, 2).map((training, index) => {
              const isLive = training.status === 'ongoing';
              
              return (
                <TouchableOpacity
                  key={training.id}
                  style={[
                    s.trainingItem,
                    { borderColor: isLive ? colors.orange : 'transparent' },
                    isLive && { backgroundColor: `${colors.orange}08` },
                    index < Math.min(todayTrainings.length, 2) - 1 && { marginBottom: 6 },
                  ]}
                  onPress={() => handleTrainingItemPress(training)}
                  activeOpacity={0.7}
                >
                  <View style={s.trainingItemLeft}>
                    {isLive ? (
                      <View style={[s.liveIndicator, { backgroundColor: colors.orange }]}>
                        <Animated.View style={[s.liveDot, pulseStyle]} />
                      </View>
                    ) : (
                      <View style={[s.timeIndicator, { backgroundColor: colors.secondary }]}>
                        <Text style={[s.timeText, { color: colors.textMuted }]}>
                          {formatTime(training)}
                        </Text>
                      </View>
                    )}
                    <View style={s.trainingInfo}>
                      <Text style={[s.trainingTitle, { color: colors.text }]} numberOfLines={1}>
                        {training.title}
                      </Text>
                      {training.team?.name && (
                        <Text style={[s.teamName, { color: colors.textMuted }]} numberOfLines={1}>
                          {training.team.name}
                        </Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={14} color={colors.border} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 14,
  },

  // Action Row - Solo (50%) + Quick Actions (25% each)
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },

  // Solo Session Button - flex: 2 (50%)
  soloButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  soloIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  soloText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: -0.2,
  },
  liveIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Quick Action Buttons - flex: 1 (25% each)
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  quickIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Coming Up Section
  comingUpSection: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  comingUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  comingUpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comingUpTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Training Items
  trainingsList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  trainingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  trainingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  liveIndicator: {
    width: 44,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#fff',
  },
  timeIndicator: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trainingInfo: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  teamName: {
    fontSize: 11,
    marginTop: 1,
  },
});
