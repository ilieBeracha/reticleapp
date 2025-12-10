import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { getMyActivePersonalSession } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTrainingStore } from '@/store/trainingStore';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

// Import extracted components and hooks
import { WeeklyActivityChart } from '@/components/insights';
import {
  GreetingHeader,
  RecentSessionsSection,
  SecondaryActionsRow,
  StatusDial,
  UpcomingTrainingsSection,
  useDialState,
  useSessionStats,
  useSessionTimer,
  useWeeklyStats,
} from './personal-home';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PersonalHomePage() {
  const colors = useColors();
  const { fullName } = useAppContext();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();
  const { sessions, sessionsLoading, loadTeams } = useWorkspaceData();
  const { loadSessions, createSession } = useSessionStore();
  const { myUpcomingTrainings, loadingMyTrainings, loadMyUpcomingTrainings, loadMyStats } =
    useTrainingStore();

  // Local UI state
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  useFocusEffect(
    useCallback(() => {
      loadSessions();
      loadMyUpcomingTrainings();
      loadMyStats();
    }, [loadSessions, loadMyUpcomingTrainings, loadMyStats])
  );

  useEffect(() => {
    setOnSessionCreated(() => loadSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════════════════════════

  const activeSession = useMemo(() => sessions.find((s) => s.status === 'active'), [sessions]);
  const recentSessions = useMemo(
    () => sessions.filter((s) => s.status === 'completed').slice(0, 4),
    [sessions]
  );
  const nextTraining = useMemo(() => {
    // Get first live or upcoming training
    return myUpcomingTrainings.find((t) => t.status === 'ongoing') || myUpcomingTrainings[0];
  }, [myUpcomingTrainings]);
  const lastSession = recentSessions[0];
  const displaySession = activeSession || lastSession;
  const sessionTitle = displaySession
    ? displaySession.training_title || displaySession.drill_name || 'Freestyle Session'
    : 'No sessions yet';

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  // Timer for active session
  const { elapsed } = useSessionTimer(activeSession);

  // Session stats (targets, shots, accuracy)
  const { sessionStats, currentAccuracy } = useSessionStats(activeSession);

  // Weekly aggregated stats
  const weeklyStats = useWeeklyStats(sessions, activeSession);

  // Dial mode state and navigation
  const {
    activeDialMode,
    currentModeConfig,
    dialValue,
    dialProgress,
    modeCount,
    currentModeIndex,
    handlePrevMode,
    handleNextMode,
  } = useDialState({
    activeSession,
    elapsed,
    sessionStats,
    currentAccuracy,
    weeklyStats,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadSessions(), loadMyUpcomingTrainings(), loadMyStats()]);
    setRefreshing(false);
  }, [loadSessions, loadMyUpcomingTrainings, loadMyStats]);

  const handleStart = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStarting(true);
    try {
      const existing = await getMyActivePersonalSession();
      const sessionId = existing?.id || (await createSession({ session_mode: 'solo' })).id;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/(protected)/activeSession?sessionId=${sessionId}` as any);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setStarting(false);
    }
  }, [createSession]);

  const handleResume = useCallback(() => {
    if (!activeSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/activeSession?sessionId=${activeSession.id}` as any);
  }, [activeSession]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const isLoading = sessionsLoading || loadingMyTrainings;

  if (isLoading && sessions.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const firstName = fullName?.split(' ')[0] || 'User';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <GreetingHeader firstName={firstName} colors={colors} />
        {/* Status Dial - Always visible with session action */}
        <StatusDial
          colors={colors}
          activeSession={activeSession}
          displaySession={displaySession}
          sessionTitle={sessionTitle}
          sessionStats={sessionStats}
          weeklyStats={weeklyStats}
          currentModeConfig={currentModeConfig}
          dialValue={dialValue}
          dialProgress={dialProgress}
          modeCount={modeCount}
          currentModeIndex={currentModeIndex}
          activeDialMode={activeDialMode}
          onPrevMode={handlePrevMode}
          onNextMode={handleNextMode}
          elapsed={elapsed}
          starting={starting}
          onStart={handleStart}
          onResume={handleResume}
          nextTraining={nextTraining}
        />

        {/* Weekly Activity Chart */}
        <View style={styles.chartSection}>
          <WeeklyActivityChart sessions={sessions} colors={colors} />
        </View>

        {/* Secondary Actions */}
        <View style={styles.section}>
          <SecondaryActionsRow colors={colors} />
        </View>

        {/* Upcoming Trainings */}
        <UpcomingTrainingsSection colors={colors} trainings={myUpcomingTrainings} />

        {/* Recent Sessions */}
        <RecentSessionsSection colors={colors} sessions={recentSessions} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
});

export default PersonalHomePage;
