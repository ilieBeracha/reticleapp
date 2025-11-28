import { BaseAvatar } from '@/components/BaseAvatar';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useModals } from '@/contexts/ModalContext';
import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppContext } from '@/hooks/useAppContext';
import { getPendingInvitations } from '@/services/invitationService';
import { getWorkspaceTeams } from '@/services/teamService';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { WorkspaceInvitationWithDetails, WorkspaceMemberWithTeams } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type MainView = 'teams' | 'attached';

// ============================================================================
// TOP-LEVEL VIEW TOGGLE
// ============================================================================
const ViewToggle = React.memo(function ViewToggle({
  activeView,
  onViewChange,
  teamCount,
  attachedCount,
  colors,
}: {
  activeView: MainView;
  onViewChange: (view: MainView) => void;
  teamCount: number;
  attachedCount: number;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.viewToggle, { backgroundColor: colors.secondary }]}>
      <TouchableOpacity
        style={[
          styles.viewToggleItem,
          activeView === 'teams' && { backgroundColor: colors.card },
        ]}
        onPress={() => onViewChange('teams')}
        activeOpacity={0.7}
      >
        <View style={[styles.viewToggleIcon, { backgroundColor: activeView === 'teams' ? '#6366F120' : 'transparent' }]}>
          <Ionicons name="people" size={18} color={activeView === 'teams' ? '#6366F1' : colors.textMuted} />
        </View>
        <View style={styles.viewToggleText}>
          <Text style={[styles.viewToggleLabel, { color: activeView === 'teams' ? colors.text : colors.textMuted }]}>
            Team Structure
          </Text>
          <Text style={[styles.viewToggleCount, { color: activeView === 'teams' ? '#6366F1' : colors.textMuted }]}>
            {teamCount} teams
          </Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.viewToggleDivider, { backgroundColor: colors.border }]} />

      <TouchableOpacity
        style={[
          styles.viewToggleItem,
          activeView === 'attached' && { backgroundColor: colors.card },
        ]}
        onPress={() => onViewChange('attached')}
        activeOpacity={0.7}
      >
        <View style={[styles.viewToggleIcon, { backgroundColor: activeView === 'attached' ? '#10B98120' : 'transparent' }]}>
          <Ionicons name="link" size={18} color={activeView === 'attached' ? '#10B981' : colors.textMuted} />
        </View>
        <View style={styles.viewToggleText}>
          <Text style={[styles.viewToggleLabel, { color: activeView === 'attached' ? colors.text : colors.textMuted }]}>
            Attached
          </Text>
          <Text style={[styles.viewToggleCount, { color: activeView === 'attached' ? '#10B981' : colors.textMuted }]}>
            {attachedCount} members
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ============================================================================
// ROLE BADGE
// ============================================================================
const RoleBadge = React.memo(function RoleBadge({
  role,
  colors,
}: {
  role: string;
  colors: typeof Colors.light;
}) {
  const getRoleConfig = () => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: '#6366F1', bg: '#6366F115', icon: 'shield-checkmark' as const };
      case 'admin':
        return { label: 'Admin', color: '#8B5CF6', bg: '#8B5CF615', icon: 'shield-half' as const };
      case 'instructor':
        return { label: 'Instructor', color: '#EC4899', bg: '#EC489915', icon: 'school' as const };
      case 'commander':
        return { label: 'Commander', color: '#F59E0B', bg: '#F59E0B15', icon: 'star' as const };
      case 'squad_commander':
        return { label: 'Squad Cmdr', color: '#10B981', bg: '#10B98115', icon: 'star-half' as const };
      case 'soldier':
        return { label: 'Soldier', color: colors.textMuted, bg: colors.secondary, icon: 'person' as const };
      default:
        return { label: 'Member', color: colors.textMuted, bg: colors.secondary, icon: 'person' as const };
    }
  };

  const config = getRoleConfig();

  return (
    <View style={[styles.roleBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={11} color={config.color} />
      <Text style={[styles.roleBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
});

// ============================================================================
// TEAM CARD (EXPANDABLE)
// ============================================================================
const TeamCard = React.memo(function TeamCard({
  team,
  colors,
  onPress,
  members,
  onMemberPress,
  currentUserId,
}: {
  team: any;
  colors: typeof Colors.light;
  onPress: () => void;
  members: WorkspaceMemberWithTeams[];
  onMemberPress: (member: WorkspaceMemberWithTeams) => void;
  currentUserId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const memberCount = team.member_count || members.length || 0;

  // Filter members for this team
  const teamMembers = useMemo(() => 
    members.filter(m => m.teams?.some(t => t.team_id === team.id)),
    [members, team.id]
  );

  return (
    <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.teamCardHeader}
        activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={[styles.teamIcon, { backgroundColor: '#6366F115' }]}>
          <Ionicons name="people" size={20} color="#6366F1" />
        </View>

        <View style={styles.teamInfo}>
          <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
          <View style={styles.teamMeta}>
            <Text style={[styles.teamMetaText, { color: colors.textMuted }]}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
            {team.squads && team.squads.length > 0 && (
              <>
                <View style={[styles.teamMetaDot, { backgroundColor: colors.textMuted }]} />
                <Text style={[styles.teamMetaText, { color: colors.textMuted }]}>
                  {team.squads.length} squads
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.teamCardRight}>
          <TouchableOpacity
            style={[styles.teamViewBtn, { backgroundColor: colors.secondary }]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.teamViewBtnText, { color: colors.text }]}>View</Text>
          </TouchableOpacity>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && teamMembers.length > 0 && (
        <View style={[styles.teamMembersList, { borderTopColor: colors.border }]}>
          {teamMembers.map((member) => {
            const teamMembership = member.teams?.find(t => t.team_id === team.id);
            return (
              <TouchableOpacity
                key={member.id}
                style={styles.teamMemberRow}
                onPress={() => onMemberPress(member)}
                activeOpacity={0.7}
              >
                <BaseAvatar
                  fallbackText={member.profile_full_name || 'UN'}
                  size="xs"
                  role={member.role}
                />
                <Text style={[styles.teamMemberName, { color: colors.text }]} numberOfLines={1}>
                  {member.profile_full_name || 'Unknown'}
                </Text>
                {member.member_id === currentUserId && (
                  <View style={[styles.youBadgeSmall, { backgroundColor: colors.primary }]}>
                    <Text style={styles.youBadgeSmallText}>You</Text>
                  </View>
                )}
                <RoleBadge role={teamMembership?.team_role || 'member'} colors={colors} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
});

// ============================================================================
// STAFF MEMBER CARD (for org-level staff)
// ============================================================================
const StaffCard = React.memo(function StaffCard({
  member,
  colors,
  onPress,
  isCurrentUser,
}: {
  member: WorkspaceMemberWithTeams;
  colors: typeof Colors.light;
  onPress: () => void;
  isCurrentUser?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.staffCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        isCurrentUser && { borderColor: colors.primary },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <BaseAvatar
        fallbackText={member.profile_full_name || 'UN'}
        size="sm"
        role={member.role}
      />
      <View style={styles.staffInfo}>
        <View style={styles.staffNameRow}>
          <Text style={[styles.staffName, { color: colors.text }]} numberOfLines={1}>
            {member.profile_full_name || 'Unknown'}
          </Text>
          {isCurrentUser && (
            <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>
        <Text style={[styles.staffEmail, { color: colors.textMuted }]} numberOfLines={1}>
          {member.profile_email}
        </Text>
      </View>
      <RoleBadge role={member.role} colors={colors} />
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ opacity: 0.4 }} />
    </TouchableOpacity>
  );
});

// ============================================================================
// ATTACHED MEMBER CARD
// ============================================================================
const AttachedCard = React.memo(function AttachedCard({
  member,
  colors,
  onPress,
}: {
  member: WorkspaceMemberWithTeams;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.attachedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <BaseAvatar
        fallbackText={member.profile_full_name || 'UN'}
        size="md"
        role="attached"
      />
      <View style={styles.attachedInfo}>
        <Text style={[styles.attachedName, { color: colors.text }]} numberOfLines={1}>
          {member.profile_full_name || 'Unknown'}
        </Text>
        <Text style={[styles.attachedEmail, { color: colors.textMuted }]} numberOfLines={1}>
          {member.profile_email}
        </Text>
        <View style={styles.attachedMeta}>
          <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
          <Text style={[styles.attachedMetaText, { color: colors.textMuted }]}>
            Joined {new Date(member.joined_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.4 }} />
    </TouchableOpacity>
  );
});

// ============================================================================
// INVITE CARD
// ============================================================================
const InviteCard = React.memo(function InviteCard({
  invite,
  colors,
}: {
  invite: WorkspaceInvitationWithDetails;
  colors: typeof Colors.light;
}) {
  const isExpired = new Date(invite.expires_at) < new Date();
  const isAttached = invite.role === 'attached';

  return (
    <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[
        styles.inviteIcon,
        { backgroundColor: isExpired ? colors.red + '15' : isAttached ? '#10B98115' : '#6366F115' }
      ]}>
        <Ionicons
          name={isExpired ? 'time-outline' : isAttached ? 'link' : 'ticket-outline'}
          size={14}
          color={isExpired ? colors.red : isAttached ? '#10B981' : '#6366F1'}
        />
      </View>
      <View style={styles.inviteInfo}>
        <Text style={[styles.inviteCode, { color: colors.text }]}>{invite.invite_code}</Text>
        <Text style={[styles.inviteRole, { color: colors.textMuted }]}>
          {isAttached ? 'Attached Member' : invite.team_name ? `${invite.team_role} in ${invite.team_name}` : invite.role}
        </Text>
      </View>
      {isExpired && (
        <View style={[styles.expiredBadge, { backgroundColor: colors.red + '15' }]}>
          <Text style={[styles.expiredBadgeText, { color: colors.red }]}>Expired</Text>
        </View>
      )}
    </View>
  );
});

// ============================================================================
// SECTION HEADER
// ============================================================================
const SectionHeader = React.memo(function SectionHeader({
  title,
  count,
  colors,
  action,
}: {
  title: string;
  count?: number;
  colors: typeof Colors.light;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
        {typeof count === 'number' && (
          <View style={[styles.sectionBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.sectionBadgeText, { color: colors.textMuted }]}>{count}</Text>
          </View>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ============================================================================
// EMPTY STATE
// ============================================================================
const EmptyState = React.memo(function EmptyState({
  icon,
  iconColor,
  title,
  description,
  actionLabel,
  onAction,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconBox, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={36} color={iconColor} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.emptyAction, { backgroundColor: iconColor }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ============================================================================
// MAIN SCREEN
// ============================================================================
const ManageScreen = React.memo(function ManageScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { activeWorkspace, activeWorkspaceId } = useAppContext();
  const { workspaceMembers, loadWorkspaceMembers, loading: membersLoading } = useWorkspaceStore();
  const { orgRole, isCommander, currentUserId, loading: roleLoading } = useOrgRole();

  const {
    setSelectedTeam,
    setSelectedMember,
    setOnTeamCreated,
    setOnMemberInvited,
    setOnInviteAccepted,
  } = useModals();

  const [mainView, setMainView] = useState<MainView>('teams');
  const [teams, setTeams] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitationWithDetails[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Permissions
  const isAdmin = orgRole === 'owner' || orgRole === 'admin';
  const canInvite = isAdmin || isCommander;
  const canCreateTeam = isAdmin;
  const canSeeInvites = isAdmin || isCommander;

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setTeamsLoading(true);
    try {
      const teamsData = await getWorkspaceTeams(activeWorkspaceId);
      setTeams(teamsData || []);
    } catch (error) {
      console.error('Failed to load teams:', error);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [activeWorkspaceId]);

  // Load invites
  const loadPendingInvites = useCallback(async () => {
    if (!activeWorkspaceId || !canSeeInvites) return;
    try {
      const invites = await getPendingInvitations(activeWorkspaceId);
      setPendingInvites(invites);
    } catch (error) {
      console.error('Failed to load invites:', error);
      setPendingInvites([]);
    }
  }, [activeWorkspaceId, canSeeInvites]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceMembers();
      loadTeams();
      if (canSeeInvites) loadPendingInvites();
    }
  }, [activeWorkspaceId, loadWorkspaceMembers, loadTeams, loadPendingInvites, canSeeInvites]);

  useEffect(() => {
    setOnTeamCreated(() => loadTeams);
    setOnMemberInvited(() => () => {
      loadWorkspaceMembers();
      loadPendingInvites();
    });
    setOnInviteAccepted(() => loadWorkspaceMembers);
    return () => {
      setOnTeamCreated(null);
      setOnMemberInvited(null);
      setOnInviteAccepted(null);
    };
  }, [loadTeams, loadWorkspaceMembers, loadPendingInvites, setOnTeamCreated, setOnMemberInvited, setOnInviteAccepted]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      loadWorkspaceMembers(),
      loadTeams(),
      canSeeInvites ? loadPendingInvites() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [loadWorkspaceMembers, loadTeams, loadPendingInvites, canSeeInvites]);

  // Actions
  const handleInviteTeamMember = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/inviteMembers' as any);
  }, []);

  const handleInviteAttached = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/inviteMembers?type=attached' as any);
  }, []);

  const handleCreateTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTeam' as any);
  }, []);

  const handleTeamPress = useCallback((team: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeam(team);
    router.push('/(protected)/teamPreview' as any);
  }, [setSelectedTeam]);

  const handleMemberPress = useCallback((member: WorkspaceMemberWithTeams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMember(member);
    router.push('/(protected)/memberPreview' as any);
  }, [setSelectedMember]);

  // Categorize members
  const { staffMembers, teamMembers, attachedMembers } = useMemo(() => {
    const staff: WorkspaceMemberWithTeams[] = [];
    const team: WorkspaceMemberWithTeams[] = [];
    const attached: WorkspaceMemberWithTeams[] = [];

    workspaceMembers.forEach((m) => {
      if (m.role === 'attached') {
        attached.push(m);
      } else if (['owner', 'admin', 'instructor'].includes(m.role)) {
        staff.push(m);
      } else {
        team.push(m);
      }
    });

    return { staffMembers: staff, teamMembers: team, attachedMembers: attached };
  }, [workspaceMembers]);

  // Categorize invites
  const { teamInvites, attachedInvites } = useMemo(() => {
    const teamInv: WorkspaceInvitationWithDetails[] = [];
    const attachedInv: WorkspaceInvitationWithDetails[] = [];

    pendingInvites.forEach((inv) => {
      if (inv.role === 'attached') {
        attachedInv.push(inv);
      } else {
        teamInv.push(inv);
      }
    });

    return { teamInvites: teamInv, attachedInvites: attachedInv };
  }, [pendingInvites]);

  const isLoading = membersLoading || teamsLoading || roleLoading;

  if (isLoading && !refreshing && workspaceMembers.length === 0 && teams.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemedStatusBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {activeWorkspace?.workspace_name ?? 'Workspace'}
        </Text>
      </View>

      {/* View Toggle */}
      {isAdmin && (
        <View style={styles.toggleContainer}>
          <ViewToggle
            activeView={mainView}
            onViewChange={setMainView}
            teamCount={teams.length}
            attachedCount={attachedMembers.length}
            colors={colors}
          />
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {/* ============================================================ */}
        {/* TEAMS VIEW */}
        {/* ============================================================ */}
        {(mainView === 'teams' || !isAdmin) && (
          <>
            {/* Staff Members Section */}
            {staffMembers.length > 0 && (
              <>
                <SectionHeader
                  title="ORGANIZATION STAFF"
                  count={staffMembers.length}
                  colors={colors}
                  action={canInvite ? { label: '+ Invite', onPress: handleInviteTeamMember } : undefined}
                />
                {staffMembers.map((member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                    colors={colors}
                    onPress={() => handleMemberPress(member)}
                    isCurrentUser={member.member_id === currentUserId}
                  />
                ))}
              </>
            )}

            {/* Teams Section */}
            <SectionHeader
              title="TEAMS"
              count={teams.length}
              colors={colors}
              action={canCreateTeam ? { label: '+ Create', onPress: handleCreateTeam } : undefined}
            />

            {teams.length === 0 ? (
              <EmptyState
                icon="people"
                iconColor="#6366F1"
                title="No teams yet"
                description="Create teams to organize your members into groups with commanders and soldiers"
                actionLabel={canCreateTeam ? "Create First Team" : undefined}
                onAction={canCreateTeam ? handleCreateTeam : undefined}
                colors={colors}
              />
            ) : (
              teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  colors={colors}
                  onPress={() => handleTeamPress(team)}
                  members={teamMembers}
                  onMemberPress={handleMemberPress}
                  currentUserId={currentUserId}
                />
              ))
            )}

            {/* Team Invites */}
            {canSeeInvites && teamInvites.length > 0 && (
              <>
                <SectionHeader title="PENDING TEAM INVITES" count={teamInvites.length} colors={colors} />
                {teamInvites.map((invite) => (
                  <InviteCard key={invite.id} invite={invite} colors={colors} />
                ))}
              </>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* ATTACHED VIEW */}
        {/* ============================================================ */}
        {mainView === 'attached' && isAdmin && (
          <>
            {/* Info Banner */}
            <View style={[styles.infoBanner, { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}>
              <Ionicons name="information-circle" size={20} color="#10B981" />
              <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>
                Attached members are external users (like range customers) who can log their own personal sessions linked to your organization. They cannot see teams or other members.
              </Text>
            </View>

            {/* Attached Members */}
            <SectionHeader
              title="ATTACHED MEMBERS"
              count={attachedMembers.length}
              colors={colors}
              action={canInvite ? { label: '+ Invite', onPress: handleInviteAttached } : undefined}
            />

            {attachedMembers.length === 0 ? (
              <EmptyState
                icon="link"
                iconColor="#10B981"
                title="No attached members"
                description="Invite external users who can log their own sessions without being part of your team structure"
                actionLabel="Invite Attached Member"
                onAction={handleInviteAttached}
                colors={colors}
              />
            ) : (
              attachedMembers.map((member) => (
                <AttachedCard
                  key={member.id}
                  member={member}
                  colors={colors}
                  onPress={() => handleMemberPress(member)}
                />
              ))
            )}

            {/* Attached Invites */}
            {attachedInvites.length > 0 && (
              <>
                <SectionHeader title="PENDING INVITES" count={attachedInvites.length} colors={colors} />
                {attachedInvites.map((invite) => (
                  <InviteCard key={invite.id} invite={invite} colors={colors} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
});

export default ManageScreen;

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },

  // Toggle Container
  toggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  viewToggleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
  },
  viewToggleDivider: {
    width: 1,
    marginVertical: 8,
  },
  viewToggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleText: {
    flex: 1,
  },
  viewToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  viewToggleCount: {
    fontSize: 12,
    marginTop: 1,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Staff Card
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  staffInfo: {
    flex: 1,
    gap: 2,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '600',
  },
  staffEmail: {
    fontSize: 12,
  },

  // Team Card
  teamCard: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInfo: {
    flex: 1,
    gap: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamMetaText: {
    fontSize: 13,
  },
  teamMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  teamCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamViewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  teamViewBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  teamMembersList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  teamMemberName: {
    flex: 1,
    fontSize: 14,
  },

  // Attached Card
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  attachedInfo: {
    flex: 1,
    gap: 2,
  },
  attachedName: {
    fontSize: 16,
    fontWeight: '600',
  },
  attachedEmail: {
    fontSize: 13,
  },
  attachedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  attachedMetaText: {
    fontSize: 11,
  },

  // Invite Card
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  inviteIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteInfo: {
    flex: 1,
    gap: 1,
  },
  inviteCode: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inviteRole: {
    fontSize: 11,
  },
  expiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Role Badge
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // You Badge
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  youBadgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeSmallText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  emptyActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
