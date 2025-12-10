import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { calculateSessionStats, getMyActivePersonalSession, type SessionWithDetails } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTrainingStore } from '@/store/trainingStore';
import { useFocusEffect } from '@react-navigation/native';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Play, ScanLine, Target, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function PersonalHomePage() {
  const colors = useColors();
  const { fullName } = useAppContext();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();
  const { sessions, sessionsLoading, loadTeams } = useWorkspaceData();
  const { loadSessions, createSession } = useSessionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  
  // Live timer state for active session
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Session stats (targets, shots, etc.)
  const [sessionStats, setSessionStats] = useState<{
    targetCount: number;
    totalShotsFired: number;
    totalHits: number;
    paperTargets: number;
    tacticalTargets: number;
  } | null>(null);

  const { myUpcomingTrainings, myStats, loadingMyTrainings, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

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

  // Data
  const activeSession = useMemo(() => sessions.find(s => s.status === 'active'), [sessions]);
  const recentSessions = useMemo(() => sessions.filter(s => s.status === 'completed').slice(0, 4), [sessions]);
  const lastSession = recentSessions[0];
  
  // Live timer for active session
  useEffect(() => {
    if (activeSession) {
      // Calculate initial elapsed time
      const startTime = new Date(activeSession.started_at).getTime();
      const updateElapsed = () => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      };
      
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      setElapsedTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [activeSession]);
  
  // Load session stats (targets) for active session
  useEffect(() => {
    if (activeSession) {
      calculateSessionStats(activeSession.id)
        .then(stats => setSessionStats(stats))
        .catch(() => setSessionStats(null));
    } else {
      setSessionStats(null);
    }
  }, [activeSession]);
  
  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return { minutes: mins, seconds: secs };
  };
  
  const elapsed = formatElapsedTime(elapsedTime);
  
  // Calculate total training time this week
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    
    const weekSessions = sessions.filter(s => 
      s.status === 'completed' && 
      new Date(s.created_at) >= weekStart
    );
    
    const totalMinutes = weekSessions.reduce((acc, s) => acc + getDuration(s), 0);
    return { sessions: weekSessions.length, minutes: totalMinutes };
  }, [sessions]);
  
  // Calculate dial progress (0-1) based on session duration
  // Max duration for full dial = 60 minutes
  const dialProgress = useMemo(() => {
    if (activeSession) {
      return Math.min(elapsed.minutes / 60, 1);
    }
    if (lastSession) {
      return Math.min(getDuration(lastSession) / 60, 1);
    }
    return 0;
  }, [activeSession, elapsed.minutes, lastSession]);
  
  // Calculate strokeDashoffset for progress
  // Full arc is 198, so offset = 198 * (1 - progress)
  const strokeDashoffset = 198 * (1 - dialProgress);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadSessions(), loadMyUpcomingTrainings(), loadMyStats()]);
    setRefreshing(false);
  }, [loadSessions, loadMyUpcomingTrainings, loadMyStats]);

  // Handlers
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

  const isLoading = sessionsLoading || loadingMyTrainings;

  if (isLoading && sessions.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const firstName = fullName?.split(' ')[0] || 'User';
  
  // Current display session (active or last)
  const displaySession = activeSession || lastSession;
  const sessionTitle = displaySession 
    ? (displaySession.training_title || displaySession.drill_name || 'Freestyle Session')
    : 'No sessions yet';

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
          />
        }
      >
        {/* ══════════════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={styles.header}
        >
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>
              Hello, {firstName}
            </Text>
            <Text style={[styles.subGreeting, { color: colors.textMuted }]}>
              Ready to train?
            </Text>
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            STATUS DIAL
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.dialSection}>
          <View style={[styles.dialCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Top Row - Session Title */}
            <View style={styles.dialHeader}>
              <TouchableOpacity 
                style={[styles.dialNavButton, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <ChevronRight size={16} color={colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
              
              <View style={styles.dialHeaderCenter}>
                <Text style={[styles.dialLabel, { color: activeSession ? '#10B981' : colors.textMuted }]}>
                  {activeSession ? '● LIVE SESSION' : 'LAST SESSION'}
                </Text>
                <Text style={[styles.dialTitle, { color: colors.text }]} numberOfLines={1}>
                  {sessionTitle}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.dialNavButton, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Dial */}
            <View style={styles.dialContainer}>
              <Svg height={200} width={200} viewBox="0 0 100 100">
                <Defs>
                  {/* Colorful gradient: Blue → Teal → Amber */}
                  <SvgLinearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={activeSession ? '#3B82F6' : '#6366F1'} />
                    <Stop offset="0.5" stopColor={activeSession ? '#10B981' : '#8B5CF6'} />
                    <Stop offset="1" stopColor={activeSession ? '#F59E0B' : '#EC4899'} />
                  </SvgLinearGradient>
                </Defs>
                
                {/* Background Track */}
                <Circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={colors.border}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="198 264"
                  strokeLinecap="round"
                  rotation="135"
                  origin="50, 50"
                />
                
                {/* Progress Track */}
                <Circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#dialGrad)"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${198 - strokeDashoffset} 264`}
                  strokeLinecap="round"
                  rotation="135"
                  origin="50, 50"
                />
              </Svg>

              {/* Center Content */}
              <View style={styles.dialCenter}>
                <Text style={[styles.dialCenterLabel, { color: colors.textMuted }]}>
                  {activeSession ? 'ELAPSED' : 'DURATION'}
                </Text>
                
                {activeSession ? (
                  // Live timer display
                  <View style={styles.timerContainer}>
                    <Text style={[styles.dialValue, { color: colors.text }]}>
                      {elapsed.minutes}
                    </Text>
                    <Text style={[styles.dialValueSeparator, { color: colors.textMuted }]}>:</Text>
                    <Text style={[styles.dialValueSeconds, { color: colors.textMuted }]}>
                      {elapsed.seconds.toString().padStart(2, '0')}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.dialValue, { color: colors.text }]}>
                    {lastSession ? getDuration(lastSession) : '0'}
                  </Text>
                )}
                
                <Text style={[styles.dialUnit, { color: '#F59E0B' }]}>
                  {activeSession ? 'MIN:SEC' : 'MIN'}
                </Text>
              </View>
            </View>

            {/* Bottom Stats */}
            <View style={styles.dialStats}>
              <View style={styles.dialStat}>
                <View style={[styles.dialStatIcon, { backgroundColor: activeSession ? '#F59E0B20' : colors.secondary }]}>
                  <Zap size={16} color={activeSession ? '#F59E0B' : colors.textMuted} />
                </View>
                <Text style={[styles.dialStatValue, { color: colors.text }]}>
                  {displaySession?.session_mode === 'group' ? 'Group' : 'Solo'}
                </Text>
                <Text style={[styles.dialStatLabel, { color: colors.textMuted }]}>MODE</Text>
              </View>

              <View style={styles.dialStatCenter}>
                <Text style={[styles.dialStatValueLarge, { color: colors.text }]}>
                  {activeSession 
                    ? (sessionStats?.targetCount ?? 0)
                    : lastSession 
                      ? format(new Date(lastSession.created_at), 'dd MMM') 
                      : '--'}
                </Text>
                <Text style={[styles.dialStatLabel, { color: colors.textMuted }]}>
                  {activeSession ? 'TARGETS' : 'DATE'}
                </Text>
              </View>

              <View style={styles.dialStat}>
                <View style={[styles.dialStatIcon, { backgroundColor: activeSession ? '#3B82F620' : colors.secondary }]}>
                  <Target size={16} color={activeSession ? '#3B82F6' : colors.textMuted} />
                </View>
                <Text style={[styles.dialStatValue, { color: colors.text }]}>
                  {activeSession 
                    ? (sessionStats?.totalShotsFired ?? 0)
                    : sessions.filter(s => s.status === 'completed').length}
                </Text>
                <Text style={[styles.dialStatLabel, { color: colors.textMuted }]}>
                  {activeSession ? 'SHOTS' : 'TOTAL'}
                </Text>
              </View>
            </View>
            
            {/* Active Session Target Details */}
            {activeSession && sessionStats && sessionStats.targetCount > 0 && (
              <View style={[styles.targetStats, { backgroundColor: colors.secondary }]}>
                <View style={styles.targetStatItem}>
                  <View style={[styles.targetStatDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.targetStatText, { color: colors.text }]}>
                    {sessionStats.totalHits} hits
                  </Text>
                </View>
                <View style={[styles.targetStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.targetStatItem}>
                  <View style={[styles.targetStatDot, { backgroundColor: '#6366F1' }]} />
                  <Text style={[styles.targetStatText, { color: colors.text }]}>
                    {sessionStats.paperTargets} paper
                  </Text>
                </View>
                <View style={[styles.targetStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.targetStatItem}>
                  <View style={[styles.targetStatDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.targetStatText, { color: colors.text }]}>
                    {sessionStats.tacticalTargets} tactical
                  </Text>
                </View>
              </View>
            )}
            
            {/* Team/Training Info (if applicable) */}
            {displaySession && (displaySession.team_name || displaySession.training_title) && (
              <View style={[styles.sessionMeta, { backgroundColor: colors.secondary }]}>
                {displaySession.team_name && (
                  <View style={styles.sessionMetaItem}>
                    <Target size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
                      {displaySession.team_name}
                    </Text>
                  </View>
                )}
                {displaySession.training_title && (
                  <View style={styles.sessionMetaItem}>
                    <Calendar size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
                      {displaySession.training_title}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            WEEKLY STATS
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.section}>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statsHeader}>
              <Text style={[styles.statsTitle, { color: colors.text }]}>This Week</Text>
              <Text style={[styles.statsSubtitle, { color: colors.textMuted }]}>Last 7 days</Text>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{weeklyStats.sessions}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{weeklyStats.minutes}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Minutes</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{myStats.upcoming}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Upcoming</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            QUICK ACTIONS
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
          <View style={styles.actionsRow}>
            {/* Start/Resume */}
            <TouchableOpacity
              onPress={activeSession ? handleResume : handleStart}
              activeOpacity={0.9}
              disabled={starting}
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: activeSession ? '#10B981' : colors.border }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: activeSession ? '#10B98120' : colors.secondary }]}>
                {starting ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : activeSession ? (
                  <Play size={20} color="#10B981" fill="#10B981" style={{ marginLeft: 2 }} />
                ) : (
                  <Play size={20} color={colors.text} fill={colors.text} style={{ marginLeft: 2 }} />
                )}
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  {activeSession ? 'Resume Session' : 'Start Session'}
                </Text>
                <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
                  {activeSession 
                    ? `${elapsed.minutes}:${elapsed.seconds.toString().padStart(2, '0')} elapsed`
                    : 'Drill / Freestyle'}
                </Text>
              </View>
              <View style={styles.actionIndicator}>
                <View style={[styles.actionBar, { backgroundColor: activeSession ? '#10B981' : colors.border }]} />
              </View>
            </TouchableOpacity>

            {/* Scans */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(protected)/scans' as any);
              }}
              activeOpacity={0.9}
              style={[styles.actionCard, styles.actionCardSecondary, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.card }]}>
                <ScanLine size={20} color={colors.textMuted} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Target Scans</Text>
                <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Gallery & Analyze</Text>
              </View>
              <View style={styles.actionIndicator}>
                <View style={[styles.actionBar, { backgroundColor: colors.border }]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            UPCOMING TRAININGS
        ══════════════════════════════════════════════════════════════════════ */}
        {myUpcomingTrainings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UPCOMING TRAININGS</Text>
              <TouchableOpacity onPress={() => router.push('/(protected)/personal/trainings' as any)}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
              {myUpcomingTrainings.slice(0, 3).map((training) => (
                <TouchableOpacity
                  key={training.id}
                  activeOpacity={0.7}
                  style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
                  }}
                >
                  <View style={[styles.listItemIcon, { backgroundColor: '#3B82F620' }]}>
                    <Calendar size={18} color="#3B82F6" />
                  </View>
                  <View style={styles.listItemContent}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>
                      {training.title}
                    </Text>
                    <Text style={[styles.listItemMeta, { color: colors.textMuted }]}>
                      {training.scheduled_at 
                        ? formatDistanceToNow(new Date(training.scheduled_at), { addSuffix: true })
                        : 'Not scheduled'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            RECENT SESSIONS
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RECENT SESSIONS</Text>
            <TouchableOpacity onPress={() => router.push('/(protected)/personal/history' as any)}>
              <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {recentSessions.map((s) => (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.7}
                style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.listItemIcon, { backgroundColor: colors.secondary }]}>
                  <Target size={18} color={colors.textMuted} />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>
                    {s.training_title || s.drill_name || 'Freestyle Session'}
                  </Text>
                  <Text style={[styles.listItemMeta, { color: colors.textMuted }]}>
                    {format(new Date(s.created_at), 'MMM d, yyyy • HH:mm')}
                  </Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={[styles.listItemValue, { color: colors.text }]}>
                    {getDuration(s)}
                    <Text style={[styles.listItemUnit, { color: colors.textMuted }]}>m</Text>
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {recentSessions.length === 0 && (
              <View style={[styles.emptyState, { borderColor: colors.border }]}>
                <Target size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No sessions yet. Start training!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getDuration(s: SessionWithDetails): number {
  if (!s.ended_at) return 0;
  return Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  greeting: { fontSize: 28, fontWeight: '600', letterSpacing: -0.5 },
  subGreeting: { fontSize: 14, fontWeight: '500', marginTop: 4 },

  // Dial Section
  dialSection: { paddingHorizontal: 20, marginBottom: 16 },
  dialCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  dialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dialHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dialNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  dialTitle: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dialCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  dialCenterLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dialValue: { fontSize: 48, fontWeight: '300', letterSpacing: -2 },
  dialValueSeparator: { fontSize: 36, fontWeight: '300', marginHorizontal: 2 },
  dialValueSeconds: { fontSize: 28, fontWeight: '300' },
  dialUnit: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  dialStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  dialStat: { alignItems: 'center', gap: 4 },
  dialStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dialStatCenter: { alignItems: 'center' },
  dialStatValue: { fontSize: 13, fontWeight: '600' },
  dialStatValueLarge: { fontSize: 18, fontWeight: '500', letterSpacing: -0.5 },
  dialStatLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  
  // Session Meta
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionMetaText: { fontSize: 12, fontWeight: '500' },
  
  // Target Stats (active session)
  targetStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  targetStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  targetStatText: { fontSize: 13, fontWeight: '600' },
  targetStatDivider: { width: 1, height: 16 },

  // Stats Card
  section: { paddingHorizontal: 20, marginBottom: 20 },
  statsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  statsHeader: { marginBottom: 16 },
  statsTitle: { fontSize: 16, fontWeight: '600' },
  statsSubtitle: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 32 },

  // Section Header
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLink: { fontSize: 12, fontWeight: '600' },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  actionCardSecondary: { opacity: 0.8 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {},
  actionTitle: { fontSize: 15, fontWeight: '600' },
  actionDesc: { fontSize: 11, marginTop: 2 },
  actionIndicator: { alignSelf: 'flex-end' },
  actionBar: { width: 32, height: 4, borderRadius: 2 },

  // Lists
  listContainer: { gap: 10 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: { flex: 1 },
  listItemTitle: { fontSize: 15, fontWeight: '600' },
  listItemMeta: { fontSize: 12, marginTop: 2 },
  listItemRight: { alignItems: 'flex-end' },
  listItemValue: { fontSize: 15, fontWeight: '500' },
  listItemUnit: { fontSize: 11 },

  // Empty State
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    gap: 12,
  },
  emptyText: { fontSize: 14 },
});

export default PersonalHomePage;
