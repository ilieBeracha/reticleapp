/**
 * Training Detail
 *
 * Simple, data-driven training view:
 * - Header with key stats
 * - Drill list with progress
 * - Insights summary when finished
 */
import {
  useTrainingActions,
  useTrainingDetail,
} from '@/components/training';
import {
  AddDrillModal,
  CommanderActionsSheet,
  SquadStatusContent,
  StartTrainingSheet,
  TrainingHero,
  TrainingSettingsModal,
} from '@/components/training/detail';
import { StartDrillSheet } from '@/components/training/StartDrillSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useTrainingRealtime, useWeaponRealtime, type TeamWeaponRecord } from '@/hooks/realtime';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { usePermissions } from '@/hooks/usePermissions';
import { getTeamDrills } from '@/services/drillService';
import type { BaseSessionConfig } from '@/services/session/types';
import {
  createSession,
  getTrainingSessionsWithStats,
  SessionWithDetails,
} from '@/services/sessionService';
import { addDrill } from '@/services/trainingService';
import {
  notifyWeaponAssigned,
  notifyWeaponRequestApproved,
  notifyWeaponRequestRejected,
} from '@/services/notifications';
import {
  cancelWeaponRequest,
  createWeaponRequest,
  getAssignedWeapons,
  getMyPendingRequest,
  getOrCreatePersonalProfile,
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
  Clock,
  MoreHorizontal,
  Play,
  Radio,
  Send,
  Smartphone,
  Target,
  Trophy,
  Users,
  Watch,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 140; // Reduced for faster scroll-away

// ═══════════════════════════════════════════════════════════════════════════
// PARALLAX SCROLL CONTENT
// ═══════════════════════════════════════════════════════════════════════════

type TabType = 'drills' | 'squad';

function ParallaxScrollContent({
  training,
  colors,
  insets,
  onAutoCloseExpired,
  openWeather,
  userWeapon,
  weaponChecked,
  pendingRequest,
  requestingWeapon,
  canManageTraining,
  onAssignWeapon,
  onRequestWeapon,
  onCancelRequest,
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
  onChangeWatchPreference,
  // Realtime status
  isRealtimeConnected,
}: any) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const [activeTab, setActiveTab] = useState<TabType>('drills');

  // Show tabs only for commanders during ongoing/finished training
  const showTabs = canManageTraining && (isOngoing || isFinished);

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
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [1.3, 1, 0.95]
          ),
        },
      ],
      // Fade out faster
      opacity: interpolate(
        scrollOffset.value,
        [0, HEADER_HEIGHT * 0.5],
        [1, 0]
      ),
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
        style={[
          styles.heroCard,
          { backgroundColor: colors.card, paddingTop: insets.top + 12 },
          headerAnimatedStyle,
        ]}
      >
        {/* Nav Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.secondary }]}
            onPress={onBack}
          >
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
        <TrainingHero
          training={training}
          colors={colors}
          onAutoCloseExpired={onAutoCloseExpired}
        />

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
          {weaponChecked && (
            <TouchableOpacity
              style={[
                styles.statusItem,
                { backgroundColor: userWeapon ? colors.green + '12' : colors.orange + '12' },
              ]}
              onPress={!userWeapon && canManageTraining ? onAssignWeapon : undefined}
              disabled={!!userWeapon || !canManageTraining}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.statusText, { color: userWeapon ? colors.green : colors.orange }]}
                numberOfLines={1}
              >
                {userWeapon ? userWeapon.name : 'No weapon'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Watch mode - compact */}
          {isOngoing && isWatchConnected && trainingWatchPreference !== null && (
            <TouchableOpacity
              style={[styles.statusItem, { backgroundColor: colors.secondary }]}
              onPress={onChangeWatchPreference}
              activeOpacity={0.7}
            >
              {trainingWatchPreference ? (
                <Watch size={12} color={colors.green} />
              ) : (
                <Smartphone size={12} color={colors.textMuted} />
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

      {/* Tab Bar - Commander only, ongoing/finished */}
      {showTabs && (
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'drills' && [styles.tabActive, { backgroundColor: colors.primary + '15' }],
            ]}
            onPress={() => setActiveTab('drills')}
            activeOpacity={0.7}
          >
            <Target size={16} color={activeTab === 'drills' ? colors.primary : colors.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'drills' ? colors.primary : colors.textMuted },
              ]}
            >
              Drills
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'squad' && [styles.tabActive, { backgroundColor: colors.primary + '15' }],
            ]}
            onPress={() => setActiveTab('squad')}
            activeOpacity={0.7}
          >
            <Users size={16} color={activeTab === 'squad' ? colors.primary : colors.textMuted} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'squad' ? colors.primary : colors.textMuted },
              ]}
            >
              Squad
            </Text>
            {teamSessions.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.green }]}>
                <Text style={styles.tabBadgeText}>
                  {new Set(teamSessions.map((s: any) => s.user_id)).size}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Content based on active tab */}
      {activeTab === 'drills' ? (
        <View style={styles.drillsContainer}>
          {/* No weapon banner - only show after weapon check complete */}
          {isOngoing && weaponChecked && !userWeapon && (
            <View style={[styles.noWeaponBanner, { 
              backgroundColor: pendingRequest ? colors.blue + '10' : colors.orange + '10', 
              borderColor: pendingRequest ? colors.blue + '25' : colors.orange + '25' 
            }]}>
              <View style={[styles.noWeaponIcon, { 
                backgroundColor: pendingRequest ? colors.blue + '20' : colors.orange + '20' 
              }]}>
                {pendingRequest ? (
                  <Clock size={20} color={colors.blue} />
                ) : (
                  <AlertCircle size={20} color={colors.orange} />
                )}
              </View>
              <View style={styles.noWeaponContent}>
                <Text style={[styles.noWeaponTitle, { color: pendingRequest ? colors.blue : colors.orange }]}>
                  {pendingRequest ? 'Request Pending' : 'No Weapon Assigned'}
                </Text>
                <Text style={[styles.noWeaponHint, { color: colors.textMuted }]}>
                  {pendingRequest 
                    ? 'Waiting for commander approval'
                    : canManageTraining 
                      ? 'Tap to manage team weapons' 
                      : 'Request a weapon to start drills'}
                </Text>
              </View>
              {/* Action button */}
              {canManageTraining ? (
                <TouchableOpacity
                  style={[styles.noWeaponAction, { backgroundColor: colors.orange }]}
                  onPress={onAssignWeapon}
                  activeOpacity={0.7}
                >
                  <Text style={styles.noWeaponActionText}>Manage</Text>
                </TouchableOpacity>
              ) : pendingRequest ? (
                <TouchableOpacity
                  style={[styles.noWeaponAction, { backgroundColor: colors.secondary }]}
                  onPress={onCancelRequest}
                  activeOpacity={0.7}
                >
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.noWeaponAction, { backgroundColor: colors.primary }]}
                  onPress={onRequestWeapon}
                  disabled={requestingWeapon}
                  activeOpacity={0.7}
                >
                  {requestingWeapon ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Empty State */}
          {drills.length === 0 ? (
            <View style={[styles.emptyDrills, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <BookOpen size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Drills Scheduled
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {canManageTraining 
                  ? 'Use the menu (⋯) to add drills' 
                  : 'Wait for your commander to add drills'}
              </Text>
            </View>
          ) : (
            /* Drills List - Simple, compact cards */
            <View style={[styles.drillsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {drills.map((drill: any, index: number) => {
                const progress = drillProgress.find((p: { drillId: string }) => p.drillId === drill.id);
                const isCompleted = progress?.completed || false;
                
                // Determine if this drill can be started
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
                    {/* Number/Status */}
                    <View style={[
                      styles.drillNumber,
                      { backgroundColor: isCompleted ? colors.green + '15' : canStartThisDrill ? colors.primary + '15' : colors.secondary }
                    ]}>
                      {isCompleted ? (
                        <CheckCircle2 size={16} color={colors.green} />
                      ) : (
                        <Text style={[styles.drillNumberText, { color: canStartThisDrill ? colors.primary : colors.textMuted }]}>
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.drillInfo}>
                      <Text style={[styles.drillName, { color: isCompleted ? colors.textMuted : colors.text }]} numberOfLines={1}>
                        {drill.name}
                      </Text>
                      <View style={styles.drillMeta}>
                        <Text style={[styles.drillMetaText, { color: colors.textMuted }]}>
                          {distance}m · {rounds} rds
                        </Text>
                        <View style={[styles.drillTypeBadge, { backgroundColor: isGrouping ? colors.green + '12' : '#F59E0B12' }]}>
                          <Text style={[styles.drillTypeText, { color: isGrouping ? colors.green : '#F59E0B' }]}>
                            {isGrouping ? 'Grouping' : 'Engagement'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action */}
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
          )}

          {/* Training Summary - shown when finished with insights */}
          {isFinished && completedCount > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.green + '30' }]}>
              {/* Header */}
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.green + '15' }]}>
                  <Trophy size={20} color={colors.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>Training Complete</Text>
                  <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
                    {completedCount} of {drills.length} drills · {format(new Date(training.scheduled_at), 'MMM d')}
                  </Text>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={[styles.insightsRow, { borderTopColor: colors.border }]}>
                <View style={styles.insightItem}>
                  <Text style={[styles.insightValue, { color: colors.text }]}>
                    {Math.round((completedCount / drills.length) * 100)}%
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Completion</Text>
                </View>
                <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
                <View style={styles.insightItem}>
                  <Text style={[styles.insightValue, { color: colors.text }]}>
                    {teamSessions.length}
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Sessions</Text>
                </View>
                <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
                <View style={styles.insightItem}>
                  <Text style={[styles.insightValue, { color: colors.text }]}>
                    {new Set(teamSessions.map((s: any) => s.user_id)).size || 1}
                  </Text>
                  <Text style={[styles.insightLabel, { color: colors.textMuted }]}>Shooters</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.squadContainer}>
          <SquadStatusContent
            teamSessions={teamSessions}
            drills={drills}
            drillProgress={drillProgress}
            colors={colors}
          />
        </View>
      )}

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
  const [weaponChecked, setWeaponChecked] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<WeaponRequest | null>(null);
  const [requestingWeapon, setRequestingWeapon] = useState(false);

  // Add Drill state
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [availableDrills, setAvailableDrills] = useState<Drill[]>([]);
  const [loadingDrills, setLoadingDrills] = useState(false);
  const [addingDrill, setAddingDrill] = useState(false);
  const [drillSearch, setDrillSearch] = useState('');


  // Watch preference for this training (asked once, remembered for all drills)
  // null = not asked yet, true = use watch, false = phone only
  const [trainingWatchPreference, setTrainingWatchPreference] = useState<boolean | null>(null);
  const [showWatchPrompt, setShowWatchPrompt] = useState(false);
  const [pendingDrillForWatch, setPendingDrillForWatch] = useState<any>(null);
  
  // Garmin connection status
  const isWatchConnected = useIsGarminConnected();
  const watchDevice = useGarminDevice();

  const handledAutoStartRef = useRef<string | null>(null);
  const autoFinishTriggeredRef = useRef(false);
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
  const { training, drillProgress, loading, setTraining, refetch } = useTrainingDetail(
    trainingId,
    contextTraining
  );

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
    executeFinishTraining,
    handleCancelTraining,
  } = useTrainingActions({
    training,
    setTraining,
    onTrainingUpdated: getOnTrainingUpdated() ?? undefined,
  });

  // Computed values
  const drills = training?.drills || [];
  const completedCount = drillProgress.filter((p) => p.completed).length;
  const allDrillsCompleted =
    drills.length > 0 && completedCount === drills.length && training?.status === 'ongoing';
  const isOngoing = training?.status === 'ongoing';
  const isPlanned = training?.status === 'planned';
  const isFinished = training?.status === 'finished';


  // Group Sessions by Drill
  const sessionsByDrill = useMemo(() => {
    const map = new Map<string, SessionWithDetails[]>();
    teamSessions.forEach((s) => {
      if (s.drill_id) {
        if (!map.has(s.drill_id)) map.set(s.drill_id, []);
        map.get(s.drill_id)?.push(s);
      }
    });
    return map;
  }, [teamSessions]);

  // Filtered drills for add drill modal
  const filteredDrills = useMemo(() => {
    if (!drillSearch.trim()) return availableDrills;
    const query = drillSearch.toLowerCase();
    return availableDrills.filter(
      (d) =>
        d.name.toLowerCase().includes(query) || d.description?.toLowerCase().includes(query)
    );
  }, [availableDrills, drillSearch]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-FINISH WHEN ALL DRILLS COMPLETED
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (
      allDrillsCompleted &&
      canManageTraining &&
      !autoFinishTriggeredRef.current &&
      !actionLoading
    ) {
      autoFinishTriggeredRef.current = true;
      
      // Show a brief confirmation before auto-finishing
      Alert.alert(
        'All Drills Completed! 🎯',
        'Great work! Would you like to complete this training now?',
        [
          {
            text: 'Stay Open',
            style: 'cancel',
            onPress: () => {
              autoFinishTriggeredRef.current = false;
            },
          },
          {
            text: 'Complete Training',
            onPress: () => {
              // Use executeFinishTraining directly - no second confirmation needed
              executeFinishTraining();
            },
          },
        ]
      );
    }
  }, [allDrillsCompleted, canManageTraining, actionLoading, executeFinishTraining]);

  // Reset auto-finish flag when training changes
  useEffect(() => {
    if (training?.status !== 'ongoing') {
      autoFinishTriggeredRef.current = false;
    }
  }, [training?.status]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  // Load user's assigned weapon and pending request for this training's team
  useEffect(() => {
    if (!training?.team_id || !session?.user?.id) {
      // No team = no team weapon needed, mark as checked
      if (training && !training.team_id) setWeaponChecked(true);
      return;
    }
    if (!isMountedRef.current) return;

    let cancelled = false;
    async function loadWeaponAndRequest() {
      try {
        // Load both in parallel
        const [assigned, pending] = await Promise.all([
          getAssignedWeapons(training!.team_id!, session!.user!.id),
          getMyPendingRequest(training!.team_id!),
        ]);
        
        if (!cancelled && isMountedRef.current) {
          setPendingRequest(pending);
          
          if (assigned.length > 0) {
            const profile = await getOrCreatePersonalProfile(assigned[0].id);
            if (!cancelled && isMountedRef.current) setUserWeapon(profile);
          }
        }
      } catch (e) {
        console.error('Failed to load weapon/request', e);
      } finally {
        if (!cancelled && isMountedRef.current) setWeaponChecked(true);
      }
    }
    loadWeaponAndRequest();
    return () => {
      cancelled = true;
    };
  }, [training?.team_id, session?.user?.id]);

  // Load Team Data if needed
  const shouldLoadTeamData =
    !!training?.id &&
    canManageTraining &&
    (training?.status === 'ongoing' || training?.status === 'finished');

  const loadTeamProgress = useCallback(async (options?: { silent?: boolean }) => {
    if (!training?.id || !canManageTraining) return;
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
  }, [training?.id, canManageTraining]);

  useEffect(() => {
    if (shouldLoadTeamData && !isLoadingTeamRef.current) loadTeamProgress();
  }, [shouldLoadTeamData, loadTeamProgress]);

  // ═══════════════════════════════════════════════════════════════════════════
  // REALTIME SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Subscribe to live updates for this training
  // Automatically refetches when sessions change (new targets, completion, etc.)
  // Enable realtime for all users when training is active
  const shouldEnableRealtime = 
    !!training?.id && 
    (training?.status === 'ongoing' || training?.status === 'finished');

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

  // Subscribe to weapon request/assignment updates
  useWeaponRealtime({
    teamId: training?.team_id,
    userId: session?.user?.id,
    enabled: !!training?.team_id && !userWeapon, // Only when user doesn't have weapon yet
    onRequestApproved: useCallback(async () => {
      console.log('[TrainingDetail] Realtime: Weapon request approved!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingRequest(null);
      // Reload weapon - it should be assigned now
      if (training?.team_id && session?.user?.id) {
        const assigned = await getAssignedWeapons(training.team_id, session.user.id);
        if (assigned.length > 0) {
          const profile = await getOrCreatePersonalProfile(assigned[0].id);
          setUserWeapon(profile);
          // Send notification
          notifyWeaponRequestApproved(training.team_id, assigned[0].name);
        }
      }
    }, [training?.team_id, session?.user?.id]),
    onRequestRejected: useCallback(() => {
      console.log('[TrainingDetail] Realtime: Weapon request rejected');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPendingRequest(null);
      // Send notification
      if (training?.team_id) {
        notifyWeaponRequestRejected(training.team_id);
      }
      Alert.alert('Request Declined', 'Your weapon request was not approved. Contact your commander for details.');
    }, [training?.team_id]),
    onWeaponAssigned: useCallback(async (weapon: TeamWeaponRecord) => {
      console.log('[TrainingDetail] Realtime: Weapon assigned!', weapon.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Convert to personal profile
      const profile = await getOrCreatePersonalProfile(weapon.id);
      setUserWeapon(profile);
      setPendingRequest(null);
      // Send notification
      if (training?.team_id && training?.team?.name) {
        notifyWeaponAssigned(training.team_id, weapon.name, training.team.name);
      }
    }, [training?.team_id, training?.team?.name]),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // Internal function to actually start the drill with a given watch preference
  // skipPrepView: explicitly passed to handle first-drill case (state hasn't updated yet)
  const startDrillWithPreference = useCallback(
    async (drill: any, useWatch: boolean, skipPrepView: boolean = false) => {
      if (!userWeapon) {
        setSelectedDrillToStart(drill);
        return;
      }

      setQuickStartingDrillId(drill.id);
      try {
        const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');

        // For team training: skip SessionPrepView when preference is set
        // Use explicit skipPrepView param (handles first drill when state hasn't updated)
        const shouldSkipPrepView = skipPrepView || (!!training?.team_id && trainingWatchPreference !== null);

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
          },
          session_mode: 'solo',
          watch_controlled: useWatch,
          // Skip SessionPrepView for team sessions with watch preference set
          start_as_pending: !shouldSkipPrepView,
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
    [userWeapon, training?.team_id, training?.id, openWeather, loadSessions, trainingWatchPreference]
  );

  const handleStartDrill = useCallback(
    async (drill: any) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // If no weapon assigned, fallback to sheet
      if (!userWeapon) {
        setSelectedDrillToStart(drill);
        return;
      }

      // If watch is connected and we haven't asked yet for this training, ask once
      if (isWatchConnected && trainingWatchPreference === null) {
        setPendingDrillForWatch(drill);
        setShowWatchPrompt(true);
        return;
      }

      // Use the stored preference (or false if no watch connected)
      const useWatch = isWatchConnected && trainingWatchPreference === true;
      await startDrillWithPreference(drill, useWatch);
    },
    [userWeapon, isWatchConnected, trainingWatchPreference, startDrillWithPreference]
  );

  // Handle watch prompt response
  const handleWatchPromptSelect = useCallback(
    async (useWatch: boolean) => {
      setShowWatchPrompt(false);
      // Save preference for this training (remembered for all drills)
      setTrainingWatchPreference(useWatch);

      // Start the pending drill with the selected preference
      // Pass skipPrepView=true since we just set the preference (first drill)
      if (pendingDrillForWatch) {
        await startDrillWithPreference(pendingDrillForWatch, useWatch, true);
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

  // Request a weapon (for soldiers)
  const handleRequestWeapon = useCallback(async () => {
    if (!training?.team_id || requestingWeapon) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRequestingWeapon(true);
    
    try {
      const request = await createWeaponRequest({
        team_id: training.team_id,
        notes: `Requested for training: ${training.title}`,
      });
      setPendingRequest(request);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request weapon');
    } finally {
      setRequestingWeapon(false);
    }
  }, [training?.team_id, training?.title, requestingWeapon]);

  // Cancel weapon request
  const handleCancelRequest = useCallback(async () => {
    if (!pendingRequest?.id) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await cancelWeaponRequest(pendingRequest.id);
      setPendingRequest(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel request');
    }
  }, [pendingRequest?.id]);

  const handleAutoCloseExpired = useCallback(() => {
    if (canManageTraining) {
      handleFinishTraining();
    } else {
      setTimeout(() => refetch(), 2000);
    }
  }, [canManageTraining, handleFinishTraining, refetch]);

  // Auto-start drill handling
  useEffect(() => {
    const startDrillId = Array.isArray(params.startDrillId)
      ? params.startDrillId[0]
      : params.startDrillId;
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
          >
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
          >
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
        onAutoCloseExpired={handleAutoCloseExpired}
        openWeather={openWeather}
        userWeapon={userWeapon}
        weaponChecked={weaponChecked}
        pendingRequest={pendingRequest}
        requestingWeapon={requestingWeapon}
        canManageTraining={canManageTraining}
        onAssignWeapon={handleOpenWeaponManagement}
        onRequestWeapon={handleRequestWeapon}
        onCancelRequest={handleCancelRequest}
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
        onChangeWatchPreference={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowWatchPrompt(true);
        }}
        // Realtime status
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* Bottom Actions - Only show when action is needed */}
      {((isPlanned && canManageTraining) ||
        (isOngoing && canManageTraining && allDrillsCompleted)) && (
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.bottomGradient, { backgroundColor: colors.background }]} />
          {isPlanned && canManageTraining && (
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
                  <Text style={[styles.mainActionBtnText, { color: colors.background }]}>
                    Begin Training
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isOngoing && canManageTraining && allDrillsCompleted && (
            <TouchableOpacity
              style={[styles.mainActionBtn, { backgroundColor: colors.green }]}
              onPress={() => handleFinishTraining()}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <CheckCircle2 size={18} color="#fff" />
                  <Text style={[styles.mainActionBtnText, { color: '#fff' }]}>
                    Complete Training
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
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

      {/* Watch Control Prompt - Asked once per training */}
      <Modal
        visible={showWatchPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowWatchPrompt(false);
          setPendingDrillForWatch(null);
        }}
      >
        <View style={styles.watchPromptOverlay}>
          <View style={[styles.watchPromptCard, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.watchPromptHeader}>
              <View style={[styles.watchPromptIcon, { backgroundColor: colors.green + '20' }]}>
                <Watch size={28} color={colors.green} />
              </View>
              <Text style={[styles.watchPromptTitle, { color: colors.text }]}>
                Watch Connected
              </Text>
              <Text style={[styles.watchPromptSubtitle, { color: colors.textMuted }]}>
                {watchDevice?.name || 'Garmin Watch'}
              </Text>
            </View>

            {/* Description */}
            <View style={styles.watchPromptBody}>
              <Text style={[styles.watchPromptDescription, { color: colors.text }]}>
                How do you want to track sessions during this training?
              </Text>
              <Text style={[styles.watchPromptNote, { color: colors.textMuted }]}>
                This choice will apply to all drills in this training.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.watchPromptButtons}>
              <TouchableOpacity
                style={[styles.watchPromptBtn, { backgroundColor: colors.secondary }]}
                onPress={() => handleWatchPromptSelect(false)}
                activeOpacity={0.7}
              >
                <Smartphone size={20} color={colors.textMuted} />
                <Text style={[styles.watchPromptBtnText, { color: colors.text }]}>
                  Phone Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.watchPromptBtn, { backgroundColor: colors.green + '20' }]}
                onPress={() => handleWatchPromptSelect(true)}
                activeOpacity={0.7}
              >
                <Watch size={20} color={colors.green} />
                <Text style={[styles.watchPromptBtnText, { color: colors.green, fontWeight: '600' }]}>
                  Use Watch
                </Text>
              </TouchableOpacity>
            </View>
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
  noWeaponBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  noWeaponIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWeaponContent: {
    flex: 1,
    gap: 4,
  },
  noWeaponTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  noWeaponHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  noWeaponAction: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  noWeaponActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  insightsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  insightLabel: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  insightDivider: {
    width: 1,
    height: 32,
    alignSelf: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    // background set dynamically
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  squadContainer: {
    // Same horizontal spacing as phases
    marginHorizontal: -6,
    paddingHorizontal: 6,
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
  // Watch Prompt Modal
  watchPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  watchPromptCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
  },
  watchPromptHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  watchPromptIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  watchPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  watchPromptSubtitle: {
    fontSize: 14,
  },
  watchPromptBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  watchPromptDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  watchPromptNote: {
    fontSize: 13,
    textAlign: 'center',
  },
  watchPromptButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  watchPromptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  watchPromptBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
