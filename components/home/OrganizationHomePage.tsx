import { BaseAvatar } from '@/components/BaseAvatar';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppContext } from '@/hooks/useAppContext';
import { getWorkspaceSessions, type SessionWithDetails } from '@/services/sessionService';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { TrainingWithDetails, WorkspaceMemberWithTeams } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
// ACTION ROW
// ═══════════════════════════════════════════════════════════════════════════
const ActionRow = React.memo(function ActionRow({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} activeOpacity={0.5} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// STAT BLOCK
// ═══════════════════════════════════════════════════════════════════════════
const StatBlock = React.memo(function StatBlock({
  value,
  label,
  colors,
}: {
  value: number | string;
  label: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// TRAINING ITEM
// ═══════════════════════════════════════════════════════════════════════════
const TrainingItem = React.memo(function TrainingItem({
  training,
  colors,
  onPress,
}: {
  training: TrainingWithDetails;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const scheduledDate = new Date(training.scheduled_at);
  const now = new Date();
  const isToday = scheduledDate.toDateString() === now.toDateString();
  const isTomorrow = scheduledDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
  const isOngoing = training.status === 'ongoing';
  
  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Subtle status indicator
  const showLive = isOngoing;
  const showToday = isToday && !isOngoing;

  return (
    <TouchableOpacity style={styles.trainingItem} activeOpacity={0.6} onPress={onPress}>
      <View style={styles.trainingContent}>
        <View style={styles.trainingHeader}>
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
          {showLive && (
            <View style={styles.trainingLiveBadge}>
              <View style={styles.trainingLiveDot} />
              <Text style={styles.trainingLiveText}>LIVE</Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
          {showToday ? <Text style={{ color: '#FF9500', fontWeight: '500' }}>Today</Text> : dateLabel} at {timeLabel}
          {training.team && ` · ${training.team.name}`}
          {(training.drill_count ?? 0) > 0 && ` · ${training.drill_count} drills`}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITY ITEM
// ═══════════════════════════════════════════════════════════════════════════
const ActivityItem = React.memo(function ActivityItem({
  session,
  colors,
}: {
  session: SessionWithDetails;
  colors: typeof Colors.light;
}) {
  const duration = session.ended_at
    ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000);
  
  const isActive = session.status === 'active';

  return (
    <View style={styles.activityItem}>
      {isActive && <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />}
      <Text style={[styles.activityName, { color: colors.text }]} numberOfLines={1}>
        {session.training_title || session.drill_name || 'Session'}
      </Text>
      <Text style={[styles.activityMeta, { color: colors.textMuted }]}>
        {session.user_full_name?.split(' ')[0]} · {duration}m
      </Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER ITEM
// ═══════════════════════════════════════════════════════════════════════════
const MemberItem = React.memo(function MemberItem({
  member,
  colors,
  onPress,
  isYou,
  teamRole,
}: {
  member: WorkspaceMemberWithTeams;
  colors: typeof Colors.light;
  onPress: () => void;
  isYou?: boolean;
  teamRole?: string;
}) {
  return (
    <TouchableOpacity style={styles.memberItem} activeOpacity={0.5} onPress={onPress}>
      <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="sm" role={member.role} />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
          {member.profile_full_name || 'Unknown'}
          {isYou && <Text style={{ color: colors.textMuted }}> (you)</Text>}
        </Text>
        <Text style={[styles.memberRole, { color: colors.textMuted }]}>
          {teamRole || member.role}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION
// ═══════════════════════════════════════════════════════════════════════════
const Section = React.memo(function Section({
  title,
  action,
  onAction,
  colors,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  colors: typeof Colors.light;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
        {action && onAction && (
          <TouchableOpacity onPress={onAction} activeOpacity={0.5}>
            <Text style={[styles.sectionAction, { color: colors.text }]}>{action}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════════════════
const Divider = ({ colors }: { colors: typeof Colors.light }) => (
  <View style={[styles.divider, { backgroundColor: colors.border }]} />
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const OrganizationHomePage = React.memo(function OrganizationHomePage() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { activeWorkspace, activeWorkspaceId } = useAppContext();
  const { orgRole, hasTeam, teamInfo, isCommander, currentUserId } = useOrgRole();
  const { workspaceMembers, loadWorkspaceMembers } = useWorkspaceStore();
  const { orgTrainings: trainings, loadOrgTrainings, loadingOrgTrainings } = useTrainingStore();
  const { teams, loadTeams } = useTeamStore();

  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Role checks
  const isAdmin = orgRole === 'owner' || orgRole === 'admin';
  const isInstructor = orgRole === 'instructor';
  const isStaff = isAdmin || isInstructor;
  const isAttached = orgRole === 'attached';
  const isTeamMember = !isStaff && !isAttached;

  // Data loading
  const loadData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const [sessionsData] = await Promise.all([
        getWorkspaceSessions(activeWorkspaceId),
        !isAttached ? loadTeams(activeWorkspaceId) : Promise.resolve(),
        loadOrgTrainings(activeWorkspaceId), // Uses store
      ]);
      setSessions(sessionsData || []);
    } catch (error) {
      console.error('Failed to load org data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, isAttached, loadOrgTrainings, loadTeams]);

  // Reload data every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (activeWorkspaceId) {
        loadData();
        loadOrgTrainings(activeWorkspaceId);
        loadTeams(activeWorkspaceId);
        loadWorkspaceMembers();
      }
    }, [activeWorkspaceId, loadData, loadWorkspaceMembers])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     await Promise.all([loadData(), loadWorkspaceMembers(), activeWorkspaceId && loadOrgTrainings(activeWorkspaceId)]);
    setRefreshing(false);
  }, [loadData, loadWorkspaceMembers, loadOrgTrainings, activeWorkspaceId]);

  // Computed dataxsS
  const recentSessions = useMemo(() => sessions.slice(0, 4), [sessions]);
  const completedCount = useMemo(() => sessions.filter(s => s.status === 'completed').length, [sessions]);
  
  const myTeam = useMemo(() => {
    if (!teamInfo) return null;
    return teams.find(t => t.id === teamInfo.teamId) || null;
  }, [teams, teamInfo]);

  const myTeamMembers = useMemo(() => {
    if (!teamInfo) return [];
    return workspaceMembers.filter(m => m.teams?.some(t => t.team_id === teamInfo.teamId));
  }, [workspaceMembers, teamInfo]);

  const staffMembers = useMemo(() =>
    workspaceMembers.filter(m => ['owner', 'admin', 'instructor'].includes(m.role)),
    [workspaceMembers]
  );

  // Role subtitle
  const roleSubtitle = useMemo(() => {
    if (isStaff) return orgRole.charAt(0).toUpperCase() + orgRole.slice(1);
    if (teamInfo) {
      const role = teamInfo.teamRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `${role} · ${teamInfo.teamName}`;
    }
    return 'Member';
  }, [orgRole, isStaff, teamInfo]);

  // Navigation
  const nav = useMemo(() => ({
    createTraining: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(protected)/createTraining' as any); },
    createSession: () => { loadData(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(protected)/createSession' as any); },
    viewTrainings: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(protected)/org/trainings' as any); },
    viewManage: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(protected)/org/manage' as any); },
    inviteToTeam: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(teamInfo?.teamId ? `/(protected)/inviteTeamMember?teamId=${teamInfo.teamId}` as any : '/(protected)/inviteTeamMember' as any);
    },
    trainingLive: (id: string) => { 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
      router.push(`/(protected)/trainingLive?trainingId=${id}` as any); 
    },
    memberPreview: (id: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/(protected)/memberPreview?id=${id}` as any); },
  }), [teamInfo]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {activeWorkspace?.workspace_name || 'Organization'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{roleSubtitle}</Text>
        </View>

        {/* ═══ STATS BAR (Staff) ═══ */}
        {isStaff && (
          <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <StatBlock value={workspaceMembers.length} label="Members" colors={colors} />
            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            <StatBlock value={teams.length} label="Teams" colors={colors} />
            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            <StatBlock value={trainings.length} label="Upcoming" colors={colors} />
          </View>
        )}

        {/* ═══ STATS BAR (Team Member) ═══ */}
        {isTeamMember && (
          <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <StatBlock value={myTeamMembers.length} label="Team" colors={colors} />
            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            <StatBlock value={trainings.length} label="Upcoming" colors={colors} />
            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            <StatBlock value={completedCount} label="Completed" colors={colors} />
          </View>
        )}

        {/* ═══ ACTIONS (Staff) ═══ */}
        {isStaff && (
          <Section title="Actions" colors={colors}>
            <ActionRow icon="add-circle-outline" label="Create Training" colors={colors} onPress={nav.createTraining} />
            <Divider colors={colors} />
            <ActionRow icon="fitness-outline" label="Start Session" colors={colors} onPress={nav.createSession} />
            <Divider colors={colors} />
            <ActionRow icon="people-outline" label="Manage Organization" colors={colors} onPress={nav.viewManage} />
          </Section>
        )}

        {/* ═══ ACTIONS (Team Member) ═══ */}
        {isTeamMember && (
          <Section title="Actions" colors={colors}>
            {isCommander && (
              <>
                <ActionRow icon="add-circle-outline" label="Create Training" colors={colors} onPress={nav.createTraining} />
                <Divider colors={colors} />
              </>
            )}
            <ActionRow icon="fitness-outline" label="Start Session" colors={colors} onPress={nav.createSession} />
            {isCommander && (
              <>
                <Divider colors={colors} />
                <ActionRow icon="person-add-outline" label="Invite to Team" colors={colors} onPress={nav.inviteToTeam} />
              </>
            )}
            <Divider colors={colors} />
            <ActionRow icon="business-outline" label="View Organization" colors={colors} onPress={nav.viewManage} />
          </Section>
        )}

        {/* ═══ UPCOMING TRAININGS ═══ */}
        {!isAttached && trainings.length > 0 && (
          <Section title="Upcoming Trainings" action="See all" onAction={nav.viewTrainings} colors={colors}>
            {trainings.slice(0, 3).map((t, i) => (
              <React.Fragment key={t.id}>
                {i > 0 && <Divider colors={colors} />}
                <TrainingItem training={t} colors={colors} onPress={() => nav.trainingLive(t.id)} />
              </React.Fragment>
            ))}
          </Section>
        )}

        {/* ═══ RECENT ACTIVITY ═══ */}
        {recentSessions.length > 0 && !isAttached && (
          <Section title="Recent Activity" colors={colors}>
            {recentSessions.map((s, i) => (
              <React.Fragment key={s.id}>
                {i > 0 && <Divider colors={colors} />}
                <ActivityItem session={s} colors={colors} />
              </React.Fragment>
            ))}
          </Section>
        )}

        {/* ═══ MY TEAM (Team Members) ═══ */}
        {isTeamMember && myTeam && myTeamMembers.length > 0 && (
          <Section title={myTeam.name} action="View all" onAction={nav.viewManage} colors={colors}>
            {myTeamMembers.slice(0, 5).map((m, i) => {
              const membership = m.teams?.find(t => t.team_id === teamInfo?.teamId);
              return (
                <React.Fragment key={m.id}>
                  {i > 0 && <Divider colors={colors} />}
                  <MemberItem
                    member={m}
                    colors={colors}
                    onPress={() => nav.memberPreview(m.member_id)}
                    isYou={m.member_id === currentUserId}
                    teamRole={membership?.team_role}
                  />
                </React.Fragment>
              );
            })}
          </Section>
        )}

        {/* ═══ STAFF (Admin view) ═══ */}
        {isAdmin && staffMembers.length > 0 && (
          <Section title="Staff" action="Manage" onAction={nav.viewManage} colors={colors}>
            {staffMembers.slice(0, 4).map((m, i) => (
              <React.Fragment key={m.id}>
                {i > 0 && <Divider colors={colors} />}
                <MemberItem
                  member={m}
                  colors={colors}
                  onPress={() => nav.memberPreview(m.member_id)}
                  isYou={m.member_id === currentUserId}
                />
              </React.Fragment>
            ))}
          </Section>
        )}

        {/* ═══ TEAMS (Staff view) ═══ */}
        {isStaff && teams.length > 0 && (
          <Section title="Teams" action="Manage" onAction={nav.viewManage} colors={colors}>
            {teams.slice(0, 4).map((team, i) => (
              <React.Fragment key={team.id}>
                {i > 0 && <Divider colors={colors} />}
                <TouchableOpacity style={styles.teamItem} activeOpacity={0.5} onPress={nav.viewManage}>
                  <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
                  <Text style={[styles.teamCount, { color: colors.textMuted }]}>{team.member_count || 0}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Section>
        )}

        {/* ═══ ATTACHED VIEW ═══ */}
        {isAttached && (
          <>
            <Section title="Actions" colors={colors}>
              <ActionRow icon="fitness-outline" label="Start Session" colors={colors} onPress={nav.createSession} />
            </Section>

            {recentSessions.length > 0 && (
              <Section title="Your Sessions" colors={colors}>
                {recentSessions.map((s, i) => (
                  <React.Fragment key={s.id}>
                    {i > 0 && <Divider colors={colors} />}
                    <ActivityItem session={s} colors={colors} />
                  </React.Fragment>
                ))}
              </Section>
            )}

            {recentSessions.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                  Start logging your sessions linked to this organization
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
});

export default OrganizationHomePage;

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 16, paddingHorizontal: 4 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, marginTop: 4 },

  // Stats Bar
  statsBar: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 20, overflow: 'hidden' },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statsDivider: { width: StyleSheet.hairlineWidth, marginVertical: 12 },

  // Section
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionAction: { fontSize: 14, fontWeight: '500' },
  sectionContent: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },

  // Action Row
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  actionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionLabel: { flex: 1, fontSize: 16, fontWeight: '500' },

  // Training Item
  trainingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  trainingContent: { flex: 1 },
  trainingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  trainingTitle: { fontSize: 16, fontWeight: '500', flex: 1 },
  trainingLiveBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  trainingLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginRight: 4 },
  trainingLiveText: { fontSize: 11, fontWeight: '600', color: '#34C759', letterSpacing: 0.3 },
  trainingMeta: { fontSize: 13 },

  // Activity Item
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  activityName: { flex: 1, fontSize: 15 },
  activityMeta: { fontSize: 13 },

  // Member Item
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: '500' },
  memberRole: { fontSize: 13, marginTop: 1, textTransform: 'capitalize' },

  // Team Item
  teamItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  teamName: { flex: 1, fontSize: 16, fontWeight: '500' },
  teamCount: { fontSize: 14, marginRight: 8 },

  // Divider
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
});
