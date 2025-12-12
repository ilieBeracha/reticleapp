import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getMyActivePersonalSession } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';

// Import extracted components and hooks
import { WeeklyActivityChart } from '@/components/insights';
import {
  ActivityHub,
  GreetingHeader,
  SecondaryActionsRow,
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
  const { canManageTraining } = usePermissions();
  
  // Direct store access - no useWorkspaceData() which is for team mode
  const { sessions, loading: sessionsLoading, initialized, loadPersonalSessions, createSession } = useSessionStore();
  const { loadTeams } = useTeamStore();
  const { myUpcomingTrainings, loadMyUpcomingTrainings, loadMyStats } =
    useTrainingStore();

  // Local UI state
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  
  // Track if initial load has been triggered
  const initialLoadDone = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING - Only load once on mount, not on every focus
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Only load on first mount, not on every navigation
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    
    loadPersonalSessions();
    loadMyUpcomingTrainings();
    loadMyStats();
  }, [loadPersonalSessions, loadMyUpcomingTrainings, loadMyStats]);

  useEffect(() => {
    setOnSessionCreated(() => loadPersonalSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadPersonalSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════════════════════════

  const activeSession = useMemo(() => sessions.find((s) => s.status === 'active'), [sessions]);
  const lastSession = useMemo(
    () => sessions.find((s) => s.status === 'completed'),
    [sessions]
  );
  const nextTraining = useMemo(() => {
    // Get first live or upcoming training
    const training = myUpcomingTrainings.find((t) => t.status === 'ongoing') || myUpcomingTrainings[0];
    if (!training) return undefined;
    
    // Map to ActivityHub format with team_name
    return {
      id: training.id,
      title: training.title,
      status: training.status,
      scheduled_at: training.scheduled_at,
      drill_count: training.drill_count || training.drills?.length || 0,
      team_name: training.team?.name,
    };
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
    await Promise.all([loadPersonalSessions(), loadMyUpcomingTrainings(), loadMyStats()]);
    setRefreshing(false);
  }, [loadPersonalSessions, loadMyUpcomingTrainings, loadMyStats]);

  const handleOpenActiveSession = useCallback(() => {
    if (!activeSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/activeSession?sessionId=${activeSession.id}` as any);
  }, [activeSession]);

  const handleStartSoloSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await getMyActivePersonalSession();
      if (existing) {
        router.push(`/(protected)/activeSession?sessionId=${existing.id}` as any);
        return;
      }
      const newSession = await createSession({ session_mode: 'solo' });
      router.push(`/(protected)/activeSession?sessionId=${newSession.id}` as any);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setStarting(false);
    }
  }, [starting, createSession]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  // Only show full-page loader on first load (before initialized)
  // After that, data is available even during background refreshes
  const showLoader = !initialized && sessionsLoading;

  if (showLoader) {
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

        {/* Activity Hub - Events & sessions */}
        <ActivityHub
          colors={colors}
          activeSession={activeSession}
          sessionTitle={sessionTitle}
          sessionStats={sessionStats}
          lastSession={lastSession}
          weeklyStats={weeklyStats}
          starting={starting}
          onOpenActiveSession={handleOpenActiveSession}
          onStartSolo={handleStartSoloSession}
          nextTraining={nextTraining}
          canManageTraining={canManageTraining}
        />
        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <SecondaryActionsRow colors={colors} />
        </View>

        {/* Weekly Calendar */}
        <View style={styles.sectionContainer}>
          <WeeklyActivityChart sessions={sessions} colors={colors} />
        </View>

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
