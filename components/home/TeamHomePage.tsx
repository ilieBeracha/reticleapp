import { BaseAvatar } from '@/components/BaseAvatar';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useCanManageTeam, useMyTeamRole, useTeamStore } from '@/store/teamStore';
import type { TeamMemberWithProfile } from '@/types/workspace';
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
// QUICK ACTION BUTTON
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
// MEMBER ITEM
// ═══════════════════════════════════════════════════════════════════════════
const MemberItem = React.memo(function MemberItem({
  member,
  colors,
  onPress,
  isYou,
}: {
  member: TeamMemberWithProfile;
  colors: typeof Colors.light;
  onPress: () => void;
  isYou?: boolean;
}) {
  const roleLabel = member.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return (
    <TouchableOpacity style={styles.memberItem} activeOpacity={0.5} onPress={onPress}>
      <BaseAvatar fallbackText={member.profile?.full_name || 'UN'} size="sm" role={member.role.role} />
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
          {member.profile?.full_name || 'Unknown'}
          {isYou && <Text style={{ color: colors.textMuted }}> (you)</Text>}
        </Text>
        <Text style={[styles.memberRole, { color: colors.textMuted }]}>
          {roleLabel}
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
// EMPTY STATE (No Team)
// ═══════════════════════════════════════════════════════════════════════════
const EmptyState = React.memo(function EmptyState({
  colors,
  onCreateTeam,
  onJoinTeam,
}: {
  colors: typeof Colors.light;
  onCreateTeam: () => void;
  onJoinTeam: () => void;
}) {
  return (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="people" size={48} color={colors.primary} />
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
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Create Team</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={onJoinTeam}
          activeOpacity={0.7}
        >
          <Ionicons name="enter-outline" size={18} color={colors.text} />
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Join with Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export const TeamHomePage = React.memo(function TeamHomePage() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const { 
    teams, 
    activeTeamId, 
    activeTeam, 
    members, 
    loading,
    loadTeams,
    loadActiveTeam,
  } = useTeamStore();
  
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
      // Note: setActiveTeam already calls loadActiveTeam(), so no need to call it here
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTeams();
    if (activeTeamId) await loadActiveTeam();
    setRefreshing(false);
  }, [loadTeams, loadActiveTeam, activeTeamId]);

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
    createSession: () => {
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
    switchTeam: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/(protected)/teamSwitcher' as any);
    },
  }), [activeTeamId]);

  // Role label
  const roleLabel = useMemo(() => {
    if (!myRole) return '';
    return myRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }, [myRole]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  }

  // No teams - show empty state
  if (teams.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemedStatusBar />
        <EmptyState
          colors={colors}
          onCreateTeam={nav.createTeam}
          onJoinTeam={nav.joinTeam}
        />
      </View>
    );
  }

  const currentTeam = teams.find(t => t.id === activeTeamId);

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
        <TouchableOpacity 
          style={styles.header} 
          onPress={teams.length > 1 ? nav.switchTeam : undefined}
          activeOpacity={teams.length > 1 ? 0.7 : 1}
        >
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {currentTeam?.name || 'Team'}
            </Text>
            {teams.length > 1 && (
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            )}
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{roleLabel}</Text>
        </TouchableOpacity>

        {/* ═══ QUICK ACTIONS ═══ */}
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="fitness"
            label="Start Session"
            colors={colors}
            onPress={nav.createSession}
            accent="#34C759"
          />
          {canManage && (
            <QuickAction
              icon="calendar"
              label="New Training"
              colors={colors}
              onPress={nav.createTraining}
              accent="#007AFF"
            />
          )}
          {canManage && (
            <QuickAction
              icon="person-add"
              label="Invite"
              colors={colors}
              onPress={nav.inviteMember}
              accent="#FF9500"
            />
          )}
        </View>

        {/* ═══ STATS ═══ */}
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <StatBlock value={members.length || currentTeam?.member_count || 0} label="Members" colors={colors} />
          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
          <StatBlock value={currentTeam?.squads?.length || 0} label="Squads" colors={colors} />
          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
          <StatBlock value={0} label="Sessions" colors={colors} />
        </View>

        {/* ═══ TEAM MEMBERS ═══ */}
        {members.length > 0 && (
          <Section 
            title="Team Members" 
            action={canManage ? "Manage" : undefined}
            onAction={canManage ? nav.manageTeam : undefined}
            colors={colors}
          >
            {members.slice(0, 5).map((m, i) => (
              <React.Fragment key={m.user_id}>
                {i > 0 && <Divider colors={colors} />}
                <MemberItem
                  member={m}
                  colors={colors}
                  onPress={() => nav.memberPreview(m.user_id)}
                  isYou={m.user_id === currentUserId}
                />
              </React.Fragment>
            ))}
          </Section>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
});

export default TeamHomePage;

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
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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

  // Member Item
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: '500' },
  memberRole: { fontSize: 13, marginTop: 1, textTransform: 'capitalize' },

  // Divider
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },

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

