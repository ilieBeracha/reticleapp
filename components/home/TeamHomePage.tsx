import { BaseAvatar } from '@/components/BaseAvatar';
import { useColors } from '@/hooks/ui/useColors';
import { useCanManageTeam, useMyTeamRole, useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Plus, Settings, Target, UserPlus, Users } from 'lucide-react-native';
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
    membersLoading,
    loadTeams,
    loadActiveTeam,
    loadMembers,
  } = useTeamStore();
  
  const { teamTrainings, loadingTeamTrainings, loadTeamTrainings } = useTrainingStore();
  
  const myRole = useMyTeamRole();
  const canManage = useCanManageTeam();

  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID on mount
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
      };
      init();
    }, [])
  );
  
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
    startSession: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(protected)/createSession' as any);
    },
    createTraining: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(protected)/createTraining' as any);
    },
    inviteMember: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/(protected)/inviteTeamMember?teamId=${activeTeamId}` as any);
    },
    manageTeam: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(protected)/teamManage' as any);
    },
    memberPreview: (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(protected)/memberPreview?id=${id}` as any);
    },
    trainingDetail: (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/(protected)/trainingDetail?id=${id}` as any);
    },
  }), [activeTeamId]);

  // Role label
  const roleLabel = useMemo(() => {
    if (!myRole) return '';
    return myRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }, [myRole]);

  const currentTeam = teams.find(t => t.id === activeTeamId);
  
  // Upcoming trainings
  const upcomingTrainings = useMemo(() => {
    return teamTrainings
      .filter(t => t.status === 'scheduled' && t.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
      .slice(0, 3);
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
            QUICK ACTIONS
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
          <View style={styles.actionsRow}>
            {/* Start Session */}
            <TouchableOpacity
              onPress={nav.startSession}
              activeOpacity={0.9}
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
                <Target size={20} color="#10B981" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Start Session</Text>
                <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Log targets</Text>
              </View>
              <View style={styles.actionIndicator}>
                <View style={[styles.actionBar, { backgroundColor: '#10B981' }]} />
              </View>
            </TouchableOpacity>

            {/* Create Training (if manager) or View Trainings */}
            {canManage ? (
              <TouchableOpacity
                onPress={nav.createTraining}
                activeOpacity={0.9}
                style={[styles.actionCard, styles.actionCardSecondary, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.card }]}>
                  <Plus size={20} color="#3B82F6" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>New Training</Text>
                  <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Schedule</Text>
                </View>
                <View style={styles.actionIndicator}>
                  <View style={[styles.actionBar, { backgroundColor: colors.border }]} />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/(protected)/team/trainings' as any)}
                activeOpacity={0.9}
                style={[styles.actionCard, styles.actionCardSecondary, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.card }]}>
                  <Calendar size={20} color={colors.textMuted} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>Trainings</Text>
                  <Text style={[styles.actionDesc, { color: colors.textMuted }]}>View all</Text>
                </View>
                <View style={styles.actionIndicator}>
                  <View style={[styles.actionBar, { backgroundColor: colors.border }]} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            INVITE BUTTON (for managers)
        ══════════════════════════════════════════════════════════════════════ */}
        {canManage && (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}
            onPress={nav.inviteMember}
            activeOpacity={0.7}
          >
            <View style={[styles.inviteIcon, { backgroundColor: '#F59E0B20' }]}>
              <UserPlus size={18} color="#F59E0B" />
            </View>
            <View style={styles.inviteContent}>
              <Text style={[styles.inviteTitle, { color: colors.text }]}>Invite Team Member</Text>
              <Text style={[styles.inviteDesc, { color: colors.textMuted }]}>Generate an invite code</Text>
            </View>
            <ChevronRight size={18} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            UPCOMING TRAININGS
        ══════════════════════════════════════════════════════════════════════ */}
        {upcomingTrainings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UPCOMING TRAININGS</Text>
              <TouchableOpacity onPress={() => router.push('/(protected)/team/trainings' as any)}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
              {upcomingTrainings.map((training) => (
                <TouchableOpacity
                  key={training.id}
                  activeOpacity={0.7}
                  style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => nav.trainingDetail(training.id)}
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
            TEAM MEMBERS
        ══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TEAM MEMBERS</Text>
            {members.length > 5 && (
              <TouchableOpacity onPress={nav.manageTeam}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.listContainer}>
            {members.slice(0, 5).map((member) => (
              <TouchableOpacity
                key={member.user_id}
                activeOpacity={0.7}
                style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => nav.memberPreview(member.user_id)}
              >
                <BaseAvatar 
                  fallbackText={member.profile?.full_name || 'UN'} 
                  size="sm" 
                  role={member.role?.role} 
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                    {member.profile?.full_name || 'Unknown'}
                    {member.user_id === currentUserId && (
                      <Text style={{ color: colors.textMuted }}> (you)</Text>
                    )}
                  </Text>
                  <View style={[styles.memberRoleBadge, { backgroundColor: getRoleColor(member.role?.role) + '15' }]}>
                    <Text style={[styles.memberRoleText, { color: getRoleColor(member.role?.role) }]}>
                      {formatRole(member.role?.role)}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            
            {members.length === 0 && membersLoading && (
              <View style={[styles.emptyList, { borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                  Loading members...
                </Text>
              </View>
            )}

            {members.length === 0 && !membersLoading && (
              <View style={[styles.emptyList, { borderColor: colors.border }]}>
                <Users size={28} color={colors.textMuted} />
                <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                  No members yet
                </Text>
              </View>
            )}
          </View>
        </View>

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
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <Users size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No team yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Create a team to start training together, or join one with an invite code
      </Text>
      
      <View style={styles.emptyActions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={onCreateTeam}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Create Team</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
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
    case 'owner': return '#8B5CF6';  // Purple for owner
    case 'commander': return '#EF4444';  // Red
    case 'squad_commander': return '#F59E0B';  // Orange
    case 'soldier': return '#10B981';  // Green
    default: return '#6B7280';
  }
}

function formatRole(role: string | undefined | null): string {
  if (!role) return 'Member';
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLink: { fontSize: 12, fontWeight: '600' },

  // Stats Card
  statsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 32 },

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
  actionCardSecondary: { opacity: 0.9 },
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

  // Invite Button
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteContent: { flex: 1 },
  inviteTitle: { fontSize: 15, fontWeight: '600' },
  inviteDesc: { fontSize: 12, marginTop: 2 },

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

  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberRoleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  memberRoleText: { fontSize: 11, fontWeight: '600' },

  // Empty List
  emptyList: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    gap: 8,
  },
  emptyListText: { fontSize: 14 },

  // Empty State
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyActions: { width: '100%', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, gap: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1, gap: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: '500' },
});

export default TeamHomePage;
