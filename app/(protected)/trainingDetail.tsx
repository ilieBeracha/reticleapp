/**
 * Training Detail - Story Mode
 *
 * A narrative journey through training with phases:
 * Execution → Debrief
 *
 * Each phase is a chapter in the training story, connected by a vertical timeline.
 */
import {
  useTrainingActions,
  useTrainingDetail,
} from '@/components/training';
import {
  AddDrillModal,
  CommanderActionsSheet,
  DebriefPhaseContent,
  ExecutionPhaseContent,
  getPhaseNarrativeText,
  getPhaseStatus,
  PhaseSection,
  SquadStatusContent,
  StartTrainingSheet,
  TrainingHero,
  TrainingSettingsModal,
} from '@/components/training/detail';
import { StartDrillSheet } from '@/components/training/StartDrillSheet';
import { WeaponAssignmentManager } from '@/components/weapons';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
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
import { getTeamMembers } from '@/services/teamService';
import { addDrill } from '@/services/trainingService';
import {
  getAssignedWeapons,
  getOrCreatePersonalProfile,
  type UserWeapon,
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
  CheckCircle2,
  MoreHorizontal,
  Play,
  Smartphone,
  Target,
  Users,
  Watch,
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

const HEADER_HEIGHT = 180;

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
  canManageTraining,
  onAssignWeapon,
  phaseStatus,
  completedCount,
  drills,
  isPlanned,
  isOngoing,
  isFinished,
  drillProgress,
  teamSessions,
  sessionsByDrill,
  quickStartingDrillId,
  startingDrillId,
  onStartDrill,
  onAddDrill,
  onBack,
  onShowCommanderActions,
  // Watch preference props
  isWatchConnected,
  trainingWatchPreference,
  onChangeWatchPreference,
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
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [1.5, 1, 1]
          ),
        },
      ],
      opacity: interpolate(
        scrollOffset.value,
        [0, HEADER_HEIGHT * 0.8],
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

        {/* Quick Stats - Colored Chips */}
        <View style={styles.chipsRow}>
          <View style={[styles.chip, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.chipText, { color: colors.primary }]}>
              {completedCount}/{drills.length} drills
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: userWeapon ? colors.green + '15' : colors.orange + '15' },
            ]}
            onPress={!userWeapon && canManageTraining ? onAssignWeapon : undefined}
            disabled={!!userWeapon || !canManageTraining}
          >
            <Text
              style={[styles.chipText, { color: userWeapon ? colors.green : colors.orange }]}
              numberOfLines={1}
            >
              {userWeapon ? userWeapon.name : 'No weapon'}
            </Text>
          </TouchableOpacity>

          {/* Watch/Phone mode chip - only show when ongoing and preference is set */}
          {isOngoing && isWatchConnected && trainingWatchPreference !== null && (
            <TouchableOpacity
              style={[
                styles.chip,
                styles.chipWithIcon,
                { backgroundColor: trainingWatchPreference ? colors.green + '15' : colors.secondary },
              ]}
              onPress={onChangeWatchPreference}
              activeOpacity={0.7}
            >
              {trainingWatchPreference ? (
                <Watch size={12} color={colors.green} />
              ) : (
                <Smartphone size={12} color={colors.textMuted} />
              )}
              <Text
                style={[
                  styles.chipText,
                  { color: trainingWatchPreference ? colors.green : colors.textMuted },
                ]}
              >
                {trainingWatchPreference ? 'Watch' : 'Phone'}
              </Text>
            </TouchableOpacity>
          )}

          {openWeather?.temperatureC != null && (
            <View style={[styles.chip, { backgroundColor: colors.blue + '15' }]}>
              <Text style={[styles.chipText, { color: colors.blue }]}>
                {Math.round(openWeather.temperatureC)}°C
              </Text>
            </View>
          )}

          {training.team && (
            <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.chipText, { color: colors.textMuted }]}>
                {training.team.name}
              </Text>
            </View>
          )}

          <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.chipText, { color: colors.textMuted }]}>
              {format(new Date(training.scheduled_at), 'MMM d')}
            </Text>
          </View>
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
        <View style={styles.phasesContainer}>
          {/* PHASE 1: EXECUTION */}
          <PhaseSection
            phase="execution"
            title="The Range"
            subtitle={getPhaseNarrativeText('execution', phaseStatus.execution, {
              completedDrills: completedCount,
              totalDrills: drills.length,
              isPlanned,
            })}
            status={phaseStatus.execution}
            colors={colors}
            defaultExpanded={isOngoing}
          >
            <ExecutionPhaseContent
              training={training}
              drillProgress={drillProgress}
              teamSessions={teamSessions}
              sessionsByDrill={sessionsByDrill}
              colors={colors}
              canManageTraining={canManageTraining}
              startingDrillId={quickStartingDrillId || startingDrillId}
              onStartDrill={onStartDrill}
              onAddDrill={onAddDrill}
              userWeapon={userWeapon}
            />
          </PhaseSection>

          {/* PHASE 2: DEBRIEF */}
          <PhaseSection
            phase="debrief"
            title="After Action"
            subtitle={getPhaseNarrativeText('debrief', phaseStatus.debrief)}
            status={phaseStatus.debrief}
            isLast
            colors={colors}
            defaultExpanded={isFinished}
          >
            <DebriefPhaseContent
              training={training}
              drillProgress={drillProgress}
              colors={colors}
              canManageTraining={canManageTraining}
            />
          </PhaseSection>
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

  // Add Drill state
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [availableDrills, setAvailableDrills] = useState<Drill[]>([]);
  const [loadingDrills, setLoadingDrills] = useState(false);
  const [addingDrill, setAddingDrill] = useState(false);
  const [drillSearch, setDrillSearch] = useState('');

  // Weapon Assignment state
  const [showWeaponAssignment, setShowWeaponAssignment] = useState(false);
  const [teamMembers, setTeamMembers] = useState<
    { id: string; full_name: string; avatar_url?: string | null }[]
  >([]);

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

  // Phase status calculation
  const phaseStatus = useMemo(() => {
    return training ? getPhaseStatus(training.status) : getPhaseStatus('planned');
  }, [training?.status]);

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

  // Load user's assigned weapon for this training's team
  useEffect(() => {
    if (!training?.team_id || !session?.user?.id) return;
    if (!isMountedRef.current) return;

    let cancelled = false;
    async function loadWeapon() {
      try {
        const assigned = await getAssignedWeapons(training!.team_id!, session!.user!.id);
        if (!cancelled && isMountedRef.current && assigned.length > 0) {
          const profile = await getOrCreatePersonalProfile(assigned[0].id);
          if (!cancelled && isMountedRef.current) setUserWeapon(profile);
        }
      } catch (e) {
        console.error('Failed to load assigned weapon', e);
      }
    }
    loadWeapon();
    return () => {
      cancelled = true;
    };
  }, [training?.team_id, session?.user?.id]);

  // Load Team Data if needed
  const shouldLoadTeamData =
    !!training?.id &&
    canManageTraining &&
    (training?.status === 'ongoing' || training?.status === 'finished');

  const loadTeamProgress = useCallback(async () => {
    if (!training?.id || !canManageTraining) return;
    // Prevent duplicate loads
    if (isLoadingTeamRef.current || !isMountedRef.current) return;

    isLoadingTeamRef.current = true;
    setLoadingTeamProgress(true);
    try {
      const sessions = await getTrainingSessionsWithStats(training.id);
      if (isMountedRef.current) setTeamSessions(sessions);
    } catch (error) {
      console.error('[TrainingDetail] Failed to load team progress:', error);
    } finally {
      if (isMountedRef.current) setLoadingTeamProgress(false);
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

  const handleOpenWeaponAssignment = useCallback(async () => {
    if (!training?.team_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const members = await getTeamMembers(training.team_id);
      setTeamMembers(
        members.map((m) => ({
          id: m.user_id,
          full_name: m.profile?.full_name || 'Unknown',
          avatar_url: m.profile?.avatar_url,
        }))
      );
      setShowWeaponAssignment(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load team members.');
    }
  }, [training?.team_id]);

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
        canManageTraining={canManageTraining}
        onAssignWeapon={() => setShowWeaponAssignment(true)}
        phaseStatus={phaseStatus}
        completedCount={completedCount}
        drills={drills}
        isPlanned={isPlanned}
        isOngoing={isOngoing}
        isFinished={isFinished}
        drillProgress={drillProgress}
        teamSessions={teamSessions}
        sessionsByDrill={sessionsByDrill}
        quickStartingDrillId={quickStartingDrillId}
        startingDrillId={startingDrillId}
        onStartDrill={handleStartDrill}
        onAddDrill={handleOpenAddDrill}
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
        onAssignWeapon={handleOpenWeaponAssignment}
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

      <Modal
        visible={showWeaponAssignment}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponAssignment(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {training?.team_id && (
            <WeaponAssignmentManager
              teamId={training.team_id}
              teamMembers={teamMembers}
              onClose={() => setShowWeaponAssignment(false)}
            />
          )}
        </View>
      </Modal>

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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phasesContainer: {
    marginHorizontal: -6,
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
  modalContainer: {
    flex: 1,
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
