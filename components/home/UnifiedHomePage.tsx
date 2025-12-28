/**
 * Unified Home Page
 * 
 * Elegant, flowing layout with personal overview first,
 * team content below, and coach-like guidance throughout.
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
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Crosshair,
  Flame,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';
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
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BaseAvatar } from '../BaseAvatar';
import { mapSessionToHomeSession, type HomeSession } from './types';
import { useHomeState } from './useHomeState';

// ============================================================================
// TYPES
// ============================================================================
interface WeeklyStats {
  shots: number;
  hits: number;
  accuracy: number;
  bestGroup: string;
  sessions: number;
  totalTimeMinutes: number;
}

// ============================================================================
// COACH MESSAGES - Contextual guidance
// ============================================================================
function getCoachMessage(stats: {
  sessions: number;
  shots: number;
  accuracy: number;
  hasActiveSession: boolean;
  hasUpcoming: boolean;
  streak: number;
}) {
  if (stats.hasActiveSession) {
    return "You have a session in progress. Let's finish what you started.";
  }
  if (stats.sessions === 0) {
    return "Ready to get some rounds downrange? Start your first session today.";
  }
  if (stats.streak >= 5) {
    return `${stats.streak} day streak! You're building serious discipline.`;
  }
  if (stats.accuracy >= 90) {
    return "Outstanding accuracy this week. Keep pushing your limits.";
  }
  if (stats.accuracy >= 75) {
    return "Solid performance. Consistency is building.";
  }
  if (stats.hasUpcoming) {
    return "You have training scheduled. Stay sharp.";
  }
  if (stats.sessions < 3) {
    return "Build momentum with regular practice. Every session counts.";
  }
  return "Keep the rhythm going. Your skills sharpen with each session.";
}

// ============================================================================
// WEEKLY STATS CARD - Compact but informative
// ============================================================================
function WeeklyStatsCard({
  stats,
  streak,
  colors,
}: {
  stats: WeeklyStats;
  streak: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (stats.sessions === 0) return null;

  const formatTime = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  return (
    <View style={[styles.weeklyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header with streak */}
      <View style={styles.weeklyHeader}>
        <Text style={[styles.weeklyTitle, { color: colors.text }]}>This Week</Text>
        <View style={styles.weeklyHeaderRight}>
          {streak >= 2 && (
            <View style={[styles.streakBadge, { backgroundColor: '#F9731615' }]}>
              <Flame size={12} color="#F97316" />
              <Text style={styles.streakText}>{streak}d</Text>
            </View>
          )}
          <Text style={[styles.weeklySessionCount, { color: colors.textMuted }]}>
            {stats.sessions} session{stats.sessions !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.weeklyStatsRow}>
        <View style={styles.weeklyStat}>
          <Target size={14} color={colors.indigo} />
          <Text style={[styles.weeklyStatValue, { color: colors.text }]}>
            {stats.shots.toLocaleString()}
          </Text>
          <Text style={[styles.weeklyStatLabel, { color: colors.textMuted }]}>shots</Text>
        </View>

        <View style={[styles.weeklyStatDivider, { backgroundColor: colors.border }]} />

        <View style={styles.weeklyStat}>
          <TrendingUp size={14} color={colors.green} />
          <Text style={[styles.weeklyStatValue, { color: colors.text }]}>{stats.accuracy}%</Text>
          <Text style={[styles.weeklyStatLabel, { color: colors.textMuted }]}>accuracy</Text>
        </View>

        <View style={[styles.weeklyStatDivider, { backgroundColor: colors.border }]} />

        <View style={styles.weeklyStat}>
          <Crosshair size={14} color={colors.orange} />
          <Text style={[styles.weeklyStatValue, { color: colors.text }]}>{stats.bestGroup}</Text>
          <Text style={[styles.weeklyStatLabel, { color: colors.textMuted }]}>best</Text>
        </View>

        <View style={[styles.weeklyStatDivider, { backgroundColor: colors.border }]} />

        <View style={styles.weeklyStat}>
          <Clock size={14} color={colors.blue} />
          <Text style={[styles.weeklyStatValue, { color: colors.text }]}>
            {formatTime(stats.totalTimeMinutes)}
          </Text>
          <Text style={[styles.weeklyStatLabel, { color: colors.textMuted }]}>time</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// ACTIVE SESSION CARD
// ============================================================================
function ActiveSessionCard({
  session,
  colors,
  onPress,
}: {
  session: HomeSession;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.green }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.activeCardLeft}>
        <View style={styles.liveIndicator}>
          <View style={styles.livePulse} />
          <Text style={styles.liveLabel}>IN PROGRESS</Text>
        </View>
        <Text style={[styles.activeTitle, { color: colors.text }]} numberOfLines={1}>
          {session.drillName || 'Practice Session'}
        </Text>
        {session.stats && session.stats.shots > 0 && (
          <Text style={[styles.activeMeta, { color: colors.textMuted }]}>
            {session.stats.shots} shots · {session.stats.accuracy || 0}%
          </Text>
        )}
      </View>
      <View style={[styles.activeArrow, { backgroundColor: colors.green }]}>
        <ArrowRight size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// START PRACTICE CARD
// ============================================================================
function StartPracticeCard({
  colors,
  onPress,
  starting,
  lastSessionDaysAgo,
}: {
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  starting: boolean;
  lastSessionDaysAgo: number | null;
}) {
  const getSubtitle = () => {
    if (lastSessionDaysAgo === null) return 'Begin your training journey';
    if (lastSessionDaysAgo === 0) return 'Great momentum today!';
    if (lastSessionDaysAgo === 1) return 'Pick up where you left off';
    if (lastSessionDaysAgo <= 3) return `${lastSessionDaysAgo} days since last session`;
    return 'Time to get back on the range';
  };

  return (
    <TouchableOpacity
      style={[styles.startCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={starting}
    >
      <View style={[styles.startIcon, { backgroundColor: `${colors.primary}12` }]}>
        <Zap size={22} color={colors.primary} />
      </View>
      <View style={styles.startContent}>
        <Text style={[styles.startTitle, { color: colors.text }]}>Start Practice</Text>
        <Text style={[styles.startSubtitle, { color: colors.textMuted }]}>{getSubtitle()}</Text>
      </View>
      {starting ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={[styles.startArrow, { backgroundColor: colors.primary }]}>
          <ChevronRight size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// TEAM TRAINING CARD
// ============================================================================
function TeamTrainingCard({
  training,
  colors,
  onPress,
}: {
  training: any;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const isLive = training.status === 'ongoing';
  const drillCount = training.drill_count || 0;

  return (
    <TouchableOpacity
      style={[
        styles.trainingCard,
        { backgroundColor: colors.card, borderColor: isLive ? colors.orange : colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.trainingCardContent}>
        <View style={styles.trainingHeader}>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDotSmall} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
        </View>
        <View style={styles.trainingMeta}>
          <Users size={12} color={colors.textMuted} />
          <Text style={[styles.trainingTeam, { color: colors.textMuted }]}>
            {training.team?.name || 'Team Training'}
          </Text>
          {drillCount > 0 && (
            <>
              <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
              <Text style={[styles.trainingDrills, { color: colors.textMuted }]}>
                {drillCount} drills
              </Text>
            </>
          )}
        </View>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ============================================================================
// RECENT SESSION ROW
// ============================================================================
function RecentSessionRow({
  session,
  colors,
  onPress,
}: {
  session: HomeSession;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const isTeam = session.origin === 'team';
  const timeAgo = session.endedAt
    ? formatTimeAgo(session.endedAt)
    : session.startedAt
    ? formatTimeAgo(session.startedAt)
    : '';

  return (
    <TouchableOpacity style={styles.recentRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.recentIcon, { backgroundColor: isTeam ? `${colors.blue}12` : `${colors.indigo}12` }]}>
        {isTeam ? <Users size={14} color={colors.blue} /> : <Crosshair size={14} color={colors.indigo} />}
      </View>
      <View style={styles.recentContent}>
        <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
          {session.drillName || (isTeam ? 'Team Session' : 'Practice Session')}
        </Text>
        <Text style={[styles.recentMeta, { color: colors.textMuted }]}>
          {session.stats?.shots ? `${session.stats.shots} shots` : 'No shots'}
          {session.stats?.accuracy ? ` · ${session.stats.accuracy}%` : ''}
        </Text>
      </View>
      <Text style={[styles.recentTime, { color: colors.textMuted }]}>{timeAgo}</Text>
    </TouchableOpacity>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function UnifiedHomePage() {
  const colors = useColors();
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
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url;
  const fallbackInitial =
    profileFullName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';

  // Stores
  const { sessions, loading: sessionsLoading, initialized } = useSessionStore();
  const { teams, loadTeams } = useTeamStore();
  const { myUpcomingTrainings, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

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

  // Filter upcoming trainings
  const upcomingTrainings = useMemo(() => {
    return myUpcomingTrainings
      .filter((t) => t.status === 'planned' || t.status === 'ongoing')
      .filter((t) => !allSessions.some((s) => s.training_id === t.id && s.status === 'active'))
      .slice(0, 3);
  }, [myUpcomingTrainings, allSessions]);

  const homeState = useHomeState({
    sessions: allSessions,
    upcomingTrainings,
    hasTeams,
  });

  // Map sessions for display
  const timelineSessions = useMemo(() => {
    return allSessions.map((session) => mapSessionToHomeSession(session));
  }, [allSessions]);

  const completedSessions = useMemo(() => {
    return allSessions.filter((s) => s.status === 'completed');
  }, [allSessions]);

  const recentSessions = useMemo(() => {
    return timelineSessions
      .filter((s) => s.state === 'completed' || s.state === 'unreviewed')
      .slice(0, 5);
  }, [timelineSessions]);

  // Compute weekly stats
  const weeklyStats = useMemo((): WeeklyStats => {
    let shots = 0;
    let hits = 0;
    let totalTimeMs = 0;
    let minDispersion = 1000;
    let hasDispersion = false;

    completedSessions.forEach((s) => {
      if (s.stats) {
        shots += s.stats.shots_fired || 0;
        hits += s.stats.hits_total || 0;
        if (s.stats.best_dispersion_cm && s.stats.best_dispersion_cm > 0) {
          hasDispersion = true;
          minDispersion = Math.min(minDispersion, s.stats.best_dispersion_cm);
        }
        }
      if (s.started_at && s.ended_at) {
        const start = new Date(s.started_at).getTime();
        const end = new Date(s.ended_at).getTime();
        totalTimeMs += end - start;
      }
    });

    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
    const bestGroup = hasDispersion ? `${minDispersion.toFixed(1)}cm` : '—';
    const totalTimeMinutes = Math.round(totalTimeMs / 60000);

    return { shots, hits, accuracy, bestGroup, sessions: completedSessions.length, totalTimeMinutes };
  }, [completedSessions]);

  // Compute streak
  const streak = useMemo(() => {
    if (completedSessions.length === 0) return 0;
    const sessionDates = new Set(
      completedSessions.map((s) => {
        const d = new Date(s.ended_at || s.started_at || '');
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (sessionDates.has(key)) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [completedSessions]);

  // Last session days ago
  const lastSessionDaysAgo = useMemo(() => {
    if (completedSessions.length === 0) return null;
    const last = completedSessions[0];
    const lastDate = new Date(last.ended_at || last.started_at || '');
    return Math.floor((Date.now() - lastDate.getTime()) / 86400000);
  }, [completedSessions]);

  // Coach message
  const coachMessage = useMemo(
    () =>
      getCoachMessage({
        sessions: weeklyStats.sessions,
        shots: weeklyStats.shots,
        accuracy: weeklyStats.accuracy,
        hasActiveSession: !!homeState.activeSession,
        hasUpcoming: upcomingTrainings.length > 0,
        streak,
      }),
    [weeklyStats, homeState.activeSession, upcomingTrainings, streak]
  );

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

  const handleActiveSessionPress = useCallback(() => {
    if (homeState.activeSession?.sourceSession) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(protected)/activeSession?sessionId=${homeState.activeSession.sourceSession.id}`);
    }
  }, [homeState.activeSession]);

  const handleSessionPress = useCallback((session: HomeSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (session.sourceSession) {
        router.push(`/(protected)/sessionDetail?sessionId=${session.sourceSession.id}`);
    }
  }, []);

  const handleTrainingPress = useCallback((training: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}`);
  }, []);

  const shouldShowLoading =
    (loadingAllSessions && allSessions.length === 0) || (!initialized && sessionsLoading);

  if (shouldShowLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasActiveSession = homeState.activeSession && homeState.activeSession.origin === 'solo';
  const hasTeamContent = upcomingTrainings.length > 0 || hasTeams;

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
              <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{firstName}</Text>
            </View>
          </View>
            {isGarminConnected && (
              <View style={[styles.watchBadge, { backgroundColor: `${colors.green}15` }]}>
                <Ionicons name="watch" size={14} color={colors.green} />
              </View>
            )}
          </View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* COACH MESSAGE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={[styles.coachMessage, { color: colors.text }]} numberOfLines={2}>{coachMessage}</Text>
        </Animated.View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* PERSONAL SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350).delay(50)} style={styles.section}>
          {/* Active Session or Start Practice */}
          {hasActiveSession && homeState.activeSession ? (
            <ActiveSessionCard
              session={homeState.activeSession}
              colors={colors}
              onPress={handleActiveSessionPress}
            />
          ) : (
            <StartPracticeCard
              colors={colors}
              onPress={handleStartSession}
              starting={starting}
              lastSessionDaysAgo={lastSessionDaysAgo}
            />
          )}

          {/* Weekly Stats */}
          <WeeklyStatsCard stats={weeklyStats} streak={streak} colors={colors} />
        </Animated.View>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TEAM SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {hasTeamContent && (
          <Animated.View entering={FadeInUp.duration(350).delay(100)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={14} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Team Training</Text>
            </View>

            {upcomingTrainings.length > 0 ? (
              <View style={styles.trainingsList}>
                {upcomingTrainings.map((training) => (
                  <TeamTrainingCard
                    key={training.id}
                    training={training}
                    colors={colors}
                    onPress={() => handleTrainingPress(training)}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyTeam, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Calendar size={18} color={colors.textMuted} />
                <Text style={[styles.emptyTeamText, { color: colors.textMuted }]}>
                  No upcoming trainings
                </Text>
                <TouchableOpacity
                  style={styles.viewScheduleBtn}
                  onPress={() => router.push('/(protected)/(tabs)/trainings')}
                >
                  <Text style={[styles.viewScheduleText, { color: colors.primary }]}>Schedule</Text>
                  <ChevronRight size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
        </Animated.View>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* RECENT ACTIVITY */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {recentSessions.length > 0 && (
          <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recent Activity</Text>
            </View>
            <View style={[styles.recentList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {recentSessions.map((session, idx) => (
                <View key={session.id}>
                  <RecentSessionRow session={session} colors={colors} onPress={() => handleSessionPress(session)} />
                  {idx < recentSessions.length - 1 && (
                    <View style={[styles.recentDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              ))}
            </View>
            </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

export default UnifiedHomePage;

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 1 },
  userName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  watchBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Coach Message
  coachMessage: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.85,
    width: '65%',
  },

  // Section
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Weekly Stats Card
  weeklyCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  weeklyTitle: { fontSize: 14, fontWeight: '600' },
  weeklyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  streakText: { fontSize: 11, fontWeight: '700', color: '#F97316' },
  weeklySessionCount: { fontSize: 12 },
  weeklyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weeklyStatValue: { fontSize: 15, fontWeight: '700' },
  weeklyStatLabel: { fontSize: 10 },
  weeklyStatDivider: { width: 1, height: 28 },

  // Active Session Card
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  activeCardLeft: { flex: 1 },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 0.5,
  },
  activeTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  activeMeta: { fontSize: 13 },
  activeArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Start Practice Card
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  startIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startContent: { flex: 1 },
  startTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  startSubtitle: { fontSize: 13 },
  startArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Training Card
  trainingsList: { gap: 8 },
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  trainingCardContent: { flex: 1 },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F97316',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 0.3,
  },
  trainingTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trainingTeam: { fontSize: 12, fontWeight: '500' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 4 },
  trainingDrills: { fontSize: 12 },

  // Empty Team
  emptyTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  emptyTeamText: { flex: 1, fontSize: 13, fontWeight: '500' },
  viewScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewScheduleText: { fontSize: 12, fontWeight: '600' },

  // Recent List
  recentList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentContent: { flex: 1 },
  recentTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  recentMeta: { fontSize: 12 },
  recentTime: { fontSize: 11, fontWeight: '500' },
  recentDivider: { height: 1, marginLeft: 62 },
});
