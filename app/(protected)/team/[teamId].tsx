/**
 * Team Context Screen
 *
 * Dashboard layout similar to UnifiedHomePage:
 * - NOW: Live training or next upcoming
 * - SCHEDULE: All trainings
 * - SQUAD: Team members and presence
 * - THIS WEEK: Performance stats (commanders)
 * - MANAGE: Quick actions (commanders)
 */

import { NoTeamsEmptyState } from '@/components/teams/NoTeamsEmptyState';
import { TeamSwitcherPill } from '@/components/teams/TeamSwitcherSheet';
import { COLORS, PULSE_ANIMATION } from '@/components/training/trainings.constants';
import { groupTrainingsByTimeframe } from '@/components/training/trainings.helpers';
import { useColors } from '@/hooks/ui/useColors';
import { getRecentSessionsWithStats } from '@/services/session/queries';
import { getTeamMembers } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { format, isToday, isTomorrow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Activity,
    ArrowLeft,
    BarChart3,
    BookOpen,
    Calendar,
    ChevronRight,
    Clock,
    Plus,
    Settings,
    Target,
    UserPlus,
    Users,
    Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated2, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// COMPONENTS
// ============================================================================

function PulseDot({ color }: { color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: PULSE_ANIMATION.minOpacity, duration: PULSE_ANIMATION.duration, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: PULSE_ANIMATION.maxOpacity, duration: PULSE_ANIMATION.duration, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: pulseAnim }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

function SectionHeader({ icon: Icon, label, color, iconBg }: { icon: any; label: string; color: string; iconBg: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
        <Icon size={14} color={color} />
      </View>
      <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getRoleConfig(role?: string) {
  switch (role) {
    case 'owner': return { label: 'Owner', color: '#F59E0B' };
    case 'commander': return { label: 'Commander', color: '#3B82F6' };
    case 'squad_commander': return { label: 'Squad Cmdr', color: '#8B5CF6' };
    default: return { label: 'Soldier', color: '#6B7280' };
  }
}

function getSmartTimeLabel(date: Date, isLive: boolean) {
  if (isLive) return 'Now';
  if (isToday(date)) return format(date, 'HH:mm');
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TeamContextScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { teams, setActiveTeam, loading: teamsLoading, initialized } = useTeamStore();
  const { teamTrainings, loadTeamTrainings, loadingTeamTrainings } = useTrainingStore();

  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [sessionStats, setSessionStats] = useState<{ shots: number; sessions: number; accuracy: number }>({ shots: 0, sessions: 0, accuracy: 0 });

  const activeTeam = useMemo(() => teams.find((t) => t.id === teamId) || null, [teams, teamId]);
  const canSchedule = ['owner', 'commander', 'squad_commander'].includes(activeTeam?.my_role || '');
  const canManage = ['owner', 'commander'].includes(activeTeam?.my_role || '');
  const roleConfig = activeTeam ? getRoleConfig(activeTeam.my_role) : null;
  const showSwitcher = teams.length > 1;

  useEffect(() => { if (teamId) setActiveTeam(teamId); }, [teamId, setActiveTeam]);

  useFocusEffect(useCallback(() => {
    if (teamId) {
      loadTeamTrainings(teamId);
      getTeamMembers(teamId).then(setMembers).catch(console.error);
      if (canManage) {
        getRecentSessionsWithStats({ days: 7, limit: 100, teamId }).then((sessions) => {
          const shots = sessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
          const acc = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.stats?.accuracy_pct || 0), 0) / sessions.length) : 0;
          setSessionStats({ shots, sessions: sessions.length, accuracy: acc });
        }).catch(console.error);
      }
    }
  }, [teamId, loadTeamTrainings, canManage]));

  const trainings = useMemo(() => teamTrainings.filter((t) => t.team_id === teamId), [teamTrainings, teamId]);
  const grouped = useMemo(() => groupTrainingsByTimeframe(trainings), [trainings]);
  const liveTraining = trainings.find((t) => t.status === 'ongoing');
  const upcomingTrainings = [...grouped.live, ...grouped.today, ...grouped.tomorrow, ...grouped.thisWeek, ...grouped.upcoming];
  const pastTrainings = grouped.past.filter((t) => t.status === 'finished');
  const nextTraining = upcomingTrainings.find((t) => t.status !== 'ongoing');

  const onlineCount = members.filter((m) => (m.profile as any)?.status === 'online').length;
  const trainingCount = members.filter((m) => (m.profile as any)?.status === 'training').length;

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (teamId) {
      await loadTeamTrainings(teamId);
      const m = await getTeamMembers(teamId).catch(() => []);
      setMembers(m);
    }
    setRefreshing(false);
  }, [teamId, loadTeamTrainings]);

  const goBack = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); };
  const goToTraining = (t: TrainingWithDetails) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(protected)/trainingDetail?id=${t.id}` as any); };
  const goToReport = (id: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/(protected)/trainingReport', params: { trainingId: id } }); };
  const createTraining = () => { if (!teamId) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/(protected)/createTraining?teamId=${teamId}` as any); };
  const inviteMember = () => { if (!teamId) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(protected)/inviteTeamMember?teamId=${teamId}` as any); };
  const viewMembers = () => { if (!teamId) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(protected)/teamMembers?teamId=${teamId}` as any); };
  const openLibrary = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(protected)/drillLibrary' as any); };
  const openSettings = () => { if (!teamId) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(protected)/teamSettings?teamId=${teamId}` as any); };

  if (!initialized || (teamsLoading && teams.length === 0)) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!activeTeam) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><NoTeamsEmptyState /></View>;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerLabel, { color: colors.textMuted }]}>TEAM</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{activeTeam.name}</Text>
        </View>
        {showSwitcher ? (
          <TeamSwitcherPill />
        ) : roleConfig ? (
          <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '15' }]}>
            <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
        ) : <View style={{ width: 60 }} />}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {loadingTeamTrainings ? (
          <View style={styles.loadingInner}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: NOW - What's happening                                    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <Animated2.View entering={FadeInDown.duration(300)} style={styles.sectionContainer}>
              <SectionHeader icon={Clock} label="NOW" color={colors.primary} iconBg={`${colors.primary}15`} />

              {liveTraining ? (
                <TouchableOpacity
                  style={[styles.liveCard, { borderColor: COLORS.live + '40' }]}
                  onPress={() => goToTraining(liveTraining)}
                  activeOpacity={0.9}
                >
                  <View style={styles.liveRow}>
                    <View style={styles.liveBadge}>
                      <PulseDot color="#fff" />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                    {trainingCount > 0 && <Text style={styles.liveParticipants}>{trainingCount} training</Text>}
                  </View>
                  <Text style={styles.liveTitle}>{liveTraining.title}</Text>
                  <Text style={styles.liveSub}>Tap to join</Text>
                </TouchableOpacity>
              ) : nextTraining ? (
                <TouchableOpacity
                  style={[styles.nextCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => goToTraining(nextTraining)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.nextTime, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.nextTimeText, { color: colors.primary }]}>
                      {isToday(new Date(nextTraining.scheduled_at)) ? format(new Date(nextTraining.scheduled_at), 'HH:mm') : getSmartTimeLabel(new Date(nextTraining.scheduled_at), false)}
                    </Text>
                  </View>
                  <View style={styles.nextInfo}>
                    <Text style={[styles.nextLabel, { color: colors.textMuted }]}>Next Training</Text>
                    <Text style={[styles.nextTitle, { color: colors.text }]} numberOfLines={1}>{nextTraining.title}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.emptyNow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Calendar size={20} color={colors.textMuted} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyNowText, { color: colors.textMuted }]}>No upcoming trainings</Text>
                </View>
              )}

              {/* Quick Actions for commanders */}
              {canSchedule && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={[styles.actionPrimary, { backgroundColor: colors.text }]} onPress={createTraining} activeOpacity={0.85}>
                    <Plus size={16} color={colors.background} strokeWidth={2.5} />
                    <Text style={[styles.actionPrimaryText, { color: colors.background }]}>New Training</Text>
                  </TouchableOpacity>
                  {canManage && (
                    <TouchableOpacity style={[styles.actionSecondary, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={inviteMember} activeOpacity={0.7}>
                      <UserPlus size={16} color={colors.text} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Animated2.View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: SCHEDULE - Upcoming trainings                             */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <Animated2.View entering={FadeInDown.duration(300).delay(100)} style={styles.sectionContainer}>
              <SectionHeader icon={Calendar} label="SCHEDULE" color={colors.orange} iconBg={`${colors.orange}15`} />

              {upcomingTrainings.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No trainings scheduled</Text>
                  {canSchedule && (
                    <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.secondary }]} onPress={createTraining}>
                      <Plus size={14} color={colors.text} strokeWidth={2.5} />
                      <Text style={[styles.emptyBtnText, { color: colors.text }]}>Schedule</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.list}>
                  {upcomingTrainings.slice(0, 4).map((t) => {
                    const isLive = t.status === 'ongoing';
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.listItem, { backgroundColor: colors.card, borderColor: isLive ? COLORS.live + '40' : colors.border }]}
                        onPress={() => goToTraining(t)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.listTime, { backgroundColor: isLive ? COLORS.live : colors.secondary }]}>
                          {isLive && <PulseDot color="#fff" />}
                          <Text style={[styles.listTimeText, { color: isLive ? '#fff' : colors.textMuted }]}>
                            {getSmartTimeLabel(new Date(t.scheduled_at), isLive)}
                          </Text>
                        </View>
                        <View style={styles.listContent}>
                          <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{t.title}</Text>
                          {(t.drill_count ?? 0) > 0 && (
                            <Text style={[styles.listMeta, { color: colors.textMuted }]}>{t.drill_count} drills</Text>
                          )}
                        </View>
                        <ChevronRight size={16} color={colors.border} />
                      </TouchableOpacity>
                    );
                  })}
                  {upcomingTrainings.length > 4 && (
                    <Text style={[styles.moreText, { color: colors.textMuted }]}>+{upcomingTrainings.length - 4} more</Text>
                  )}
                </View>
              )}
            </Animated2.View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: SQUAD - Team members                                      */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <Animated2.View entering={FadeInDown.duration(300).delay(200)} style={styles.sectionContainer}>
              <SectionHeader icon={Users} label="SQUAD" color="#8B5CF6" iconBg="#8B5CF615" />

              <TouchableOpacity
                style={[styles.squadCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={viewMembers}
                activeOpacity={0.7}
              >
                <View style={styles.avatarStack}>
                  {members.slice(0, 5).map((m, i) => (
                    <View
                      key={m.user_id}
                      style={[styles.avatar, { backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5], marginLeft: i > 0 ? -10 : 0, zIndex: 5 - i }]}
                    >
                      <Text style={styles.avatarText}>{(m.profile?.full_name?.charAt(0) || '?').toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.squadInfo}>
                  <Text style={[styles.squadCount, { color: colors.text }]}>{members.length} members</Text>
                  <View style={styles.statusRow}>
                    {trainingCount > 0 && (
                      <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: COLORS.training }]} />
                        <Text style={[styles.statusText, { color: colors.textMuted }]}>{trainingCount} training</Text>
                      </View>
                    )}
                    {onlineCount > 0 && (
                      <View style={styles.statusItem}>
                        <View style={[styles.statusDot, { backgroundColor: COLORS.online }]} />
                        <Text style={[styles.statusText, { color: colors.textMuted }]}>{onlineCount} online</Text>
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated2.View>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: THIS WEEK - Stats (commanders only)                       */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {canManage && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Animated2.View entering={FadeInDown.duration(300).delay(300)} style={styles.sectionContainer}>
                  <SectionHeader icon={Activity} label="THIS WEEK" color={colors.green} iconBg={`${colors.green}15`} />

                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                      <Zap size={18} color="#F59E0B" />
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {sessionStats.shots >= 1000 ? `${(sessionStats.shots / 1000).toFixed(1)}k` : sessionStats.shots}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots fired</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                      <Target size={18} color="#10B981" />
                      <Text style={[styles.statValue, { color: colors.text }]}>{sessionStats.accuracy}%</Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>avg accuracy</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                      <Activity size={18} color="#3B82F6" />
                      <Text style={[styles.statValue, { color: colors.text }]}>{sessionStats.sessions}</Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>sessions</Text>
                    </View>
                  </View>

                  {/* Completed trainings */}
                  {pastTrainings.length > 0 && (
                    <>
                      <Text style={[styles.subsectionTitle, { color: colors.textMuted }]}>Completed Trainings</Text>
                      <View style={styles.list}>
                        {pastTrainings.slice(0, 3).map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => goToReport(t.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.listTime, { backgroundColor: colors.secondary }]}>
                              <Text style={[styles.listTimeText, { color: colors.textMuted }]}>{format(new Date(t.scheduled_at), 'MMM d')}</Text>
                            </View>
                            <View style={styles.listContent}>
                              <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{t.title}</Text>
                            </View>
                            <View style={[styles.reportIcon, { backgroundColor: '#10B98115' }]}>
                              <BarChart3 size={14} color="#10B981" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </Animated2.View>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* SECTION: MANAGE - Quick links (commanders only)                    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {canManage && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Animated2.View entering={FadeInDown.duration(300).delay(400)} style={styles.sectionContainer}>
                  <SectionHeader icon={Settings} label="MANAGE" color={colors.textMuted} iconBg={colors.secondary} />

                  <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity style={styles.menuItem} onPress={viewMembers}>
                      <View style={[styles.menuIcon, { backgroundColor: '#8B5CF615' }]}><Users size={16} color="#8B5CF6" /></View>
                      <Text style={[styles.menuText, { color: colors.text }]}>Members & Roles</Text>
                      <ChevronRight size={16} color={colors.border} />
                    </TouchableOpacity>
                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.menuItem} onPress={openLibrary}>
                      <View style={[styles.menuIcon, { backgroundColor: '#3B82F615' }]}><BookOpen size={16} color="#3B82F6" /></View>
                      <Text style={[styles.menuText, { color: colors.text }]}>Drill Library</Text>
                      <ChevronRight size={16} color={colors.border} />
                    </TouchableOpacity>
                    <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity style={styles.menuItem} onPress={openSettings}>
                      <View style={[styles.menuIcon, { backgroundColor: colors.secondary }]}><Settings size={16} color={colors.textMuted} /></View>
                      <Text style={[styles.menuText, { color: colors.text }]}>Team Settings</Text>
                      <ChevronRight size={16} color={colors.border} />
                    </TouchableOpacity>
                  </View>
                </Animated2.View>
              </>
            )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  loadingInner: { paddingVertical: 60, alignItems: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '700' },

  // Section structure (matches UnifiedHomePage)
  sectionContainer: { paddingVertical: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  divider: { height: 1, marginVertical: 12, opacity: 0.5 },
  subsectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 16, marginBottom: 10, textTransform: 'uppercase' },

  // Live card
  liveCard: { padding: 16, borderRadius: 14, backgroundColor: COLORS.live, borderWidth: 1, marginBottom: 10 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  liveParticipants: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  liveTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  liveSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  // Next training card
  nextCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 12, marginBottom: 10 },
  nextTime: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  nextTimeText: { fontSize: 13, fontWeight: '700' },
  nextInfo: { flex: 1 },
  nextLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  nextTitle: { fontSize: 15, fontWeight: '600' },

  // Empty now
  emptyNow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 10 },
  emptyNowText: { fontSize: 14 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 10 },
  actionPrimaryText: { fontSize: 14, fontWeight: '600' },
  actionSecondary: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Empty card
  emptyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  emptyText: { fontSize: 14 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  emptyBtnText: { fontSize: 13, fontWeight: '600' },

  // List items
  list: { gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  listTime: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 56, justifyContent: 'center' },
  listTimeText: { fontSize: 11, fontWeight: '600' },
  listContent: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: '600' },
  listMeta: { fontSize: 12, marginTop: 2 },
  moreText: { textAlign: 'center', fontSize: 12, marginTop: 8 },

  // Squad card
  squadCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  avatarStack: { flexDirection: 'row', marginRight: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  squadInfo: { flex: 1 },
  squadCount: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  statusRow: { flexDirection: 'row', gap: 12 },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, gap: 6 },
  statValue: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, textAlign: 'center' },

  // Report icon
  reportIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  // Menu
  menuCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, fontSize: 14, fontWeight: '500' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
});
