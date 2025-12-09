import { Colors } from '@/constants/Colors';
import { useModals } from '@/contexts/ModalContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useSessionStats } from '@/hooks/useSessionStats';
import { useWorkspaceActions } from '@/hooks/useWorkspaceActions';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import type { SessionWithDetails } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TrainingWithDetails } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isTomorrow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// HERO CARD (Featured Training / Session)
// ═══════════════════════════════════════════════════════════════════════════
const HeroCard = React.memo(function HeroCard({
  title,
  subtitle,
  meta,
  actionLabel,
  onPress,
  gradientColors,
  icon,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  actionLabel: string;
  onPress: () => void;
  gradientColors: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity style={styles.heroCard} onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>{subtitle}</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          {meta && <Text style={styles.heroMeta}>{meta}</Text>}
          <View style={styles.heroAction}>
            <Text style={styles.heroActionText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>
        <View style={styles.heroIconContainer}>
          <Ionicons name={icon} size={80} color="rgba(255,255,255,0.15)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// HORIZONTAL SCROLL TRAINING CARD
// ═══════════════════════════════════════════════════════════════════════════
const TrainingScrollCard = React.memo(function TrainingScrollCard({
  training,
  colors,
  onPress,
}: {
  training: TrainingWithDetails;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const scheduledDate = new Date(training.scheduled_at);
  const today = isToday(scheduledDate);
  const tomorrow = isTomorrow(scheduledDate);
  const dateLabel = today ? 'Today' : tomorrow ? 'Tomorrow' : format(scheduledDate, 'EEE, MMM d');
  const timeLabel = format(scheduledDate, 'HH:mm');

  return (
    <TouchableOpacity
      style={[styles.trainingScrollCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.trainingScrollAccent, { backgroundColor: '#3B82F6' }]} />
      <View style={styles.trainingScrollContent}>
        <Text style={[styles.trainingScrollTitle, { color: colors.text }]} numberOfLines={2}>
          {training.title}
        </Text>
        <View style={styles.trainingScrollMeta}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.trainingScrollMetaText, { color: colors.textMuted }]}>
            {dateLabel}, {timeLabel}
          </Text>
        </View>
        {training.team && (
          <View style={styles.trainingScrollMeta}>
            <Ionicons name="people-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.trainingScrollMetaText, { color: colors.textMuted }]}>
              {training.team.name}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// STAT PILL
// ═══════════════════════════════════════════════════════════════════════════
const StatPill = React.memo(function StatPill({
  icon,
  value,
  label,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statPillIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={[styles.statPillValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statPillLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// QUICK ACTION BUTTON
// ═══════════════════════════════════════════════════════════════════════════
const QuickActionButton = React.memo(function QuickActionButton({
  icon,
  label,
  color = '#ffffff',
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════════
const SectionHeader = React.memo(function SectionHeader({
  title,
  action,
  onAction,
  colors,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.6}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY ROW (Subtle/Muted)
// ═══════════════════════════════════════════════════════════════════════════
const ActivityRow = React.memo(function ActivityRow({
  session,
  colors,
  onPress,
}: {
  session: SessionWithDetails;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const isActive = session.status === 'active';
  const isPersonal = !session.team_id;
  const duration = session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000);
  const sessionDate = format(new Date(session.started_at), 'MMM d');

  return (
    <TouchableOpacity
      style={styles.activityRowSubtle}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.activityContentSubtle}>
        <Text style={[styles.activityTitleSubtle, { color: colors.textMuted }]} numberOfLines={1}>
          {session.training_title || session.drill_name || 'Free Session'}
        </Text>
        <Text style={[styles.activityMetaSubtle, { color: colors.border }]}>
          {sessionDate} · {isActive ? 'Active' : `${duration}m`}
          {isPersonal ? '' : ` · ${session.team_name || 'Team'}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// TIP CARD
// ═══════════════════════════════════════════════════════════════════════════
const TipCard = React.memo(function TipCard({
  icon,
  title,
  description,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.tipIconContainer, { backgroundColor: colors.primary + '10' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.tipContent}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.tipDesc, { color: colors.textMuted }]}>{description}</Text>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT ROW
// ═══════════════════════════════════════════════════════════════════════════
const InsightRow = React.memo(function InsightRow({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightLeft}>
        <Ionicons name={icon} size={16} color={colors.textMuted} />
        <Text style={[styles.insightLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.insightValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const PersonalHomePage = React.memo(function PersonalHomePage() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { fullName } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();
  const { sessions, sessionsLoading, loadTeams } = useWorkspaceData();
  const { loadSessions } = useSessionStore();
  const [refreshing, setRefreshing] = useState(false);

  const {
    myUpcomingTrainings,
    loadingMyTrainings,
    loadMyUpcomingTrainings,
    loadMyStats,
  } = useTrainingStore();

  useFocusEffect(
    useCallback(() => {
      loadSessions();
      loadMyUpcomingTrainings();
      loadMyStats();
    }, [loadSessions, loadMyUpcomingTrainings, loadMyStats])
  );

  const stats = useSessionStats(sessions);

  useEffect(() => {
    setOnSessionCreated(() => loadSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  const { onStartSession, onCreateTeam } = useWorkspaceActions();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadSessions(), loadMyUpcomingTrainings(), loadMyStats()]);
    setRefreshing(false);
  }, [loadSessions, loadMyUpcomingTrainings, loadMyStats]);

  // Data Filtering
  const activeSessions = useMemo(() => sessions.filter(s => s.status === 'active'), [sessions]);
  const ongoingTrainings = useMemo(() => myUpcomingTrainings.filter(t => t.status === 'ongoing'), [myUpcomingTrainings]);
  const plannedTrainings = useMemo(() => myUpcomingTrainings.filter(t => t.status === 'planned'), [myUpcomingTrainings]);
  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  // Calculate time
  const totalTime = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, session) => {
      if (session.started_at && session.ended_at) {
        return acc + (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / (1000 * 60);
      }
      return acc;
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return hours > 0 ? `${hours}h` : `${mins}m`;
  }, [sessions]);

  // Navigation
  const nav = useMemo(() => ({
    startSession: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onStartSession(); },
    createTeam: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCreateTeam(); },
    viewProgress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
    viewScans: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(protected)/scans' as any); },
    resumeSession: (id: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/(protected)/activeSession?sessionId=${id}` as any); },
    trainingLive: (id: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/(protected)/trainingLive?trainingId=${id}` as any); },
  }), [onStartSession, onCreateTeam]);

  // Featured content
  const featuredSession = activeSessions[0];
  const featuredTraining = ongoingTrainings[0] || plannedTrainings[0];

  const isLoading = sessionsLoading || loadingMyTrainings;

  if (isLoading && sessions.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <Text style={[styles.headerGreeting, { color: colors.textMuted }]}>Welcome back,</Text>
          <Text style={[styles.headerName, { color: colors.text }]}>{fullName || 'User'}</Text>
        </View>

        {/* ═══ HERO SECTION ═══ */}
        {featuredSession && (
          <View style={styles.heroSection}>
            <HeroCard
              title={featuredSession.training_title || featuredSession.drill_name || 'Active Session'}
              subtitle="IN PROGRESS"
              meta={featuredSession.team_name || undefined}
              actionLabel="Resume Session"
              onPress={() => nav.resumeSession(featuredSession.id)}
              gradientColors={['#6366F1', '#8B5CF6']}
              icon="fitness"
            />
          </View>
        )}

        {!featuredSession && featuredTraining && (
          <View style={styles.heroSection}>
            <HeroCard
              title={featuredTraining.title}
              subtitle={featuredTraining.status === 'ongoing' ? 'LIVE NOW' : 'UP NEXT'}
              meta={featuredTraining.team?.name}
              actionLabel={featuredTraining.status === 'ongoing' ? 'Join Now' : 'View Details'}
              onPress={() => nav.trainingLive(featuredTraining.id)}
              gradientColors={featuredTraining.status === 'ongoing' ? ['#10B981', '#059669'] : ['#3B82F6', '#2563EB']}
              icon="calendar"
            />
          </View>
        )}

        {/* ═══ STATS ROW ═══ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
          style={styles.statsScrollView}
        >
          <StatPill icon="layers-outline" value={stats.totalSessions} label="Sessions" color="#6366F1" colors={colors} />
          <StatPill icon="checkmark-circle-outline" value={stats.completedSessions} label="Completed" color="#10B981" colors={colors} />
          <StatPill icon="time-outline" value={totalTime} label="Total Time" color="#F59E0B" colors={colors} />
          <StatPill icon="calendar-outline" value={plannedTrainings.length} label="Upcoming" color="#3B82F6" colors={colors} />
        </ScrollView>

        {/* ═══ QUICK ACTIONS ═══ */}
        <View style={styles.section}>
          <SectionHeader title="Quick Actions" colors={colors} />
          <View style={styles.quickActionsGrid}>
            <QuickActionButton icon="add-circle" label="Session" colors={colors} onPress={nav.startSession} />
            <QuickActionButton icon="scan" label="Scans" colors={colors} onPress={nav.viewScans} />
            <QuickActionButton icon="stats-chart" label="Progress" colors={colors} onPress={nav.viewProgress} />
          </View>
        </View>

        {/* ═══ UPCOMING TRAININGS ═══ */}
        {plannedTrainings.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Upcoming Trainings" action="See all" onAction={() => {}} colors={colors} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trainingsRow}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH + 12}
            >
              {plannedTrainings.slice(0, 5).map(training => (
                <TrainingScrollCard
                  key={training.id}
                  training={training}
                  colors={colors}
                  onPress={() => nav.trainingLive(training.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ═══ TRAINING TIPS ═══ */}
        <View style={styles.section}>
          <SectionHeader title="Tips & Insights" colors={colors} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tipsRow}
          >
            <TipCard
              icon="bulb-outline"
              title="Consistency wins"
              description="Short daily sessions beat long occasional ones"
              colors={colors}
            />
            <TipCard
              icon="analytics-outline"
              title="Track progress"
              description="Review your scans to identify patterns"
              colors={colors}
            />
            <TipCard
              icon="people-outline"
              title="Train together"
              description="Join a team for accountability"
              colors={colors}
            />
          </ScrollView>
        </View>

        {/* ═══ YOUR INSIGHTS ═══ */}
        <View style={styles.section}>
          <SectionHeader title="Your Stats" colors={colors} />
          <View style={[styles.insightsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InsightRow icon="flame-outline" label="Current streak" value={stats.totalSessions > 0 ? '3 days' : '—'} colors={colors} />
            <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
            <InsightRow icon="trending-up-outline" label="This week" value={`${Math.min(stats.totalSessions, 5)} sessions`} colors={colors} />
            <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
            <InsightRow icon="ribbon-outline" label="Best session" value={totalTime !== '0m' ? totalTime : '—'} colors={colors} />
          </View>
        </View>

        {/* ═══ SESSION HISTORY (Subtle) ═══ */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Session History" colors={colors} />
            <View style={[styles.historyContainer, { borderColor: colors.border }]}>
              {recentSessions.map((session, index) => (
                <React.Fragment key={session.id}>
                  <ActivityRow
                    session={session}
                    colors={colors}
                    onPress={() => session.status === 'active' ? nav.resumeSession(session.id) : {}}
                  />
                  {index < recentSessions.length - 1 && (
                    <View style={[styles.historyDivider, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* ═══ EMPTY STATE ═══ */}
        {plannedTrainings.length === 0 && recentSessions.length === 0 && !featuredSession && (
          <View style={styles.section}>
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="rocket-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to train?</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Start your first session or join a team to get going
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={nav.startSession}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Start Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

    </View>
  );
});

export default PersonalHomePage;

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 8, paddingHorizontal: 20 },
  headerGreeting: { fontSize: 15, marginBottom: 4 },
  headerName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },

  // Hero
  heroSection: { paddingHorizontal: 20, marginTop: 8 },
  heroCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  heroGradient: { padding: 20, minHeight: 160, justifyContent: 'space-between' },
  heroContent: { flex: 1, zIndex: 1 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 12, letterSpacing: -0.3 },
  heroMeta: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  heroActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  heroIconContainer: { position: 'absolute', right: -10, bottom: -10, opacity: 0.5 },

  // Stats
  statsScrollView: { marginTop: 20 },
  statsRow: { paddingHorizontal: 20, gap: 12 },
  statPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  statPillIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statPillValue: { fontSize: 18, fontWeight: '700' },
  statPillLabel: { fontSize: 12, marginTop: 1 },

  // Section
  section: { marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  sectionAction: { fontSize: 14, fontWeight: '600' },

  // Quick Actions
  quickActionsGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  quickActionBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickActionLabel: { fontSize: 12, fontWeight: '600' },

  // Training Scroll Cards
  trainingsRow: { paddingHorizontal: 20, gap: 12 },
  trainingScrollCard: { width: CARD_WIDTH, borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  trainingScrollAccent: { width: 4 },
  trainingScrollContent: { flex: 1, padding: 16 },
  trainingScrollTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  trainingScrollMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  trainingScrollMetaText: { fontSize: 13 },

  // Tips
  tipsRow: { paddingHorizontal: 20, gap: 12 },
  tipCard: { width: 200, padding: 16, borderRadius: 14, borderWidth: 1 },
  tipIconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tipDesc: { fontSize: 12, lineHeight: 16 },

  // Insights Card
  insightsCard: { marginHorizontal: 20, borderRadius: 14, borderWidth: 1, padding: 4 },
  insightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14 },
  insightLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightLabel: { fontSize: 14 },
  insightValue: { fontSize: 14, fontWeight: '600' },
  insightDivider: { height: 1, marginHorizontal: 14 },

  // Session History (Subtle)
  historyContainer: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  historyDivider: { height: 1, marginLeft: 16 },
  activityRowSubtle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  activityContentSubtle: { flex: 1 },
  activityTitleSubtle: { fontSize: 14, marginBottom: 2 },
  activityMetaSubtle: { fontSize: 12 },

  // Empty State
  emptyState: { marginHorizontal: 20, alignItems: 'center', padding: 32, borderRadius: 20, borderWidth: 1 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
