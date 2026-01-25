/**
 * Training Detail
 *
 * Simple, data-driven training view:
 * - Header with key stats
 * - Drill list with progress
 * - Insights summary when finished
 */
import { useTrainingActions, useTrainingDetail } from '@/components/training';
import {
  AddDrillModal,
  CommanderActionsSheet,
  CustomSessionCard,
  StartTrainingSheet,
  TrainingHero,
  TrainingReadinessCard,
  TrainingSettingsModal,
  type CustomSessionConfig,
  type ReadinessItem,
} from '@/components/training/detail';
import { StartDrillSheet } from '@/components/training/StartDrillSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useTrainingRealtime, useWeaponRealtime, type TeamWeaponRecord } from '@/hooks/realtime';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { usePermissions } from '@/hooks/usePermissions';
import { getTeamDrills } from '@/services/drillService';
import {
  notifyWeaponAssigned,
  notifyWeaponRequested,
  notifyWeaponRequestApproved,
  notifyWeaponRequestRejected,
} from '@/services/notifications';
import type { BaseSessionConfig } from '@/services/session/types';
import { createSession, getTrainingSessionsWithStats, SessionWithDetails } from '@/services/sessionService';
import { addDrill } from '@/services/trainingService';
import {
  cancelWeaponRequest,
  createWeaponRequest,
  getAssignedWeapons,
  getMyPendingRequest,
  getOrCreatePersonalProfile,
  getPoolWeapons,
  type TeamWeapon,
  type UserWeapon,
  type WeaponRequest,
} from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useGarminDevice, useIsGarminConnected } from '@/store/garminStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import type { Drill } from '@/types/workspace';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Crosshair,
  MoreHorizontal,
  Package,
  Play,
  Radio,
  Smartphone,
  Target,
  Trophy,
  Watch,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollViewOffset } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 140; // Reduced for faster scroll-away

// ═══════════════════════════════════════════════════════════════════════════
// PARALLAX SCROLL CONTENT
// ═══════════════════════════════════════════════════════════════════════════

function ParallaxScrollContent({
  training,
  colors,
  insets,
  userId,
  onAutoCloseExpired,
  userWeapon,
  assignedWeapon,
  weaponChecked,
  canManageTraining,
  onAssignWeapon,
  onOpenWeaponPicker,
  poolWeapons,
  selectingPoolWeapon,
  onSelectPoolWeapon,
  pendingRequest,
  requestingWeapon,
  onRequestWeapon,
  onCancelRequest,
  onAddDrill,
  completedCount,
  drills,
  isPlanned,
  isOngoing,
  isFinished,
  drillProgress,
  teamSessions,
  quickStartingDrillId,
  startingDrillId,
  onStartDrill,
  onBack,
  onShowCommanderActions,
  // Watch preference props
  isWatchConnected,
  trainingWatchPreference,
  onCapturePreferenceSelect,
  watchDeviceName,
  trainingSensitivity,
  // Realtime status
  isRealtimeConnected,
}: any) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          // Move out of view faster - scrolls away at 1.2x speed
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT * 0.6],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [1.3, 1, 0.95]),
        },
      ],
      // Fade out faster
      opacity: interpolate(scrollOffset.value, [0, HEADER_HEIGHT * 0.5], [1, 0]),
    };
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
    >
      {/* Parallax Header with Nav */}
      <Animated.View
        style={[styles.heroCard, { backgroundColor: colors.card, paddingTop: insets.top + 12 }, headerAnimatedStyle]}
      >
        {/* Nav Row */}
        <View style={styles.navRow}>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.secondary }]} onPress={onBack}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {canManageTraining && (
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: colors.text }]}
              onPress={onShowCommanderActions}
            >
              <MoreHorizontal size={20} color={colors.background} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title + Status */}
        <TrainingHero training={training} colors={colors} onAutoCloseExpired={onAutoCloseExpired} />

        {/* Status Bar - Clean & Minimal */}
        <View style={styles.statusBar}>
          {/* Progress */}
          <View style={[styles.statusItem, { backgroundColor: colors.primary + '12' }]}>
            <Target size={14} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              {completedCount}/{drills.length}
            </Text>
          </View>

          {/* Weapon - only show after checked */}
          {weaponChecked &&
            (() => {
              // Can pick weapon if training ongoing AND there are weapon options
              const hasWeaponOptions = isOngoing && (assignedWeapon || poolWeapons.length > 0);
              // Show picker for anyone with options (soldiers pick from assigned + pool, commanders too)
              const canChangeWeapon = hasWeaponOptions;

              return (
                <TouchableOpacity
                  style={[
                    styles.statusItem,
                    { backgroundColor: userWeapon ? colors.green + '12' : colors.orange + '12' },
                    canChangeWeapon && { paddingRight: 6 },
                  ]}
                  onPress={
                    canChangeWeapon ? onOpenWeaponPicker : !userWeapon && canManageTraining ? onAssignWeapon : undefined
                  }
                  disabled={!canChangeWeapon && !!userWeapon}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.statusText, { color: userWeapon ? colors.green : colors.orange }]}
                    numberOfLines={1}
                  >
                    {userWeapon ? userWeapon.name : 'No weapon'}
                  </Text>
                  {canChangeWeapon && (
                    <View style={[styles.statusChevron, { backgroundColor: colors.green + '20' }]}>
                      <Text style={{ fontSize: 8, color: colors.green }}>▼</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })()}

          {/* Watch/Phone mode - tappable to change */}
          {isOngoing && isWatchConnected && (
            <TouchableOpacity
              style={[
                styles.statusItem,
                {
                  backgroundColor:
                    trainingWatchPreference === null
                      ? colors.orange + '15'
                      : trainingWatchPreference
                        ? colors.orange + '12'
                        : colors.primary + '12',
                },
              ]}
              onPress={() =>
                onCapturePreferenceSelect(trainingWatchPreference ? 'phone' : 'watch', trainingSensitivity)
              }
              activeOpacity={0.7}
            >
              {trainingWatchPreference === null ? (
                <>
                  <Watch size={12} color={colors.orange} />
                  <Text style={[styles.statusText, { color: colors.orange, fontSize: 10 }]}>?</Text>
                </>
              ) : trainingWatchPreference ? (
                <Watch size={12} color={colors.orange} />
              ) : (
                <Smartphone size={12} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}

          {/* Live indicator */}
          {isRealtimeConnected && (
            <View style={[styles.statusItem, { backgroundColor: colors.green + '10', paddingHorizontal: 8 }]}>
              <Radio size={10} color={colors.green} />
            </View>
          )}
        </View>
      </Animated.View>

      {/* Content */}
      <View style={styles.drillsContainer}>
        {/* Training Readiness Card - Commander view for setup tracking */}
        {canManageTraining &&
          (isPlanned || isOngoing) &&
          weaponChecked &&
          (() => {
            const isTeamTraining = !!training?.team_id;
            const hasDrills = drills.length > 0;
            const hasWeapon = !!userWeapon;

            const showCard = !hasDrills || (isTeamTraining && !hasWeapon);
            if (!showCard) return null;

            const readinessItems: ReadinessItem[] = [
              {
                id: 'drills',
                label: hasDrills ? `${drills.length} drill${drills.length !== 1 ? 's' : ''} added` : 'Add drills',
                isComplete: hasDrills,
                icon: 'drill',
                onPress: !hasDrills ? onAddDrill : undefined,
              },
            ];

            if (isTeamTraining) {
              readinessItems.push({
                id: 'weapon',
                label: hasWeapon ? 'Weapon assigned' : 'Assign weapon',
                isComplete: hasWeapon,
                icon: 'weapon',
                onPress: !hasWeapon ? onAssignWeapon : undefined,
              });
            }

            const handleCompleteSetup = () => {
              const firstIncomplete = readinessItems.find((i) => !i.isComplete);
              if (firstIncomplete?.onPress) firstIncomplete.onPress();
            };

            return (
              <TrainingReadinessCard
                items={readinessItems}
                colors={colors}
                onCompleteSetup={handleCompleteSetup}
                isTeamTraining={isTeamTraining}
              />
            );
          })()}

        {/* Weapon Request Card - Soldier without weapon */}
        {isOngoing && weaponChecked && !userWeapon && !canManageTraining && (
          <View style={[styles.noWeaponBanner, { borderColor: colors.orange + '30', backgroundColor: colors.orange + '06' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.noWeaponTitle, { color: colors.text }]}>
                {pendingRequest ? 'Request Pending' : 'No Weapon Assigned'}
              </Text>
              <Text style={[styles.noWeaponHint, { color: colors.textMuted }]}>
                {pendingRequest
                  ? 'Waiting for your commander to approve...'
                  : 'Request a weapon to start shooting'}
              </Text>
            </View>
            {pendingRequest ? (
              <TouchableOpacity
                style={[styles.requestButton, { backgroundColor: colors.textMuted }]}
                onPress={onCancelRequest}
                activeOpacity={0.7}
              >
                <X size={14} color="#fff" />
                <Text style={styles.requestButtonText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.requestButton, { backgroundColor: colors.orange }]}
                onPress={onRequestWeapon}
                disabled={requestingWeapon}
                activeOpacity={0.7}
              >
                {requestingWeapon ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Package size={14} color="#fff" />
                    <Text style={styles.requestButtonText}>Request</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TRAINING SUMMARY - Commander only, after training finishes         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {isFinished && canManageTraining && completedCount > 0 && (() => {
          const completedSessions = teamSessions.filter((s: any) => s.status === 'completed' && s.stats);
          const totalShots = completedSessions.reduce(
            (sum: number, s: any) => sum + (s.stats?.shots_fired || 0), 0
          );
          const totalHits = completedSessions.reduce((sum: number, s: any) => sum + (s.stats?.hits_total || 0), 0);
          const avgAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;
          const bestGroupCm = completedSessions
            .map((s: any) => s.stats?.best_dispersion_cm)
            .filter((v: any): v is number => v !== null && v !== undefined && v > 0);
          const bestGroup = bestGroupCm.length > 0 ? Math.min(...bestGroupCm) : null;

          const totalTimeMs = completedSessions.reduce((sum: number, s: any) => {
            if (!s.started_at || !s.ended_at) return sum;
            return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime());
          }, 0);
          const totalMinutes = Math.round(totalTimeMs / 60000);
          const timeDisplay =
            totalMinutes >= 60
              ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
              : totalMinutes > 0
                ? `${totalMinutes}m`
                : '—';

          const headline =
            totalShots > 0 ? `${avgAccuracy}% Hit Rate` : `${completedCount}/${drills.length} Complete`;

          return (
            <View style={[styles.roundSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.roundSummaryAccent, { backgroundColor: colors.green + '12' }]}>
                <Trophy size={18} color={colors.green} />
              </View>
              <Text style={[styles.roundSummaryHeadline, { color: colors.text }]}>{headline}</Text>
              <Text style={[styles.roundSummarySubtitle, { color: colors.textMuted }]}>
                {completedCount}/{drills.length} objectives · {format(new Date(training.scheduled_at), 'MMM d')}
              </Text>
              <View style={[styles.roundMetricsRow, { borderTopColor: colors.border }]}>
                <View style={styles.roundMetric}>
                  <Text style={[styles.roundMetricValue, { color: colors.text }]}>{totalShots || '—'}</Text>
                  <Text style={[styles.roundMetricLabel, { color: colors.textMuted }]}>Shots</Text>
                </View>
                <View style={[styles.roundMetricDivider, { backgroundColor: colors.border }]} />
                <View style={styles.roundMetric}>
                  <Text style={[styles.roundMetricValue, { color: colors.text }]}>
                    {bestGroup !== null ? `${bestGroup.toFixed(1)}` : '—'}
                  </Text>
                  <Text style={[styles.roundMetricLabel, { color: colors.textMuted }]}>
                    {bestGroup !== null ? 'Best (cm)' : 'Group'}
                  </Text>
                </View>
                <View style={[styles.roundMetricDivider, { backgroundColor: colors.border }]} />
                <View style={styles.roundMetric}>
                  <Text style={[styles.roundMetricValue, { color: colors.text }]}>{timeDisplay}</Text>
                  <Text style={[styles.roundMetricLabel, { color: colors.textMuted }]}>Time</Text>
                </View>
                <View style={[styles.roundMetricDivider, { backgroundColor: colors.border }]} />
                <View style={styles.roundMetric}>
                  <Text style={[styles.roundMetricValue, { color: colors.text }]}>
                    {new Set(teamSessions.map((s: any) => s.user_id)).size || 1}
                  </Text>
                  <Text style={[styles.roundMetricLabel, { color: colors.textMuted }]}>Shooters</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OBJECTIVES - Commander-planned drills                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {drills.length === 0 ? (
          <View style={[styles.emptyDrills, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <BookOpen size={32} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Objectives</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {canManageTraining ? 'Use the menu (⋯) to add objectives' : 'Wait for your commander to set objectives'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>OBJECTIVES</Text>
            <View style={[styles.drillsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {drills.map((drill: any, index: number) => {
                const progress = drillProgress.find((p: { drillId: string }) => p.drillId === drill.id);
                const isCompleted = progress?.completed || false;

                const previousDrillsCompleted = drillProgress
                  .slice(0, index)
                  .every((p: { completed: boolean }) => p.completed);
                const canStartThisDrill = isOngoing && !isCompleted && previousDrillsCompleted;
                const isStartingThis = (quickStartingDrillId || startingDrillId) === drill.id;
                const canActuallyStart = canStartThisDrill && !!userWeapon;

                const distance = drill.distance_m || drill.config?.distance_m || 25;
                const rounds = drill.rounds_per_shooter || drill.config?.rounds || 5;
                const isGrouping = drill.drill_goal === 'grouping';

                return (
                  <TouchableOpacity
                    key={drill.id}
                    style={[
                      styles.drillRow,
                      index < drills.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      isCompleted && { backgroundColor: colors.green + '05' },
                      canStartThisDrill && { backgroundColor: colors.primary + '03' },
                    ]}
                    onPress={canActuallyStart ? () => onStartDrill(drill) : undefined}
                    disabled={!canActuallyStart || isStartingThis}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.drillNumber,
                        {
                          backgroundColor: isCompleted
                            ? colors.green + '15'
                            : canStartThisDrill
                              ? colors.primary + '15'
                              : colors.secondary,
                        },
                      ]}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={16} color={colors.green} />
                      ) : (
                        <Text
                          style={[
                            styles.drillNumberText,
                            { color: canStartThisDrill ? colors.primary : colors.textMuted },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    <View style={styles.drillInfo}>
                      <Text
                        style={[styles.drillName, { color: isCompleted ? colors.textMuted : colors.text }]}
                        numberOfLines={1}
                      >
                        {drill.name}
                      </Text>
                      <View style={styles.drillMeta}>
                        <Text style={[styles.drillMetaText, { color: colors.textMuted }]}>
                          {distance}m · {rounds} rds
                        </Text>
                        <View
                          style={[
                            styles.drillTypeBadge,
                            { backgroundColor: isGrouping ? colors.green + '12' : '#F59E0B12' },
                          ]}
                        >
                          <Text style={[styles.drillTypeText, { color: isGrouping ? colors.green : '#F59E0B' }]}>
                            {isGrouping ? 'Grouping' : 'Engagement'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isStartingThis ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : canActuallyStart ? (
                      <View style={[styles.drillAction, { backgroundColor: colors.primary }]}>
                        <Play size={14} color="#fff" fill="#fff" />
                      </View>
                    ) : canStartThisDrill && weaponChecked && !userWeapon ? (
                      <AlertCircle size={18} color={colors.orange} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ACTIVITY - Commander: all users grouped. Soldier: own sessions only */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {teamSessions.length > 0 && (() => {
          // Filter: commanders see all, soldiers see only their own
          const visibleSessions = canManageTraining
            ? teamSessions
            : teamSessions.filter((s: any) => s.user_id === userId);

          if (visibleSessions.length === 0) return null;

          // Group sessions by user
          const grouped = new Map<string, { name: string; sessions: any[] }>();
          visibleSessions.forEach((s: any) => {
            const uid = s.user_id;
            if (!grouped.has(uid)) {
              grouped.set(uid, { name: s.user_full_name || 'Unknown', sessions: [] });
            }
            grouped.get(uid)!.sessions.push(s);
          });

          // Sort: current user first, then alphabetical
          const sortedUsers = Array.from(grouped.entries()).sort(([idA, a], [idB, b]) => {
            if (idA === userId) return -1;
            if (idB === userId) return 1;
            return a.name.localeCompare(b.name);
          });

          return (
            <View style={styles.activitySection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACTIVITY</Text>
              {sortedUsers.map(([uid, { name, sessions }]) => {
                const isMe = uid === userId;
                const userCompletedCount = sessions.filter((s: any) => s.status === 'completed').length;

                return (
                  <View key={uid} style={styles.userSessionGroup}>
                    {/* User header */}
                    <View style={styles.userSessionHeader}>
                      <View style={[styles.userAvatar, { backgroundColor: isMe ? colors.primary + '15' : colors.secondary }]}>
                        <Text style={[styles.userAvatarText, { color: isMe ? colors.primary : colors.textMuted }]}>
                          {name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.userSessionName, { color: colors.text }]}>
                        {isMe ? 'You' : name}
                      </Text>
                      <Text style={[styles.userSessionCount, { color: colors.textMuted }]}>
                        {userCompletedCount}/{sessions.length}
                      </Text>
                    </View>

                    {/* User's sessions */}
                    <View style={[styles.userSessionList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {sessions.map((s: any, idx: number) => {
                        const isCompleted = s.status === 'completed';
                        const isActive = s.status === 'active';
                        const drillName = s.drill_config?.name || s.drill_name || 'Session';
                        const isGrouping = s.drill_config?.drill_goal === 'grouping';
                        const accuracy = s.stats?.accuracy_pct
                          ?? (s.stats?.hits_total && s.stats?.shots_fired
                            ? Math.round((s.stats.hits_total / s.stats.shots_fired) * 100)
                            : null);
                        const groupSize = s.stats?.best_dispersion_cm;
                        const distance = s.drill_config?.distance_m || '';
                        const shots = s.stats?.shots_fired || 0;

                        return (
                          <View
                            key={s.id}
                            style={[
                              styles.drillRow,
                              idx < sessions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                              isCompleted && { backgroundColor: colors.green + '03' },
                              isActive && { backgroundColor: colors.orange + '05' },
                            ]}
                          >
                            <View
                              style={[
                                styles.drillNumber,
                                {
                                  backgroundColor: isCompleted
                                    ? colors.green + '15'
                                    : isActive
                                      ? colors.orange + '15'
                                      : colors.secondary,
                                },
                              ]}
                            >
                              {isCompleted ? (
                                <CheckCircle2 size={14} color={colors.green} />
                              ) : isActive ? (
                                <Play size={14} color={colors.orange} />
                              ) : (
                                <Target size={14} color={colors.textMuted} />
                              )}
                            </View>
                            <View style={styles.drillInfo}>
                              <Text
                                style={[styles.drillName, { color: isCompleted ? colors.textMuted : colors.text }]}
                                numberOfLines={1}
                              >
                                {drillName}
                              </Text>
                              <Text style={[styles.drillMetaText, { color: colors.textMuted }]}>
                                {distance ? `${distance}m · ` : ''}{shots > 0 ? `${shots} rds` : isActive ? 'In progress' : 'Pending'}
                              </Text>
                            </View>
                            {isCompleted && (
                              isGrouping ? (
                                groupSize != null && groupSize > 0 && (
                                  <Text style={[styles.sessionAccuracy, { color: colors.green }]}>
                                    {groupSize.toFixed(1)}cm
                                  </Text>
                                )
                              ) : (
                                accuracy !== null && (
                                  <Text style={[styles.sessionAccuracy, { color: colors.green }]}>
                                    {accuracy}%
                                  </Text>
                                )
                              )
                            )}
                            {isActive && (
                              <View style={[styles.activeBadge, { backgroundColor: colors.orange + '15' }]}>
                                <Text style={[styles.activeBadgeText, { color: colors.orange }]}>LIVE</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

      </View>

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.textMuted }]}>
        Created {formatDistanceToNow(new Date(training.created_at), { addSuffix: true })}
      </Text>

    </Animated.ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function TrainingDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { canManageTraining: canManageByRole } = usePermissions();
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const params = useLocalSearchParams<{ id?: string; startDrillId?: string }>();
  const { selectedTraining: contextTraining, getOnTrainingUpdated } = useModals();
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });
  const { loadSessions } = useSessionStore();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [quickStartingDrillId, setQuickStartingDrillId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommanderActions, setShowCommanderActions] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const [selectedDrillToStart, setSelectedDrillToStart] = useState<any>(null);

  const [teamSessions, setTeamSessions] = useState<SessionWithDetails[]>([]);
  const [loadingTeamProgress, setLoadingTeamProgress] = useState(false);
  const [userWeapon, setUserWeapon] = useState<UserWeapon | null>(null);
  const [assignedWeapon, setAssignedWeapon] = useState<UserWeapon | null>(null); // Original assigned weapon
  const [weaponChecked, setWeaponChecked] = useState(false);
  const [poolWeapons, setPoolWeapons] = useState<TeamWeapon[]>([]);
  const [selectingPoolWeapon, setSelectingPoolWeapon] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<WeaponRequest | null>(null);
  const [requestingWeapon, setRequestingWeapon] = useState(false);

  // Add Drill state
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [availableDrills, setAvailableDrills] = useState<Drill[]>([]);
  const [loadingDrills, setLoadingDrills] = useState(false);
  const [addingDrill, setAddingDrill] = useState(false);
  const [drillSearch, setDrillSearch] = useState('');

  // Custom session state
  const [showCommanderCustomSession, setShowCommanderCustomSession] = useState(false);
  const [addingCustomDrill, setAddingCustomDrill] = useState(false);

  // Watch preference for this training (asked once, remembered for all drills)
  // null = not asked yet, true = use watch, false = phone only
  const [trainingWatchPreference, setTrainingWatchPreference] = useState<boolean | null>(null);
  const [trainingSensitivity, setTrainingSensitivity] = useState(3.5); // Default: 3.5 (standard rifle)
  const [pendingDrillForWatch, setPendingDrillForWatch] = useState<any>(null);

  // Garmin connection status
  const isWatchConnected = useIsGarminConnected();
  const watchDevice = useGarminDevice();

  const handledAutoStartRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const isLoadingTeamRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAINING DATA
  // ═══════════════════════════════════════════════════════════════════════════

  const trainingId = params.id || contextTraining?.id;
  const { training, drillProgress, loading, setTraining, refetch } = useTrainingDetail(trainingId, contextTraining);

  const isCreator = training?.creator?.id === session?.user?.id;
  // canManageByRole is based on activeTeamId, but we need to check against training's team
  // For now, only allow creator OR if activeTeam matches training team and user has manage role
  const activeTeamMatchesTraining = !training?.team_id || training?.team_id === activeTeamId;
  const canManageTraining = isCreator || (canManageByRole && activeTeamMatchesTraining);

  const {
    actionLoading,
    startingDrillId,
    handleStartTraining,
    handleFinishTraining,
    handleCancelTraining,
  } = useTrainingActions({
    training,
    setTraining,
    onTrainingUpdated: getOnTrainingUpdated() ?? undefined,
  });

  // Computed values
  const drills = training?.drills || [];
  const completedCount = drillProgress.filter((p) => p.completed).length;
  const isOngoing = training?.status === 'ongoing';
  const isPlanned = training?.status === 'planned';
  const isFinished = training?.status === 'finished';

  // Filtered drills for add drill modal
  const filteredDrills = useMemo(() => {
    if (!drillSearch.trim()) return availableDrills;
    const query = drillSearch.toLowerCase();
    return availableDrills.filter(
      (d) => d.name.toLowerCase().includes(query) || d.description?.toLowerCase().includes(query)
    );
  }, [availableDrills, drillSearch]);


  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  // Load user's assigned weapon, pool weapons, and pending request for this training's team
  useEffect(() => {
    if (!training?.team_id || !session?.user?.id) {
      if (training && !training.team_id) setWeaponChecked(true);
      return;
    }
    if (!isMountedRef.current) return;

    let cancelled = false;
    async function loadWeapons() {
      try {
        const [assigned, pool, myRequest] = await Promise.all([
          getAssignedWeapons(training!.team_id!, session!.user!.id),
          getPoolWeapons(training!.team_id!),
          getMyPendingRequest(training!.team_id!),
        ]);

        if (!cancelled && isMountedRef.current) {
          setPoolWeapons(pool);
          setPendingRequest(myRequest);

          if (assigned.length > 0) {
            const profile = await getOrCreatePersonalProfile(assigned[0].id);
            if (!cancelled && isMountedRef.current) {
              setAssignedWeapon(profile); // Store original assigned weapon
              setUserWeapon(profile); // Also set as current weapon
            }
          }
        }
      } catch (e) {
        console.error('Failed to load weapons', e);
      } finally {
        if (!cancelled && isMountedRef.current) setWeaponChecked(true);
      }
    }
    loadWeapons();
    return () => {
      cancelled = true;
    };
  }, [training?.team_id, session?.user?.id]);

  // Load Team Data if needed (all users need it for "My Sessions" section)
  const shouldLoadTeamData =
    !!training?.id && (training?.status === 'ongoing' || training?.status === 'finished');

  const loadTeamProgress = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!training?.id) return;
      // Prevent duplicate loads
      if (isLoadingTeamRef.current || !isMountedRef.current) return;

      isLoadingTeamRef.current = true;
      // Only show loading indicator for user-initiated refreshes, not realtime updates
      if (!options?.silent) {
        setLoadingTeamProgress(true);
      }
      try {
        const sessions = await getTrainingSessionsWithStats(training.id);
        if (isMountedRef.current) setTeamSessions(sessions);
      } catch (error) {
        console.error('[TrainingDetail] Failed to load team progress:', error);
      } finally {
        if (isMountedRef.current && !options?.silent) {
          setLoadingTeamProgress(false);
        }
        // Debounce before allowing next load
        setTimeout(() => {
          isLoadingTeamRef.current = false;
        }, 500);
      }
    },
    [training?.id]
  );

  useEffect(() => {
    if (shouldLoadTeamData && !isLoadingTeamRef.current) loadTeamProgress();
  }, [shouldLoadTeamData, loadTeamProgress]);

  // ═══════════════════════════════════════════════════════════════════════════
  // REALTIME SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Subscribe to live updates for this training
  // Automatically refetches when sessions change (new targets, completion, etc.)
  // Enable realtime for all users when training is active
  const shouldEnableRealtime = !!training?.id && (training?.status === 'ongoing' || training?.status === 'finished');

  const { isConnected: isRealtimeConnected } = useTrainingRealtime({
    trainingId: training?.id,
    enabled: shouldEnableRealtime, // All users get live updates
    onSessionUpdate: useCallback(() => {
      // Session status changed (completed, updated, etc.)
      console.log('[TrainingDetail] Realtime: Session updated, refreshing silently...');
      loadTeamProgress({ silent: true });
      refetch({ silent: true });
    }, [loadTeamProgress, refetch]),
    onSessionCreate: useCallback(() => {
      // New session started in this training
      console.log('[TrainingDetail] Realtime: New session created, refreshing silently...');
      loadTeamProgress({ silent: true });
    }, [loadTeamProgress]),
    onNewTarget: useCallback(() => {
      // Target added to any session - refresh drill progress
      console.log('[TrainingDetail] Realtime: New target added, refreshing silently...');
      loadTeamProgress({ silent: true });
      refetch({ silent: true });
    }, [loadTeamProgress, refetch]),
  });

  // Subscribe to weapon updates:
  // - Soldiers: get notified when weapon assigned/request approved/rejected
  // - Commanders: get notified when a soldier requests a weapon
  useWeaponRealtime({
    teamId: training?.team_id,
    userId: session?.user?.id,
    enabled: !!training?.team_id && isOngoing,
    onNewRequest: useCallback(
      (request: any) => {
        if (!canManageTraining || !training?.team_id) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        const soldierName = request.user?.full_name || request.notes || 'A soldier';
        // Show in-app alert with quick action
        Alert.alert(
          'Weapon Request',
          `${soldierName} needs a weapon for this training.`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Assign Now',
              onPress: () => {
                router.push({
                  pathname: '/(protected)/teamArmory',
                  params: { teamId: training.team_id! },
                });
              },
            },
          ]
        );
        // Also fire local notification (in case commander leaves the screen)
        notifyWeaponRequested(
          training.team_id,
          training.team?.name || 'team',
          soldierName,
          training.id
        );
      },
      [canManageTraining, training?.team_id, training?.team?.name, training?.id]
    ),
    onRequestApproved: useCallback(async () => {
      if (canManageTraining) return; // commanders don't need this
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (training?.team_id && session?.user?.id) {
        const assigned = await getAssignedWeapons(training.team_id, session.user.id);
        if (assigned.length > 0) {
          const profile = await getOrCreatePersonalProfile(assigned[0].id);
          setUserWeapon(profile);
          notifyWeaponRequestApproved(training.team_id, assigned[0].name);
        }
      }
    }, [training?.team_id, session?.user?.id, canManageTraining]),
    onRequestRejected: useCallback(() => {
      if (canManageTraining) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (training?.team_id) {
        notifyWeaponRequestRejected(training.team_id);
      }
    }, [training?.team_id, canManageTraining]),
    onWeaponAssigned: useCallback(
      async (weapon: TeamWeaponRecord) => {
        if (canManageTraining) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const profile = await getOrCreatePersonalProfile(weapon.id);
        setUserWeapon(profile);
        if (training?.team_id && training?.team?.name) {
          notifyWeaponAssigned(training.team_id, weapon.name, training.team.name);
        }
      },
      [training?.team_id, training?.team?.name, canManageTraining]
    ),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Start a drill directly with given watch preference
  const startDrillWithPreference = useCallback(
    async (drill: any, useWatch: boolean, _skipPrepView: boolean = false) => {
      if (!userWeapon) {
        setSelectedDrillToStart(drill);
        return;
      }

      setQuickStartingDrillId(drill.id);
      try {
        const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');

        const config: BaseSessionConfig = {
          weapon_id: userWeapon.id,
          weather: sessionWeather,
          team_id: training?.team_id || null,
          training_id: training?.id || null,
          drill_id: drill.id,
          drill_config: {
            name: drill.name,
            drill_goal: drill.drill_goal || 'engagement',
            target_type: drill.target_type || 'paper',
            distance_m: drill.distance_m,
            rounds_per_shooter: drill.rounds_per_shooter,
            time_limit_seconds: drill.time_limit_seconds,
            // Include detection sensitivity when using watch mode
            ...(useWatch && { detection_sensitivity: trainingSensitivity }),
          },
          session_mode: 'solo',
          watch_controlled: useWatch,
          start_as_pending: false,
        };

        const newSession = await createSession(config);
        await loadSessions();

        // Navigate to activeSession
        router.push({
          pathname: '/(protected)/activeSession',
          params: {
            sessionId: newSession.id,
            returnTo: 'trainingDetail',
            returnId: training?.id,
          },
        });
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to start session');
      } finally {
        setQuickStartingDrillId(null);
      }
    },
    [userWeapon, training?.team_id, training?.id, openWeather, loadSessions, trainingSensitivity]
  );

  const handleStartDrill = useCallback(
    async (drill: any) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // If no weapon assigned, fallback to sheet
      if (!userWeapon) {
        setSelectedDrillToStart(drill);
        return;
      }

      // If watch is connected and we haven't chosen yet, save the drill
      // and let the CapturePreferenceCard prompt the user
      if (isWatchConnected && trainingWatchPreference === null) {
        setPendingDrillForWatch(drill);
        // Show a brief alert to guide the user to the capture mode selection
        Alert.alert('Choose Recording Mode', 'Select how to record your session using the card above the drills.', [
          { text: 'OK', style: 'default' },
        ]);
        return;
      }

      // Use the stored preference (or false if no watch connected)
      const useWatch = isWatchConnected && trainingWatchPreference === true;
      await startDrillWithPreference(drill, useWatch);
    },
    [userWeapon, isWatchConnected, trainingWatchPreference, startDrillWithPreference]
  );

  // Handle capture preference selection (from inline card)
  const handleCapturePreferenceSelect = useCallback(
    (mode: 'phone' | 'watch', sensitivity?: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const useWatch = mode === 'watch';
      setTrainingWatchPreference(useWatch);
      if (sensitivity !== undefined) {
        setTrainingSensitivity(sensitivity);
      }

      // If there's a pending drill (user tapped drill before setting preference)
      // Start it now with the selected preference
      if (pendingDrillForWatch) {
        startDrillWithPreference(pendingDrillForWatch, useWatch, true);
        setPendingDrillForWatch(null);
      }
    },
    [pendingDrillForWatch, startDrillWithPreference]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
    if (shouldLoadTeamData) await loadTeamProgress();
    setRefreshing(false);
  }, [refetch, shouldLoadTeamData, loadTeamProgress]);

  // Commander: add a custom session config as a drill to the training plan
  const handleAddCustomDrill = useCallback(
    async (config: CustomSessionConfig) => {
      if (!training?.id || addingCustomDrill) return;

      setAddingCustomDrill(true);
      try {
        const drillName = `${config.purpose === 'grouping' ? 'Grouping' : 'Engagement'} ${config.distance}m`;
        await addDrill(training.id, {
          name: drillName,
          drill_goal: config.purpose,
          target_type: config.targetType,
          distance_m: config.distance,
          rounds_per_shooter: config.shotsPlanned,
          time_limit_seconds: config.timeLimit ?? undefined,
          position: config.position as any,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCommanderCustomSession(false);
        refetch();
      } catch (error) {
        Alert.alert('Error', 'Failed to add session to plan.');
      } finally {
        setAddingCustomDrill(false);
      }
    },
    [training?.id, addingCustomDrill, refetch]
  );

  const loadAvailableDrills = useCallback(async () => {
    if (!training?.team_id) return;
    setLoadingDrills(true);
    try {
      const teamDrills = await getTeamDrills(training.team_id);
      setAvailableDrills(teamDrills);
    } catch (error) {
      console.error('[TrainingDetail] Failed to load drills:', error);
    } finally {
      setLoadingDrills(false);
    }
  }, [training?.team_id]);

  const handleOpenAddDrill = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddDrill(true);
    loadAvailableDrills();
  }, [loadAvailableDrills]);

  const handleAddDrill = useCallback(
    async (drill: Drill) => {
      if (!training?.id || addingDrill) return;
      setAddingDrill(true);
      try {
        await addDrill(training.id, {
          drill_id: drill.id,
          name: drill.name,
          drill_goal: drill.drill_goal,
          target_type: drill.target_type,
          distance_m: drill.distance_m,
          rounds_per_shooter: drill.rounds_per_shooter,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAddDrill(false);
        setDrillSearch('');
        refetch();
      } catch (error) {
        Alert.alert('Error', 'Failed to add drill.');
      } finally {
        setAddingDrill(false);
      }
    },
    [training?.id, addingDrill, refetch]
  );

  // Navigate to team armory for weapon management
  const handleOpenWeaponManagement = useCallback(() => {
    if (!training?.team_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/teamArmory',
      params: { teamId: training.team_id },
    });
  }, [training?.team_id]);

  // Open weapon picker modal
  const handleOpenWeaponPicker = useCallback(() => {
    // Only allow changing weapon if training is ongoing and there are options
    if (!isOngoing) return;
    const hasOptions = assignedWeapon || poolWeapons.length > 0;
    if (!hasOptions) {
      // No options - inform user
      Alert.alert('No Weapons Available', 'No weapons assigned or available in the team pool.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWeaponPicker(true);
  }, [isOngoing, assignedWeapon, poolWeapons.length]);

  // Select assigned weapon
  const handleSelectAssignedWeapon = useCallback(() => {
    if (!assignedWeapon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUserWeapon(assignedWeapon);
    setShowWeaponPicker(false);
  }, [assignedWeapon]);

  // Grab a pool weapon for this session (creates tracking profile, pool stays available)
  const handleSelectPoolWeapon = useCallback(
    async (weapon: TeamWeapon) => {
      if (selectingPoolWeapon) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectingPoolWeapon(true);

      try {
        const profile = await getOrCreatePersonalProfile(weapon.id);
        setUserWeapon(profile);
        setShowWeaponPicker(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to grab weapon');
      } finally {
        setSelectingPoolWeapon(false);
      }
    },
    [selectingPoolWeapon]
  );

  const handleRequestWeapon = useCallback(async () => {
    if (!training?.team_id || requestingWeapon) return;

    setRequestingWeapon(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const request = await createWeaponRequest({
        team_id: training.team_id,
        notes: 'Requesting weapon for training',
      });
      setPendingRequest(request);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    } finally {
      setRequestingWeapon(false);
    }
  }, [training?.team_id, requestingWeapon]);

  const handleCancelRequest = useCallback(async () => {
    if (!pendingRequest) return;

    try {
      await cancelWeaponRequest(pendingRequest.id);
      setPendingRequest(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel request');
    }
  }, [pendingRequest]);

  const handleAutoCloseExpired = useCallback(() => {
    if (canManageTraining) {
      handleFinishTraining();
    } else {
      setTimeout(() => refetch(), 2000);
    }
  }, [canManageTraining, handleFinishTraining, refetch]);

  // Auto-start drill handling
  useEffect(() => {
    const startDrillId = Array.isArray(params.startDrillId) ? params.startDrillId[0] : params.startDrillId;
    if (!startDrillId || !training) return;
    if (handledAutoStartRef.current === startDrillId) return;
    handledAutoStartRef.current = startDrillId;

    const drill = (training.drills || []).find((d) => d.id === startDrillId);
    if (!drill || training.status !== 'ongoing') {
      router.replace(`/(protected)/trainingDetail?id=${training.id}`);
      return;
    }
    handleStartDrill(drill);
  }, [params.startDrillId, training, handleStartDrill]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: NOT FOUND STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (!training) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <AlertCircle size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Training Not Found</Text>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>
            This training may have been deleted or you don't have access.
          </Text>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: MAIN CONTENT
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ParallaxScrollContent
        training={training}
        colors={colors}
        insets={insets}
        userId={session?.user?.id}
        onAutoCloseExpired={handleAutoCloseExpired}
        userWeapon={userWeapon}
        assignedWeapon={assignedWeapon}
        weaponChecked={weaponChecked}
        canManageTraining={canManageTraining}
        onAssignWeapon={handleOpenWeaponManagement}
        onOpenWeaponPicker={handleOpenWeaponPicker}
        poolWeapons={poolWeapons}
        selectingPoolWeapon={selectingPoolWeapon}
        onSelectPoolWeapon={handleSelectPoolWeapon}
        pendingRequest={pendingRequest}
        requestingWeapon={requestingWeapon}
        onRequestWeapon={handleRequestWeapon}
        onCancelRequest={handleCancelRequest}
        onAddDrill={handleOpenAddDrill}
        completedCount={completedCount}
        drills={drills}
        isPlanned={isPlanned}
        isOngoing={isOngoing}
        isFinished={isFinished}
        drillProgress={drillProgress}
        teamSessions={teamSessions}
        quickStartingDrillId={quickStartingDrillId}
        startingDrillId={startingDrillId}
        onStartDrill={handleStartDrill}
        onBack={() => {
          // If we can go back normally, do so
          // Otherwise navigate to home to break any potential loops
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(protected)/(tabs)');
          }
        }}
        onShowCommanderActions={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowCommanderActions(true);
        }}
        // Watch preference props
        isWatchConnected={isWatchConnected}
        trainingWatchPreference={trainingWatchPreference}
        onCapturePreferenceSelect={handleCapturePreferenceSelect}
        watchDeviceName={watchDevice?.name}
        trainingSensitivity={trainingSensitivity}
        // Realtime status
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* Bottom Action - Begin Training for planned */}
      {isPlanned && canManageTraining && (
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.bottomGradient, { backgroundColor: colors.background }]} />
          <TouchableOpacity
            style={[styles.mainActionBtn, { backgroundColor: colors.text }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowStartSheet(true);
            }}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Play size={18} fill={colors.background} color={colors.background} />
                <Text style={[styles.mainActionBtnText, { color: colors.background }]}>Begin Training</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <TrainingSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        training={training}
        onUpdate={setTraining}
        colors={colors}
      />

      <CommanderActionsSheet
        visible={showCommanderActions}
        onClose={() => setShowCommanderActions(false)}
        onAddDrill={handleOpenAddDrill}
        onAddCustomSession={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowCommanderCustomSession(true);
        }}
        onAssignWeapon={handleOpenWeaponManagement}
        onFinishTraining={handleFinishTraining}
        onSettings={() => setShowSettings(true)}
        onCancel={handleCancelTraining}
        trainingStatus={training.status}
        colors={colors}
      />

      <StartTrainingSheet
        visible={showStartSheet}
        onClose={() => setShowStartSheet(false)}
        onStart={handleStartTraining}
        colors={colors}
      />

      <StartDrillSheet
        visible={!!selectedDrillToStart}
        onClose={() => setSelectedDrillToStart(null)}
        drill={selectedDrillToStart}
        trainingId={training?.id}
        teamId={training?.team_id}
        initialWeapon={userWeapon}
      />

      <AddDrillModal
        visible={showAddDrill}
        onClose={() => setShowAddDrill(false)}
        drills={availableDrills}
        filteredDrills={filteredDrills}
        searchQuery={drillSearch}
        onSearchChange={setDrillSearch}
        onAddDrill={handleAddDrill}
        loading={loadingDrills}
        adding={addingDrill}
        colors={colors}
      />

      {/* Commander: Custom Session → Add to Plan */}
      <CustomSessionCard
        visible={showCommanderCustomSession}
        onClose={() => setShowCommanderCustomSession(false)}
        hideTrigger
        onStartSession={handleAddCustomDrill}
        hasWeapon={true}
        isStarting={addingCustomDrill}
        isWatchConnected={false}
      />

      {/* Weapon Picker Modal */}
      <Modal
        visible={showWeaponPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWeaponPicker(false)}
      >
        <View style={styles.weaponPickerOverlay}>
          <TouchableOpacity
            style={styles.weaponPickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowWeaponPicker(false)}
          />
          <View style={[styles.weaponPickerSheet, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.weaponPickerSheetHeader}>
              <Text style={[styles.weaponPickerSheetTitle, { color: colors.text }]}>Select Weapon</Text>
              <TouchableOpacity
                onPress={() => setShowWeaponPicker(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Assigned Weapon Section */}
            {assignedWeapon && (
              <View style={styles.weaponPickerSection}>
                <Text style={[styles.weaponPickerSectionTitle, { color: colors.textMuted }]}>YOUR WEAPON</Text>
                <TouchableOpacity
                  style={[
                    styles.weaponPickerOption,
                    { borderColor: colors.border },
                    userWeapon?.id === assignedWeapon.id && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '08',
                    },
                  ]}
                  onPress={handleSelectAssignedWeapon}
                  activeOpacity={0.7}
                >
                  <View style={[styles.weaponPickerIcon, { backgroundColor: colors.green + '15' }]}>
                    <Crosshair size={16} color={colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.weaponPickerOptionName, { color: colors.text }]}>{assignedWeapon.name}</Text>
                    <Text style={[styles.weaponPickerOptionMeta, { color: colors.textMuted }]}>Assigned to you</Text>
                  </View>
                  {userWeapon?.id === assignedWeapon.id && <CheckCircle2 size={18} color={colors.primary} />}
                </TouchableOpacity>
              </View>
            )}

            {/* Pool Weapons Section */}
            {poolWeapons.length > 0 && (
              <View style={styles.weaponPickerSection}>
                <Text style={[styles.weaponPickerSectionTitle, { color: colors.textMuted }]}>TEAM POOL</Text>
                {poolWeapons.map((weapon: TeamWeapon) => {
                  const isSelected = userWeapon?.team_weapon_id === weapon.id;
                  return (
                    <TouchableOpacity
                      key={weapon.id}
                      style={[
                        styles.weaponPickerOption,
                        { borderColor: colors.border },
                        isSelected && {
                          borderColor: colors.primary,
                          backgroundColor: colors.primary + '08',
                        },
                      ]}
                      onPress={() => handleSelectPoolWeapon(weapon)}
                      disabled={selectingPoolWeapon}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.weaponPickerIcon, { backgroundColor: colors.blue + '15' }]}>
                        <Package size={16} color={colors.blue} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.weaponPickerOptionName, { color: colors.text }]}>{weapon.name}</Text>
                        <Text style={[styles.weaponPickerOptionMeta, { color: colors.textMuted }]}>
                          {weapon.caliber || 'Shared weapon'}
                        </Text>
                      </View>
                      {selectingPoolWeapon ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : isSelected ? (
                        <CheckCircle2 size={18} color={colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* No options message */}
            {!assignedWeapon && poolWeapons.length === 0 && (
              <View style={styles.weaponPickerEmpty}>
                <Text style={[styles.weaponPickerEmptyText, { color: colors.textMuted }]}>No weapons available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  heroCard: {
    minHeight: HEADER_HEIGHT,
    marginBottom: 24,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusChevron: {
    width: 14,
    height: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  drillsContainer: {
    gap: 16,
  },
  drillsList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  drillNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  drillInfo: {
    flex: 1,
    gap: 4,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillMetaText: {
    fontSize: 12,
  },
  drillTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  drillTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  drillAction: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Weapon Picker Card (soldier without weapon)
  weaponPickerCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  weaponPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  weaponPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  weaponPickerHint: {
    fontSize: 12,
    marginTop: 2,
  },
  poolSection: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  poolLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  poolLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  poolWeaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  poolWeaponIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolWeaponName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  poolWeaponMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  poolWeaponAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  // No weapon available banner
  noWeaponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  noWeaponTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noWeaponHint: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  requestButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyDrills: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Round Summary Card
  roundSummaryCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    gap: 4,
  },
  roundSummaryAccent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roundSummaryHeadline: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  roundSummarySubtitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  roundMetricsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  roundMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  roundMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  roundMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  roundMetricDivider: {
    width: 1,
    height: 28,
    alignSelf: 'center',
  },
  roundInsight: {
    alignSelf: 'stretch',
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
  },
  roundInsightText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  activitySection: {
    marginTop: 20,
    gap: 16,
  },
  userSessionGroup: {
    gap: 6,
  },
  userSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userSessionName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  userSessionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  userSessionList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionAccuracy: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 32,
    opacity: 0.5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  bottomGradient: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 20,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  mainActionBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Weapon Picker Modal
  weaponPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  weaponPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  weaponPickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  weaponPickerSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  weaponPickerSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  weaponPickerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  weaponPickerSectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  weaponPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  weaponPickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weaponPickerOptionName: {
    fontSize: 15,
    fontWeight: '600',
  },
  weaponPickerOptionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  weaponPickerEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  weaponPickerEmptyText: {
    fontSize: 14,
  },
});
