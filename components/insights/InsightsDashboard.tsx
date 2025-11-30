import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useSessionStats } from '@/hooks/useSessionStats';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { useSessionStore } from '@/store/sessionStore';
import { useTrainingStore } from '@/store/trainingStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { format, subDays, isToday, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// HERO STAT CARD
// ═══════════════════════════════════════════════════════════════════════════
const HeroStatCard = React.memo(function HeroStatCard({
  title,
  value,
  subtitle,
  icon,
  gradientColors,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: [string, string];
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={styles.heroStatCard}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroStatGradient}>
        <View style={styles.heroStatIcon}>
          <Ionicons name={icon} size={24} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.heroStatValue}>{value}</Text>
        <Text style={styles.heroStatTitle}>{title}</Text>
        <Text style={styles.heroStatSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MINI STAT CARD
// ═══════════════════════════════════════════════════════════════════════════
const MiniStatCard = React.memo(function MiniStatCard({
  icon,
  value,
  label,
  color,
  colors,
  delay = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  colors: typeof Colors.light;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInRight.delay(delay).duration(400)}
      style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.miniStatIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.miniStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// WEEKLY ACTIVITY CHART
// ═══════════════════════════════════════════════════════════════════════════
const WeeklyActivityChart = React.memo(function WeeklyActivityChart({
  sessions,
  colors,
}: {
  sessions: any[];
  colors: typeof Colors.light;
}) {
  // Get current week days
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Count sessions per day
  const dailyCounts = weekDays.map(day => {
    const count = sessions.filter(s => isSameDay(new Date(s.started_at), day)).length;
    return { day, count, label: format(day, 'EEE') };
  });

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>This Week</Text>
          <View style={[styles.chartBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.chartBadgeText, { color: colors.primary }]}>
              {sessions.filter(s => {
                const d = new Date(s.started_at);
                return d >= weekStart && d <= weekEnd;
              }).length} sessions
            </Text>
          </View>
        </View>
        
        <View style={styles.chartBars}>
          {dailyCounts.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 80 : 8;
            const today = isToday(item.day);
            
            return (
              <Animated.View
                key={item.label}
                entering={FadeInDown.delay(400 + index * 50).duration(400)}
                style={styles.chartBarColumn}
              >
                <View style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: Math.max(height, 8),
                        backgroundColor: today ? colors.primary : colors.primary + '30',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.chartBarLabel, { color: today ? colors.primary : colors.textMuted }]}>
                  {item.label}
                </Text>
                {item.count > 0 && (
                  <Text style={[styles.chartBarCount, { color: colors.textMuted }]}>{item.count}</Text>
                )}
              </Animated.View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// STREAK CARD
// ═══════════════════════════════════════════════════════════════════════════
const StreakCard = React.memo(function StreakCard({
  sessions,
  colors,
}: {
  sessions: any[];
  colors: typeof Colors.light;
}) {
  // Calculate streak (consecutive days with sessions)
  const streak = useMemo(() => {
    let count = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(currentDate, i);
      const hasSession = sessions.some(s => isSameDay(new Date(s.started_at), checkDate));
      
      if (hasSession) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [sessions]);

  const streakDays = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const hasSession = sessions.some(s => isSameDay(new Date(s.started_at), day));
    return { day, hasSession, label: format(day, 'EEEEE') };
  });

  return (
    <Animated.View entering={FadeInDown.delay(500).duration(500)}>
      <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.streakHeader}>
          <View style={styles.streakInfo}>
            <View style={styles.streakIconContainer}>
              <Ionicons name="flame" size={28} color="#F59E0B" />
            </View>
            <View>
              <Text style={[styles.streakValue, { color: colors.text }]}>{streak} day{streak !== 1 ? 's' : ''}</Text>
              <Text style={[styles.streakLabel, { color: colors.textMuted }]}>Current Streak</Text>
            </View>
          </View>
          {streak >= 7 && (
            <View style={[styles.streakBadge, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="trophy" size={14} color="#F59E0B" />
              <Text style={[styles.streakBadgeText, { color: '#F59E0B' }]}>On Fire!</Text>
            </View>
          )}
        </View>
        
        <View style={styles.streakDays}>
          {streakDays.map((item, index) => (
            <View key={index} style={styles.streakDayColumn}>
              <View
                style={[
                  styles.streakDot,
                  {
                    backgroundColor: item.hasSession ? '#10B981' : colors.border,
                    borderColor: item.hasSession ? '#10B981' : colors.border,
                  },
                ]}
              >
                {item.hasSession && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={[styles.streakDayLabel, { color: colors.textMuted }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// RECENT SESSION ROW
// ═══════════════════════════════════════════════════════════════════════════
const RecentSessionRow = React.memo(function RecentSessionRow({
  session,
  colors,
  delay = 0,
}: {
  session: any;
  colors: typeof Colors.light;
  delay?: number;
}) {
  const duration = session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : null;

  const statusColor = session.status === 'completed' ? '#10B981' : session.status === 'active' ? colors.primary : colors.textMuted;

  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(400)}>
      <TouchableOpacity
        style={[styles.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={[styles.sessionIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.sessionContent}>
          <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
            {session.training_title || session.drill_name || 'Free Session'}
          </Text>
          <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
            {format(new Date(session.started_at), 'MMM d, HH:mm')}
            {duration && ` · ${duration}m`}
          </Text>
        </View>
        <View style={[styles.sessionBadge, { backgroundColor: statusColor + '15' }]}>
          <Text style={[styles.sessionBadgeText, { color: statusColor }]}>
            {session.status === 'completed' ? 'Done' : session.status === 'active' ? 'Live' : 'Cancelled'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS RING
// ═══════════════════════════════════════════════════════════════════════════
const ProgressRing = React.memo(function ProgressRing({
  progress,
  size,
  strokeWidth,
  color,
  bgColor,
  children,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.ringBg, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: bgColor }]} />
      </View>
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <View
          style={[
            styles.ringProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: `${(progress / 100) * 360}deg` }],
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const InsightsDashboard = React.memo(function InsightsDashboard() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [refreshing, setRefreshing] = useState(false);
  const { sessions } = useWorkspaceData();
  const { loadSessions } = useSessionStore();
  const { loadMyStats, myStats } = useTrainingStore();

  useFocusEffect(
    useCallback(() => {
      loadSessions();
      loadMyStats();
    }, [loadSessions, loadMyStats])
  );

  const stats = useSessionStats(sessions);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadSessions(), loadMyStats()]);
    setRefreshing(false);
  }, [loadSessions, loadMyStats]);

  // Calculate total time
  const totalTime = useMemo(() => {
    const totalMinutes = sessions.reduce((acc, session) => {
      if (session.started_at && session.ended_at) {
        return acc + (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / (1000 * 60);
      }
      return acc;
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return { hours, mins, display: hours > 0 ? `${hours}h ${mins}m` : `${mins}m` };
  }, [sessions]);

  // Completion rate
  const completionRate = useMemo(() => {
    if (stats.totalSessions === 0) return 0;
    return Math.round((stats.completedSessions / stats.totalSessions) * 100);
  }, [stats]);

  // Recent sessions (last 5)
  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Your training analytics</Text>
        </View>

        {/* Hero Stats */}
        <View style={styles.heroStatsRow}>
          <HeroStatCard
            title="Sessions"
            value={stats.totalSessions}
            subtitle="Total completed"
            icon="layers"
            gradientColors={['#6366F1', '#8B5CF6']}
            delay={0}
          />
          <HeroStatCard
            title="Time"
            value={totalTime.display}
            subtitle="Training time"
            icon="time"
            gradientColors={['#10B981', '#059669']}
            delay={100}
          />
        </View>

        {/* Completion Ring */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View style={[styles.completionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.completionContent}>
              <ProgressRing
                progress={completionRate}
                size={100}
                strokeWidth={10}
                color={colors.primary}
                bgColor={colors.border}
              >
                <Text style={[styles.completionValue, { color: colors.text }]}>{completionRate}%</Text>
              </ProgressRing>
              <View style={styles.completionInfo}>
                <Text style={[styles.completionTitle, { color: colors.text }]}>Completion Rate</Text>
                <Text style={[styles.completionSubtitle, { color: colors.textMuted }]}>
                  {stats.completedSessions} of {stats.totalSessions} sessions finished
                </Text>
                <View style={styles.completionStats}>
                  <View style={styles.completionStatItem}>
                    <View style={[styles.completionDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.completionStatText, { color: colors.textMuted }]}>
                      {stats.completedSessions} completed
                    </Text>
                  </View>
                  <View style={styles.completionStatItem}>
                    <View style={[styles.completionDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.completionStatText, { color: colors.textMuted }]}>
                      {stats.activeSessions} active
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Mini Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.miniStatsRow}
          style={styles.miniStatsScroll}
        >
          <MiniStatCard icon="checkmark-circle" value={stats.completedSessions} label="Completed" color="#10B981" colors={colors} delay={300} />
          <MiniStatCard icon="radio-button-on" value={stats.activeSessions} label="Active" color="#6366F1" colors={colors} delay={350} />
          <MiniStatCard icon="calendar" value={myStats.upcoming} label="Upcoming" color="#3B82F6" colors={colors} delay={400} />
          <MiniStatCard icon="trending-up" value={`${totalTime.hours}h`} label="This Month" color="#F59E0B" colors={colors} delay={450} />
        </ScrollView>

        {/* Weekly Activity */}
        <WeeklyActivityChart sessions={sessions} colors={colors} />

        {/* Streak */}
        <StreakCard sessions={sessions} colors={colors} />

        {/* Recent Activity */}
        {recentSessions.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
              <TouchableOpacity>
                <Text style={[styles.sectionAction, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sessionsList}>
              {recentSessions.map((session, index) => (
                <RecentSessionRow key={session.id} session={session} colors={colors} delay={600 + index * 50} />
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {sessions.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No data yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Complete some sessions to see your insights
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 8 : 16 },

  // Header
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  headerSubtitle: { fontSize: 15, marginTop: 4 },

  // Hero Stats
  heroStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  heroStatCard: { flex: 1, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  heroStatGradient: { padding: 20, minHeight: 140 },
  heroStatIcon: { marginBottom: 12 },
  heroStatValue: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  heroStatTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  heroStatSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Completion Card
  completionCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  completionContent: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  completionValue: { fontSize: 24, fontWeight: '800' },
  completionInfo: { flex: 1 },
  completionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  completionSubtitle: { fontSize: 13, marginBottom: 12 },
  completionStats: { gap: 6 },
  completionStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completionDot: { width: 8, height: 8, borderRadius: 4 },
  completionStatText: { fontSize: 13 },

  // Mini Stats
  miniStatsScroll: { marginBottom: 16 },
  miniStatsRow: { paddingRight: 16, gap: 12 },
  miniStatCard: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', minWidth: 100 },
  miniStatIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  miniStatValue: { fontSize: 20, fontWeight: '700' },
  miniStatLabel: { fontSize: 12, marginTop: 2 },

  // Chart Card
  chartCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 18, fontWeight: '700' },
  chartBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  chartBadgeText: { fontSize: 12, fontWeight: '600' },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  chartBarColumn: { flex: 1, alignItems: 'center' },
  chartBarWrapper: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '60%', borderRadius: 6, minHeight: 8 },
  chartBarLabel: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  chartBarCount: { fontSize: 10, marginTop: 2 },

  // Streak Card
  streakCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  streakInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F59E0B15', alignItems: 'center', justifyContent: 'center' },
  streakValue: { fontSize: 20, fontWeight: '700' },
  streakLabel: { fontSize: 13 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  streakBadgeText: { fontSize: 12, fontWeight: '600' },
  streakDays: { flexDirection: 'row', justifyContent: 'space-between' },
  streakDayColumn: { alignItems: 'center', gap: 6 },
  streakDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  streakDayLabel: { fontSize: 11, fontWeight: '600' },

  // Ring
  ringBg: {},
  ringProgress: {},

  // Recent Section
  recentSection: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionAction: { fontSize: 14, fontWeight: '600' },
  sessionsList: { gap: 10 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  sessionIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 14 },
  sessionContent: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sessionMeta: { fontSize: 13 },
  sessionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  sessionBadgeText: { fontSize: 11, fontWeight: '600' },

  // Empty State
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 20, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 4 },
});
