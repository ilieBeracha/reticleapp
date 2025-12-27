/**
 * Unified Home Page
 * 
 * Clean, organized layout with clear visual hierarchy.
 */

import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import {
  deleteSession,
  getMyActivePersonalSession,
  getRecentSessionsWithStats,
  type SessionWithDetails,
} from '@/services/sessionService';
import { useGarminStore } from '@/store/garminStore';
import { useMessagesStore } from '@/store/messagesService';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { getSafeSessionDuration } from '@/utils/sessionDuration';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Crosshair, Target, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BaseAvatar } from '../BaseAvatar';
import { mapSessionToHomeSession, type HomeSession } from './types';
import { EmptyState } from './unified/sections/EmptyState';
import { UpcomingTrainingsCard } from './unified/sections/UpcomingTrainingsCard';
import { useHomeState } from './useHomeState';
import { ActivityTimeline } from './widgets';

export function UnifiedHomePage() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profileFullName, profileAvatarUrl, user } = useAuth();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();
  const garminStatus = useGarminStore((s) => s.status);
  const isGarminConnected = garminStatus === 'CONNECTED';

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
  const fallbackInitial =
    profileFullName?.charAt(0)?.toUpperCase() ?? email?.charAt(0)?.toUpperCase() ?? '?';

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

  // Load recent sessions
  const loadAllSessions = useCallback(async () => {
    try {
      const sessions = await getRecentSessionsWithStats({ days: 7, limit: 20 });
      setAllSessions(sessions);
    } catch (error) {
      console.error('Failed to load all sessions:', error);
    } finally {
      setLoadingAllSessions(false);
    }
  }, []);

  useEffect(() => {
    useMessagesStore.subscribe((state) => {
      console.log('Messages:', state.messages);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) {
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

  const hasTeams = teams.length > 0;

  const upcomingTrainings = useMemo(() => {
    return myUpcomingTrainings
      .filter((t) => t.status === 'planned' || t.status === 'ongoing')
      .filter((t) => !allSessions.some((s) => s.training_id === t.id && s.status === 'active'))
      .slice(0, 2);
  }, [myUpcomingTrainings, allSessions]);

  const homeState = useHomeState({
    sessions: allSessions,
    upcomingTrainings,
    hasTeams,
  });

  const timelineSessions = useMemo(() => {
    return allSessions.map((session) => mapSessionToHomeSession(session));
  }, [allSessions]);

  const completedSessions = useMemo(() => {
    return allSessions.filter((s) => s.status === 'completed');
  }, [allSessions]);

  // Compute weekly stats
  const weeklyStats = useMemo(() => {
    let shots = 0;
    let hits = 0;
    let solo = 0;
    let team = 0;
    let totalTimeMs = 0;
    let minDispersion = 1000;
    let hasDispersion = false;
    let totalDist = 0;
    let distCount = 0;

    completedSessions.forEach((s) => {
      if (s.stats) {
        shots += s.stats.shots_fired || 0;
        hits += s.stats.hits_total || 0;
        if (s.stats.best_dispersion_cm && s.stats.best_dispersion_cm > 0) {
          hasDispersion = true;
          minDispersion = Math.min(minDispersion, s.stats.best_dispersion_cm);
        }
        if (s.stats.avg_distance_m) {
          totalDist += s.stats.avg_distance_m;
          distCount++;
        }
      }
      const duration = getSafeSessionDuration(s);
      if (duration > 0) totalTimeMs += duration * 1000;
      if (s.team_id) team++;
      else solo++;
    });

    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
    const bestGroup = hasDispersion ? `${minDispersion.toFixed(1)}cm` : '—';
    const avgDist = distCount > 0 ? `${Math.round(totalDist / distCount)}m` : '—';
    const hours = Math.floor(totalTimeMs / (1000 * 60 * 60));
    const mins = Math.floor((totalTimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const time = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return { shots, hits, solo, team, accuracy, bestGroup, avgDist, time, sessions: completedSessions.length };
  }, [completedSessions]);

  const hasActivity = allSessions.length > 0 || upcomingTrainings.length > 0;

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadAllSessions(), loadMyUpcomingTrainings(), loadMyStats(), loadTeams()]);
    setRefreshing(false);
  }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams]);

  const handleStartSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await getMyActivePersonalSession();
      if (existing) {
        setStarting(false);
        Alert.alert(
          'Active Session',
          `You have an active session${existing.drill_name ? ` for "${existing.drill_name}"` : ''}. What would you like to do?`,
          [
            { text: 'Continue', onPress: () => router.push(`/(protected)/activeSession?sessionId=${existing.id}`) },
            {
              text: 'Delete & Start New',
              style: 'destructive',
              onPress: async () => {
                await deleteSession(existing.id);
                await loadAllSessions();
                router.push('/(protected)/createSession');
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
      router.push('/(protected)/createSession');
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setStarting(false);
    }
  }, [starting, loadAllSessions]);

  const handleHeroPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { activeSession } = homeState;
    if (activeSession?.sourceSession && activeSession.origin === 'solo') {
      router.push(`/(protected)/activeSession?sessionId=${activeSession.sourceSession.id}`);
      return;
    }
    handleStartSession();
  }, [homeState, handleStartSession]);

  const handleSessionPress = useCallback((session: HomeSession) => {
    if (session.sourceSession) {
      if (session.state === 'active') {
        router.push(`/(protected)/activeSession?sessionId=${session.sourceSession.id}`);
      } else {
        router.push(`/(protected)/sessionDetail?sessionId=${session.sourceSession.id}`);
      }
    } else if (session.sourceTraining) {
      router.push(`/(protected)/trainingDetail?id=${session.sourceTraining.id}`);
    }
  }, []);

  const shouldShowLoading = (loadingAllSessions && allSessions.length === 0) || (!initialized && sessionsLoading);

  if (shouldShowLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasActiveSession = homeState.activeSession && homeState.activeSession.origin === 'solo';

  // Pie chart data
  const pieData = [
    { value: weeklyStats.solo, color: colors.indigo },
    { value: weeklyStats.team, color: colors.green },
  ].filter((d) => d.value > 0);
  const chartData = pieData.length > 0 ? pieData : [{ value: 1, color: `${colors.text}10` }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* HEADER */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              {avatarUrl ? (
                <BaseAvatar source={{ uri: avatarUrl }} fallbackText={fallbackInitial} size="sm" borderWidth={0} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.text }]}>{fallbackInitial}</Text>
              )}
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: colors.textMuted }]}>{firstName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {isGarminConnected && (
              <View style={[styles.watchBadge, { backgroundColor: `${colors.green}15` }]}>
                <Ionicons name="watch" size={14} color={colors.green} />
              </View>
            )}
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* MAIN CARD - Hero + Stats Combined */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.mainCard}>
          <View style={[styles.mainCardInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Hero Section */}
            <TouchableOpacity style={styles.heroSection} onPress={handleHeroPress} activeOpacity={0.7}>
              <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Zap size={20} color={colors.primary} />
              </View>
              <View style={styles.heroContent}>
                {hasActiveSession ? (
                  <>
                    <View style={styles.liveRow}>
                      <View style={styles.liveDot} />
                      <Text style={[styles.liveText, { color: colors.green }]}>In Progress</Text>
                    </View>
                    <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>
                      {homeState.activeSession?.drillName || 'Practice Session'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.heroLabel, { color: colors.textMuted }]}>Ready to train</Text>
                    <Text style={[styles.heroTitle, { color: colors.text }]}>Start Practice</Text>
                  </>
                )}
              </View>
              <View style={[styles.heroArrow, { backgroundColor: colors.primary }]}>
                <ChevronRight size={16} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {/* Left: Chart + Accuracy */}
              <View style={styles.statsLeft}>
                <View style={styles.chartContainer}>
                  <PieChart data={chartData} donut radius={28} innerRadius={20} showText={false} backgroundColor={colors.card} />
                  <View style={[StyleSheet.absoluteFill, styles.chartCenter]}>
                    <Text style={[styles.chartValue, { color: colors.text }]}>{weeklyStats.sessions}</Text>
                  </View>
                </View>
                <View>
                  <Text style={[styles.statBig, { color: colors.indigo }]}>{weeklyStats.accuracy}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
                </View>
              </View>

              {/* Right: Highlights */}
              <View style={styles.statsRight}>
                <View style={styles.highlightRow}>
                  <View style={[styles.highlightIcon, { backgroundColor: `${colors.indigo}12` }]}>
                    <Crosshair size={14} color={colors.indigo} />
                  </View>
                  <View>
                    <Text style={[styles.highlightValue, { color: colors.text }]}>{weeklyStats.bestGroup}</Text>
                    <Text style={[styles.highlightLabel, { color: colors.textMuted }]}>Best Group</Text>
                  </View>
                </View>
                <View style={styles.highlightRow}>
                  <View style={[styles.highlightIcon, { backgroundColor: `${colors.green}12` }]}>
                    <Target size={14} color={colors.green} />
                  </View>
                  <View>
                    <Text style={[styles.highlightValue, { color: colors.text }]}>{weeklyStats.avgDist}</Text>
                    <Text style={[styles.highlightLabel, { color: colors.textMuted }]}>Avg Distance</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Mini stats bar */}
            <View style={[styles.miniStats, { backgroundColor: `${colors.text}04` }]}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniValue, { color: colors.text }]}>{weeklyStats.shots.toLocaleString()}</Text>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>shots</Text>
              </View>
              <View style={[styles.miniDivider, { backgroundColor: colors.border }]} />
              <View style={styles.miniStat}>
                <Text style={[styles.miniValue, { color: colors.text }]}>{weeklyStats.hits.toLocaleString()}</Text>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>hits</Text>
              </View>
              <View style={[styles.miniDivider, { backgroundColor: colors.border }]} />
              <View style={styles.miniStat}>
                <Text style={[styles.miniValue, { color: colors.text }]}>{weeklyStats.time}</Text>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>time</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* CONTENT */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {!hasActivity && !homeState.activeSession ? (
          <EmptyState colors={colors} onStartPractice={handleStartSession} starting={starting} />
        ) : (
          <>
            {/* Upcoming Trainings */}
            {upcomingTrainings.length > 0 && (
              <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
                <UpcomingTrainingsCard trainings={upcomingTrainings} />
              </Animated.View>
            )}

            {/* Activity Timeline */}
            <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
              <ActivityTimeline sessions={timelineSessions} onSessionPress={handleSessionPress} />
            </Animated.View>
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

    
    </View>
  );
}

export default UnifiedHomePage;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  greeting: { fontSize: 13, fontWeight: '500' },
  userName: { fontSize: 11, marginTop: 1 },
  watchBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Card
  mainCard: { marginBottom: 16 },
  mainCardInner: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Hero
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { flex: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  heroLabel: { fontSize: 11, fontWeight: '500', marginBottom: 1 },
  heroTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  heroArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: { height: 1, marginHorizontal: 14 },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    padding: 14,
    gap: 16,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chartContainer: { position: 'relative' },
  chartCenter: { alignItems: 'center', justifyContent: 'center' },
  chartValue: { fontSize: 11, fontWeight: '800' },
  statBig: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginTop: -2 },

  statsRight: { gap: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  highlightIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightValue: { fontSize: 13, fontWeight: '700', letterSpacing: -0.3 },
  highlightLabel: { fontSize: 9, fontWeight: '500' },

  // Mini Stats
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 8,
  },
  miniStat: { alignItems: 'center', flex: 1 },
  miniValue: { fontSize: 13, fontWeight: '700' },
  miniLabel: { fontSize: 9, fontWeight: '500', marginTop: 1 },
  miniDivider: { width: 1, height: 20 },

  // Section
  section: { marginBottom: 16 },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
