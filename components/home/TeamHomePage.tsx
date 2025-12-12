import { useColors } from '@/hooks/ui/useColors';
import { useCanManageTeam, useMyTeamRole, useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Plus, Settings, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BUTTON_GRADIENT } from '@/theme/colors';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function TeamHomePage() {
  const colors = useColors();
  
  const { 
    teams, 
    activeTeamId, 
    activeTeam, 
    members, 
    loading,
    loadTeams,
    loadActiveTeam,
    loadMembers,
  } = useTeamStore();
  
  const { teamTrainings, loadingTeamTrainings, loadTeamTrainings } = useTrainingStore();
  
  const myRole = useMyTeamRole();
  const canManage = useCanManageTeam();

  const [refreshing, setRefreshing] = useState(false);
  
  // Load team trainings when team changes
  useEffect(() => {
    if (activeTeamId) {
      loadTeamTrainings(activeTeamId);
    }
  }, [activeTeamId, loadTeamTrainings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      loadTeams(),
      activeTeamId ? loadActiveTeam() : Promise.resolve(),
      activeTeamId ? loadMembers() : Promise.resolve(),
      activeTeamId ? loadTeamTrainings(activeTeamId) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [loadTeams, loadActiveTeam, loadMembers, loadTeamTrainings, activeTeamId]);

  // Navigation
  const nav = useMemo(() => ({
    createTeam: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(protected)/createTeam' as any);
    },
    joinTeam: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(protected)/acceptInvite' as any);
    },
    createTraining: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(protected)/createTraining' as any);
    },
    manageTeam: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(protected)/teamManage' as any);
    },
  }), []);

  // Role label
  const roleLabel = useMemo(() => {
    if (!myRole) return '';
    return myRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }, [myRole]);

  const currentTeam = teams.find(t => t.id === activeTeamId);

  // Live training (if any is currently ongoing)
  const liveTraining = useMemo(() => {
    return teamTrainings.find(t => t.status === 'ongoing');
  }, [teamTrainings]);

  // Next upcoming training
  const nextTraining = useMemo(() => {
    const now = new Date();
    return teamTrainings
      .filter(t => t.status === 'planned' && t.scheduled_at && new Date(t.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];
  }, [teamTrainings]);

  // Insights for anomaly detection (for owners/commanders)
  const insights = useMemo(() => {
    const now = new Date();
    const msDay = 24 * 60 * 60 * 1000;
    const ms30d = 30 * msDay;

    const getEventDate = (t: any) =>
      new Date(t.ended_at || t.scheduled_at || t.created_at || now);

    // Completion rate (last 30d) vs baseline (previous 30d)
    const windowLast30Start = new Date(now.getTime() - ms30d);
    const windowPrev30Start = new Date(now.getTime() - 2 * ms30d);

    const last30 = teamTrainings.filter((t) => {
      const d = getEventDate(t);
      return d >= windowLast30Start && d <= now;
    });
    const prev30 = teamTrainings.filter((t) => {
      const d = getEventDate(t);
      return d >= windowPrev30Start && d < windowLast30Start;
    });

    const last30Completed = last30.filter((t) => t.status === 'finished').length;
    const last30Cancelled = last30.filter((t) => t.status === 'cancelled').length;
    const last30Denom = last30Completed + last30Cancelled;
    const last30Rate = last30Denom > 0 ? Math.round((last30Completed / last30Denom) * 100) : null;

    const prev30Completed = prev30.filter((t) => t.status === 'finished').length;
    const prev30Cancelled = prev30.filter((t) => t.status === 'cancelled').length;
    const prev30Denom = prev30Completed + prev30Cancelled;
    const baselineRate = prev30Denom > 0 ? Math.round((prev30Completed / prev30Denom) * 100) : null;

    // Anomaly = significant deviation from baseline
    const hasAnomaly =
      last30Rate !== null &&
      baselineRate !== null &&
      Math.abs(last30Rate - baselineRate) >= 20;
    
    const isPositive = (last30Rate ?? 0) > (baselineRate ?? 0);

    // Weekly bars (8w completed trainings)
    const weeks = 8;
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());

    const weekBars = Array.from({ length: weeks }, (_, i) => {
      const start = new Date(startOfThisWeek);
      start.setDate(start.getDate() - (weeks - 1 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end, count: 0, isCurrent: i === weeks - 1 };
    });
    
    for (const t of teamTrainings) {
      if (t.status !== 'finished') continue;
      const d = getEventDate(t);
      const b = weekBars.find((w) => d >= w.start && d < w.end);
      if (b) b.count += 1;
    }
    
    const maxWeek = Math.max(1, ...weekBars.map((b) => b.count));
    
    // Find the peak week (for the tooltip callout)
    let peakIdx = 0;
    let peakCount = 0;
    weekBars.forEach((b, i) => {
      if (b.count > peakCount) {
        peakCount = b.count;
        peakIdx = i;
      }
    });

    // Anomaly description
    let anomalyDescription = '';
    if (hasAnomaly) {
      const diff = Math.abs((last30Rate ?? 0) - (baselineRate ?? 0));
      if (isPositive) {
        anomalyDescription = `Training completion is ${diff}% higher than expected. Your team is exceeding predictions.`;
      } else {
        anomalyDescription = `Training completion dropped ${diff}% below baseline. Consider reviewing team engagement.`;
      }
    }

    return {
      hasAnomaly,
      isPositive,
      last30Rate,
      baselineRate,
      last30Completed,
      weekBars,
      maxWeek,
      peakIdx,
      peakCount,
      anomalyDescription,
    };
  }, [teamTrainings]);

  // Only show full-page loader on initial load
  const isLoading = (loading || loadingTeamTrainings) && teams.length === 0;
  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // No teams - show empty state
  if (teams.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState colors={colors} onCreateTeam={nav.createTeam} onJoinTeam={nav.joinTeam} />
      </View>
    );
  }

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
            <Text style={[styles.teamName, { color: colors.text }]}>
              {currentTeam?.name || 'Team'}
            </Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(myRole) + '20' }]}>
                <Text style={[styles.roleText, { color: getRoleColor(myRole) }]}>{roleLabel}</Text>
              </View>
              {currentTeam?.squads && currentTeam.squads.length > 0 && (
                <Text style={[styles.squadCount, { color: colors.textMuted }]}>
                  • {currentTeam.squads.length} squads
                </Text>
              )}
            </View>
          </View>
          {canManage && (
            <TouchableOpacity 
              style={[styles.settingsButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={nav.manageTeam}
            >
              <Settings size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            STATS CARD
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.section}>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {members.length || currentTeam?.member_count || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Members</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {currentTeam?.squads?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Squads</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {teamTrainings.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Trainings</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            LIVE TRAINING BANNER (if ongoing)
        ══════════════════════════════════════════════════════════════════════ */}
        {liveTraining && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <TouchableOpacity
              style={[styles.liveBanner, { borderColor: 'rgba(147,197,253,0.3)' }]}
              onPress={() => router.push(`/(protected)/trainingLive?trainingId=${liveTraining.id}` as any)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[...BUTTON_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.liveBannerInner}
              >
                <View style={styles.liveBannerLeft}>
                  <View style={styles.liveDot} />
                  <View>
                    <Text style={styles.liveBannerLabel}>LIVE NOW</Text>
                    <Text style={styles.liveBannerTitle} numberOfLines={1}>{liveTraining.title}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            NEXT TRAINING CARD (if scheduled)
        ══════════════════════════════════════════════════════════════════════ */}
        {!liveTraining && nextTraining && (
          <TouchableOpacity
            style={[styles.nextTrainingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/(protected)/trainingDetail?id=${nextTraining.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.nextTrainingIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Calendar size={20} color="#3B82F6" />
            </View>
            <View style={styles.nextTrainingContent}>
              <Text style={[styles.nextTrainingLabel, { color: colors.textMuted }]}>NEXT UP</Text>
              <Text style={[styles.nextTrainingTitle, { color: colors.text }]} numberOfLines={1}>
                {nextTraining.title}
              </Text>
              <Text style={[styles.nextTrainingTime, { color: colors.textMuted }]}>
                {formatDistanceToNow(new Date(nextTraining.scheduled_at!), { addSuffix: true })}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            QUICK ACTIONS
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {/* All Trainings */}
            <TouchableOpacity
              onPress={() => router.push('/(protected)/team/trainings' as any)}
              activeOpacity={0.9}
              style={styles.actionCardGradient}
            >
              <LinearGradient
                colors={[...BUTTON_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGradientInner}
              >
                <Calendar size={18} color="#fff" />
                <Text style={styles.actionGradientText}>All Trainings</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* New Training (managers only) or Team info */}
            {canManage ? (
              <TouchableOpacity
                onPress={nav.createTraining}
                activeOpacity={0.9}
                style={[styles.actionCardSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Plus size={18} color={colors.text} />
                <Text style={[styles.actionSecondaryText, { color: colors.text }]}>Schedule</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/(protected)/team/manage' as any)}
                activeOpacity={0.9}
                style={[styles.actionCardSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Users size={18} color={colors.text} />
                <Text style={[styles.actionSecondaryText, { color: colors.text }]}>Members</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            INSIGHTS CARD (for owners/commanders)
        ══════════════════════════════════════════════════════════════════════ */}
        {canManage && (
          <View style={styles.section}>
            <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Header row */}
              <View style={styles.insightHeader}>
                <View style={styles.insightTitleBlock}>
                  <Text style={[styles.insightTitle, { color: colors.text }]}>
                    {insights.hasAnomaly ? 'Anomaly Detected' : 'Team Momentum'}
                  </Text>
                  <Text style={[styles.insightDesc, { color: colors.textMuted }]}>
                    {insights.hasAnomaly 
                      ? insights.anomalyDescription
                      : 'Training completion trends over the last 8 weeks.'}
                  </Text>
                </View>
                <View style={[
                  styles.insightBadge, 
                  { backgroundColor: insights.hasAnomaly 
                      ? (insights.isPositive ? '#10B98120' : '#F59E0B20') 
                      : '#3B82F620' 
                  }
                ]}>
                  <Ionicons 
                    name={insights.hasAnomaly ? 'flag' : 'analytics'} 
                    size={20} 
                    color={insights.hasAnomaly 
                      ? (insights.isPositive ? '#10B981' : '#F59E0B') 
                      : '#3B82F6'
                    } 
                  />
                </View>
              </View>

              {/* Bar chart */}
              <View style={styles.chartContainer}>
                {/* Dotted reference lines */}
                <View style={[styles.chartLine, { top: '25%', borderColor: colors.border }]} />
                <View style={[styles.chartLine, { top: '50%', borderColor: colors.border }]} />
                <View style={[styles.chartLine, { top: '75%', borderColor: colors.border }]} />
                
                <View style={styles.chartBars}>
                  {insights.weekBars.map((bar, idx) => {
                    const heightPct = Math.max(8, (bar.count / insights.maxWeek) * 100);
                    const isPeak = idx === insights.peakIdx && bar.count > 0;
                    const isCurrent = bar.isCurrent;
                    
                    return (
                      <View key={idx} style={styles.chartBarCol}>
                        {/* Peak tooltip */}
                        {isPeak && insights.peakCount > 0 && (
                          <View style={styles.peakTooltip}>
                            <Text style={styles.peakTooltipText}>+{insights.peakCount}</Text>
                            <View style={styles.peakTooltipArrow} />
                          </View>
                        )}
                        <View style={[styles.chartBarTrack, { backgroundColor: colors.secondary }]}>
                          {isCurrent || isPeak ? (
                            <LinearGradient
                              colors={isPeak 
                                ? ['#5EEAD4', '#14B8A6'] 
                                : ['#93C5FD', '#3B82F6']
                              }
                              start={{ x: 0.5, y: 1 }}
                              end={{ x: 0.5, y: 0 }}
                              style={[styles.chartBarFill, { height: `${heightPct}%` }]}
                            />
                          ) : (
                            <View
                              style={[
                                styles.chartBarFill,
                                { 
                                  height: `${heightPct}%`, 
                                  backgroundColor: '#5EEAD440',
                                }
                              ]}
                            />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Bottom stats row */}
              <View style={styles.insightFooter}>
                <View>
                  <Text style={[styles.insightBigNum, { color: colors.text }]}>
                    {insights.last30Rate !== null ? `${insights.last30Rate}%` : '—'}
                  </Text>
                  <Text style={[styles.insightMeta, { color: colors.textMuted }]}>
                    Prediction {insights.baselineRate !== null ? `${insights.baselineRate}%` : '—'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.seeDetailsBtn, { borderColor: colors.primary }]}
                  onPress={() => router.push('/(protected)/team/trainings' as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.seeDetailsBtnText, { color: colors.primary }]}>See Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function EmptyState({ 
  colors, 
  onCreateTeam, 
  onJoinTeam 
}: { 
  colors: ReturnType<typeof useColors>;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
}) {
  return (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.emptyIcon, { backgroundColor: 'rgba(147,197,253,0.15)' }]}>
        <Users size={48} color="#93C5FD" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No team yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Create a team to start training together, or join one with an invite code
      </Text>
      
      <View style={styles.emptyActions}>
        <TouchableOpacity
          style={styles.primaryBtnWrapper}
          onPress={onCreateTeam}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[...BUTTON_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtnGradient}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Create Team</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onJoinTeam}
          activeOpacity={0.7}
        >
          <Ionicons name="enter-outline" size={18} color={colors.text} />
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Join with Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function getRoleColor(role: string | null): string {
  switch (role) {
    case 'owner': return '#93C5FD';
    case 'commander': return '#A5B4FC';
    case 'squad_commander': return '#9CA3AF';
    case 'soldier': return '#6B7280';
    default: return '#6B7280';
  }
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  teamName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 12, fontWeight: '600' },
  squadCount: { fontSize: 13 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2, marginLeft: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLink: { fontSize: 12, fontWeight: '600' },

  // Stats Card
  statsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 32 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCardGradient: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradientInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    minHeight: 50,
  },
  actionGradientText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  actionCardSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Live Banner
  liveBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  liveBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  liveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  liveBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  liveBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },

  // Next Training Card
  nextTrainingCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  nextTrainingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTrainingContent: {
    flex: 1,
  },
  nextTrainingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nextTrainingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  nextTrainingTime: {
    fontSize: 12,
    marginTop: 2,
  },

  // Insight Card (Anomaly)
  insightCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightTitleBlock: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  insightDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  insightBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    height: 100,
    marginTop: 20,
    marginBottom: 16,
    position: 'relative',
  },
  chartLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dotted',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 20,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarTrack: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  peakTooltip: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  peakTooltipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  peakTooltipArrow: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1F2937',
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  insightBigNum: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  insightMeta: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  seeDetailsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  seeDetailsBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyActions: { width: '100%', gap: 12 },
  primaryBtnWrapper: { borderRadius: 12, overflow: 'hidden' },
  primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1, gap: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: '500' },
});

export default TeamHomePage;
