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
import type { Colors, HeroMode } from '@/types/home';
import type { HomeSession } from '@/types/home.viewmodel';
import type { TeamWithMembers, TrainingWithDetails } from '@/types/workspace';
import { getTeamColor } from '@/utils/teamColors';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Play, Radio, Target } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
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
  // Team context
  activeTeam: TeamWithMembers | null;
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
  activeTeam,
  activeTeamTraining,
  isTrainingCommander,
  onTrainingPress,
  defaultWeapon,
  upcomingTrainings,
}: HeroActionsProps) {
  const mainScale = useSharedValue(1);
  const sideScale = useSharedValue(1);
  const weaponScale = useSharedValue(1);
  const statsScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  // Get team-specific accent color
  const teamColor = useMemo(() => {
    if (activeTeam?.id) {
      return getTeamColor(activeTeam.id);
    }
    return colors.primary; // Fallback to primary color
  }, [activeTeam?.id, colors.primary]);

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
      // Idle: main area shows weapon, tapping navigates to weapon/loadout
      if (defaultWeapon) {
        router.push(`/(protected)/weaponDetail?weaponId=${defaultWeapon.id}` as any);
      } else {
        router.push('/(protected)/(tabs)/loadout' as any);
      }
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
          heroMode === 'team-live' && { backgroundColor: `${teamColor}15`, borderColor: `${teamColor}30` },
          heroMode === 'solo-active' && { backgroundColor: `${colors.green}15`, borderColor: `${colors.green}30` },
          heroMode === 'idle' && activeTeam && { backgroundColor: `${teamColor}08`, borderColor: `${teamColor}20` },
          heroMode === 'idle' && !activeTeam && { backgroundColor: colors.card, borderColor: colors.border },
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
                <Animated.View style={[s.livePulse, { backgroundColor: `${teamColor}40` }, pulseStyle]} />
                <View style={[s.liveIconBadge, { backgroundColor: `${teamColor}40` }]}>
                  <Radio size={11} color={teamColor} />
                </View>
              </View>
              <View style={s.mainTextContainer}>
                <Text style={[s.mainLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  {isTrainingCommander ? 'Your Training' : (activeTeamTraining.team?.name ?? 'Team')}
                </Text>
                <Text style={[s.mainTitle, { color: colors.text }]} numberOfLines={1}>
                  {activeTeamTraining.title || 'Live Training'}
                </Text>
              </View>
              <View style={[s.badge, { backgroundColor: teamColor }]}>
                <Text style={[s.badgeText, { color: '#fff' }]}>{isTrainingCommander ? 'MANAGE' : 'JOIN'}</Text>
              </View>
              <ChevronRight size={14} color={colors.textMuted} />
            </>
          )}

          {heroMode === 'solo-active' && (
            <>
              <View style={s.liveIconContainer}>
                <Animated.View style={[s.livePulse, { backgroundColor: `${colors.green}40` }, pulseStyle]} />
                <View style={[s.soloIconLive, { backgroundColor: `${colors.green}40` }]}>
                  <Play size={11} color={colors.green} fill={colors.green} />
                </View>
              </View>
              <View style={s.mainTextContainer}>
                <Text style={[s.mainLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  Active Session
                </Text>
                <Text style={[s.mainTitle, { color: colors.text }]} numberOfLines={1}>
                  {activeSession?.drillName || 'Solo Practice'}
                </Text>
              </View>
            </>
          )}

          {heroMode === 'idle' && (
            <>
              <View style={[s.soloIconDefault, { backgroundColor: activeTeam ? `${teamColor}15` : `${colors.textMuted}15` }]}>
                <Target size={13} color={activeTeam ? teamColor : colors.textMuted} strokeWidth={2} />
              </View>
              <View style={s.mainTextContainer}>
                <Text style={[s.mainLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  {activeTeam ? activeTeam.name : (defaultWeapon ? 'Default Weapon' : 'Ready to Train')}
                </Text>
                <Text style={[s.mainTitle, { color: colors.text }]} numberOfLines={1}>
                  {defaultWeapon?.name || 'No weapon selected'}
                </Text>
              </View>
              <ChevronRight size={14} color={activeTeam ? teamColor : colors.textMuted} />
            </>
          )}
        </TouchableOpacity>

        {/* Solo side — attached, separated by divider (only when team-live) */}
        {heroMode === 'team-live' && (
          <>
            <View style={[s.divider, { backgroundColor: `${teamColor}25` }]} />
            <TouchableOpacity style={s.sideArea} onPress={handleSoloSidePress} activeOpacity={0.7}>
              <View style={[s.sideIcon, { backgroundColor: `${colors.textMuted}10` }]}>
                <Target size={14} color={colors.textMuted} strokeWidth={2} />
              </View>
              <Text style={[s.sideLabel, { color: colors.textMuted }]}>Solo</Text>
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
    alignItems: 'flex-start',
  },
  mainLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  idleText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Divider between main and side
  divider: {
    width: 1,
    marginVertical: 8,
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
  },
  sideLabel: {
    fontSize: 9,
    fontWeight: '600',
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
  liveIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloIconLive: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloIconDefault: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Badges
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
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
