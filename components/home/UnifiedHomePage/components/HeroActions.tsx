/**
 * HeroActions Component
 *
 * Split-button hero that adapts content based on priority:
 * 1. Team training live → Main shows training, side shows "Solo"
 * 2. Active solo session → Full-width "Continue" button
 * 3. Idle → Full-width "Start Session" button
 *
 * Below: Weapon (50%) + Stats (50%) + TimelineStrip
 */

import type { UserWeapon, WeaponStats } from '@/services/weaponService';
import type { TrainingWithDetails } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Play, Radio, Target } from 'lucide-react-native';
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
import type { Colors, HeroMode } from '../UnifiedHomePage.types';
import { TimelineStrip } from './TimelineStrip';

interface HeroActionsProps {
  colors: Colors;
  heroMode: HeroMode;
  // Solo session
  activeSession: HomeSession | null;
  hasActiveSession: boolean;
  starting: boolean;
  onStartSession: () => void;
  onActiveSessionPress: () => void;
  // Team training
  activeTeamTraining: TrainingWithDetails | null;
  isTrainingCommander: boolean;
  hasTeams: boolean;
  onTrainingPress: (training: any) => void;
  // Next upcoming training (for secondary row)
  nextUpcomingTraining: TrainingWithDetails | null;
  // Weapon data
  defaultWeapon: UserWeapon | null;
  defaultWeaponStats: WeaponStats | null;
  // Upcoming trainings for timeline
  upcomingTrainings: TrainingWithDetails[];
}

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function HeroActions({
  colors,
  heroMode,
  activeSession,
  hasActiveSession,
  starting,
  onStartSession,
  onActiveSessionPress,
  activeTeamTraining,
  isTrainingCommander,
  hasTeams,
  onTrainingPress,
  nextUpcomingTraining,
  defaultWeapon,
  defaultWeaponStats,
  upcomingTrainings,
}: HeroActionsProps) {
  const mainScale = useSharedValue(1);
  const sideScale = useSharedValue(1);
  const weaponScale = useSharedValue(1);
  const statsScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (heroMode === 'team-live' || heroMode === 'solo-active') {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [heroMode]);

  const mainAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mainScale.value }],
  }));

  const sideAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sideScale.value }],
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

  // ─── HANDLERS ───────────────────────────────────────────────────────────────

  const handleMainPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (heroMode === 'team-live' && activeTeamTraining) {
      onTrainingPress(activeTeamTraining);
    } else if (heroMode === 'solo-active') {
      onActiveSessionPress();
    } else {
      onStartSession();
    }
  };

  const handleSoloSidePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStartSession();
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

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={s.container}>
      {/* ─── PRIMARY: Split button (main + solo side when team-live) ──── */}
      <Animated.View
        style={[
          s.splitContainer,
          heroMode === 'team-live' && (isTrainingCommander ? s.splitCommander : s.splitTeamLive),
          heroMode === 'solo-active' && s.splitSoloActive,
          heroMode === 'idle' && s.splitIdle,
          mainAnimStyle,
        ]}
      >
        {/* Main tappable area */}
        <TouchableOpacity
          style={s.mainArea}
          onPress={handleMainPress}
          onPressIn={() => {
            mainScale.value = withSpring(0.97);
          }}
          onPressOut={() => {
            mainScale.value = withSpring(1);
          }}
          activeOpacity={0.8}
          disabled={starting}
        >
          {heroMode === 'team-live' && activeTeamTraining && (
            <>
              <View style={s.liveIconContainer}>
                <Animated.View
                  style={[s.livePulse, isTrainingCommander ? s.livePulseIndigo : s.livePulseOrange, pulseStyle]}
                />
                <View style={[s.liveIconBadge, isTrainingCommander && s.liveIconBadgeCommander]}>
                  <Radio size={11} color="#fff" />
                </View>
              </View>
              <View style={s.mainTextContainer}>
                <Text style={s.mainLabel} numberOfLines={1}>
                  {isTrainingCommander ? 'Your Training' : (activeTeamTraining.team?.name ?? 'Team')}
                </Text>
                <Text style={s.mainTitle} numberOfLines={1}>
                  {activeTeamTraining.title || 'Live Training'}
                </Text>
              </View>
              <View style={[s.badge, isTrainingCommander ? s.badgeCommander : s.badgeLive]}>
                <Text style={s.badgeText}>{isTrainingCommander ? 'MANAGE' : 'JOIN'}</Text>
              </View>
              <ChevronRight size={14} color="rgba(255,255,255,0.5)" />
            </>
          )}

          {heroMode === 'solo-active' && (
            <>
              <View style={s.liveIconContainer}>
                <Animated.View style={[s.livePulse, s.livePulseGreen, pulseStyle]} />
                <View style={s.soloIconLive}>
                  <Play size={11} color="#fff" fill="#fff" />
                </View>
              </View>
              <View style={s.mainTextContainer}>
                <Text style={s.mainLabel} numberOfLines={1}>
                  Active Session
                </Text>
                <Text style={s.mainTitle} numberOfLines={1}>
                  {activeSession?.drillName || 'Solo Practice'}
                </Text>
              </View>
              <ChevronRight size={14} color="rgba(255,255,255,0.5)" />
            </>
          )}

          {heroMode === 'idle' && (
            <>
              <View style={s.soloIconDefault}>
                <Target size={13} color="rgba(255,255,255,0.9)" strokeWidth={2} />
              </View>
              <Text style={s.idleText}>Start Session</Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.5)" />
            </>
          )}
        </TouchableOpacity>

        {/* Solo side — attached, separated by divider (only when team-live) */}
        {heroMode === 'team-live' && (
          <>
            <View style={[s.divider, isTrainingCommander ? s.dividerCommander : s.dividerOrange]} />
            <TouchableOpacity style={s.sideArea} onPress={handleSoloSidePress} activeOpacity={0.7}>
              <View style={s.sideIcon}>
                <Target size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
              </View>
              <Text style={s.sideLabel}>Solo</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* ─── TIMELINE STRIP ────────────────────────────────────────────── */}
      <TimelineStrip colors={colors} trainings={upcomingTrainings} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 14,
  },

  // ─── SPLIT BUTTON ──────────────────────────────────────────────────────────
  splitContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  splitTeamLive: {
    backgroundColor: '#3d1f00',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  splitCommander: {
    backgroundColor: '#1a1a3d',
    borderColor: 'rgba(99,102,241,0.35)',
  },
  splitSoloActive: {
    backgroundColor: '#0d5c2e',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  splitIdle: {
    backgroundColor: '#1a1a1a',
    borderColor: 'rgba(255,255,255,0.08)',
  },

  // Main tappable area (flex: 1)
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  mainTextContainer: {
    flex: 1,
  },
  mainLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  idleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.2,
  },

  // Divider between main and side
  divider: {
    width: 1,
    marginVertical: 8,
  },
  dividerOrange: {
    backgroundColor: 'rgba(245,158,11,0.3)',
  },
  dividerCommander: {
    backgroundColor: 'rgba(99,102,241,0.3)',
  },

  // Solo side area (fixed width, attached)
  sideArea: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  sideIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sideLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },

  // ─── LIVE INDICATORS ───────────────────────────────────────────────────────
  liveIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  livePulseOrange: {
    backgroundColor: 'rgba(245,158,11,0.35)',
  },
  livePulseIndigo: {
    backgroundColor: 'rgba(99,102,241,0.35)',
  },
  livePulseGreen: {
    backgroundColor: 'rgba(16,185,129,0.4)',
  },
  liveIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.6)',
  },
  liveIconBadgeCommander: {
    backgroundColor: 'rgba(99,102,241,0.6)',
  },
  soloIconLive: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  soloIconDefault: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Badges
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeLive: {
    backgroundColor: 'rgba(245,158,11,0.8)',
  },
  badgeCommander: {
    backgroundColor: 'rgba(99,102,241,0.8)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // ─── STATS ROW ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 1,
  },
});
