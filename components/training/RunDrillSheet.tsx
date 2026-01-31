/**
 * RunDrillSheet
 *
 * Action-ready bottom sheet for executing training drills.
 * Clean, focused interface that gets soldiers into action fast.
 */

import { CaptureModePickerInline, type CaptureMode } from '@/components/session/CaptureModePicker';
import { POSITIONS, QUICK_DISTANCES, RANGE_CATEGORIES, RANGE_LABELS, type RangeCategory } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { requireCurrentUserId } from '@/services/authService';
import { getOrCreateSetupSession } from '@/services/session/mutations';
import { createEngagement } from '@/services/session/participants';
import { getActiveSquadEngagement, getCompletedDrillExecutionCount } from '@/services/session/queries';
import { getMostRecentUserWeaponId, getUserWeapon, type UserWeapon } from '@/services/weaponService';
import { useGarminDevice, useIsGarminConnected } from '@/stores/garminStore';
import type { TrainingDrill } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Crosshair, Lock, Minus, Plus, Target, Users, Watch, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RunDrillSheetProps {
  visible: boolean;
  onClose: () => void;
  drill: TrainingDrill | null;
  trainingId: string;
  teamId: string;
}

export function RunDrillSheet({ visible, onClose, drill, trainingId, teamId }: RunDrillSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Watch connectivity
  const isWatchConnected = useIsGarminConnected();
  const watchDevice = useGarminDevice();

  // Soldier's choices
  const [distance, setDistance] = useState(25);
  const [bullets, setBullets] = useState(5);
  const [position, setPosition] = useState<string>('standing');

  // Capture mode
  const [captureMode, setCaptureMode] = useState<CaptureMode>('phone');
  const [sensitivity, setSensitivity] = useState(3.5);

  // State
  const [weapon, setWeapon] = useState<UserWeapon | null>(null);
  const [loadingWeapon, setLoadingWeapon] = useState(true);
  const [completedExecutions, setCompletedExecutions] = useState(0);
  const [loadingExecutions, setLoadingExecutions] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Animation
  const pulseScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // Derived
  const maxExecutions = drill?.max_executions ?? 1;
  const hasReachedLimit = maxExecutions !== null && completedExecutions >= maxExecutions;
  const isWatchMode = captureMode === 'watch';
  const isGrouping = drill?.drill_goal === 'grouping';
  const isSquad = drill?.engagement_mode === 'squad';

  const distanceCategory = drill?.distance_category as RangeCategory | null;
  const categoryBounds = distanceCategory ? RANGE_CATEGORIES.find((c) => c.value === distanceCategory) : null;
  const minDistance = categoryBounds?.min ?? 1;
  const maxDistance = categoryBounds?.max ?? 1000;

  // Execution policy determines if soldier can modify values
  // 'locked' = commander's values are strict (no changes allowed)
  // 'guided' = defaults pre-filled but soldier can adjust
  // 'free' = full freedom to pick values
  const executionPolicy = drill?.execution_policy || 'locked';
  const isLocked = executionPolicy === 'locked';

  // Values are only locked if policy is 'locked' AND a specific value was set
  const isDistanceLocked = isLocked && drill?.distance_m != null;
  const isBulletsLocked = isLocked && drill?.rounds_per_shooter != null;
  const isPositionLocked = isLocked && drill?.position != null;

  const quickDistances = useMemo(
    () => (distanceCategory ? QUICK_DISTANCES[distanceCategory] : [25, 50, 100, 200]),
    [distanceCategory]
  );

  // Allow starting even if limit reached - just show warning
  const canStart = weapon && !loadingWeapon && !loadingExecutions;

  // Pulse animation for ready state
  useEffect(() => {
    if (canStart && visible) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [canStart, visible]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Initialize from drill
  useEffect(() => {
    if (!drill) return;

    if (drill.distance_m != null) {
      setDistance(drill.distance_m);
    } else if (distanceCategory) {
      setDistance(QUICK_DISTANCES[distanceCategory][0] || 100);
    }

    setBullets(drill.rounds_per_shooter ?? 5);
    setPosition(drill.position || 'standing');
    setCaptureMode(isWatchConnected ? 'watch' : 'phone');
  }, [drill, distanceCategory, isWatchConnected]);

  // Load data
  useEffect(() => {
    if (!visible || !drill?.id) return;

    (async () => {
      setLoadingExecutions(true);
      try {
        const userId = await requireCurrentUserId();
        const count = await getCompletedDrillExecutionCount(userId, drill.id, trainingId);
        setCompletedExecutions(count);
      } catch {
        // Ignore
      } finally {
        setLoadingExecutions(false);
      }
    })();
  }, [visible, drill?.id, trainingId]);

  useEffect(() => {
    if (!visible) return;

    (async () => {
      setLoadingWeapon(true);
      try {
        const userId = await requireCurrentUserId();
        const weaponId = await getMostRecentUserWeaponId(userId);
        if (weaponId) {
          const w = await getUserWeapon(weaponId);
          if (w) setWeapon(w);
        }
      } catch {
        // Ignore
      } finally {
        setLoadingWeapon(false);
      }
    })();
  }, [visible]);

  const handleDistanceChange = useCallback(
    (delta: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDistance((prev) => Math.max(minDistance, Math.min(maxDistance, prev + delta)));
    },
    [minDistance, maxDistance]
  );

  const handleStart = useCallback(async () => {
    if (!drill || !weapon) return;

    setIsStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const userId = await requireCurrentUserId();

      // For squad drills, check if there's already an active engagement for this training
      if (isSquad) {
        const existing = await getActiveSquadEngagement(trainingId);
        if (existing) {
          // Redirect to existing engagement - must cancel before creating a new one
          onClose();
          if (existing.started_at) {
            router.push({
              pathname: '/(protected)/activeSession',
              params: {
                sessionId: existing.session_id,
                engagementId: existing.id,
                engagementMode: existing.engagement_mode,
                returnTo: 'trainingDetail',
                returnId: trainingId,
              },
            });
          } else {
            router.push({
              pathname: '/(protected)/squadLobby',
              params: {
                engagementId: existing.id,
                sessionId: existing.session_id,
                trainingId,
                engagementMode: existing.engagement_mode,
              },
            });
          }
          setIsStarting(false);
          return;
        }
      }

      // Create the session first
      const session = await getOrCreateSetupSession({
        weapon_id: weapon.id,
        team_id: teamId,
        training_id: trainingId,
        drill_id: drill.id,
        watch_controlled: isWatchMode,
        soldier_distance_m: distance,
        soldier_bullets: bullets,
        soldier_position: position,
      });

      // For squad engagements, create engagement in pending status and go to lobby
      if (isSquad) {
        const engagement = await createEngagement({
          sessionId: session.id,
          shooterId: userId,
          drillGoal: drill.drill_goal || 'engagement',
          trainingId,
          requestedMode: 'squad',
          status: 'pending', // Lobby state - waiting for participants
        });

        onClose();
        router.push({
          pathname: '/(protected)/squadLobby',
          params: {
            engagementId: engagement.id,
            trainingId,
            engagementMode: 'squad',
          },
        });
      } else {
        // Solo flow - go directly to active session
        onClose();
        router.push({ pathname: '/(protected)/activeSession', params: { sessionId: session.id } });
      }
    } catch (err) {
      console.error('[RunDrillSheet] Failed:', err);
    } finally {
      setIsStarting(false);
    }
  }, [drill, weapon, teamId, trainingId, distance, bullets, position, isWatchMode, isSquad, onClose]);

  if (!drill) return null;

  // Colors based on drill type: grouping=primary, squad=blue, solo engagement=orange
  const goalColor = isGrouping ? colors.primary : colors.orange;
  const actionColor = isSquad ? colors.blue : goalColor;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.secondary }]} onPress={onClose}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Badges row */}
            <Animated.View entering={FadeInDown.duration(300)} style={styles.badgeRow}>
              {/* Drill type badge */}
              <View style={[styles.drillBadge, { backgroundColor: `${goalColor}12` }]}>
                {isGrouping ? (
                  <Crosshair size={14} color={goalColor} strokeWidth={2.5} />
                ) : (
                  <Target size={14} color={goalColor} strokeWidth={2.5} />
                )}
                <Text style={[styles.drillBadgeText, { color: goalColor }]}>
                  {isGrouping ? t('drill.grouping', 'Grouping') : t('drill.engagement', 'Engagement')}
                </Text>
              </View>

              {/* Squad badge */}
              {isSquad && (
                <View style={[styles.policyBadge, { backgroundColor: `${colors.blue}12` }]}>
                  <Users size={11} color={colors.blue} />
                  <Text style={[styles.policyBadgeText, { color: colors.blue }]}>
                    {t('training.squadEngagement', 'Squad')}
                  </Text>
                </View>
              )}

              {/* Execution policy badge */}
              <View
                style={[
                  styles.policyBadge,
                  {
                    backgroundColor: isLocked ? `${colors.textMuted}12` : `${colors.green}12`,
                  },
                ]}
              >
                {isLocked ? (
                  <Lock size={11} color={colors.textMuted} />
                ) : (
                  <Zap size={11} color={colors.green} />
                )}
                <Text
                  style={[
                    styles.policyBadgeText,
                    { color: isLocked ? colors.textMuted : colors.green },
                  ]}
                >
                  {executionPolicy === 'locked'
                    ? t('training.policyLocked', 'Locked')
                    : executionPolicy === 'guided'
                      ? t('training.policyGuided', 'Adjustable')
                      : t('training.policyFree', 'Free')}
                </Text>
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.duration(300).delay(50)}
              style={[styles.drillName, { color: colors.text }]}
              numberOfLines={2}
            >
              {drill.name}
            </Animated.Text>

            {/* Progress */}
            {!loadingExecutions && maxExecutions !== null && (
              <Animated.View
                entering={FadeIn.delay(100)}
                style={[styles.progressRow, { backgroundColor: hasReachedLimit ? `${colors.orange}10` : `${colors.green}10` }]}
              >
                <Zap size={12} color={hasReachedLimit ? colors.orange : colors.green} />
                <Text style={[styles.progressText, { color: hasReachedLimit ? colors.orange : colors.green }]}>
                  {`${completedExecutions}/${maxExecutions} ${t('training.completed', 'completed')}`}
                  {hasReachedLimit && ` · ${t('training.extraPractice', 'Extra')}`}
                </Text>
              </Animated.View>
            )}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Weapon */}
            <Animated.View
              entering={FadeInDown.duration(300).delay(100)}
              style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.weaponIcon, { backgroundColor: `${colors.primary}12` }]}>
                <Crosshair size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.weaponInfo}>
                <Text style={[styles.weaponLabel, { color: colors.textMuted }]}>Weapon</Text>
                <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
                  {loadingWeapon ? 'Loading...' : weapon?.name || 'No weapon selected'}
                </Text>
              </View>
              {weapon && (
                <View style={[styles.readyBadge, { backgroundColor: `${colors.green}15` }]}>
                  <Text style={[styles.readyText, { color: colors.green }]}>Ready</Text>
                </View>
              )}
            </Animated.View>

            {/* Watch Mode */}
            {isWatchConnected && (
              <Animated.View entering={FadeInDown.duration(300).delay(150)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Watch size={14} color={colors.textMuted} />
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recording</Text>
                </View>
                <CaptureModePickerInline
                  selectedMode={captureMode}
                  onModeChange={setCaptureMode}
                  sensitivity={sensitivity}
                  onSensitivityChange={setSensitivity}
                  showSensitivity
                />
                {isWatchMode && watchDevice && (
                  <View style={styles.watchConnected}>
                    <View style={[styles.watchDot, { backgroundColor: colors.green }]} />
                    <Text style={[styles.watchName, { color: colors.green }]}>{watchDevice.name}</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Distance */}
            <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Distance</Text>
                {isDistanceLocked && <Lock size={11} color={colors.textMuted} />}
                {!isDistanceLocked && distanceCategory && (
                  <Text style={[styles.rangeLabel, { color: colors.blue }]}>{RANGE_LABELS[distanceCategory]}</Text>
                )}
              </View>

              {isDistanceLocked ? (
                <View style={[styles.lockedValue, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.lockedValueText, { color: colors.text }]}>{drill.distance_m}m</Text>
                  <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                    {t('training.lockedValue', 'Locked')}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.counter, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => handleDistanceChange(-25)}
                    >
                      <Minus size={18} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.counterCenter}>
                      <TextInput
                        style={[styles.counterInput, { color: colors.text }]}
                        value={String(distance)}
                        onChangeText={(t) => {
                          const n = parseInt(t, 10);
                          if (!isNaN(n) && n > 0) setDistance(n);
                        }}
                        keyboardType="number-pad"
                      />
                      <Text style={[styles.counterUnit, { color: colors.textMuted }]}>meters</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => handleDistanceChange(25)}
                    >
                      <Plus size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quickRow}>
                    {quickDistances.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.quickChip,
                          {
                            backgroundColor: distance === d ? colors.text : colors.card,
                            borderColor: distance === d ? colors.text : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDistance(d);
                        }}
                      >
                        <Text style={[styles.quickText, { color: distance === d ? colors.background : colors.text }]}>
                          {d}m
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </Animated.View>

            {/* Bullets (engagement only) */}
            {!isGrouping && (
              <Animated.View entering={FadeInDown.duration(300).delay(250)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Rounds</Text>
                  {isBulletsLocked && <Lock size={11} color={colors.textMuted} />}
                </View>

                {isBulletsLocked ? (
                  <View style={[styles.lockedValue, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.lockedValueText, { color: colors.text }]}>{drill.rounds_per_shooter}</Text>
                    <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                      {t('training.lockedValue', 'Locked')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.optionGrid}>
                    {[5, 10, 15, 20].map((n) => (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.optionBtn,
                          {
                            backgroundColor: bullets === n ? colors.text : colors.card,
                            borderColor: bullets === n ? colors.text : colors.border,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setBullets(n);
                        }}
                      >
                        <Text style={[styles.optionText, { color: bullets === n ? colors.background : colors.text }]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Animated.View>
            )}

            {/* Position */}
            <Animated.View entering={FadeInDown.duration(300).delay(300)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Position</Text>
                {isPositionLocked && <Lock size={11} color={colors.textMuted} />}
              </View>

              {isPositionLocked ? (
                <View style={[styles.lockedValue, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.lockedValueText, { color: colors.text }]}>
                    {POSITIONS.find((p) => p.value === drill.position)?.label || drill.position}
                  </Text>
                  <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                    {t('training.lockedValue', 'Locked')}
                  </Text>
                </View>
              ) : (
                <View style={styles.positionGrid}>
                  {POSITIONS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.positionBtn,
                        {
                          backgroundColor: position === p.value ? colors.text : colors.card,
                          borderColor: position === p.value ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPosition(p.value);
                      }}
                    >
                      <Text
                        style={[styles.positionText, { color: position === p.value ? colors.background : colors.text }]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 12 }]}>
            <Animated.View style={[styles.actionContainer, canStart && pulseStyle]}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: canStart ? actionColor : colors.secondary,
                  },
                ]}
                onPress={handleStart}
                onPressIn={() => {
                  buttonScale.value = withSpring(0.97);
                }}
                onPressOut={() => {
                  buttonScale.value = withSpring(1);
                }}
                disabled={!canStart || isStarting}
                activeOpacity={0.9}
              >
                <Animated.View style={[styles.actionBtnInner, buttonAnimStyle]}>
                  {isStarting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      {isSquad ? (
                        <Users size={20} color="#fff" strokeWidth={2.5} />
                      ) : isWatchMode ? (
                        <Watch size={20} color="#fff" strokeWidth={2.5} />
                      ) : isGrouping ? (
                        <Crosshair size={20} color="#fff" strokeWidth={2.5} />
                      ) : (
                        <Target size={20} color="#fff" strokeWidth={2.5} />
                      )}
                      <Text style={styles.actionText}>
                        {isSquad
                          ? t('training.openLobby', 'Open Lobby')
                          : isWatchMode
                            ? t('training.goWithWatch', 'Go with Watch')
                            : isGrouping
                              ? t('training.runGrouping', 'Run Grouping')
                              : t('training.startDrill', 'Start Drill')}
                      </Text>
                    </>
                  )}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  drillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  drillBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  policyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  drillName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },

  // Weapon card
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  weaponIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponInfo: {
    flex: 1,
    gap: 2,
  },
  weaponLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  readyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readyText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Sections
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 'auto',
  },

  // Watch
  watchConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  watchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  watchName: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Counter
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterCenter: {
    flex: 1,
    alignItems: 'center',
  },
  counterInput: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
  },
  counterUnit: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },

  // Quick chips
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Options
  optionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '800',
  },

  // Position
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  positionText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Locked
  lockedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedValueText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  lockedHint: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
  },
  actionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
