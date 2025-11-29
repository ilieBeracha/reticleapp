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
import { Button, ContextMenu, Host } from '@expo/ui/swift-ui';
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

// ============================================================================
// TYPES
// ============================================================================
type ManageSection = 'staff' | 'attached' | 'teams';

// ============================================================================
// SECTION TAB BAR (for admins)
// ============================================================================
const SectionTabs = React.memo(function SectionTabs({
  activeSection,
  onSectionChange,
  staffCount,
  attachedCount,
  teamCount,
  colors,
  showTeams,
  showAttached,
}: {
  activeSection: ManageSection;
  onSectionChange: (section: ManageSection) => void;
  staffCount: number;
  attachedCount: number;
  teamCount: number;
  colors: typeof Colors.light;
  showTeams: boolean;
  showAttached: boolean;
}) {
  const allTabs: { key: ManageSection; label: string; icon: keyof typeof Ionicons.glyphMap; count: number; color: string }[] = [
    { key: 'staff', label: 'Staff', icon: 'shield', count: staffCount, color: '#6366F1' },
    { key: 'teams', label: 'Teams', icon: 'people', count: teamCount, color: '#F59E0B' },
    { key: 'attached', label: 'Attached', icon: 'link', count: attachedCount, color: '#10B981' },
  ];

  // Filter tabs based on visibility settings
  const tabs = allTabs.filter(tab => {
    if (tab.key === 'teams' && !showTeams) return false;
    if (tab.key === 'attached' && !showAttached) return false;
    return true;
  });

    return (
    <View style={[styles.sectionTabs, { backgroundColor: colors.secondary }]}>
      {tabs.map((tab) => {
        const isActive = activeSection === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.sectionTab, isActive && { backgroundColor: colors.card }]}
            onPress={() => onSectionChange(tab.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.sectionTabIcon, { backgroundColor: isActive ? tab.color + '20' : 'transparent' }]}>
              <Ionicons name={tab.icon} size={16} color={isActive ? tab.color : colors.textMuted} />
      </View>
            <Text style={[styles.sectionTabLabel, { color: isActive ? colors.text : colors.textMuted }]}>
              {tab.label}
            </Text>
            <View style={[styles.sectionTabBadge, { backgroundColor: isActive ? tab.color : colors.border }]}>
              <Text style={[styles.sectionTabBadgeText, { color: isActive ? '#fff' : colors.textMuted }]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ============================================================================
// ROLE BADGE
// ============================================================================
const RoleBadge = React.memo(function RoleBadge({
  role,
  colors,
  size = 'normal',
}: {
  role: string;
  colors: typeof Colors.light;
  size?: 'small' | 'normal';
}) {
  const config = useMemo(() => {
    switch (role) {
      case 'owner': return { label: 'Owner', color: '#6366F1', icon: 'shield-checkmark' as const };
      case 'admin': return { label: 'Admin', color: '#8B5CF6', icon: 'shield-half' as const };
      case 'instructor': return { label: 'Instructor', color: '#EC4899', icon: 'school' as const };
      case 'attached': return { label: 'Attached', color: '#10B981', icon: 'link' as const };
      case 'commander': return { label: 'Commander', color: '#F59E0B', icon: 'star' as const };
      case 'squad_commander': return { label: 'Squad Cmdr', color: '#10B981', icon: 'star-half' as const };
      case 'soldier': return { label: 'Soldier', color: colors.textMuted, icon: 'person' as const };
      default: return { label: 'Member', color: colors.textMuted, icon: 'person' as const };
    }
  }, [role, colors.textMuted]);

  const isSmall = size === 'small';

  return (
    <View style={[styles.roleBadge, { backgroundColor: config.color + '15' }, isSmall && styles.roleBadgeSmall]}>
      <Ionicons name={config.icon} size={isSmall ? 10 : 11} color={config.color} />
      <Text style={[styles.roleBadgeText, { color: config.color }, isSmall && styles.roleBadgeTextSmall]}>
        {config.label}
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
  showTeamInfo,
}: {
  member: WorkspaceMemberWithTeams;
  colors: typeof Colors.light;
  onPress: () => void;
  isCurrentUser?: boolean;
  showTeamInfo?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.memberCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        isCurrentUser && { borderColor: colors.primary },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="sm" role={member.role} />
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
        {showTeamInfo && member.teams && member.teams.length > 0 && (
          <Text style={[styles.memberTeam, { color: colors.textMuted }]} numberOfLines={1}>
            {member.teams[0].team_role} in {member.teams[0].team_name}
          </Text>
          )}
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
      <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="md" role="attached" />
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

  const teamMembers = useMemo(
    () => members.filter((m) => m.teams?.some((t) => t.team_id === team.id)),
    [members, team.id]
  );

  const memberCount = team.member_count || teamMembers.length || 0;

  return (
    <View style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <TouchableOpacity
        style={styles.teamCardHeader}
      activeOpacity={0.7}
        onPress={() => setExpanded(!expanded)}
    >
        <View style={[styles.teamIcon, { backgroundColor: '#F59E0B15' }]}>
          <Ionicons name="people" size={20} color="#F59E0B" />
      </View>
      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, { color: colors.text }]}>{team.name}</Text>
          <Text style={[styles.teamMeta, { color: colors.textMuted }]}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
            {team.squads?.length > 0 && ` · ${team.squads.length} squads`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.teamViewBtn, { backgroundColor: colors.secondary }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.teamViewBtnText, { color: colors.text }]}>Manage</Text>
        </TouchableOpacity>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {expanded && teamMembers.length > 0 && (
        <View style={[styles.teamMembersList, { borderTopColor: colors.border }]}>
          {teamMembers.map((member) => {
            const teamMembership = member.teams?.find((t) => t.team_id === team.id);
            return (
              <TouchableOpacity
                key={member.id}
                style={styles.teamMemberRow}
                onPress={() => onMemberPress(member)}
                activeOpacity={0.7}
              >
                <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="xs" role={member.role} />
                <Text style={[styles.teamMemberName, { color: colors.text }]} numberOfLines={1}>
                  {member.profile_full_name || 'Unknown'}
              </Text>
                {member.member_id === currentUserId && (
                  <View style={[styles.youBadgeSmall, { backgroundColor: colors.primary }]}>
                    <Text style={styles.youBadgeSmallText}>You</Text>
                  </View>
          )}
                <RoleBadge role={teamMembership?.team_role || 'member'} colors={colors} size="small" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      </View>
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
  const roleLabel = isAttached
    ? 'Attached Member'
    : invite.team_name
      ? `${invite.team_role} in ${invite.team_name}`
    : invite.role;

  return (
    <View style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View
        style={[
          styles.inviteIcon,
          { backgroundColor: isExpired ? colors.red + '15' : isAttached ? '#10B98115' : '#6366F115' },
        ]}
      >
        <Ionicons
          name={isExpired ? 'time-outline' : isAttached ? 'link' : 'ticket-outline'}
          size={14}
          color={isExpired ? colors.red : isAttached ? '#10B981' : '#6366F1'}
        />
      </View>
      <View style={styles.inviteInfo}>
        <Text style={[styles.inviteCode, { color: colors.text }]}>{invite.invite_code}</Text>
        <Text style={[styles.inviteRole, { color: colors.textMuted }]}>{roleLabel}</Text>
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
// INFO BANNER
// ============================================================================
const InfoBanner = React.memo(function InfoBanner({
  icon,
  iconColor,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  text: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.infoBanner, { backgroundColor: iconColor + '10', borderColor: iconColor + '30' }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.infoBannerText, { color: colors.textMuted }]}>{text}</Text>
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
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.emptyAction, { backgroundColor: iconColor }]} onPress={onAction} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ============================================================================
// TEAM MEMBER VIEW (for soldiers/commanders - their team + org overview)
// ============================================================================
const TeamMemberView = React.memo(function TeamMemberView({
  colors,
  teamInfo,
  members,
  teams,
  currentUserId,
  isCommander,
  onMemberPress,
  onTeamPress,
  onInviteToTeam,
}: {
  colors: typeof Colors.light;
  teamInfo: { teamId: string; teamName: string; teamRole: string } | null;
  members: WorkspaceMemberWithTeams[];
  teams: any[];
  currentUserId?: string | null;
  isCommander: boolean;
  onMemberPress: (member: WorkspaceMemberWithTeams) => void;
  onTeamPress: (team: any) => void;
  onInviteToTeam: () => void;
}) {
  // Filter members for this team
  const teamMembers = useMemo(
    () => (teamInfo ? members.filter((m) => m.teams?.some((t) => t.team_id === teamInfo.teamId)) : []),
    [members, teamInfo]
  );
  
  // Staff members (visible to all team members)
  const staffMembers = useMemo(
    () => members.filter(m => ['owner', 'admin', 'instructor'].includes(m.role)),
    [members]
  );
  
  // Other teams (not my team)
  const otherTeams = useMemo(
    () => (teamInfo ? teams.filter(t => t.id !== teamInfo.teamId) : teams),
    [teams, teamInfo]
  );

  if (!teamInfo) {
    return (
      <View style={styles.noTeamContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.noTeamText, { color: colors.textMuted }]}>You're not assigned to a team yet</Text>
      </View>
    );
  }

  return (
    <>
      {/* My Team Header */}
      <View style={[styles.teamHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.teamHeaderIcon, { backgroundColor: '#F59E0B15' }]}>
          <Ionicons name="people" size={28} color="#F59E0B" />
        </View>
        <View style={styles.teamHeaderInfo}>
          <Text style={[styles.teamHeaderName, { color: colors.text }]}>{teamInfo.teamName}</Text>
          <Text style={[styles.teamHeaderRole, { color: colors.textMuted }]}>
            Your role: <Text style={{ color: '#F59E0B', fontWeight: '600' }}>{teamInfo.teamRole}</Text>
          </Text>
        </View>
        {isCommander && (
        <TouchableOpacity
            style={[styles.teamInviteBtn, { backgroundColor: '#10B98115' }]}
            onPress={onInviteToTeam}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={18} color="#10B981" />
        </TouchableOpacity>
      )}
    </View>

      {/* My Team Members */}
      <SectionHeader title="TEAM MEMBERS" count={teamMembers.length} colors={colors} />
      {teamMembers.map((member) => {
        const membership = member.teams?.find((t) => t.team_id === teamInfo.teamId);
        return (
          <TouchableOpacity
            key={member.id}
            style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => onMemberPress(member)}
          >
            <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="sm" role={member.role} />
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                  {member.profile_full_name || 'Unknown'}
                </Text>
                {member.member_id === currentUserId && (
                  <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.youBadgeText}>You</Text>
                  </View>
                )}
              </View>
            </View>
            <RoleBadge role={membership?.team_role || 'member'} colors={colors} />
          </TouchableOpacity>
        );
      })}
      
      {/* ═══ ORGANIZATION OVERVIEW ═══ */}
      
      {/* Organization Staff */}
      {staffMembers.length > 0 && (
        <>
          <SectionHeader title="ORGANIZATION STAFF" count={staffMembers.length} colors={colors} />
          {staffMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => onMemberPress(member)}
            >
              <BaseAvatar fallbackText={member.profile_full_name || 'UN'} size="sm" role={member.role} />
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                  {member.profile_full_name || 'Unknown'}
                </Text>
              </View>
              <RoleBadge role={member.role} colors={colors} />
            </TouchableOpacity>
          ))}
        </>
      )}
      
      {/* Other Teams */}
      {otherTeams.length > 0 && (
        <>
          <SectionHeader title="OTHER TEAMS" count={otherTeams.length} colors={colors} />
          {otherTeams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => onTeamPress(team)}
            >
              <View style={[styles.teamCardIcon, { backgroundColor: '#6366F115' }]}>
                <Ionicons name="people" size={20} color="#6366F1" />
              </View>
              <View style={styles.teamCardInfo}>
                <Text style={[styles.teamCardName, { color: colors.text }]}>{team.name}</Text>
                <Text style={[styles.teamCardCount, { color: colors.textMuted }]}>
                  {team.member_count || 0} members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </>
      )}
    </>
  );
});


// ============================================================================
// ADMIN VIEW (full access - Staff, Teams, Attached)
// ============================================================================
const AdminView = React.memo(function AdminView({
  colors,
  activeSection,
  staffMembers,
  teamMembers,
  attachedMembers,
  teams,
  invites,
  currentUserId,
  onMemberPress,
  onTeamPress,
  onInviteStaff,
  onInviteTeam,
  onInviteAttached,
  onCreateTeam,
  canInvite,
  canCreateTeam,
}: {
  colors: typeof Colors.light;
  activeSection: ManageSection;
  staffMembers: WorkspaceMemberWithTeams[];
  teamMembers: WorkspaceMemberWithTeams[];
  attachedMembers: WorkspaceMemberWithTeams[];
  teams: any[];
  invites: WorkspaceInvitationWithDetails[];
  currentUserId?: string | null;
  onMemberPress: (member: WorkspaceMemberWithTeams) => void;
  onTeamPress: (team: any) => void;
  onInviteStaff: () => void;
  onInviteTeam: () => void;
  onInviteAttached: () => void;
  onCreateTeam: () => void;
  canInvite: boolean;
  canCreateTeam: boolean;
}) {
  const staffInvites = invites.filter((i) => ['owner', 'admin', 'instructor'].includes(i.role));
  const teamInvites = invites.filter((i) => i.team_id && i.role === 'member');
  const attachedInvites = invites.filter((i) => i.role === 'attached');

  return (
    <>
      {/* ========== STAFF SECTION ========== */}
      {activeSection === 'staff' && (
        <>
          <InfoBanner
            icon="shield"
            iconColor="#6366F1"
            text="Staff members have organization-wide access. They can see all teams and members."
            colors={colors}
          />

          <SectionHeader
            title="ORGANIZATION STAFF"
            count={staffMembers.length}
            colors={colors}
            action={canInvite ? { label: '+ Invite Staff', onPress: onInviteStaff } : undefined}
          />

          {staffMembers.length === 0 ? (
            <EmptyState
              icon="shield"
              iconColor="#6366F1"
              title="No staff members"
              description="Invite admins and instructors to help manage your organization"
              actionLabel={canInvite ? 'Invite Staff' : undefined}
              onAction={canInvite ? onInviteStaff : undefined}
              colors={colors}
            />
          ) : (
            staffMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                colors={colors}
                onPress={() => onMemberPress(member)}
                isCurrentUser={member.member_id === currentUserId}
              />
            ))
          )}

          {staffInvites.length > 0 && (
            <>
              <SectionHeader title="PENDING STAFF INVITES" count={staffInvites.length} colors={colors} />
              {staffInvites.map((invite) => (
                <InviteCard key={invite.id} invite={invite} colors={colors} />
              ))}
            </>
          )}
        </>
      )}

      {/* ========== TEAMS SECTION ========== */}
      {activeSection === 'teams' && (
        <>
          <InfoBanner
            icon="people"
            iconColor="#F59E0B"
            text="Teams organize members into groups with commanders and soldiers. Team members only see their own team."
            colors={colors}
          />

          <SectionHeader
            title="TEAMS"
            count={teams.length}
            colors={colors}
            action={canCreateTeam ? { label: '+ Create Team', onPress: onCreateTeam } : undefined}
          />

          {teams.length === 0 ? (
            <EmptyState
              icon="people"
              iconColor="#F59E0B"
              title="No teams yet"
              description="Create teams to organize members with commanders and soldiers"
              actionLabel={canCreateTeam ? 'Create Team' : undefined}
              onAction={canCreateTeam ? onCreateTeam : undefined}
              colors={colors}
            />
          ) : (
            teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                colors={colors}
                onPress={() => onTeamPress(team)}
                members={teamMembers}
                onMemberPress={onMemberPress}
                currentUserId={currentUserId}
              />
            ))
          )}

          {canInvite && (
            <TouchableOpacity
              style={[styles.inviteTeamBtn, { borderColor: colors.border }]}
              onPress={onInviteTeam}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={[styles.inviteTeamBtnText, { color: colors.primary }]}>Invite Team Member</Text>
            </TouchableOpacity>
          )}

          {teamInvites.length > 0 && (
            <>
              <SectionHeader title="PENDING TEAM INVITES" count={teamInvites.length} colors={colors} />
              {teamInvites.map((invite) => (
                <InviteCard key={invite.id} invite={invite} colors={colors} />
              ))}
            </>
          )}
        </>
      )}

      {/* ========== ATTACHED SECTION ========== */}
      {activeSection === 'attached' && (
        <>
          <InfoBanner
            icon="link"
            iconColor="#10B981"
            text="Attached members are external users who log their own sessions. They can't see teams or other members."
            colors={colors}
          />

          <SectionHeader
            title="ATTACHED MEMBERS"
            count={attachedMembers.length}
            colors={colors}
            action={canInvite ? { label: '+ Invite', onPress: onInviteAttached } : undefined}
          />

          {attachedMembers.length === 0 ? (
            <EmptyState
              icon="link"
              iconColor="#10B981"
              title="No attached members"
              description="Invite external users (like range customers) to log sessions linked to your org"
              actionLabel={canInvite ? 'Invite Attached Member' : undefined}
              onAction={canInvite ? onInviteAttached : undefined}
              colors={colors}
            />
          ) : (
            attachedMembers.map((member) => (
              <AttachedCard key={member.id} member={member} colors={colors} onPress={() => onMemberPress(member)} />
            ))
          )}

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
    </>
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

  const { setSelectedTeam, setSelectedMember, setOnTeamCreated, setOnMemberInvited, setOnInviteAccepted } = useModals();

  const [activeSection, setActiveSection] = useState<ManageSection>('staff');
  const [teams, setTeams] = useState<any[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvitationWithDetails[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get visibility settings from workspace (persisted in database)
  const showTeams = activeWorkspace?.show_teams_tab ?? true;
  const showAttached = activeWorkspace?.show_attached_tab ?? true;
  
  // Get store action to update settings
  const { updateWorkspaceSettings } = useWorkspaceStore();

  // Determine user type (attached members never see this screen - they're redirected)
  const isOrgStaff = ['owner', 'admin', 'instructor'].includes(orgRole);
  const isTeamMember = !isOrgStaff; // Soldiers, commanders - they see "My Team" view
  
  // Check if user can change settings (admin/owner only)
  const canChangeSettings = orgRole === 'owner' || orgRole === 'admin';
  
  // Reset active section if current section is hidden
  useEffect(() => {
    if (activeSection === 'teams' && !showTeams) {
      setActiveSection('staff');
    } else if (activeSection === 'attached' && !showAttached) {
      setActiveSection('staff');
    }
  }, [showTeams, showAttached, activeSection]);
  
  // Handler to toggle settings (saves to database)
  const handleToggleTeams = useCallback(async () => {
    if (!canChangeSettings) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateWorkspaceSettings({ show_teams_tab: !showTeams });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }, [canChangeSettings, showTeams, updateWorkspaceSettings]);
  
  const handleToggleAttached = useCallback(async () => {
    if (!canChangeSettings) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateWorkspaceSettings({ show_attached_tab: !showAttached });
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }, [canChangeSettings, showAttached, updateWorkspaceSettings]);

  // Permissions
  const canInvite = isOrgStaff || isCommander;
  const canCreateTeam = ['owner', 'admin'].includes(orgRole);
  const canSeeInvites = isOrgStaff || isCommander;

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setTeamsLoading(true);
    try {
      const data = await getWorkspaceTeams(activeWorkspaceId);
      setTeams(data || []);
    } catch (e) {
      console.error('Failed to load teams:', e);
    } finally {
      setTeamsLoading(false);
    }
  }, [activeWorkspaceId]);

  // Load invites
  const loadInvites = useCallback(async () => {
    if (!activeWorkspaceId || !canSeeInvites) return;
    try {
      const data = await getPendingInvitations(activeWorkspaceId);
      setInvites(data);
    } catch (e) {
      console.error('Failed to load invites:', e);
    }
  }, [activeWorkspaceId, canSeeInvites]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadWorkspaceMembers();
      loadTeams();
      if (canSeeInvites) loadInvites();
    }
  }, [activeWorkspaceId, loadWorkspaceMembers, loadTeams, loadInvites, canSeeInvites]);

  useEffect(() => {
    setOnTeamCreated(() => loadTeams);
    setOnMemberInvited(() => () => {
      loadWorkspaceMembers();
      loadInvites();
    });
    setOnInviteAccepted(() => loadWorkspaceMembers);
    return () => {
      setOnTeamCreated(null);
      setOnMemberInvited(null);
      setOnInviteAccepted(null);
    };
  }, [loadTeams, loadWorkspaceMembers, loadInvites, setOnTeamCreated, setOnMemberInvited, setOnInviteAccepted]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadWorkspaceMembers(), loadTeams(), canSeeInvites ? loadInvites() : Promise.resolve()]);
    setRefreshing(false);
  }, [loadWorkspaceMembers, loadTeams, loadInvites, canSeeInvites]);

  // Actions - Separate invite sheets for each type
  const handleInviteStaff = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/inviteStaff' as any);
  }, []);

  const handleInviteTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/inviteTeamMember' as any);
  }, []);

  const handleInviteAttached = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/inviteAttached' as any);
  }, []);

  const handleCreateTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/createTeam' as any);
  }, []);

  const handleTeamPress = useCallback(
    (team: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeam(team);
      router.push('/(protected)/teamPreview' as any);
    },
    [setSelectedTeam]
  );

  const handleMemberPress = useCallback(
    (member: WorkspaceMemberWithTeams) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMember(member);
      router.push('/(protected)/memberPreview' as any);
    },
    [setSelectedMember]
  );

  // Categorize members
  const { staffMembers, teamMembers, attachedMembers } = useMemo(() => {
    const staff: WorkspaceMemberWithTeams[] = [];
    const team: WorkspaceMemberWithTeams[] = [];
    const attached: WorkspaceMemberWithTeams[] = [];

    workspaceMembers.forEach((m) => {
      if (m.role === 'attached') attached.push(m);
      else if (['owner', 'admin', 'instructor'].includes(m.role)) staff.push(m);
      else team.push(m);
    });

    return { staffMembers: staff, teamMembers: team, attachedMembers: attached };
  }, [workspaceMembers]);

  const isLoading = membersLoading || teamsLoading || roleLoading;

  if (isLoading && !refreshing && workspaceMembers.length === 0) {
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

  // Determine header title based on view
  const getHeaderTitle = () => {
    if (isTeamMember) return 'My Team';
    return 'Manage';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{getHeaderTitle()}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {activeWorkspace?.workspace_name ?? 'Workspace'}
            </Text>
          </View>

        {/* Visibility Options Dropdown - Only for admin/owner on iOS */}
        {canChangeSettings && Platform.OS === 'ios' && (
          <Host style={styles.dropdownHost}>
            <ContextMenu>
              <ContextMenu.Items>
                <Button
                  systemImage={showTeams ? 'checkmark.circle.fill' : 'circle'}
                  onPress={handleToggleTeams}
                >
                  {showTeams ? 'Hide Teams' : 'Show Teams'}
                </Button>
                <Button
                  systemImage={showAttached ? 'checkmark.circle.fill' : 'circle'}
                  onPress={handleToggleAttached}
                >
                  {showAttached ? 'Hide Attached' : 'Show Attached'}
                </Button>
              </ContextMenu.Items>
              <ContextMenu.Trigger>
                <Button variant="borderless" systemImage="line.3.horizontal.decrease.circle">
                  View
                </Button>
              </ContextMenu.Trigger>
            </ContextMenu>
          </Host>
          )}
        </View>

      {/* Section Tabs (only for org staff) */}
      {isOrgStaff && (
        <View style={styles.tabsContainer}>
          <SectionTabs
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            staffCount={staffMembers.length}
            attachedCount={attachedMembers.length}
            teamCount={teams.length}
            colors={colors}
            showTeams={showTeams}
            showAttached={showAttached}
          />
                </View>
              )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* TEAM MEMBER VIEW - Their team + org overview */}
        {isTeamMember && (
          <TeamMemberView
            colors={colors}
            teamInfo={teamInfo}
            members={workspaceMembers}
            teams={teams}
            currentUserId={currentUserId}
            isCommander={isCommander}
            onMemberPress={handleMemberPress}
            onTeamPress={handleTeamPress}
            onInviteToTeam={handleInviteTeam}
          />
        )}

        {/* ADMIN VIEW - Full management (attached members never see this screen) */}
        {isOrgStaff && (
          <AdminView
                        colors={colors}
            activeSection={activeSection}
            staffMembers={staffMembers}
            teamMembers={teamMembers}
            attachedMembers={attachedMembers}
            teams={teams}
            invites={invites}
            currentUserId={currentUserId}
            onMemberPress={handleMemberPress}
            onTeamPress={handleTeamPress}
            onInviteStaff={handleInviteStaff}
            onInviteTeam={handleInviteTeam}
            onInviteAttached={handleInviteAttached}
            onCreateTeam={handleCreateTeam}
            canInvite={canInvite}
            canCreateTeam={canCreateTeam}
          />
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2, opacity: 0.6 },
  dropdownHost: { width: 70, height: 36, marginLeft: 8 },

  // Tabs
  tabsContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionTabs: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
    gap: 5,
  },
  sectionTabIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sectionTabLabel: { fontSize: 12, fontWeight: '600' },
  sectionTabBadge: { minWidth: 18, height: 16, paddingHorizontal: 5, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTabBadgeText: { fontSize: 10, fontWeight: '600' },

  // Content
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingTop: 8 },

  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  sectionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sectionBadgeText: { fontSize: 10, fontWeight: '600' },
  sectionAction: { fontSize: 12, fontWeight: '600' },

  // Info Banner
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10, marginBottom: 6 },
  infoBannerText: { flex: 1, fontSize: 12, lineHeight: 17, opacity: 0.8 },

  // Member Card
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 6, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  memberInfo: { flex: 1, gap: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberEmail: { fontSize: 11, opacity: 0.6 },
  memberTeam: { fontSize: 10, marginTop: 1, opacity: 0.5 },

  // Attached Card
  attachedCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  attachedInfo: { flex: 1, gap: 1 },
  attachedName: { fontSize: 15, fontWeight: '600' },
  attachedEmail: { fontSize: 12, opacity: 0.6 },
  attachedMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  attachedMetaText: { fontSize: 10, opacity: 0.5 },

  // Team Card
  teamCard: { marginBottom: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  teamCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  teamIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1, gap: 1 },
  teamName: { fontSize: 15, fontWeight: '600' },
  teamMeta: { fontSize: 12, opacity: 0.6 },
  teamViewBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  teamViewBtnText: { fontSize: 12, fontWeight: '600' },
  teamMembersList: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6, paddingHorizontal: 12 },
  teamMemberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  teamMemberName: { flex: 1, fontSize: 13 },

  // Team Header (for team member view)
  teamHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 12, marginBottom: 6 },
  teamHeaderIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  teamHeaderInfo: { flex: 1, gap: 2 },
  teamHeaderName: { fontSize: 18, fontWeight: '700' },
  teamHeaderRole: { fontSize: 13, opacity: 0.7 },
  teamInviteBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  // Team Card (for org overview in team member view)
  teamCardIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  teamCardInfo: { flex: 1, gap: 1 },
  teamCardName: { fontSize: 14, fontWeight: '600' },
  teamCardCount: { fontSize: 11, opacity: 0.6 },

  // Invite Button
  inviteTeamBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 6, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', gap: 6 },
  inviteTeamBtnText: { fontSize: 13, fontWeight: '600' },

  // Invite Card
  inviteCard: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 5, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  inviteIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  inviteInfo: { flex: 1, gap: 0 },
  inviteCode: { fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inviteRole: { fontSize: 10, opacity: 0.6 },
  expiredBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  expiredBadgeText: { fontSize: 9, fontWeight: '600' },

  // Role Badge
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, gap: 3 },
  roleBadgeSmall: { paddingHorizontal: 5, paddingVertical: 2 },
  roleBadgeText: { fontSize: 10, fontWeight: '600' },
  roleBadgeTextSmall: { fontSize: 9 },

  // You Badge
  youBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  youBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  youBadgeSmall: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  youBadgeSmallText: { fontSize: 7, fontWeight: '700', color: '#fff' },

  // No Team
  noTeamContainer: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  noTeamText: { fontSize: 14, opacity: 0.6 },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 28 },
  emptyIconBox: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16, opacity: 0.7 },
  emptyAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, gap: 5 },
  emptyActionText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
