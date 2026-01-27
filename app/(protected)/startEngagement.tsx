/**
 * START ENGAGEMENT
 *
 * This is the ONLY execution entry point.
 * Users start engagements - they never "create sessions".
 *
 * Session = invisible setup container (weapon, environment)
 * Engagement = what users actually configure and run
 *
 * Flow:
 * 1. User selects goal (Grouping / Engagement)
 * 2. User configures engagement params (distance, position, rounds)
 * 3. User selects weapon (for setup)
 * 4. System auto-creates/reuses Session invisibly
 * 5. System creates Engagement with user's config
 * 6. Navigate to execution
 */

import { CaptureModePickerInline, type CaptureMode } from '@/components/session/CaptureModePicker';
import { EngagementModeToggle } from '@/components/session/creation';
import { DrillPresetPicker, PresetForm } from '@/components/shared/drills';
import { CreateWeaponFlow, WeaponPicker } from '@/components/weapons';
import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import type { DrillPreset } from '@/services/presetService';
import { createEngagement } from '@/services/session/participants';
import type { DrillGoal, EngagementMode } from '@/services/session/types';
import { deleteSession, getMyActiveSession, getOrCreateSetupSession } from '@/services/sessionService';
import { getUserWeapon, type UserWeapon } from '@/services/weaponService';
import { toSessionWeatherData } from '@/services/weather';
import { useGarminDevice, useIsGarminConnected } from '@/store/garminStore';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, CornerDownRight, Crosshair, Minus, Plus, Target } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DrillGoalType = 'grouping' | 'engagement';
type Position = 'standing' | 'kneeling' | 'prone' | 'seated' | 'other';

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'standing', label: 'Standing' },
  { value: 'kneeling', label: 'Kneeling' },
  { value: 'prone', label: 'Prone' },
  { value: 'seated', label: 'Seated' },
];

const COMMON_DISTANCES = [10, 15, 25, 50, 100, 200, 300];

export default function StartEngagementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadSessions } = useSessionStore();
  const { canManageTraining } = usePermissions();
  const isWatchConnected = useIsGarminConnected();
  const watchDevice = useGarminDevice();

  // Weather for session setup
  const { weather: openWeather } = useOpenWeather({ autoFetch: true });

  const params = useLocalSearchParams<{
    // Team context (optional)
    teamId?: string;
    trainingId?: string;
    // Pre-fill from drill/preset
    purpose?: string;
    distance?: string;
    shots?: string;
    position?: string;
    timeLimit?: string;
    drillName?: string;
    // Execution policy: how strict is the drill configuration?
    // 'locked' = must execute exactly as defined
    // 'guided' = defaults pre-filled, user may change
    // 'free' = no constraints, full freedom
    executionPolicy?: 'locked' | 'guided' | 'free';
    // Engagement mode: solo, squad, or group (from commander config)
    engagementMode?: 'solo' | 'squad' | 'group';
    // Return destination
    returnTo?: string;
    returnId?: string;
  }>();

  const teamId = params.teamId || null;
  const trainingId = params.trainingId || null;
  const isTeamContext = !!teamId;

  // Execution Policy - explicit control over configuration freedom
  // Default to 'free' for solo practice (no drill context)
  const executionPolicy = params.executionPolicy || 'free';
  const drillName = params.drillName || null;

  // Derived flags from policy
  const isConfigLocked = executionPolicy === 'locked';
  const hasPrefilledConfig = executionPolicy === 'locked' || executionPolicy === 'guided';

  // Goal is ALWAYS locked when coming from a training drill (regardless of policy)
  // The drill type (grouping/engagement) is set by commander and cannot be changed
  const isFromTrainingDrill = !!trainingId && !!params.purpose;
  const isGoalLocked = isFromTrainingDrill;

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGAGEMENT CONFIG STATE (what users actually configure)
  // ═══════════════════════════════════════════════════════════════════════════

  const [drillGoal, setDrillGoal] = useState<DrillGoalType>((params.purpose as DrillGoalType) || 'grouping');
  // Engagement mode from commander config (or default to solo)
  // Grouping drills are ALWAYS solo (enforced)
  const initialEngagementMode = params.purpose === 'grouping' ? 'solo' : params.engagementMode || 'solo';
  const [engagementMode, setEngagementMode] = useState<EngagementMode>(initialEngagementMode);

  // Debug: Log params on mount
  useEffect(() => {
    console.log('[StartEngagement] Params received:', {
      purpose: params.purpose,
      engagementMode: params.engagementMode,
      teamId: params.teamId,
      initialEngagementMode,
    });
  }, []);
  const [distance, setDistance] = useState(params.distance ? parseInt(params.distance, 10) : 25);
  const [rounds, setRounds] = useState(params.shots ? parseInt(params.shots, 10) : 5);
  const [position, setPosition] = useState<Position>((params.position as Position) || 'standing');
  const [timeLimit, setTimeLimit] = useState<number | null>(params.timeLimit ? parseInt(params.timeLimit, 10) : null);

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP STATE (for invisible Session)
  // ═══════════════════════════════════════════════════════════════════════════

  const [weapon, setWeapon] = useState<UserWeapon | null>(null);
  const [loadingWeapon, setLoadingWeapon] = useState(true);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('phone');
  const [sensitivity, setSensitivity] = useState(3.5);

  // UI state
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCreateWeapon, setShowCreateWeapon] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD DEFAULT WEAPON
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    async function loadDefaultWeapon() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's most recently used weapon
        const { data: weapons } = await supabase
          .from('user_weapons')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (weapons && weapons.length > 0) {
          const w = await getUserWeapon(weapons[0].id);
          if (w) {
            setWeapon(w);
            // Apply weapon defaults
            const config = w.category ? getCategoryConfig(w.category) : null;
            if (config) {
              setDistance(config.distances.zeroDistance);
              setPosition(config.drillDefaults.defaultPosition as Position);
            }
          }
        }
      } catch (error) {
        console.error('[StartEngagement] Failed to load weapon:', error);
      } finally {
        setLoadingWeapon(false);
      }
    }
    loadDefaultWeapon();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK FOR ACTIVE SESSION OR EXISTING SQUAD ENGAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function check() {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            if (!cancelled) setCheckingSession(false);
            return;
          }

          // Check for active squad/group engagement in this training first
          if (trainingId) {
            const { data: activeEngagements } = await supabase
              .from('engagements')
              .select(`
                id,
                session_id,
                status,
                engagement_mode,
                started_at,
                shooter_id
              `)
              .eq('training_id', trainingId)
              .in('engagement_mode', ['squad', 'group'])
              .not('status', 'in', '("completed","cancelled")')
              .order('created_at', { ascending: false })
              .limit(1);

            if (activeEngagements && activeEngagements.length > 0) {
              const engagement = activeEngagements[0];
              const isCommander = engagement.shooter_id === user.id;

              // Check if user is a participant
              const { data: participation } = await supabase
                .from('engagement_participants')
                .select('id, state')
                .eq('engagement_id', engagement.id)
                .eq('user_id', user.id)
                .maybeSingle();

              const isParticipant = !!participation && participation.state === 'joined';
              const hasStarted = !!engagement.started_at;

              // If user is commander or participant, redirect to existing engagement
              if (isCommander || isParticipant) {
                if (hasStarted) {
                  // Session in progress - go to active session
                  router.replace({
                    pathname: '/(protected)/activeSession',
                    params: {
                      sessionId: engagement.session_id,
                      engagementId: engagement.id,
                      engagementMode: engagement.engagement_mode,
                      returnTo: params.returnTo || 'trainingDetail',
                      returnId: trainingId,
                    },
                  });
                } else {
                  // Still in lobby - go to squad lobby
                  router.replace({
                    pathname: '/(protected)/squadLobby',
                    params: {
                      engagementId: engagement.id,
                      sessionId: engagement.session_id,
                      trainingId,
                      engagementMode: engagement.engagement_mode,
                    },
                  });
                }
                return;
              }
            }
          }

          // Check for any other active session (solo)
          const active = await getMyActiveSession();
          if (active) {
            Alert.alert('Active Session', 'You have an active session. Continue or start fresh?', [
              {
                text: 'Continue',
                onPress: () => {
                  router.replace({
                    pathname: '/(protected)/activeSession',
                    params: { sessionId: active.id },
                  });
                },
              },
              {
                text: 'Delete & Start New',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteSession(active.id);
                    if (!cancelled) setCheckingSession(false);
                  } catch {
                    Alert.alert('Error', 'Failed to delete session');
                    router.back();
                  }
                },
              },
              { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
            ]);
          } else {
            if (!cancelled) setCheckingSession(false);
          }
        } catch {
          if (!cancelled) setCheckingSession(false);
        }
      }

      check();
      return () => {
        cancelled = true;
      };
    }, [trainingId, params.returnTo])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED STATE
  // ═══════════════════════════════════════════════════════════════════════════

  // Grouping is ALWAYS solo - enforce canonical rule
  const effectiveEngagementMode: EngagementMode = drillGoal === 'grouping' ? 'solo' : engagementMode;

  // Squad toggle only for engagement + team context + commander
  const showSquadToggle = drillGoal === 'engagement' && isTeamContext && canManageTraining;

  const canStart = weapon !== null && distance > 0 && rounds > 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // START ENGAGEMENT (main action)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleStart = useCallback(async () => {
    if (!weapon || isSubmitting) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Safety check: Prevent creating duplicate squad/group engagement
      const isTeamMode = effectiveEngagementMode === 'squad' || effectiveEngagementMode === 'group';
      if (isTeamMode && trainingId) {
        const { data: existingEngagements } = await supabase
          .from('engagements')
          .select('id, session_id, status, started_at, shooter_id')
          .eq('training_id', trainingId)
          .in('engagement_mode', ['squad', 'group'])
          .not('status', 'in', '("completed","cancelled")')
          .limit(1);

        if (existingEngagements && existingEngagements.length > 0) {
          const existing = existingEngagements[0];
          Alert.alert(
            'Active Squad Engagement',
            'There\'s already an active squad/group engagement for this training. You\'ll be redirected to it.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (existing.started_at) {
                    router.replace({
                      pathname: '/(protected)/activeSession',
                      params: {
                        sessionId: existing.session_id,
                        engagementId: existing.id,
                        engagementMode: effectiveEngagementMode,
                      },
                    });
                  } else {
                    router.replace({
                      pathname: '/(protected)/squadLobby',
                      params: {
                        engagementId: existing.id,
                        sessionId: existing.session_id,
                        trainingId,
                        engagementMode: effectiveEngagementMode,
                      },
                    });
                  }
                },
              },
            ]
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Step 1: Get or create Session (INVISIBLE to user)
      // Session is based on setup params: weapon, environment
      const sessionWeather = toSessionWeatherData(openWeather, 'openweathermap');
      const isWatchMode = captureMode === 'watch';

      const session = await getOrCreateSetupSession({
        weapon_id: weapon.id,
        weather: sessionWeather,
        team_id: teamId,
        training_id: trainingId,
        watch_controlled: isWatchMode,
        // Drill config stored for reference (engagement params)
        drill_config: {
          drill_goal: drillGoal,
          distance_m: distance,
          rounds_per_shooter: rounds,
          position,
          // Execution policy - controls whether user can reconfigure during active session
          execution_policy: executionPolicy,
          ...(timeLimit && { time_limit_seconds: timeLimit }),
          ...(isWatchMode && { detection_sensitivity: sensitivity }),
          // Store drill name for squad lobby display
          ...(drillName && { name: drillName }),
        },
      });

      // Step 2: Create Engagement (the actual execution unit)
      // Squad/group engagements start as 'pending' (in lobby, waiting to start)
      // Solo engagements start as 'completed' (immediate execution)
      // NOTE: createEngagement auto-adds the creator as a joined participant for squad/group
      const engagement = await createEngagement({
        sessionId: session.id,
        shooterId: user.id,
        drillGoal: drillGoal as DrillGoal,
        trainingId,
        requestedMode: effectiveEngagementMode,
        status: isTeamMode ? 'pending' : 'completed',
      });

      await loadSessions();

      // ═══════════════════════════════════════════════════════════════════════
      // SQUAD/GROUP ENGAGEMENT: Navigate to lobby (invites happen there)
      // ═══════════════════════════════════════════════════════════════════════
      console.log('[StartEngagement] Navigation decision:', {
        effectiveEngagementMode,
        engagementMode,
        drillGoal,
        teamId,
        isSquadOrGroup: effectiveEngagementMode === 'squad' || effectiveEngagementMode === 'group',
        hasTeamId: !!teamId,
      });

      if ((effectiveEngagementMode === 'squad' || effectiveEngagementMode === 'group') && teamId) {
        console.log('[StartEngagement] Going to squadLobby (mode:', effectiveEngagementMode, ')');
        router.replace({
          pathname: '/(protected)/squadLobby',
          params: {
            engagementId: engagement.id,
            sessionId: session.id,
            trainingId: trainingId || undefined,
            engagementMode: effectiveEngagementMode,
          },
        });
        return;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // SOLO ENGAGEMENT: Navigate directly to active session
      // ═══════════════════════════════════════════════════════════════════════
      console.log('[StartEngagement] Going to activeSession (solo mode)');
      router.replace({
        pathname: '/(protected)/activeSession',
        params: {
          sessionId: session.id,
          engagementId: engagement.id,
          ...(params.returnTo && {
            returnTo: params.returnTo,
            returnId: params.returnId,
          }),
        },
      });
    } catch (error: any) {
      console.error('[StartEngagement] Failed:', error);
      Alert.alert('Error', error.message || 'Failed to start');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    weapon,
    drillGoal,
    drillName,
    effectiveEngagementMode,
    distance,
    rounds,
    position,
    timeLimit,
    teamId,
    trainingId,
    openWeather,
    captureMode,
    sensitivity,
    loadSessions,
    params,
    isSubmitting,
    executionPolicy,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleGoalChange = useCallback((goal: DrillGoalType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrillGoal(goal);
    // Reset squad mode when switching to grouping
    if (goal === 'grouping') {
      setEngagementMode('solo');
    }
  }, []);

  const handleWeaponSelect = useCallback((w: UserWeapon) => {
    setWeapon(w);
    setShowWeaponPicker(false);
    // Apply weapon defaults
    const config = w.category ? getCategoryConfig(w.category) : null;
    if (config) {
      setDistance(config.distances.zeroDistance);
      setPosition(config.drillDefaults.defaultPosition as Position);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleWeaponCreated = useCallback(
    async (weaponId: string) => {
      setShowCreateWeapon(false);
      try {
        const w = await getUserWeapon(weaponId);
        if (w) handleWeaponSelect(w);
      } catch (error) {
        console.error('[StartEngagement] Failed to fetch weapon:', error);
      }
    },
    [handleWeaponSelect]
  );

  const handlePresetSelect = useCallback((preset: DrillPreset) => {
    setShowPresetPicker(false);
    setDrillGoal(preset.drill_goal as DrillGoalType);
    setDistance(preset.distance_m);
    setRounds(preset.rounds_per_shooter);
    if ((preset as any).position) setPosition((preset as any).position as Position);
    if (preset.time_limit_seconds) setTimeLimit(preset.time_limit_seconds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handlePresetCreated = useCallback(
    (preset: DrillPreset) => {
      setShowPresetForm(false);
      handlePresetSelect(preset);
    },
    [handlePresetSelect]
  );

  const adjustDistance = useCallback((delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDistance((d) => Math.max(1, d + delta));
  }, []);

  const adjustRounds = useCallback((delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRounds((r) => Math.max(1, r + delta));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (checkingSession) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.textMuted} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Ionicons name="close" size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {drillGoal === 'grouping' ? 'Run Grouping' : 'Start Engagement'}
        </Text>

        {!isConfigLocked && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.card }]}
            onPress={() => setShowPresetPicker(true)}
          >
            <Ionicons name="bookmark-outline" size={16} color={colors.text} />
          </TouchableOpacity>
        )}
        {isConfigLocked && <View style={{ width: 36 }} />}
      </View>

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══════════════════════════════════════════════════════════════════════════
              LOCKED CONFIG: Show read-only overview instead of disabled form
              ═══════════════════════════════════════════════════════════════════════════ */}
          {isConfigLocked && drillName ? (
            <>
              {/* Drill Overview Card */}
              <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.overviewHeader}>
                  <View style={[styles.overviewIcon, { backgroundColor: colors.blue + '15' }]}>
                    <Target size={20} color={colors.blue} />
                  </View>
                  <View style={styles.overviewHeaderText}>
                    <Text style={[styles.overviewTitle, { color: colors.text }]}>{drillName}</Text>
                    <Text style={[styles.overviewSubtitle, { color: colors.textMuted }]}>
                      Configuration locked by commander
                    </Text>
                  </View>
                </View>

                <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />

                <View style={styles.overviewGrid}>
                  {/* Goal */}
                  <View style={styles.overviewItem}>
                    <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Goal</Text>
                    <View style={styles.overviewValueRow}>
                      {drillGoal === 'grouping' ? (
                        <Crosshair size={14} color={colors.primary} />
                      ) : (
                        <Target size={14} color={colors.orange} />
                      )}
                      <Text style={[styles.overviewValue, { color: colors.text }]}>
                        {drillGoal === 'grouping' ? 'Grouping' : 'Engagement'}
                      </Text>
                    </View>
                  </View>

                  {/* Mode (if engagement) */}
                  {drillGoal === 'engagement' && (
                    <View style={styles.overviewItem}>
                      <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Mode</Text>
                      <Text style={[styles.overviewValue, { color: colors.text }]}>
                        {effectiveEngagementMode === 'squad' ? 'Squad' : 'Solo'}
                      </Text>
                    </View>
                  )}

                  {/* Distance */}
                  <View style={styles.overviewItem}>
                    <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Distance</Text>
                    <Text style={[styles.overviewValue, { color: colors.text }]}>{distance}m</Text>
                  </View>

                  {/* Rounds */}
                  <View style={styles.overviewItem}>
                    <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Rounds</Text>
                    <Text style={[styles.overviewValue, { color: colors.text }]}>{rounds} rds</Text>
                  </View>

                  {/* Position */}
                  <View style={styles.overviewItem}>
                    <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Position</Text>
                    <Text style={[styles.overviewValue, { color: colors.text }]}>
                      {POSITIONS.find((p) => p.value === position)?.label || position}
                    </Text>
                  </View>

                  {/* Time Limit (if set) */}
                  {timeLimit && (
                    <View style={styles.overviewItem}>
                      <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Time Limit</Text>
                      <Text style={[styles.overviewValue, { color: colors.text }]}>{timeLimit}s</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Weapon Selection (always editable) */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT YOUR WEAPON</Text>
                {loadingWeapon ? (
                  <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>Loading...</Text>
                  </View>
                ) : weapon ? (
                  <TouchableOpacity
                    style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowWeaponPicker(true)}
                  >
                    <View style={[styles.weaponIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Crosshair size={20} color={colors.primary} />
                    </View>
                    <View style={styles.weaponInfo}>
                      <Text style={[styles.weaponName, { color: colors.text }]}>{weapon.name}</Text>
                      <Text style={[styles.weaponHint, { color: colors.textMuted }]}>Tap to change</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.weaponEmpty, { backgroundColor: colors.card, borderColor: colors.primary }]}
                    onPress={() => setShowWeaponPicker(true)}
                  >
                    <View style={[styles.weaponIcon, { backgroundColor: colors.primary + '10' }]}>
                      <Target size={24} color={colors.primary} />
                    </View>
                    <View style={styles.weaponInfo}>
                      <Text style={[styles.weaponName, { color: colors.text }]}>Select Weapon</Text>
                      <Text style={[styles.weaponHint, { color: colors.textMuted }]}>Required to start</Text>
                    </View>
                    <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                      <Plus size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════════════════════
                  EDITABLE CONFIG: Normal form (free or guided policy)
                  ═══════════════════════════════════════════════════════════════════════════ */}

              {/* Guided Drill Banner */}
              {executionPolicy === 'guided' && drillName && (
                <View
                  style={[styles.lockedBanner, { backgroundColor: colors.green + '15', borderColor: colors.green }]}
                >
                  <Target size={16} color={colors.green} />
                  <View style={styles.lockedBannerText}>
                    <Text style={[styles.lockedTitle, { color: colors.text }]}>{drillName}</Text>
                    <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                      Guided drill — you may adjust settings
                    </Text>
                  </View>
                </View>
              )}

              {/* Goal Toggle - locked when from training drill (any policy) */}
              <View style={[styles.section, isGoalLocked && styles.lockedSection]}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>GOAL</Text>
                <View
                  style={[
                    styles.goalToggle,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: isGoalLocked ? 0.6 : 1 },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.goalOption, drillGoal === 'grouping' && { backgroundColor: colors.primary }]}
                    onPress={() => !isGoalLocked && handleGoalChange('grouping')}
                    disabled={isGoalLocked}
                    activeOpacity={isGoalLocked ? 1 : 0.7}
                  >
                    <Crosshair size={16} color={drillGoal === 'grouping' ? '#fff' : colors.textMuted} />
                    <Text style={[styles.goalText, { color: drillGoal === 'grouping' ? '#fff' : colors.text }]}>
                      Grouping
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.goalOption, drillGoal === 'engagement' && { backgroundColor: colors.orange }]}
                    onPress={() => !isGoalLocked && handleGoalChange('engagement')}
                    disabled={isGoalLocked}
                    activeOpacity={isGoalLocked ? 1 : 0.7}
                  >
                    <Target size={16} color={drillGoal === 'engagement' ? '#fff' : colors.textMuted} />
                    <Text style={[styles.goalText, { color: drillGoal === 'engagement' ? '#fff' : colors.text }]}>
                      Engagement
                    </Text>
                  </TouchableOpacity>
                </View>
                {isGoalLocked && (
                  <Text style={[styles.lockedHint, { color: colors.textMuted }]}>Drill type set by commander</Text>
                )}
              </View>

              {/* Weapon (for setup - invisible session param) */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>WEAPON</Text>
                {loadingWeapon ? (
                  <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={[styles.weaponLoadingText, { color: colors.textMuted }]}>Loading...</Text>
                  </View>
                ) : weapon ? (
                  <TouchableOpacity
                    style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowWeaponPicker(true)}
                  >
                    <View style={[styles.weaponIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Crosshair size={20} color={colors.primary} />
                    </View>
                    <View style={styles.weaponInfo}>
                      <Text style={[styles.weaponName, { color: colors.text }]}>{weapon.name}</Text>
                      <Text style={[styles.weaponHint, { color: colors.textMuted }]}>Tap to change</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.weaponEmpty, { backgroundColor: colors.card, borderColor: colors.primary }]}
                    onPress={() => setShowWeaponPicker(true)}
                  >
                    <View style={[styles.weaponIcon, { backgroundColor: colors.primary + '10' }]}>
                      <Target size={24} color={colors.primary} />
                    </View>
                    <View style={styles.weaponInfo}>
                      <Text style={[styles.weaponName, { color: colors.text }]}>Select Weapon</Text>
                      <Text style={[styles.weaponHint, { color: colors.textMuted }]}>Required</Text>
                    </View>
                    <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                      <Plus size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Squad Toggle - only for engagement */}
              {showSquadToggle && (
                <View style={styles.section}>
                  <EngagementModeToggle value={engagementMode} onChange={setEngagementMode} disabled={!weapon} />
                </View>
              )}

              {/* Distance */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DISTANCE (meters)</Text>
                <View style={[styles.counterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustDistance(-5)}
                  >
                    <Minus size={18} color={colors.text} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.counterInput, { color: colors.text }]}
                    value={String(distance)}
                    onChangeText={(t) => setDistance(parseInt(t, 10) || 0)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={[styles.counterUnit, { color: colors.textMuted }]}>m</Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustDistance(5)}
                  >
                    <Plus size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.quickDistances}>
                  {COMMON_DISTANCES.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.quickBtn,
                        { backgroundColor: distance === d ? colors.primary : colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDistance(d);
                      }}
                    >
                      <Text style={[styles.quickBtnText, { color: distance === d ? '#fff' : colors.text }]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rounds */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ROUNDS</Text>
                <View style={[styles.counterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustRounds(-1)}
                  >
                    <Minus size={18} color={colors.text} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.counterInput, { color: colors.text }]}
                    value={String(rounds)}
                    onChangeText={(t) => setRounds(parseInt(t, 10) || 0)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={[styles.counterUnit, { color: colors.textMuted }]}>rds</Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustRounds(1)}
                  >
                    <Plus size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Position */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>POSITION</Text>
                <View style={styles.positionRow}>
                  {POSITIONS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.positionBtn,
                        {
                          backgroundColor: position === p.value ? colors.primary : colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPosition(p.value);
                      }}
                    >
                      <Text style={[styles.positionText, { color: position === p.value ? '#fff' : colors.text }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Capture Mode */}
          {isWatchConnected && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RECORDING</Text>
              <CaptureModePickerInline
                selectedMode={captureMode}
                onModeChange={setCaptureMode}
                sensitivity={sensitivity}
                onSensitivityChange={setSensitivity}
                showSensitivity
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        {!weapon && <Text style={[styles.hint, { color: colors.orange }]}>Select a weapon to continue</Text>}
        <TouchableOpacity
          style={[
            styles.startBtn,
            { backgroundColor: canStart ? colors.primary : colors.secondary, opacity: canStart ? 1 : 0.5 },
          ]}
          onPress={handleStart}
          disabled={!canStart || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CornerDownRight size={18} color="#fff" fill="#fff" />
              <Text style={styles.startBtnText}>
                {drillGoal === 'grouping'
                  ? 'Run Grouping'
                  : effectiveEngagementMode === 'squad'
                    ? 'Start Squad Engagement'
                    : effectiveEngagementMode === 'group'
                      ? 'Start Group Engagement'
                      : 'Start Engagement'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <Modal
        visible={showWeaponPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeaponPicker(false)}
      >
        <WeaponPicker
          selectedWeaponId={weapon?.id || null}
          onSelect={handleWeaponSelect}
          onClose={() => setShowWeaponPicker(false)}
          onAddNew={() => {
            setShowWeaponPicker(false);
            setShowCreateWeapon(true);
          }}
        />
      </Modal>

      <Modal
        visible={showCreateWeapon}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateWeapon(false)}
      >
        <CreateWeaponFlow
          onComplete={handleWeaponCreated}
          onCancel={() => {
            setShowCreateWeapon(false);
            setShowWeaponPicker(true);
          }}
        />
      </Modal>

      <Modal
        visible={showPresetPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPresetPicker(false)}
      >
        <DrillPresetPicker
          onSelect={handlePresetSelect}
          onCreateNew={() => {
            setShowPresetPicker(false);
            setShowPresetForm(true);
          }}
          onClose={() => setShowPresetPicker(false)}
          filterByPurpose={drillGoal}
        />
      </Modal>

      <Modal
        visible={showPresetForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPresetForm(false)}
      >
        <PresetForm
          onComplete={handlePresetCreated}
          onCancel={() => {
            setShowPresetForm(false);
            setShowPresetPicker(true);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  lockedSection: { opacity: 0.8 },

  // Locked drill banner
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  lockedBannerText: { flex: 1, gap: 2 },
  lockedTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  lockedHint: { fontSize: 12, fontWeight: '500' },

  // Overview card (for locked drills)
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewHeaderText: {
    flex: 1,
    gap: 2,
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  overviewSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  overviewDivider: {
    height: 1,
    marginVertical: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewItem: {
    minWidth: '45%',
    gap: 4,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewValue: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Goal toggle
  goalToggle: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  goalOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 9,
  },
  goalText: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },

  // Weapon
  weaponCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  weaponEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 10,
  },
  weaponIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  weaponInfo: { flex: 1, gap: 2 },
  weaponName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },
  weaponHint: { fontSize: 11, fontWeight: '500' },
  weaponLoadingText: { fontSize: 13, fontWeight: '500' },
  addBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Counter
  counterRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 8, gap: 8 },
  counterBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  counterInput: { flex: 1, fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  counterUnit: { fontSize: 14, fontWeight: '500', marginRight: 8 },

  // Quick distances
  quickDistances: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontWeight: '600' },

  // Position
  positionRow: { flexDirection: 'row', gap: 8 },
  positionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  positionText: { fontSize: 12, fontWeight: '600' },

  // Bottom
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  hint: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginBottom: 10 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  startBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
});
