/**
 * SessionPrepView
 * 
 * Shown when session is pending - AFTER drill is already selected.
 * Just shows:
 * - Drill summary (what user selected)
 * - Watch connection status
 * - Start with Watch or Phone buttons
 */

import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/session/types';
import { activateSession } from '@/services/sessionService';
import { getUserWeapon, type UserWeapon } from '@/services/weaponService';
import { useGarminStore, useIsGarminConnected } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Clock,
  Crosshair,
  MapPin,
  Phone,
  RefreshCw,
  Target,
  Trophy,
  Users,
  Watch,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface SessionPrepViewProps {
  session: SessionWithDetails;
  insets: { top: number; bottom: number };
  onSessionActivated: (session: SessionWithDetails) => void;
  onClose: () => void;
}

function PulsingRing({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.pulsingRing, animatedStyle, { borderColor: color }]}
    />
  );
}

export function SessionPrepView({
  session,
  insets,
  onSessionActivated,
  onClose,
}: SessionPrepViewProps) {
  const colors = useColors();
  const isWatchConnected = useIsGarminConnected();
  const { refreshDevices } = useGarminStore();
  
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [weapon, setWeapon] = useState<UserWeapon | null>(null);
  
  const drill = session.drill_config;
  const drillName = session.drill_name || drill?.name || 'Practice Session';
  const isGrouping = drill?.drill_goal === 'grouping';
  const isTeamSession = !!session.team_id;

  // Load full weapon info (for caliber, etc)
  useEffect(() => {
    console.log('[SessionPrepView] Session weapon data:', {
      weapon_id: session.weapon_id,
      weapon_name: session.weapon_name,
    });
    
    if (session.weapon_id) {
      getUserWeapon(session.weapon_id)
        .then((w) => {
          console.log('[SessionPrepView] Fetched weapon:', w?.name);
          setWeapon(w);
        })
        .catch((err) => {
          console.error('[SessionPrepView] Failed to fetch weapon:', err);
        });
    }
  }, [session.weapon_id]);

  // Use session's weapon_name if available, otherwise fall back to fetched weapon
  const weaponName = session.weapon_name || weapon?.name;
  const weaponCaliber = weapon?.caliber;

  const handleRefreshDevices = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshDevices();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshDevices]);

  const handleStartWithWatch = useCallback(async () => {
    if (activating) return;
    setActivating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const activated = await activateSession(session.id, true);
      onSessionActivated(activated);
    } catch (error: any) {
      console.error('[SessionPrep] Failed to activate:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setActivating(false);
    }
  }, [session.id, activating, onSessionActivated]);

  const handleStartWithPhone = useCallback(async () => {
    if (activating) return;
    setActivating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const activated = await activateSession(session.id, false);
      onSessionActivated(activated);
    } catch (error: any) {
      console.error('[SessionPrep] Failed to activate:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setActivating(false);
    }
  }, [session.id, activating, onSessionActivated]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary }]}
          onPress={handleClose}
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Ready to Start
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Drill Summary */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)}
          style={[styles.drillSummary, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.drillIcon, { backgroundColor: isGrouping ? `${colors.primary}15` : `${colors.orange}15` }]}>
            {isGrouping ? (
              <Crosshair size={24} color={colors.primary} />
            ) : (
              <Trophy size={24} color={colors.orange} />
            )}
          </View>
          <Text style={[styles.drillName, { color: colors.text }]}>{drillName}</Text>
          <View style={styles.drillMeta}>
            <View style={styles.drillMetaItem}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={[styles.drillMetaText, { color: colors.text }]}>{drill?.distance_m || 25}m</Text>
            </View>
            {drill?.rounds_per_shooter && (
              <>
                <View style={[styles.drillMetaDot, { backgroundColor: colors.border }]} />
                <View style={styles.drillMetaItem}>
                  <Zap size={14} color={colors.textMuted} />
                  <Text style={[styles.drillMetaText, { color: colors.text }]}>{drill.rounds_per_shooter} shots</Text>
                </View>
              </>
            )}
            {drill?.time_limit_seconds && (
              <>
                <View style={[styles.drillMetaDot, { backgroundColor: colors.border }]} />
                <View style={styles.drillMetaItem}>
                  <Clock size={14} color={colors.textMuted} />
                  <Text style={[styles.drillMetaText, { color: colors.text }]}>
                    {Math.floor(drill.time_limit_seconds / 60)}:{String(drill.time_limit_seconds % 60).padStart(2, '0')}
                  </Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Session Info Row - Weapon & Team */}
        <Animated.View 
          entering={FadeInDown.delay(150).duration(400)}
          style={styles.sessionInfoRow}
        >
          {/* Weapon Card */}
          {(session.weapon_id && weaponName) && (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.infoCardIcon, { backgroundColor: `${colors.text}10` }]}>
                <Target size={18} color={colors.text} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, { color: colors.textMuted }]}>Weapon</Text>
                <Text style={[styles.infoCardValue, { color: colors.text }]} numberOfLines={1}>
                  {weaponName}
                </Text>
                {weaponCaliber && (
                  <Text style={[styles.infoCardMeta, { color: colors.textMuted }]}>{weaponCaliber}</Text>
                )}
              </View>
            </View>
          )}

          {/* Team Card */}
          {isTeamSession && session.training_title && (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.infoCardIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Users size={18} color={colors.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, { color: colors.textMuted }]}>Training</Text>
                <Text style={[styles.infoCardValue, { color: colors.text }]} numberOfLines={1}>
                  {session.training_title}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Watch Status */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)}
          style={[styles.watchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.watchIconContainer}>
            {isWatchConnected && <PulsingRing color={colors.green} />}
            <View style={[
              styles.watchIconBg, 
              { backgroundColor: isWatchConnected ? `${colors.green}15` : colors.secondary }
            ]}>
              <Watch size={28} color={isWatchConnected ? colors.green : colors.textMuted} />
            </View>
          </View>
          
          <View style={styles.watchText}>
            <Text style={[styles.watchStatus, { color: colors.text }]}>
              {isWatchConnected ? 'Watch Connected' : 'No Watch'}
            </Text>
            <Text style={[styles.watchHint, { color: colors.textMuted }]}>
              {isWatchConnected ? 'Ready to track' : 'Phone only mode'}
            </Text>
          </View>
          
          {!isWatchConnected && (
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.secondary }]}
              onPress={handleRefreshDevices}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <RefreshCw size={16} color={colors.text} />
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Info */}
        <Animated.View 
          entering={FadeIn.delay(300).duration(400)}
          style={[styles.infoBox, { backgroundColor: `${colors.blue}10` }]}
        >
          <Ionicons name="information-circle" size={18} color={colors.blue} />
          <Text style={[styles.infoText, { color: colors.blue }]}>
            {isWatchConnected 
              ? 'Watch will track your shots. Tap the watch button after each shot.'
              : 'You can connect your watch later during the session.'}
          </Text>
        </Animated.View>
      </View>

      {/* Actions */}
      <Animated.View 
        entering={FadeInDown.delay(400).duration(400)}
        style={[styles.actions, { paddingBottom: insets.bottom + 20 }]}
      >
        {isWatchConnected ? (
          <>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.green }]}
              onPress={handleStartWithWatch}
              disabled={activating}
            >
              {activating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Watch size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Start with Watch</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
              onPress={handleStartWithPhone}
              disabled={activating}
            >
              <Phone size={18} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Phone Only</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.text }]}
            onPress={handleStartWithPhone}
            disabled={activating}
          >
            {activating ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Zap size={20} color={colors.background} />
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                  Start Session
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  
  // Drill Summary
  drillSummary: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  drillIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  drillName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drillMetaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  drillMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  
  // Session Info Row
  sessionInfoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
  },
  infoCardMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  
  // Watch Card
  watchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  watchIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  watchIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchText: {
    flex: 1,
    marginLeft: 12,
  },
  watchStatus: {
    fontSize: 15,
    fontWeight: '600',
  },
  watchHint: {
    fontSize: 12,
    marginTop: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  
  // Actions
  actions: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

