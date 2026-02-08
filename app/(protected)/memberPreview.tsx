import { BaseAvatar } from '@/components/shared/Avatar';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getCurrentUserId } from '@/services/authService';
import { removeTeamMember, toggleMemberPermission, updateTeamMemberRole } from '@/services/teamService';
import { useTeamRoleFlags, useTeamStore } from '@/stores/teamStore';
import type { MemberPermissions, TeamRole } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONFIG
// ═══════════════════════════════════════════════════════════════════════════

interface RoleConfig {
  color: string;
  bg: string;
  label: string;
  icon: string;
}

const getRoleConfig = (t: ReturnType<typeof useTranslation>['t']): Record<TeamRole, RoleConfig> => ({
  owner: { color: '#8B5CF6', bg: '#8B5CF620', label: t('teams.owner'), icon: 'crown' },
  commander: { color: '#EF4444', bg: '#EF444420', label: t('teams.commander'), icon: 'shield-checkmark' },
  squad_commander: { color: '#F59E0B', bg: '#F59E0B20', label: t('teams.squadCommander'), icon: 'shield' },
  soldier: { color: '#22C55E', bg: '#22C55E20', label: t('teams.soldier'), icon: 'person' },
});

const TEAM_ROLE_OPTIONS: TeamRole[] = ['commander', 'squad_commander', 'soldier'];

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM HOOK
// ═══════════════════════════════════════════════════════════════════════════

function useMemberPreview() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const { activeTeamId, activeTeam, members, loadMembers } = useTeamStore();
  const { squadId: mySquadId, isSquadCommander, canManage: canManageTeam } = useTeamRoleFlags();
  const permissions = usePermissions();

  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [squadPickerVisible, setSquadPickerVisible] = useState(false);
  const [pendingRole, setPendingRole] = useState<TeamRole | null>(null);
  const [togglingPermission, setTogglingPermission] = useState(false);

  const ROLE_CONFIG = useMemo(() => getRoleConfig(t), [t]);
  const teamSquads = activeTeam?.squads || [];

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId).catch(console.error);
  }, []);

  const member = useMemo(() => {
    if (!params.id) return null;
    return members.find((m) => m.user_id === params.id);
  }, [params.id, members]);

  const memberRole = (member?.role?.role || 'soldier') as TeamRole;
  const memberSquadId = member?.role?.squad_id || member?.details?.squad_id || null;
  const roleConfig = ROLE_CONFIG[memberRole] || ROLE_CONFIG.soldier;
  const memberPermissions: MemberPermissions = member?.permissions || {};

  // Permission checks
  const isTargetOwner = memberRole === 'owner';
  const isTargetSelf = member?.user_id === currentUserId;

  const canManageThisMember = useMemo(() => {
    if (!member || isTargetOwner || isTargetSelf) return false;
    return permissions.canManageMember(member.user_id, memberRole, memberSquadId);
  }, [member, isTargetOwner, isTargetSelf, memberRole, memberSquadId, permissions]);

  const isSquadCommanderManagingSquadMember =
    isSquadCommander && memberRole === 'soldier' && mySquadId && memberSquadId === mySquadId;

  const canManageTeamRole = canManageTeam && !isTargetOwner && !isTargetSelf;
  const canAssignSquad = canManageThisMember && (canManageTeam || isSquadCommanderManagingSquadMember);
  const canRemoveFromTeam = canManageThisMember;
  const canManagePermissions = canManageTeamRole && memberRole === 'soldier';

  // Handlers
  const updateTeamRole = useCallback(
    async (newRole: TeamRole, squadId: string | null) => {
      if (!activeTeamId || !member) return;
      try {
        setLoading(true);
        const details = squadId ? { squad_id: squadId } : undefined;
        await updateTeamMemberRole(activeTeamId, member.user_id, newRole, details);
        await loadMembers();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (error: any) {
        Alert.alert(t('errors.error'), error.message || t('errors.generic'));
      } finally {
        setLoading(false);
      }
    },
    [activeTeamId, member, loadMembers, t]
  );

  const handleViewActivity = useCallback(() => {
    if (!member) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/memberActivity',
      params: { memberId: member.user_id, memberName: member.profile?.full_name || t('members.member') },
    });
  }, [member, t]);

  const handleChangeTeamRole = useCallback(() => {
    if (!activeTeamId || !member) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const availableRoles = TEAM_ROLE_OPTIONS.filter((r) => r !== memberRole);
    const options = [...availableRoles.map((r) => ROLE_CONFIG[r]?.label || r), t('common.cancel')];
    const cancelButtonIndex = options.length - 1;

    const handleRoleSelect = (role: TeamRole) => {
      if (role === 'squad_commander') {
        if (teamSquads.length === 0) {
          Alert.alert(t('members.noSquadsTitle'), t('members.noSquadsMessage'));
          return;
        }
        setPendingRole(role);
        setSquadPickerVisible(true);
      } else {
        updateTeamRole(role, null);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: t('members.assignSquadTitle'),
          message: `${t('members.currently')} ${ROLE_CONFIG[memberRole]?.label}`,
        },
        (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            handleRoleSelect(availableRoles[buttonIndex]);
          }
        }
      );
    } else {
      Alert.alert(t('members.assignSquadTitle'), `${t('members.currently')} ${ROLE_CONFIG[memberRole]?.label}`, [
        ...availableRoles.map((role) => ({
          text: ROLE_CONFIG[role]?.label || role,
          onPress: () => handleRoleSelect(role),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]);
    }
  }, [activeTeamId, member, memberRole, teamSquads, updateTeamRole, ROLE_CONFIG, t]);

  const handleAssignSquad = useCallback(() => {
    if (teamSquads.length === 0) {
      Alert.alert(t('members.noSquadsTitle'), t('members.noSquadsMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('members.goToSquads'),
          onPress: () => {
            router.back();
            router.push(`/(protected)/teamSquads?teamId=${activeTeamId}` as any);
          },
        },
      ]);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingRole(null);
    setSquadPickerVisible(true);
  }, [teamSquads, activeTeamId, t]);

  const handleSquadSelect = useCallback(
    async (squadId: string | null) => {
      setSquadPickerVisible(false);
      if (!activeTeamId || !member) return;

      if (pendingRole) {
        await updateTeamRole(pendingRole, squadId);
      } else {
        try {
          setLoading(true);
          const currentRole = member.role?.role || 'soldier';
          await updateTeamMemberRole(activeTeamId, member.user_id, currentRole as TeamRole, { squad_id: squadId });
          await loadMembers();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
          Alert.alert(t('errors.error'), error.message || t('members.failedAssignSquad'));
        } finally {
          setLoading(false);
        }
      }
      setPendingRole(null);
    },
    [activeTeamId, member, pendingRole, updateTeamRole, loadMembers, t]
  );

  const handleRemoveFromTeam = useCallback(() => {
    if (!activeTeamId || !member) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('teams.removeMember'),
      t('teams.removeMemberConfirm', {
        memberName: member.profile?.full_name || t('members.member'),
        teamName: activeTeam?.name || t('teams.team'),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await removeTeamMember(activeTeamId, member.user_id);
              await loadMembers();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error: any) {
              Alert.alert(t('errors.error'), error.message || t('teams.failedRemoveMember'));
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [activeTeamId, activeTeam, member, loadMembers, t]);

  const handleTogglePermission = useCallback(
    async (permission: keyof MemberPermissions) => {
      if (!activeTeamId || !member) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTogglingPermission(true);
      try {
        await toggleMemberPermission(activeTeamId, member.user_id, permission);
        await loadMembers();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        Alert.alert(t('errors.error'), error.message || t('errors.generic'));
      } finally {
        setTogglingPermission(false);
      }
    },
    [activeTeamId, member, loadMembers, t]
  );

  const closeSquadPicker = useCallback(() => {
    setSquadPickerVisible(false);
    setPendingRole(null);
  }, []);

  return {
    // Data
    member,
    memberRole,
    memberSquadId,
    memberPermissions,
    roleConfig,
    ROLE_CONFIG,
    activeTeam,
    activeTeamId,
    teamSquads,
    mySquadId,

    // State
    loading,
    squadPickerVisible,
    pendingRole,
    togglingPermission,

    // Permission flags
    isTargetOwner,
    isTargetSelf,
    isSquadCommander,
    isSquadCommanderManagingSquadMember,
    canManageTeam,
    canManageTeamRole,
    canAssignSquad,
    canRemoveFromTeam,
    canManagePermissions,

    // Handlers
    handleViewActivity,
    handleChangeTeamRole,
    handleAssignSquad,
    handleSquadSelect,
    handleRemoveFromTeam,
    handleTogglePermission,
    closeSquadPicker,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MemberHeader({
  member,
  roleConfig,
  isTargetSelf,
  teamColor,
}: {
  member: NonNullable<ReturnType<typeof useMemberPreview>['member']>;
  roleConfig: RoleConfig;
  isTargetSelf: boolean;
  teamColor?: string;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const memberRole = (member.role?.role || 'soldier') as TeamRole;
  const joinedAt = member.joined_at ? formatDistanceToNow(new Date(member.joined_at), { addSuffix: true }) : null;
  const accentColor = teamColor || colors.primary;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={s.headerWrapper}>
      <LinearGradient
        colors={[accentColor + '15', 'transparent']}
        style={s.headerGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={s.header}>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.avatarContainer}>
          <View style={[s.avatarRing, { borderColor: roleConfig.color + '40' }]}>
            <BaseAvatar
              source={member.profile?.avatar_url ? { uri: member.profile.avatar_url } : undefined}
              fallbackText={member.profile?.full_name || 'UN'}
              size="xl"
              role={memberRole}
            />
          </View>
          {isTargetSelf && (
            <View style={[s.selfBadge, { backgroundColor: accentColor }]}>
              <Ionicons name="checkmark" size={10} color="#fff" />
              <Text style={s.selfBadgeText}>{t('common.you')}</Text>
            </View>
          )}
          <View style={[s.statusDot, { backgroundColor: '#22C55E', borderColor: colors.card }]} />
        </Animated.View>

        <Animated.Text entering={FadeInUp.delay(150)} style={[s.memberName, { color: colors.text }]}>
          {member.profile?.full_name || 'Unknown'}
        </Animated.Text>

        {member.profile?.email && (
          <Animated.Text entering={FadeInUp.delay(200)} style={[s.memberEmail, { color: colors.textMuted }]}>
            {member.profile.email}
          </Animated.Text>
        )}

        <Animated.View entering={FadeInUp.delay(250)} style={[s.roleBadgeContainer]}>
          <View style={[s.roleBadge, { backgroundColor: roleConfig.color + '18', borderColor: roleConfig.color + '30' }]}>
            <View style={[s.roleBadgeIcon, { backgroundColor: roleConfig.color }]}>
              <Ionicons name={roleConfig.icon as any} size={12} color="#fff" />
            </View>
            <Text style={[s.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
        </Animated.View>

        {joinedAt && (
          <Animated.View entering={FadeInUp.delay(300)} style={s.joinedContainer}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={[s.joinedText, { color: colors.textMuted }]}>
              {t('profile.memberSince')} {joinedAt}
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

function ActionRow({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  onPress,
  destructive,
  delay = 0,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
  delay?: number;
}) {
  const colors = useColors();

  return (
    <Animated.View entering={SlideInRight.delay(delay).springify()}>
      <TouchableOpacity
        style={[
          s.actionRow,
          {
            backgroundColor: destructive ? '#EF44440A' : colors.card,
            borderColor: destructive ? '#EF444420' : colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={s.actionLeft}>
          <View style={[s.actionIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon as any} size={18} color={iconColor} />
          </View>
          <View style={s.actionTextContainer}>
            <Text style={[s.actionText, { color: destructive ? '#EF4444' : colors.text }]}>{label}</Text>
            {sublabel && <Text style={[s.actionSubtext, { color: colors.textMuted }]} numberOfLines={1}>{sublabel}</Text>}
          </View>
        </View>
        <View style={[s.actionChevron, { backgroundColor: colors.secondary }]}>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PermissionToggle({
  label,
  description,
  icon,
  iconColor,
  value,
  loading,
  onToggle,
}: {
  label: string;
  description: string;
  icon: string;
  iconColor: string;
  value: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeIn.delay(400)}>
      <View style={[s.permissionRow, { backgroundColor: value ? iconColor + '08' : 'transparent', borderColor: value ? iconColor + '20' : colors.border }]}>
        <View style={s.actionLeft}>
          <View style={[s.permissionIcon, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={s.permissionInfo}>
            <Text style={[s.permissionLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[s.permissionDesc, { color: colors.textMuted }]}>{description}</Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <View style={s.switchContainer}>
            <Switch
              value={value}
              onValueChange={onToggle}
              trackColor={{ false: colors.border, true: iconColor + '50' }}
              thumbColor={value ? iconColor : colors.textMuted}
              ios_backgroundColor={colors.border}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function InfoNote({ icon, iconColor, text, bg }: { icon: string; iconColor: string; text: string; bg: string }) {
  return (
    <Animated.View entering={FadeIn.delay(500)}>
      <View style={[s.noteCard, { backgroundColor: bg, borderColor: iconColor + '20' }]}>
        <View style={[s.noteIconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon as any} size={14} color={iconColor} />
        </View>
        <Text style={[s.noteText, { color: iconColor }]}>{text}</Text>
      </View>
    </Animated.View>
  );
}

function SquadPickerModal({
  visible,
  onClose,
  squads,
  currentSquadId,
  pendingRole,
  isSquadCommander,
  canManageTeam,
  mySquadId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  squads: string[];
  currentSquadId: string | null;
  pendingRole: TeamRole | null;
  isSquadCommander: boolean;
  canManageTeam: boolean;
  mySquadId: string | null;
  onSelect: (squadId: string | null) => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();

  const filteredSquads = squads.filter((squad) => {
    if (isSquadCommander && !canManageTeam) return squad === mySquadId;
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[s.modalCancel, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {pendingRole ? t('squads.selectSquadForCommander') : t('members.assignSquadTitle')}
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={s.modalContent}>
          {currentSquadId && !pendingRole && (
            <View style={[s.currentSquadBadge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={[s.currentSquadText, { color: colors.primary }]}>
                {t('squads.currentlyIn')} {currentSquadId}
              </Text>
            </View>
          )}

          {isSquadCommander && !canManageTeam && (
            <View style={[s.squadNote, { backgroundColor: '#F59E0B15', marginBottom: 16 }]}>
              <Ionicons name="information-circle" size={16} color="#F59E0B" />
              <Text style={[s.squadNoteText, { color: '#F59E0B' }]}>
                {t('squads.squadCommanderRestriction', { squad: mySquadId })}
              </Text>
            </View>
          )}

          {filteredSquads.map((squad) => {
            const isCurrentSquad = squad === currentSquadId;
            return (
              <TouchableOpacity
                key={squad}
                style={[s.squadOption, { backgroundColor: colors.card, borderColor: isCurrentSquad ? colors.primary : colors.border }]}
                onPress={() => onSelect(squad)}
                activeOpacity={0.7}
              >
                <View style={[s.squadOptionIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="git-branch" size={18} color="#3B82F6" />
                </View>
                <Text style={[s.squadOptionText, { color: colors.text }]}>{squad}</Text>
                {isCurrentSquad && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}

          {!pendingRole && currentSquadId && canManageTeam && (
            <TouchableOpacity
              style={[s.squadOption, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}
              onPress={() => onSelect(null)}
              activeOpacity={0.7}
            >
              <View style={[s.squadOptionIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </View>
              <Text style={[s.squadOptionText, { color: '#EF4444' }]}>{t('members.removeFromSquad')}</Text>
            </TouchableOpacity>
          )}

          {pendingRole === 'squad_commander' && (
            <View style={[s.squadNote, { backgroundColor: colors.secondary }]}>
              <Ionicons name="information-circle" size={16} color={colors.textMuted} />
              <Text style={[s.squadNoteText, { color: colors.textMuted }]}>{t('squads.squadCommanderNote')}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function MemberPreviewSheet() {
  const colors = useColors();
  const { t } = useTranslation();

  const {
    member,
    memberRole,
    memberSquadId,
    memberPermissions,
    roleConfig,
    ROLE_CONFIG,
    activeTeam,
    activeTeamId,
    teamSquads,
    mySquadId,
    loading,
    squadPickerVisible,
    pendingRole,
    togglingPermission,
    isTargetOwner,
    isTargetSelf,
    isSquadCommander,
    isSquadCommanderManagingSquadMember,
    canManageTeam,
    canManageTeamRole,
    canAssignSquad,
    canRemoveFromTeam,
    canManagePermissions,
    handleViewActivity,
    handleChangeTeamRole,
    handleAssignSquad,
    handleSquadSelect,
    handleRemoveFromTeam,
    handleTogglePermission,
    closeSquadPicker,
  } = useMemberPreview();

  const teamColor = colors.primary;

  if (loading) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[s.loadingCard, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={teamColor} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>{t('common.processing')}</Text>
        </View>
      </View>
    );
  }

  if (!member) {
    return (
      <View style={[s.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
          <View style={[s.emptyIconContainer, { backgroundColor: colors.secondary }]}>
            <Ionicons name="person-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>{t('members.memberNotFound')}</Text>
          <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>{t('members.memberNotFoundDesc')}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <MemberHeader member={member} roleConfig={roleConfig} isTargetSelf={isTargetSelf} teamColor={teamColor} />

      {/* Team & Squad Info */}
      {activeTeam && (
        <Animated.View entering={FadeInUp.delay(300)} style={[s.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.teamCardContent}>
            <View style={[s.teamBadge, { backgroundColor: teamColor + '15' }]}>
              <Ionicons name="people" size={16} color={teamColor} />
            </View>
            <View style={s.teamInfo}>
              <Text style={[s.teamLabel, { color: colors.textMuted }]}>{t('teams.team')}</Text>
              <Text style={[s.teamName, { color: colors.text }]}>{activeTeam.name}</Text>
            </View>
          </View>
          {memberSquadId && (
            <View style={[s.squadInfo, { borderTopColor: colors.border }]}>
              <View style={[s.squadBadge, { backgroundColor: '#3B82F615' }]}>
                <Ionicons name="git-branch" size={14} color="#3B82F6" />
              </View>
              <Text style={[s.squadName, { color: colors.text }]}>{memberSquadId}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Actions Section */}
      <Animated.View entering={FadeInUp.delay(350)} style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{t('common.actions')}</Text>
        </View>

        <View style={s.actionsContainer}>
          <ActionRow
            icon="stats-chart"
            iconBg={teamColor + '15'}
            iconColor={teamColor}
            label={t('members.activityHistory')}
            onPress={handleViewActivity}
            delay={100}
          />

          {canManageTeamRole && (
            <ActionRow
              icon="shield-checkmark"
              iconBg="#F59E0B15"
              iconColor="#F59E0B"
              label={t('teams.role')}
              sublabel={ROLE_CONFIG[memberRole]?.label}
              onPress={handleChangeTeamRole}
              delay={150}
            />
          )}

          {canAssignSquad && (
            <ActionRow
              icon="git-branch"
              iconBg="#3B82F615"
              iconColor="#3B82F6"
              label={t('members.assignSquadTitle')}
              sublabel={memberSquadId || t('members.noSquadAssigned')}
              onPress={handleAssignSquad}
              delay={200}
            />
          )}

          {canRemoveFromTeam && (
            <ActionRow
              icon="person-remove"
              iconBg="#EF444415"
              iconColor="#EF4444"
              label={t('teams.removeMember')}
              onPress={handleRemoveFromTeam}
              destructive
              delay={250}
            />
          )}
        </View>
      </Animated.View>

      {/* Permissions Section */}
      {canManagePermissions && (
        <Animated.View entering={FadeInUp.delay(400)} style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderWithIcon}>
              <View style={[s.sectionIcon, { backgroundColor: '#22C55E15' }]}>
                <Ionicons name="key" size={12} color="#22C55E" />
              </View>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{t('teams.permissions')}</Text>
            </View>
          </View>

          <PermissionToggle
            icon="calendar"
            iconColor="#22C55E"
            label={t('teams.canCreateTraining')}
            description={t('teams.canCreateTrainingDesc')}
            value={memberPermissions.canCreateTraining === true}
            loading={togglingPermission}
            onToggle={() => handleTogglePermission('canCreateTraining')}
          />
        </Animated.View>
      )}

      {/* Info Notes */}
      <View style={s.notesContainer}>
        {isTargetOwner && (
          <InfoNote icon="lock-closed" iconColor="#8B5CF6" text={t('members.ownerCannotEdit')} bg="#8B5CF610" />
        )}

        {isTargetSelf && !isTargetOwner && (
          <InfoNote icon="person" iconColor={colors.textMuted} text={t('members.cannotModifyOwnRole')} bg={colors.secondary} />
        )}

        {isSquadCommanderManagingSquadMember && !isTargetSelf && (
          <InfoNote icon="shield" iconColor="#F59E0B" text={t('members.squadCommanderCanManage')} bg="#F59E0B10" />
        )}

        {isSquadCommander && !canManageTeam && !isSquadCommanderManagingSquadMember && !isTargetSelf && memberRole === 'soldier' && (
          <InfoNote icon="information-circle" iconColor={colors.textMuted} text={t('members.soldierNotInSquad')} bg={colors.secondary} />
        )}
      </View>

      <View style={{ height: 50 }} />

      <SquadPickerModal
        visible={squadPickerVisible}
        onClose={closeSquadPicker}
        squads={teamSquads}
        currentSquadId={memberSquadId}
        pendingRole={pendingRole}
        isSquadCommander={isSquadCommander}
        canManageTeam={canManageTeam}
        mySquadId={mySquadId}
        onSelect={handleSquadSelect}
      />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Center states
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingCard: { alignItems: 'center', padding: 32, borderRadius: 20, gap: 16 },
  loadingText: { fontSize: 15, fontWeight: '500' },
  emptyCard: { alignItems: 'center', padding: 32, borderRadius: 20, width: '100%', maxWidth: 320 },
  emptyIconContainer: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Header
  headerWrapper: { position: 'relative', marginBottom: 16 },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20 },
  avatarContainer: { position: 'relative', marginBottom: 20 },
  avatarRing: { borderWidth: 3, borderRadius: 60, padding: 4 },
  selfBadge: { position: 'absolute', bottom: 4, right: -2, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  selfBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  statusDot: { position: 'absolute', bottom: 8, right: 8, width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  memberName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginBottom: 6, textAlign: 'center' },
  memberEmail: { fontSize: 14, marginBottom: 16 },
  roleBadgeContainer: { marginBottom: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  roleBadgeIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleText: { fontSize: 13, fontWeight: '600' },
  joinedContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinedText: { fontSize: 12 },

  // Team Card
  teamCard: { marginHorizontal: 20, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  teamCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1 },
  teamLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  teamName: { fontSize: 16, fontWeight: '600' },
  squadInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  squadBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  squadName: { fontSize: 14, fontWeight: '500' },

  // Sections
  section: { marginBottom: 20, paddingHorizontal: 20 },
  sectionHeader: { marginBottom: 12 },
  sectionHeaderWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Actions
  actionsContainer: { gap: 10 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTextContainer: { flex: 1 },
  actionText: { fontSize: 15, fontWeight: '600' },
  actionSubtext: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  actionChevron: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Permissions
  permissionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1 },
  permissionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  permissionInfo: { flex: 1, marginRight: 12 },
  permissionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  permissionDesc: { fontSize: 13, lineHeight: 18 },
  switchContainer: { marginLeft: 8 },

  // Notes
  notesContainer: { paddingHorizontal: 20, gap: 10 },
  noteCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  noteIconContainer: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16, fontWeight: '500' },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalContent: { padding: 20 },
  currentSquadBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, marginBottom: 16 },
  currentSquadText: { fontSize: 14, fontWeight: '500' },
  squadOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 12, marginBottom: 10 },
  squadOptionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  squadOptionText: { flex: 1, fontSize: 16, fontWeight: '500' },
  squadNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, marginTop: 16 },
  squadNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
