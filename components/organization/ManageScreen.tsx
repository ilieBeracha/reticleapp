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

type ManageTab = 'members' | 'teams' | 'invites';

// ============================================================================
// ROLE BADGE COMPONENT
// ============================================================================
const RoleBadge = React.memo(function RoleBadge({
  role,
  teamRole,
  colors,
  compact = false,
}: {
  role: string;
  teamRole?: string;
  colors: typeof Colors.light;
  compact?: boolean;
}) {
  const getRoleConfig = () => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: '#6366F1', bg: '#6366F115', icon: 'shield-checkmark' as const };
      case 'admin':
        return { label: 'Admin', color: '#8B5CF6', bg: '#8B5CF615', icon: 'shield-half' as const };
      case 'instructor':
        return { label: 'Instructor', color: '#EC4899', bg: '#EC489915', icon: 'school' as const };
      default:
        return { label: 'Member', color: colors.textMuted, bg: colors.secondary, icon: 'person' as const };
    }
  };

  const config = getRoleConfig();

  if (compact) {
    return (
      <View style={[styles.roleBadgeCompact, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={10} color={config.color} />
      </View>
    );
  }

  return (
    <View style={[styles.roleBadge, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={12} color={config.color} />
      <Text style={[styles.roleBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
});

// ============================================================================
// TEAM ROLE BADGE
// ============================================================================
const TeamRoleBadge = React.memo(function TeamRoleBadge({
  teamRole,
  teamName,
  colors,
}: {
  teamRole: string;
  teamName: string;
  colors: typeof Colors.light;
}) {
  const getRoleConfig = () => {
    switch (teamRole) {
      case 'commander':
        return { label: 'Commander', color: '#F59E0B', icon: 'star' as const };
      case 'squad_commander':
        return { label: 'Squad Cmdr', color: '#10B981', icon: 'star-half' as const };
      default:
        return { label: 'Soldier', color: colors.textMuted, icon: 'person' as const };
    }
  };

  const config = getRoleConfig();

  return (
    <View style={[styles.teamRoleBadge, { backgroundColor: colors.secondary }]}>
      <Ionicons name={config.icon} size={10} color={config.color} />
      <Text style={[styles.teamRoleBadgeText, { color: colors.textMuted }]} numberOfLines={1}>
        {config.label} • {teamName}
      </Text>
    </View>
  );
});

// ============================================================================
// MEMBER CARD
// ============================================================================
const MemberCard = React.memo(function MemberCard({
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
        styles.memberCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        isCurrentUser && { borderColor: colors.primary, borderWidth: 1.5 },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <BaseAvatar
        fallbackText={member.profile_full_name || 'UN'}
        size="md"
        role={member.role}
      />

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
            {member.profile_full_name || 'Unknown'}
          </Text>
          {isCurrentUser && (
            <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>

        <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>
          {member.profile_email}
        </Text>

        <View style={styles.memberBadges}>
          <RoleBadge role={member.role} colors={colors} />
          {member.teams && member.teams.length > 0 && (
            <TeamRoleBadge
              teamRole={member.teams[0].team_role}
              teamName={member.teams[0].team_name}
              colors={colors}
            />
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );
});

// ============================================================================
// TEAM CARD
// ============================================================================
const TeamCard = React.memo(function TeamCard({
  team,
  colors,
  onPress,
}: {
  team: any;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const memberCount = team.member_count || 0;

  return (
    <TouchableOpacity
      style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.teamIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name="people" size={22} color={colors.text} />
      </View>

      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
        <View style={styles.teamMeta}>
          <Ionicons name="person-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.teamMetaText, { color: colors.textMuted }]}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </Text>
          {team.team_type && (
            <>
              <View style={[styles.teamMetaDot, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.teamMetaText, { color: colors.textMuted }]}>
                {team.team_type}
              </Text>
            </>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );
});

// ============================================================================
// PENDING INVITE CARD
// ============================================================================
const InviteCard = React.memo(function InviteCard({
  invite,
  colors,
}: {
  invite: WorkspaceInvitationWithDetails;
  colors: typeof Colors.light;
}) {
  const isExpired = new Date(invite.expires_at) < new Date();
  const roleLabel = invite.team_id
    ? `${invite.team_role || 'Member'} in ${invite.team_name || 'Team'}`
    : invite.role;

  return (
    <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.inviteIcon, { backgroundColor: isExpired ? colors.red + '15' : colors.primary + '15' }]}>
        <Ionicons
          name={isExpired ? 'time-outline' : 'mail-outline'}
          size={18}
          color={isExpired ? colors.red : colors.primary}
        />
      </View>

      <View style={styles.inviteInfo}>
        <View style={styles.inviteCodeRow}>
          <Text style={[styles.inviteCode, { color: colors.text }]}>
            {invite.invite_code}
          </Text>
          {isExpired && (
            <View style={[styles.expiredBadge, { backgroundColor: colors.red + '15' }]}>
              <Text style={[styles.expiredBadgeText, { color: colors.red }]}>Expired</Text>
            </View>
          )}
        </View>
        <Text style={[styles.inviteRole, { color: colors.textMuted }]}>{roleLabel}</Text>
      </View>
    </View>
  );
});

// ============================================================================
// PERMISSION BANNER
// ============================================================================
const PermissionBanner = React.memo(function PermissionBanner({
  colors,
  orgRole,
  isCommander,
  teamName,
}: {
  colors: typeof Colors.light;
  orgRole: string;
  isCommander: boolean;
  teamName?: string;
}) {
  const getPermissionInfo = () => {
    if (orgRole === 'owner' || orgRole === 'admin') {
      return {
        icon: 'shield-checkmark' as const,
        color: '#6366F1',
        title: 'Full Management Access',
        description: 'You can invite anyone and manage all teams',
      };
    }
    if (isCommander && teamName) {
      return {
        icon: 'star' as const,
        color: '#F59E0B',
        title: `Team Commander of ${teamName}`,
        description: 'You can invite members to your team only',
      };
    }
    return {
      icon: 'eye-outline' as const,
      color: colors.textMuted,
      title: 'View Only',
      description: 'You can view members but cannot make changes',
    };
  };

  const info = getPermissionInfo();

  return (
    <View style={[styles.permissionBanner, { backgroundColor: info.color + '10', borderColor: info.color + '30' }]}>
      <Ionicons name={info.icon} size={20} color={info.color} />
      <View style={styles.permissionText}>
        <Text style={[styles.permissionTitle, { color: info.color }]}>{info.title}</Text>
        <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>{info.description}</Text>
      </View>
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
}: {
  title: string;
  count?: number;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {typeof count === 'number' && (
        <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.countText, { color: colors.textMuted }]}>{count}</Text>
        </View>
      )}
    </View>
  );
});

// ============================================================================
// EMPTY STATE
// ============================================================================
const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconBox, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={32} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.emptyAction, { backgroundColor: colors.primary }]}
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
  const { orgRole, isCommander, teamInfo, currentUserId, loading: roleLoading } = useOrgRole();

  const {
    inviteMembersSheetRef,
    createTeamSheetRef,
    teamPreviewSheetRef,
    setSelectedTeam,
    memberPreviewSheetRef,
    setSelectedMember,
    setOnTeamCreated,
    setOnMemberInvited,
    setOnInviteAccepted,
  } = useModals();

  const [activeTab, setActiveTab] = useState<ManageTab>('members');
  const [teams, setTeams] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInvitationWithDetails[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Permission checks
  const canInvite = useMemo(() => {
    if (orgRole === 'owner' || orgRole === 'admin') return true;
    if (isCommander) return true;
    return false;
  }, [orgRole, isCommander]);

  const canCreateTeam = useMemo(() => {
    return orgRole === 'owner' || orgRole === 'admin';
  }, [orgRole]);

  const canSeeInvites = useMemo(() => {
    return orgRole === 'owner' || orgRole === 'admin' || isCommander;
  }, [orgRole, isCommander]);

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

  // Load pending invites
  const loadPendingInvites = useCallback(async () => {
    if (!activeWorkspaceId || !canSeeInvites) return;
    setInvitesLoading(true);
    try {
      const invites = await getPendingInvitations(activeWorkspaceId);
      setPendingInvites(invites);
    } catch (error) {
      console.error('Failed to load invites:', error);
      setPendingInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, [activeWorkspaceId, canSeeInvites]);

  // Initial load
  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceMembers();
      loadTeams();
      if (canSeeInvites) loadPendingInvites();
    }
  }, [activeWorkspaceId, loadWorkspaceMembers, loadTeams, loadPendingInvites, canSeeInvites]);

  // Register callbacks for immediate re-render
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

  const handleInvite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    inviteMembersSheetRef.current?.open();
  }, [inviteMembersSheetRef]);

  const handleCreateTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createTeamSheetRef.current?.open();
  }, [createTeamSheetRef]);

  const handleTeamPress = useCallback((team: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeam(team);
    teamPreviewSheetRef.current?.open();
  }, [setSelectedTeam, teamPreviewSheetRef]);

  const handleMemberPress = useCallback((member: WorkspaceMemberWithTeams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMember(member);
    memberPreviewSheetRef.current?.open();
  }, [setSelectedMember, memberPreviewSheetRef]);

  // Group members by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, WorkspaceMemberWithTeams[]> = {
      owner: [],
      admin: [],
      instructor: [],
      member: [],
    };

    workspaceMembers.forEach((m) => {
      if (groups[m.role]) groups[m.role].push(m);
    });

    return groups;
  }, [workspaceMembers]);

  const isLoading = membersLoading || teamsLoading || roleLoading;

  // Get action button config based on tab and permissions
  const getActionButton = () => {
    if (activeTab === 'members' && canInvite) {
      return { icon: 'person-add' as const, onPress: handleInvite };
    }
    if (activeTab === 'teams' && canCreateTeam) {
      return { icon: 'add' as const, onPress: handleCreateTeam };
    }
    if (activeTab === 'invites' && canInvite) {
      return { icon: 'add' as const, onPress: handleInvite };
    }
    return null;
  };

  const actionButton = getActionButton();

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
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Manage</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {activeWorkspace?.workspace_name || 'Workspace'}
            </Text>
          </View>

          {actionButton && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={actionButton.onPress}
              activeOpacity={0.8}
            >
              <Ionicons name={actionButton.icon} size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && { backgroundColor: colors.card }]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'members' ? colors.text : colors.textMuted }]}>
              Members
            </Text>
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'members' ? colors.primary : colors.border }]}>
              <Text style={[styles.tabBadgeText, { color: activeTab === 'members' ? '#fff' : colors.textMuted }]}>
                {workspaceMembers.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'teams' && { backgroundColor: colors.card }]}
            onPress={() => setActiveTab('teams')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'teams' ? colors.text : colors.textMuted }]}>
              Teams
            </Text>
            <View style={[styles.tabBadge, { backgroundColor: activeTab === 'teams' ? colors.primary : colors.border }]}>
              <Text style={[styles.tabBadgeText, { color: activeTab === 'teams' ? '#fff' : colors.textMuted }]}>
                {teams.length}
              </Text>
            </View>
          </TouchableOpacity>

          {canSeeInvites && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'invites' && { backgroundColor: colors.card }]}
              onPress={() => setActiveTab('invites')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'invites' ? colors.text : colors.textMuted }]}>
                Invites
              </Text>
              {pendingInvites.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.tabBadgeText, { color: '#fff' }]}>{pendingInvites.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {/* Permission Banner */}
        <PermissionBanner
          colors={colors}
          orgRole={orgRole}
          isCommander={isCommander}
          teamName={teamInfo?.teamName}
        />

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {workspaceMembers.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No members yet"
                description="Invite team members to get started"
                actionLabel={canInvite ? "Invite Member" : undefined}
                onAction={canInvite ? handleInvite : undefined}
                colors={colors}
              />
            ) : (
              <>
                {groupedMembers.owner.length > 0 && (
                  <>
                    <SectionHeader title="Owners" count={groupedMembers.owner.length} colors={colors} />
                    {groupedMembers.owner.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        colors={colors}
                        onPress={() => handleMemberPress(member)}
                        isCurrentUser={member.member_id === currentUserId}
                      />
                    ))}
                  </>
                )}

                {groupedMembers.admin.length > 0 && (
                  <>
                    <SectionHeader title="Admins" count={groupedMembers.admin.length} colors={colors} />
                    {groupedMembers.admin.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        colors={colors}
                        onPress={() => handleMemberPress(member)}
                        isCurrentUser={member.member_id === currentUserId}
                      />
                    ))}
                  </>
                )}

                {groupedMembers.instructor.length > 0 && (
                  <>
                    <SectionHeader title="Instructors" count={groupedMembers.instructor.length} colors={colors} />
                    {groupedMembers.instructor.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        colors={colors}
                        onPress={() => handleMemberPress(member)}
                        isCurrentUser={member.member_id === currentUserId}
                      />
                    ))}
                  </>
                )}

                {groupedMembers.member.length > 0 && (
                  <>
                    <SectionHeader title="Team Members" count={groupedMembers.member.length} colors={colors} />
                    {groupedMembers.member.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        colors={colors}
                        onPress={() => handleMemberPress(member)}
                        isCurrentUser={member.member_id === currentUserId}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <>
            {teams.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No teams yet"
                description={canCreateTeam ? "Create your first team to organize members" : "No teams have been created"}
                actionLabel={canCreateTeam ? "Create Team" : undefined}
                onAction={canCreateTeam ? handleCreateTeam : undefined}
                colors={colors}
              />
            ) : (
              <>
                <SectionHeader title="All Teams" count={teams.length} colors={colors} />
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    colors={colors}
                    onPress={() => handleTeamPress(team)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && canSeeInvites && (
          <>
            {pendingInvites.length === 0 ? (
              <EmptyState
                icon="mail-outline"
                title="No pending invites"
                description="Create invite codes to add new members"
                actionLabel={canInvite ? "Create Invite" : undefined}
                onAction={canInvite ? handleInvite : undefined}
                colors={colors}
              />
            ) : (
              <>
                <SectionHeader title="Pending Invitations" count={pendingInvites.length} colors={colors} />
                {pendingInvites.map((invite) => (
                  <InviteCard key={invite.id} invite={invite} colors={colors} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },

  // Permission Banner
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 12,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  memberEmail: {
    fontSize: 13,
  },
  memberBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
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
  roleBadgeCompact: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Team Role Badge
  teamRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    maxWidth: 160,
  },
  teamRoleBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Team Card
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    gap: 4,
  },
  teamMetaText: {
    fontSize: 13,
  },
  teamMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },

  // Invite Card
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteInfo: {
    flex: 1,
    gap: 2,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteCode: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inviteRole: {
    fontSize: 13,
  },
  expiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

