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
// QUICK ACTION BUTTON (Compact action button)
// ═══════════════════════════════════════════════════════════════════════════
const QuickAction = React.memo(function QuickAction({
  icon,
  label,
  colors,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: typeof Colors.light;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <TouchableOpacity 
      style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]} 
      activeOpacity={0.6} 
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: accent ? accent + '15' : colors.secondary }]}>
        <Ionicons name={icon} size={20} color={accent || colors.text} />
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTION ROW (for lists)
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
  compact,
}: {
  training: TrainingWithDetails;
  colors: typeof Colors.light;
  onPress: () => void;
  compact?: boolean;
}) {
  const scheduledDate = new Date(training.scheduled_at);
  const now = new Date();
  const isToday = scheduledDate.toDateString() === now.toDateString();
  const isTomorrow = scheduledDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
  const isOngoing = training.status === 'ongoing';
  
  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <TouchableOpacity style={styles.trainingItem} activeOpacity={0.6} onPress={onPress}>
      <View style={styles.trainingContent}>
        <View style={styles.trainingHeader}>
          <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
          {isOngoing && (
            <View style={styles.trainingLiveBadge}>
              <View style={styles.trainingLiveDot} />
              <Text style={styles.trainingLiveText}>LIVE</Text>
            </View>
          )}
        </View>
        
        {!compact && (
          <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
            {isToday && !isOngoing ? (
              <Text style={{ color: '#FF9500', fontWeight: '500' }}>Today</Text>
            ) : (
              dateLabel
            )} at {timeLabel}
            {training.team && ` · ${training.team.name}`}
            {(training.drill_count ?? 0) > 0 && ` · ${training.drill_count} drills`}
          </Text>
        )}
        {compact && (
          <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
            {timeLabel}{training.team && ` · ${training.team.name}`}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// TODAY CARD (Prominent "now/today" display)
// ═══════════════════════════════════════════════════════════════════════════
const TodayCard = React.memo(function TodayCard({
  trainings,
  activeSessions,
  colors,
  onTrainingPress,
}: {
  trainings: TrainingWithDetails[];
  activeSessions: number;
  colors: typeof Colors.light;
  onTrainingPress: (id: string) => void;
}) {
  const ongoingTrainings = trainings.filter(t => t.status === 'ongoing');
  const todayTrainings = trainings.filter(t => {
    const d = new Date(t.scheduled_at);
    return d.toDateString() === new Date().toDateString() && t.status !== 'ongoing';
  });
  
  const hasActivity = ongoingTrainings.length > 0 || todayTrainings.length > 0 || activeSessions > 0;
  
  if (!hasActivity) return null;

  return (
    <View style={[styles.todayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.todayHeader}>
        <View style={[styles.todayDot, { backgroundColor: '#34C759' }]} />
        <Text style={[styles.todayTitle, { color: colors.text }]}>Today</Text>
        {activeSessions > 0 && (
          <View style={[styles.todayBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.todayBadgeText, { color: colors.primary }]}>
              {activeSessions} active
            </Text>
          </View>
        )}
      </View>
      
      {ongoingTrainings.map((t) => (
        <TouchableOpacity 
          key={t.id} 
          style={styles.todayItem}
          onPress={() => onTrainingPress(t.id)}
          activeOpacity={0.6}
        >
          <View style={styles.todayItemContent}>
            <View style={styles.trainingLiveBadge}>
              <View style={styles.trainingLiveDot} />
              <Text style={styles.trainingLiveText}>LIVE</Text>
            </View>
            <Text style={[styles.todayItemTitle, { color: colors.text }]} numberOfLines={1}>
              {t.title}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </TouchableOpacity>
      ))}
      
      {todayTrainings.slice(0, 2).map((t) => (
        <TouchableOpacity 
          key={t.id} 
          style={styles.todayItem}
          onPress={() => onTrainingPress(t.id)}
          activeOpacity={0.6}
        >
          <View style={styles.todayItemContent}>
            <Text style={[styles.todayTime, { color: '#FF9500' }]}>
              {new Date(t.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <Text style={[styles.todayItemTitle, { color: colors.text }]} numberOfLines={1}>
              {t.title}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </TouchableOpacity>
      ))}
    </View>
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
  const isStaff = ['owner', 'admin', 'instructor'].includes(orgRole);
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

  // Role subtitle
  const roleSubtitle = useMemo(() => {
    if (isStaff) return orgRole.charAt(0).toUpperCase() + orgRole.slice(1);
    if (teamInfo) {
      const role = teamInfo.teamRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `${role} · ${teamInfo.teamName}`;
    }
    return 'Member';
  }, [orgRole, isStaff, teamInfo]);

  // Active sessions count
  const activeSessions = useMemo(() => 
    sessions.filter(s => s.status === 'active').length, 
    [sessions]
  );

  // Navigation - only real actions, not tab navigation
  const nav = useMemo(() => ({
    createTraining: () => { 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
      router.push('/(protected)/createTraining' as any); 
    },
    createSession: () => { 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
      router.push('/(protected)/createSession' as any); 
    },
    inviteToTeam: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(teamInfo?.teamId ? `/(protected)/inviteTeamMember?teamId=${teamInfo.teamId}` as any : '/(protected)/inviteTeamMember' as any);
    },
    trainingLive: (id: string) => { 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
      router.push(`/(protected)/trainingLive?trainingId=${id}` as any); 
    },
    memberPreview: (id: string) => { 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
      router.push(`/(protected)/memberPreview?id=${id}` as any); 
    },
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

        {/* ═══ TODAY CARD (Prominent "now" section) ═══ */}
        {!isAttached && (
          <TodayCard
            trainings={trainings}
            activeSessions={activeSessions}
            colors={colors}
            onTrainingPress={nav.trainingLive}
          />
        )}

        {/* ═══ QUICK ACTIONS (Grid of real actions) ═══ */}
        {!isAttached && (
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="fitness"
              label="Start Session"
              colors={colors}
              onPress={nav.createSession}
              accent="#34C759"
            />
            {(isStaff || isCommander) && (
              <QuickAction
                icon="calendar"
                label="New Training"
                colors={colors}
                onPress={nav.createTraining}
                accent="#007AFF"
              />
            )}
            {isCommander && !isStaff && (
              <QuickAction
                icon="person-add"
                label="Invite"
                colors={colors}
                onPress={nav.inviteToTeam}
                accent="#FF9500"
              />
            )}
          </View>
        )}

        {/* ═══ STATS BAR ═══ */}
        {(isStaff || isTeamMember) && (
          <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {isStaff ? (
              <>
                <StatBlock value={workspaceMembers.length} label="Members" colors={colors} />
                <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
                <StatBlock value={teams.length} label="Teams" colors={colors} />
                <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
                <StatBlock value={trainings.length} label="Scheduled" colors={colors} />
              </>
            ) : (
              <>
                <StatBlock value={myTeamMembers.length} label="Team" colors={colors} />
                <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
                <StatBlock value={trainings.length} label="Scheduled" colors={colors} />
                <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
                <StatBlock value={completedCount} label="Completed" colors={colors} />
              </>
            )}
          </View>
        )}

        {/* ═══ UPCOMING TRAININGS (no "See all" - use Trainings tab) ═══ */}
        {!isAttached && trainings.length > 0 && (
          <Section title="Upcoming" colors={colors}>
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

        {/* ═══ MY TEAM (Team Members - no "View all" - use My Team tab) ═══ */}
        {isTeamMember && myTeam && myTeamMembers.length > 0 && (
          <Section title={myTeam.name} colors={colors}>
            {myTeamMembers.slice(0, 4).map((m, i) => {
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

        {/* ═══ ATTACHED VIEW ═══ */}
        {isAttached && (
          <>
            <View style={styles.quickActionsGrid}>
              <QuickAction
                icon="fitness"
                label="Start Session"
                colors={colors}
                onPress={nav.createSession}
                accent="#34C759"
              />
            </View>

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
  header: { paddingTop: Platform.OS === 'ios' ? 8 : 16, paddingBottom: 12, paddingHorizontal: 4 },
  headerTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, marginTop: 4 },

  // Quick Actions Grid
  quickActionsGrid: { 
    flexDirection: 'row', 
    gap: 10, 
    marginBottom: 16,
  },
  quickAction: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, 
    paddingHorizontal: 14, 
    borderRadius: 12, 
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  quickActionIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  quickActionLabel: { 
    fontSize: 14, 
    fontWeight: '600',
    flex: 1,
  },

  // Today Card
  todayCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  todayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  todayItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  todayTime: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 60,
  },

  // Stats Bar
  statsBar: { flexDirection: 'row', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 20, overflow: 'hidden' },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  statsDivider: { width: StyleSheet.hairlineWidth, marginVertical: 10 },

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
  trainingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  trainingContent: { flex: 1 },
  trainingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  trainingTitle: { fontSize: 15, fontWeight: '500', flex: 1 },
  trainingLiveBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  trainingLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginRight: 4 },
  trainingLiveText: { fontSize: 10, fontWeight: '700', color: '#34C759', letterSpacing: 0.5 },
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

  // Divider
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
});
