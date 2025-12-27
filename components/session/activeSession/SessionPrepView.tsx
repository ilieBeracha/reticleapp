/**
 * SessionPrepView
 * 
 * Shown when a session is in 'pending' status.
 * User can see:
 * - Watch connection status (live updates)
 * - Drill requirements
 * - Choose to start with watch or without
 */

import { useColors } from '@/hooks/ui/useColors';
import { activateSession } from '@/services/sessionService';
import { useGarminStore, useIsGarminConnected } from '@/store/garminStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { 
  Clock, 
  MapPin, 
  Phone, 
  RefreshCw, 
  Target, 
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
import type { SessionWithDetails } from '@/services/session/types';

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
      style={[
        styles.pulsingRing,
        animatedStyle,
        { borderColor: color },
      ]}
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
  
  const drill = session.drill_config;
  const drillName = session.drill_name || drill?.name || 'Practice Session';

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
            {drillName}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Watch Status Card */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)}
          style={[styles.watchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.watchIconContainer}>
            {isWatchConnected && <PulsingRing color={colors.green} />}
            <View style={[
              styles.watchIconBg, 
              { backgroundColor: isWatchConnected ? `${colors.green}15` : colors.secondary }
            ]}>
              <Watch 
                size={32} 
                color={isWatchConnected ? colors.green : colors.textMuted} 
              />
            </View>
          </View>
          
          <Text style={[styles.watchStatus, { color: colors.text }]}>
            {isWatchConnected ? 'Watch Connected' : 'No Watch Detected'}
          </Text>
          <Text style={[styles.watchHint, { color: colors.textMuted }]}>
            {isWatchConnected 
              ? 'Your Garmin watch is ready to track shots'
              : 'Connect your watch or continue with phone only'}
          </Text>
          
          {!isWatchConnected && (
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.secondary }]}
              onPress={handleRefreshDevices}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <RefreshCw size={14} color={colors.text} />
                  <Text style={[styles.refreshText, { color: colors.text }]}>Refresh</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Drill Info */}
        {drill && (
          <Animated.View 
            entering={FadeInDown.delay(200).duration(400)}
            style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.drillLabel, { color: colors.textMuted }]}>DRILL REQUIREMENTS</Text>
            <View style={styles.drillRow}>
              <View style={styles.drillItem}>
                <MapPin size={16} color={colors.textMuted} />
                <Text style={[styles.drillText, { color: colors.text }]}>{drill.distance_m}m</Text>
              </View>
              <View style={styles.drillItem}>
                <Zap size={16} color={colors.textMuted} />
                <Text style={[styles.drillText, { color: colors.text }]}>
                  {drill.rounds_per_shooter} shots
                </Text>
              </View>
              {drill.time_limit_seconds && (
                <View style={styles.drillItem}>
                  <Clock size={16} color={colors.textMuted} />
                  <Text style={[styles.drillText, { color: colors.text }]}>
                    {Math.floor(drill.time_limit_seconds / 60)}:{String(drill.time_limit_seconds % 60).padStart(2, '0')}
                  </Text>
                </View>
              )}
            </View>
            {drill.min_accuracy_percent && (
              <View style={[styles.drillItem, { marginTop: 8 }]}>
                <Target size={16} color={colors.textMuted} />
                <Text style={[styles.drillText, { color: colors.text }]}>
                  Min {drill.min_accuracy_percent}% accuracy
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Info Box */}
        <Animated.View 
          entering={FadeIn.delay(300).duration(400)}
          style={[styles.infoBox, { backgroundColor: `${colors.blue}10` }]}
        >
          <Ionicons name="information-circle" size={18} color={colors.blue} />
          <Text style={[styles.infoText, { color: colors.blue }]}>
            {isWatchConnected 
              ? 'Watch will count shots and track time. Tap your watch button after each shot.'
              : 'You can still use the watch later if you connect it during the session.'}
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
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Phone Only
              </Text>
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
  container: {
    flex: 1,
  },
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
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  
  // Watch Card
  watchCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  watchIconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulsingRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  watchIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchStatus: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  watchHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Drill Card
  drillCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  drillLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  drillRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drillText: {
    fontSize: 14,
    fontWeight: '600',
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
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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

