import { isGroupingGoal } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import type { SessionWithDetails } from '@/services/session/types';
import { activateSession, updateSession } from '@/services/sessionService';
import { getUserWeapon, type UserWeapon } from '@/services/weaponService';
import { useGarminStore, useIsGarminConnected } from '@/store/garminStore';
import { deriveDetectionConfig } from '@/utils/detectionSensitivity';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Crosshair,
  MapPin,
  Phone,
  RefreshCw,
  Settings,
  Target,
  Trophy,
  Users,
  Watch,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  onBack?: () => void; // Go back to edit session details
  onClose: () => void; // Cancel/close entirely
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

  return <Animated.View style={[styles.pulsingRing, animatedStyle, { borderColor: color }]} />;
}

export function SessionPrepView({ session, insets, onSessionActivated, onBack, onClose }: SessionPrepViewProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const isWatchConnected = useIsGarminConnected();
  const { refreshDevices } = useGarminStore();

  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [weapon, setWeapon] = useState<UserWeapon | null>(null);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [customSensitivity, setCustomSensitivity] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  const drill = session.drill_config;
  const drillName = session.drill_name || drill?.name || t('session.practiceSession');
  const isGrouping = isGroupingGoal(drill?.drill_goal);
  const isTeamSession = !!session.team_id;
  const timeLimitOptions = [30, 60, 90, 120, 180];

  useEffect(() => {
    if (typeof drill?.time_limit_seconds === 'number') {
      setTimeLimit(drill.time_limit_seconds);
    }
  }, [drill?.time_limit_seconds]);

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
  const weaponCaliber = session.weapon_caliber || weapon?.caliber;
  const weaponCategory = session.weapon_category || weapon?.category;

  // Derive detection sensitivity from weapon
  const detectionConfig = useMemo(() => {
    return deriveDetectionConfig({
      category: weaponCategory as any,
      caliber: weaponCaliber,
      customSensitivity: customSensitivity,
    });
  }, [weaponCategory, weaponCaliber, customSensitivity]);

  const isAutoSensitivity = customSensitivity === null;
  const currentSensitivity = detectionConfig.sensitivity;

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
      // Store watch preferences in session metadata
      // These will be used by useActiveSession when building watch payload
      const customDrillConfig: Record<string, any> = {
        ...(session.drill_config || {}),
      };
      if (customSensitivity !== null) {
        customDrillConfig.detection_sensitivity = customSensitivity;
        console.log(`[SessionPrep] Saved custom sensitivity: ${customSensitivity}G`);
      }
      if (isWatchConnected) {
        customDrillConfig.time_limit_seconds = timeLimit ?? null;
      }
      if (customSensitivity !== null || isWatchConnected) {
        await updateSession(session.id, { custom_drill_config: customDrillConfig });
      }

      const activated = await activateSession(session.id, true);
      // Pass detection config through to the activated session
      onSessionActivated({
        ...activated,
        weapon_caliber: weaponCaliber,
        weapon_category: weaponCategory,
      });
    } catch (error: any) {
      console.error('[SessionPrep] Failed to activate:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setActivating(false);
    }
  }, [
    session.id,
    session.drill_config,
    activating,
    onSessionActivated,
    customSensitivity,
    weaponCaliber,
    weaponCategory,
  ]);

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

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  }, [onBack, onClose]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.secondary }]} onPress={handleBack}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('session.readyToStart')}
          </Text>
        </View>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={handleClose}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Drill Summary */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={[styles.drillSummary, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View
            style={[styles.drillIcon, { backgroundColor: isGrouping ? `${colors.primary}15` : `${colors.orange}15` }]}
          >
            {isGrouping ? <Crosshair size={24} color={colors.primary} /> : <Trophy size={24} color={colors.orange} />}
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
            {timeLimit != null && (
              <>
                <View style={[styles.drillMetaDot, { backgroundColor: colors.border }]} />
                <View style={styles.drillMetaItem}>
                  <Clock size={14} color={colors.textMuted} />
                  <Text style={[styles.drillMetaText, { color: colors.text }]}>
                    {Math.floor(timeLimit / 60)}:{String(timeLimit % 60).padStart(2, '0')}
                  </Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Session Info Row - Weapon & Team */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.sessionInfoRow}>
          {/* Weapon Card */}
          {session.weapon_id && weaponName && (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.infoCardIcon, { backgroundColor: `${colors.text}10` }]}>
                <Target size={18} color={colors.text} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, { color: colors.textMuted }]}>{t('session.weapon')}</Text>
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
                <Text style={[styles.infoCardLabel, { color: colors.textMuted }]}>{t('training.title')}</Text>
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
            <View
              style={[
                styles.watchIconBg,
                { backgroundColor: isWatchConnected ? `${colors.green}15` : colors.secondary },
              ]}
            >
              <Watch size={28} color={isWatchConnected ? colors.green : colors.textMuted} />
            </View>
          </View>

          <View style={styles.watchText}>
            <Text style={[styles.watchStatus, { color: colors.text }]}>
              {isWatchConnected ? t('session.watchConnected') : t('session.noWatch')}
            </Text>
            <Text style={[styles.watchHint, { color: colors.textMuted }]}>
              {isWatchConnected ? t('session.readyToTrack') : t('session.phoneOnlyMode')}
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

        {/* Shot Detection Sensitivity (only when watch connected) */}
        {isWatchConnected && (
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            style={[styles.sensitivityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <TouchableOpacity
              style={styles.sensitivityHeader}
              onPress={() => setShowSensitivity(!showSensitivity)}
              activeOpacity={0.7}
            >
              <View style={[styles.sensitivityIcon, { backgroundColor: `${colors.orange}15` }]}>
                <Settings size={18} color={colors.orange} />
              </View>
              <View style={styles.sensitivityHeaderText}>
                <Text style={[styles.sensitivityLabel, { color: colors.textMuted }]}>{t('session.shotDetection')}</Text>
                <Text style={[styles.sensitivityValue, { color: colors.text }]}>
                  {currentSensitivity.toFixed(1)}G{' '}
                  <Text style={{ color: colors.textMuted, fontWeight: '400' }}>({detectionConfig.description})</Text>
                </Text>
              </View>
              {showSensitivity ? (
                <ChevronUp size={20} color={colors.textMuted} />
              ) : (
                <ChevronDown size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            {showSensitivity && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.sensitivityContent}>
                {/* Preset Buttons */}
                <View style={styles.sensitivityPresets}>
                  {[
                    { id: 'light', label: t('session.sensitivityLight'), value: 0.8, desc: '.22, test' },
                    { id: 'medium', label: t('session.sensitivityMedium'), value: 2.5, desc: '9mm, 5.56' },
                    { id: 'heavy', label: t('session.sensitivityHeavy'), value: 4.0, desc: '.45, .308' },
                    { id: 'shotgun', label: t('session.sensitivityShotgun'), value: 5.5, desc: '12ga' },
                  ].map((preset) => {
                    const isSelected = Math.abs(currentSensitivity - preset.value) < 0.3;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.presetButton,
                          {
                            backgroundColor: isSelected ? `${colors.orange}15` : colors.secondary,
                            borderColor: isSelected ? colors.orange : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCustomSensitivity(preset.value);
                        }}
                      >
                        <Text style={[styles.presetLabel, { color: isSelected ? colors.orange : colors.text }]}>
                          {preset.label}
                        </Text>
                        <Text style={[styles.presetValue, { color: colors.textMuted }]}>{preset.value}G</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Auto button */}
                {weaponCaliber && (
                  <TouchableOpacity
                    style={[
                      styles.autoButton,
                      {
                        backgroundColor: isAutoSensitivity ? `${colors.green}15` : colors.secondary,
                        borderColor: isAutoSensitivity ? colors.green : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCustomSensitivity(null);
                    }}
                  >
                    <Text style={[styles.autoButtonText, { color: isAutoSensitivity ? colors.green : colors.text }]}>
                      ✨ {t('session.auto')} ({weaponCaliber})
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.sensitivityHint, { color: colors.textMuted }]}>
                  {t('session.sensitivityHint')}
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Time Limit (watch only) */}
        {isWatchConnected && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={[styles.timeLimitCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.timeLimitHeader}>
              <View style={[styles.timeLimitIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Clock size={18} color={colors.primary} />
              </View>
              <View style={styles.timeLimitHeaderText}>
                <Text style={[styles.timeLimitLabel, { color: colors.textMuted }]}>{t('session.timeLimit')}</Text>
                <Text style={[styles.timeLimitValue, { color: colors.text }]}>
                  {timeLimit == null ? t('session.noTimeLimit') : `${timeLimit}s`}
                </Text>
              </View>
            </View>

            <View style={styles.timeLimitOptions}>
              <TouchableOpacity
                style={[
                  styles.timeLimitOption,
                  { backgroundColor: timeLimit == null ? `${colors.primary}15` : colors.secondary },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTimeLimit(null);
                }}
              >
                <Text style={[styles.timeLimitOptionText, { color: timeLimit == null ? colors.primary : colors.text }]}>
                  {t('session.noTimeLimit')}
                </Text>
              </TouchableOpacity>
              {timeLimitOptions.map((value) => {
                const isSelected = timeLimit === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.timeLimitOption,
                      { backgroundColor: isSelected ? `${colors.primary}15` : colors.secondary },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTimeLimit(value);
                    }}
                  >
                    <Text style={[styles.timeLimitOptionText, { color: isSelected ? colors.primary : colors.text }]}>
                      {value}s
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Info */}
        <Animated.View
          entering={FadeIn.delay(300).duration(400)}
          style={[styles.infoBox, { backgroundColor: `${colors.blue}10` }]}
        >
          <Ionicons name="information-circle" size={18} color={colors.blue} />
          <Text style={[styles.infoText, { color: colors.blue }]}>
            {isWatchConnected
              ? t('session.watchWillTrack')
              : t('session.connectWatchLater')}
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
                  <Text style={styles.primaryButtonText}>{t('session.startWithWatch')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
              onPress={handleStartWithPhone}
              disabled={activating}
            >
              <Phone size={18} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('session.phoneOnly')}</Text>
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
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t('session.startSession')}</Text>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  timeLimitCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  timeLimitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeLimitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLimitHeaderText: {
    flex: 1,
  },
  timeLimitLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  timeLimitValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  timeLimitOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeLimitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeLimitOptionText: {
    fontSize: 13,
    fontWeight: '600',
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

  // Sensitivity Card
  sensitivityCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sensitivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  sensitivityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensitivityHeaderText: {
    flex: 1,
  },
  sensitivityLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sensitivityValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  sensitivityContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  sensitivityPresets: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetValue: {
    fontSize: 10,
    marginTop: 2,
  },
  autoButton: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  autoButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sensitivityHint: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
});
