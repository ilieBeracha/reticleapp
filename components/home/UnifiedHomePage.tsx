import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { deleteSession, getMyActivePersonalSession, getRecentSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BaseAvatar } from '../BaseAvatar';
import { SectionHeader } from './_shared/SectionHeader';
import HeroSummaryCard from './cards/HeroSummaryCard';
import { AggregatedStatsCard } from './unified/sections/AggregatedStatsCard';
import { EmptyState } from './unified/sections/EmptyState';
import { WeeklyHighlightsCard } from './unified/sections/WeeklyHighlightsCard';
import { styles } from './unified/styles';
import { ActivityTimeline } from './widgets';

function TitleHeader({
  title,
  action,
  actionText,
  colors,
}: {
  title: string;
  action?: () => void;
  actionText?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ marginBottom: 12, marginTop: 4 }}>
      <SectionHeader
        title={<Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14 }]}>{title}</Text>}
        right={
          action && actionText ? (
            <TouchableOpacity onPress={action}>
              <Text style={[styles.seeAllText, { color: colors.indigo, fontSize: 12 }]}>{actionText}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO SUMMARY CARD - Unified personal overview
// ═══════════════════════════════════════════════════════════════════════════



// Page sections/cards were extracted into `components/home/unified/*`.

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function UnifiedHomePage() {
  const colors = useColors();
  const { profileFullName, profileAvatarUrl, user } = useAuth();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profileFullName?.split(' ')[0] || 'Shooter';
  const email = user?.email;
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url;
  const fallbackInitial = profileFullName?.charAt(0)?.toUpperCase() ?? email?.charAt(0)?.toUpperCase() ?? '?';

  // Stores
  const { sessions, loading: sessionsLoading, initialized } = useSessionStore();
  const { teams, loadTeams } = useTeamStore();
  const { myUpcomingTrainings, myStats, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionWithDetails[]>([]);
  const [loadingAllSessions, setLoadingAllSessions] = useState(true);
  const initialLoadDone = useRef(false);

  // Load recent sessions (personal + team) for unified view - OPTIMIZED with SQL limits
  const loadAllSessions = useCallback(async () => {
    try {
      // Fetch only last 7 days of sessions with a reasonable limit
      // Active sessions are always included regardless of date
      const sessions = await getRecentSessionsWithStats({ days: 7, limit: 20 });
      setAllSessions(sessions);
    } catch (error) {
      console.error('Failed to load all sessions:', error);
    } finally {
      setLoadingAllSessions(false);
    }
  }, []);

  // Use useFocusEffect to refresh data when screen regains focus
  // This ensures data is fresh when navigating back from completing a session
  useFocusEffect(
    useCallback(() => {
      // Only do background refresh if already loaded once (avoid double-loading on initial mount)
      if (initialLoadDone.current) {
        // Background refresh - don't reset loadingAllSessions to avoid flashing
        loadAllSessions();
        loadMyUpcomingTrainings();
        loadMyStats();
        return;
      }
      
      initialLoadDone.current = true;
      loadAllSessions();
      loadMyUpcomingTrainings();
      loadMyStats();
      loadTeams();
    }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams])
  );

  useEffect(() => {
    setOnSessionCreated(() => loadAllSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadAllSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // Derived data
  const hasTeams = teams.length > 0;
  const activeSession = useMemo(
    () => allSessions.find((s) => s.status === 'active') || null,
    [allSessions]
  );
  const upcomingTrainings = useMemo(() => {
    return myUpcomingTrainings.filter((t) => t.status === 'planned' || t.status === 'ongoing').slice(0, 5);
  }, [myUpcomingTrainings]);
  const hasActivity = allSessions.length > 0 || upcomingTrainings.length > 0;

  // Sessions are already filtered to last 7 days at SQL level by getRecentSessionsWithStats()
  // No client-side filtering needed - just filter completed for weekly stats display
  const completedSessions = useMemo(() => {
    return allSessions.filter((s) => s.status === 'completed');
  }, [allSessions]);

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadAllSessions(), loadMyUpcomingTrainings(), loadMyStats(), loadTeams()]);
    setRefreshing(false);
  }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams]);

  const handleOpenActiveSession = useCallback(() => {
    if (!activeSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/activeSession?sessionId=${activeSession.id}` );
  }, [activeSession]);

  const handleHeroPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeSession) {
      router.push(`/(protected)/activeSession?sessionId=${activeSession.id}`);
    } else if (hasTeams) {
      router.push('/(protected)/(tabs)/trainings');
    } else {
      handleStartSoloSession();
    }
  }, [activeSession, hasTeams]);

  const handleStartSoloSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Check for existing active session first
      const existing = await getMyActivePersonalSession();
      if (existing) {
        setStarting(false);
        Alert.alert(
          'Active Session',
          `You have an active session${existing.drill_name ? ` for "${existing.drill_name}"` : ''}. What would you like to do?`,
          [
            {
              text: 'Continue',
              onPress: () => {
                router.push(`/(protected)/activeSession?sessionId=${existing.id}`);
              },
            },
            {
              text: 'Delete & Start New',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteSession(existing.id);
                  await loadAllSessions();
                  router.push('/(protected)/createSession');
                } catch (err) {
                  console.error('Failed to delete session:', err);
                  Alert.alert('Error', 'Failed to delete session');
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
      // Drill-first: route to drill selection screen
      router.push('/(protected)/createSession');
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setStarting(false);
    }
  }, [starting, loadAllSessions]);

  const handleOpenSessionDetail = useCallback((session: SessionWithDetails) => {
    router.push(`/(protected)/sessionDetail?sessionId=${session.id}`);
  }, []);

  // Show loading spinner when data is loading AND we have no sessions to display
  const shouldShowLoading = (loadingAllSessions && allSessions.length === 0) || 
                            (!initialized && sessionsLoading);
  
  if (shouldShowLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={[styles.greetingAvatar, { backgroundColor: colors.secondary }]}>
            {avatarUrl ? (
              <BaseAvatar source={{ uri: avatarUrl }} fallbackText={fallbackInitial} size="sm" borderWidth={0} />
            ) : (
              <Text style={[styles.greetingAvatarText, { color: colors.text }]}>{fallbackInitial}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.greetingText, { color: colors.textMuted }]}>{getGreeting()},</Text>
            <Text style={[styles.greetingName, { color: colors.text }]}>{firstName}</Text>
          </View>
        </View>

        {/* Hero Summary */}
        <View style={styles.section}>
          <HeroSummaryCard
            colors={colors}
            upcomingCount={upcomingTrainings.length}
            allSessions={allSessions}
            activeSession={activeSession}
            hasTeams={hasTeams}
            teamCount={teams.length}
            onPress={handleHeroPress}
          />
        </View>

        {/* Show empty state or activity */}
        {!hasActivity && !activeSession ? (
          <EmptyState colors={colors} onStartPractice={handleStartSoloSession} starting={starting} />
        ) : (
          <>
            {/* Side-by-side cards */}
            <View style={styles.section}>
              <TitleHeader title="Weekly Overview" colors={colors} />
              <View style={styles.cardsRow}>
                <AggregatedStatsCard colors={colors} allSessions={completedSessions} trainingStats={myStats} />
                <WeeklyHighlightsCard colors={colors} sessions={completedSessions} />
              </View>
            </View>


            {/* Activity Timeline */}
            <View style={{ marginTop: 8 }}>
              <ActivityTimeline
                sessions={allSessions}
                trainings={upcomingTrainings}
                onSessionPress={handleOpenSessionDetail}
              />
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}


export default UnifiedHomePage;
