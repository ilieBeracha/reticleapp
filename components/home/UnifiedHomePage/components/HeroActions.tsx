/**
 * HeroActions Component
 *
 * Compact actions section:
 * - Solo Session: 50% width - start/continue practice
 * - Default Weapon: 25% - shows weapon name & rounds
 * - Weapon Stats: 25% - shows accuracy or sessions
 * - Team Coming Up: Only shows if there are trainings today
 */

import type { UserWeapon, WeaponStats } from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Crosshair, Play, Target, Zap } from 'lucide-react-native';
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
  // Weapon data
  defaultWeapon: UserWeapon | null;
  defaultWeaponStats: WeaponStats | null;
  // Team
  todayTrainings: TodayTraining[];
  onTrainingPress: (training: TodayTraining) => void;
}

// Format large numbers (e.g., 1500 -> 1.5k)
const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function HeroActions({
  colors,
  activeSession,
  hasActiveSession,
  starting,
  onStartSession,
  onActiveSessionPress,
  defaultWeapon,
  defaultWeaponStats,
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
    if (defaultWeapon) {
      router.push(`/(protected)/weaponDetail?weaponId=${defaultWeapon.id}` as any);
    } else {
      router.push('/(protected)/(tabs)/loadout' as any);
    }
  };

  const handleStatsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (defaultWeapon) {
      router.push(`/(protected)/weaponDetail?weaponId=${defaultWeapon.id}` as any);
    } else {
      router.push('/(protected)/(tabs)/loadout' as any);
    }
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
            hasActiveSession && s.soloButtonActive,
            soloAnimStyle,
          ]}
          onPress={handleSoloPress}
          onPressIn={handleSoloPressIn}
          onPressOut={handleSoloPressOut}
          activeOpacity={1}
          disabled={starting}
        >
          {hasActiveSession ? (
            <View style={s.liveIconContainer}>
              <Animated.View style={[s.livePulse, pulseStyle]} />
              <View style={s.soloIconLive}>
                <Play size={11} color="#fff" fill="#fff" />
              </View>
            </View>
          ) : (
            <View style={s.soloIconDefault}>
              <Target size={13} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </View>
          )}
          <Text style={[s.soloText, hasActiveSession && s.soloTextActive]} numberOfLines={1}>
            {hasActiveSession ? 'Continue' : 'Start Session'}
          </Text>
          <ChevronRight size={14} color={hasActiveSession ? '#fff' : 'rgba(255,255,255,0.5)'} />
        </AnimatedTouchable>

        {/* Default Weapon - 25% */}
        <AnimatedTouchable
          style={[
            s.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            weaponAnimStyle,
          ]}
          onPress={handleWeaponPress}
          onPressIn={() => { weaponScale.value = withSpring(0.95); }}
          onPressOut={() => { weaponScale.value = withSpring(1); }}
          activeOpacity={1}
        >
          {defaultWeapon ? (
            <>
              <View style={[s.statIcon, { backgroundColor: `${colors.indigo}15` }]}>
                <Crosshair size={12} color={colors.indigo} />
              </View>
              <Text style={[s.statValue, { color: colors.text }]} numberOfLines={1}>
                {defaultWeapon.name.length > 6 ? defaultWeapon.name.slice(0, 5) + '…' : defaultWeapon.name}
              </Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {defaultWeapon.caliber || 'Weapon'}
              </Text>
            </>
          ) : (
            <>
              <View style={[s.statIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Zap size={12} color={colors.primary} />
              </View>
              <Text style={[s.statValue, { color: colors.textMuted }]}>—</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Add</Text>
            </>
          )}
        </AnimatedTouchable>

        {/* Weapon Stats - 25% */}
        <AnimatedTouchable
          style={[
            s.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            statsAnimStyle,
          ]}
          onPress={handleStatsPress}
          onPressIn={() => { statsScale.value = withSpring(0.95); }}
          onPressOut={() => { statsScale.value = withSpring(1); }}
          activeOpacity={1}
        >
          {defaultWeaponStats ? (
            <>
              <View style={[s.statIcon, { backgroundColor: `${colors.green}15` }]}>
                <Target size={12} color={colors.green} />
              </View>
              <Text style={[s.statValue, { color: colors.text }]}>
                {formatNumber(defaultWeaponStats.total_rounds_fired)}
              </Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Rounds</Text>
            </>
          ) : (
            <>
              <View style={[s.statIcon, { backgroundColor: `${colors.green}15` }]}>
                <Target size={12} color={colors.green} />
              </View>
              <Text style={[s.statValue, { color: colors.textMuted }]}>0</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Rounds</Text>
            </>
          )}
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
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  soloButtonActive: {
    backgroundColor: '#0d5c2e',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  soloIconDefault: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  soloIconLive: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  soloText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.2,
  },
  soloTextActive: {
    color: '#fff',
  },
  liveIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.4)',
  },

  // Stat Cards - flex: 1 (25% each)
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 1,
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '500',
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
