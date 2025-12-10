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
  Text,
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
  useSessionStats,
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
  const lastSession = recentSessions[0];
  const nextTraining = useMemo(() => {
    // Get first live or upcoming training
    return myUpcomingTrainings.find((t) => t.status === 'ongoing') || myUpcomingTrainings[0];
  }, [myUpcomingTrainings]);
  const sessionTitle = activeSession
    ? activeSession.training_title || activeSession.drill_name || 'Freestyle'
    : '';

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  // Session stats (targets, shots, hits)
  const { sessionStats } = useSessionStats(activeSession);

  // Weekly aggregated stats
  const weeklyStats = useWeeklyStats(sessions, activeSession);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadSessions(), loadMyUpcomingTrainings(), loadMyStats()]);
    setRefreshing(false);
  }, [loadSessions, loadMyUpcomingTrainings, loadMyStats]);

  const handleStartSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await getMyActivePersonalSession();
      if (existing) {
        router.push(`/(protected)/activeSession?sessionId=${existing.id}` as any);
      } else {
        const newSession = await createSession({ session_mode: 'solo' });
        router.push(`/(protected)/activeSession?sessionId=${newSession.id}` as any);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setStarting(false);
    }
  }, [starting, createSession]);

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
        {/* Action Cards */}
        <StatusDial
          colors={colors}
          activeSession={activeSession}
          sessionTitle={sessionTitle}
          sessionStats={sessionStats}
          weeklyStats={weeklyStats}
          lastSession={lastSession}
          starting={starting}
          onStart={handleStartSession}
          nextTraining={nextTraining}
        />

        {/* Activity Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACTIVITY</Text>
          <WeeklyActivityChart sessions={sessions} colors={colors} />
        </View>

        {/* Quick Actions Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
          <SecondaryActionsRow colors={colors} />
        </View>

        {/* Upcoming Trainings - has its own title */}
        <UpcomingTrainingsSection colors={colors} trainings={myUpcomingTrainings} />

        {/* Recent Sessions - has its own title */}
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
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
});

export default PersonalHomePage;
