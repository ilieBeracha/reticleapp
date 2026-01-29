import { BaseAvatar } from '@/components/shared/Avatar';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getCurrentUserId } from '@/services/authService';
import { removeTeamMember, updateTeamMemberRole } from '@/services/teamService';
import { useMyTeamRole, useTeamRoleFlags, useTeamStore } from '@/stores/teamStore';
import type { TeamRole } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
// ROLE CONFIG - Will be initialized with translations in component
// ═══════════════════════════════════════════════════════════════════════════
const getRoleConfig = (t: ReturnType<typeof useTranslation>['t']) => ({
  owner: { color: '#8B5CF6', bg: '#8B5CF620', label: t('teams.owner'), icon: 'crown' },
  commander: { color: '#EF4444', bg: '#EF444420', label: t('teams.commander'), icon: 'shield-checkmark' },
  squad_commander: { color: '#F59E0B', bg: '#F59E0B20', label: t('teams.squadCommander'), icon: 'shield' },
  soldier: { color: '#22C55E', bg: '#22C55E20', label: t('teams.soldier'), icon: 'person' },
});

/**
 * MEMBER PREVIEW - Native Form Sheet (Team-First)
 *
 * Permission Matrix:
 * - Team Owner/Commander: Can change team role, remove from team
 * - Squad Commander: Can manage soldiers in their OWN squad only
 * - Everyone: Can view basic info and activity
 */
export default function MemberPreviewSheet() {
  const colors = useColors();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const { activeTeamId, activeTeam, members, loadMembers } = useTeamStore();
  const myRole = useMyTeamRole();
  const { squadId: mySquadId, isSquadCommander, canManage: canManageTeam } = useTeamRoleFlags();
  const permissions = usePermissions();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [squadPickerVisible, setSquadPickerVisible] = useState(false);
  const [pendingRole, setPendingRole] = useState<TeamRole | null>(null);
  const ROLE_CONFIG = getRoleConfig(t);

  // Get team squads
  const teamSquads = activeTeam?.squads || [];

  // Get current user ID
  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId).catch(console.error);
  }, []);

  // Find member from store
  const member = useMemo(() => {
    if (!params.id) return null;
    return members.find((m) => m.user_id === params.id);
  }, [params.id, members]);

  // Get role config
  const memberRole = (member?.role?.role || 'soldier') as TeamRole;
  const memberSquadId = member?.role?.squad_id || member?.details?.squad_id || null;
  const roleConfig = ROLE_CONFIG[memberRole] || ROLE_CONFIG.soldier;

  // Permission checks using the unified permission system
  const isTargetOwner = memberRole === 'owner';
  const isTargetSelf = member?.user_id === currentUserId;

  // Check if current user can manage this specific member
  const canManageThisMember = useMemo(() => {
    if (!member || isTargetOwner || isTargetSelf) return false;
    return permissions.canManageMember(member.user_id, memberRole, memberSquadId);
  }, [member, isTargetOwner, isTargetSelf, memberRole, memberSquadId, permissions]);

  // Squad commander specific: Can only manage soldiers in their squad
  const isSquadCommanderManagingSquadMember =
    isSquadCommander && memberRole === 'soldier' && mySquadId && memberSquadId === mySquadId;

  // Team role change: Only owners/commanders can change roles (not squad commanders)
  const canManageTeamRole = canManageTeam && !isTargetOwner && !isTargetSelf;

  // Squad assignment: Owners, commanders, and squad commanders (for their squad)
  const canAssignSquad = canManageThisMember && (canManageTeam || isSquadCommanderManagingSquadMember);

  // Remove from team: Owners, commanders, and squad commanders (for their squad members)
  const canRemoveFromTeam = canManageThisMember;

  // Team role options (excluding owner)
  const teamRoleOptions: TeamRole[] = ['commander', 'squad_commander', 'soldier'];

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

    const currentRole = memberRole;
    const availableRoles = teamRoleOptions.filter((r) => r !== currentRole);

    const options = [
      ...availableRoles.map((r) => {
        if (r === 'squad_commander') return t('teams.squadCommander');
        if (r === 'commander') return t('teams.commander');
        return t('teams.soldier');
      }),
      t('common.cancel'),
    ];
    const cancelButtonIndex = options.length - 1;

    const handleRoleSelect = (role: TeamRole) => {
      // Squad commander requires a squad
      if (role === 'squad_commander') {
        if (teamSquads.length === 0) {
          Alert.alert(t('members.noSquadsTitle'), t('members.noSquadsMessage'), [{ text: t('common.ok') }]);
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
          message: `${t('members.currently')} ${ROLE_CONFIG[currentRole]?.label || currentRole}`,
        },
        async (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            const newRole = availableRoles[buttonIndex];
            handleRoleSelect(newRole);
          }
        }
      );
    } else {
      Alert.alert(
        t('members.assignSquadTitle'),
        `${t('members.currently')} ${ROLE_CONFIG[currentRole]?.label || currentRole}\n\n${t('common.select')}:`,
        [
          ...availableRoles.map((role) => ({
            text: role === 'squad_commander' ? t('teams.squadCommander') : ROLE_CONFIG[role]?.label || role,
            onPress: () => handleRoleSelect(role),
          })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ]
      );
    }
  }, [activeTeamId, member, memberRole, teamSquads, t, ROLE_CONFIG]);

  const updateTeamRole = async (newRole: TeamRole, squadId: string | null) => {
    if (!activeTeamId || !member) return;
    try {
      setLoading(true);
      const details = squadId ? { squad_id: squadId } : undefined;
      await updateTeamMemberRole(activeTeamId, member.user_id, newRole, details);
      await loadMembers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const roleLabel = ROLE_CONFIG[newRole]?.label || newRole;
      Alert.alert(t('common.success'), `${t('teams.role')}: ${roleLabel}${squadId ? ` (${squadId})` : ''}`);
      router.back();
    } catch (error: any) {
      console.error('Failed to update team role:', error);
      Alert.alert(t('errors.error'), error.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSquad = useCallback(() => {
    if (teamSquads.length === 0) {
      Alert.alert(t('members.noSquadsTitle'), t('members.noSquadsMessage'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingRole(null); // null means just assigning squad, not changing role
    setSquadPickerVisible(true);
  }, [teamSquads, t]);

  const handleSquadSelect = async (squadId: string | null) => {
    setSquadPickerVisible(false);
    if (!activeTeamId || !member) return;

    if (pendingRole) {
      // Changing role to squad_commander with squad
      await updateTeamRole(pendingRole, squadId);
    } else {
      // Just assigning to a squad (keeping current role)
      try {
        setLoading(true);
        const currentRole = member.role?.role || 'soldier';
        await updateTeamMemberRole(activeTeamId, member.user_id, currentRole as TeamRole, { squad_id: squadId });
        await loadMembers();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          t('common.success'),
          squadId ? t('members.assignTo', { squad: squadId }) : t('members.removeFromSquad')
        );
      } catch (error: any) {
        console.error('Failed to assign squad:', error);
        Alert.alert(t('errors.error'), error.message || t('members.failedAssignSquad'));
      } finally {
        setLoading(false);
      }
    }
    setPendingRole(null);
  };

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
              console.error('Failed to remove from team:', error);
              Alert.alert(t('errors.error'), error.message || t('teams.failedRemoveMember'));
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [activeTeamId, activeTeam, member, loadMembers]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.card, paddingTop: 100 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('common.processing')}</Text>
      </View>
    );
  }

  // No member state
  if (!member) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.card, paddingTop: 100 }]}>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('members.memberNotFound')}</Text>
      </View>
    );
  }

  const joinedAt = member.joined_at ? formatDistanceToNow(new Date(member.joined_at), { addSuffix: true }) : null;

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <BaseAvatar
            source={member.profile?.avatar_url ? { uri: member.profile.avatar_url } : undefined}
            fallbackText={member.profile?.full_name || 'UN'}
            size="xl"
            role={memberRole}
          />
          {isTargetSelf && (
            <View style={[styles.selfBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.selfBadgeText}>{t('common.you')}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.memberName, { color: colors.text }]}>{member.profile?.full_name || 'Unknown'}</Text>

        {member.profile?.email && (
          <Text style={[styles.memberEmail, { color: colors.textMuted }]}>{member.profile.email}</Text>
        )}

        {/* Role Badge */}
        <View style={[styles.roleBadge, { backgroundColor: roleConfig.bg }]}>
          <Ionicons name={roleConfig.icon as any} size={14} color={roleConfig.color} />
          <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
        </View>

        {joinedAt && (
          <Text style={[styles.joinedText, { color: colors.textMuted }]}>
            {t('profile.memberSince')} {joinedAt}
          </Text>
        )}
      </View>

      {/* Team Info */}
      {activeTeam && (
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="people" size={18} color={colors.text} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('teams.team')}</Text>
          </View>
          <Text style={[styles.teamName, { color: colors.text }]}>{activeTeam.name}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('common.actions')}</Text>

        {/* View Activity */}
        <TouchableOpacity
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
          onPress={handleViewActivity}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="stats-chart" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>{t('members.activityHistory')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Change Role - Managers only */}
        {canManageTeamRole && (
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={handleChangeTeamRole}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
              </View>
              <View>
                <Text style={[styles.actionText, { color: colors.text }]}>{t('teams.role')}</Text>
                <Text style={[styles.actionSubtext, { color: colors.textMuted }]}>
                  {ROLE_CONFIG[memberRole]?.label || memberRole}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Assign to Squad - Managers and Squad Commanders (for their squad) */}
        {canAssignSquad && (
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => {
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
              handleAssignSquad();
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="git-branch" size={18} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.actionText, { color: colors.text }]}>{t('members.assignSquadTitle')}</Text>
                <Text style={[styles.actionSubtext, { color: colors.textMuted }]}>
                  {memberSquadId || t('members.noSquadAssigned')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Remove from Team - Managers only */}
        {canRemoveFromTeam && (
          <TouchableOpacity style={styles.actionRow} onPress={handleRemoveFromTeam} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="person-remove" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('teams.removeMember')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Info notes */}
      {isTargetOwner && (
        <View style={[styles.noteCard, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle" size={16} color={colors.textMuted} />
          <Text style={[styles.noteText, { color: colors.textMuted }]}>{t('members.ownerCannotEdit')}</Text>
        </View>
      )}
      {isTargetSelf && !isTargetOwner && (
        <View style={[styles.noteCard, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle" size={16} color={colors.textMuted} />
          <Text style={[styles.noteText, { color: colors.textMuted }]}>{t('members.cannotModifyOwnRole')}</Text>
        </View>
      )}
      {/* Squad commander managing member in their squad */}
      {isSquadCommanderManagingSquadMember && !isTargetSelf && (
        <View style={[styles.noteCard, { backgroundColor: '#F59E0B15' }]}>
          <Ionicons name="shield" size={16} color="#F59E0B" />
          <Text style={[styles.noteText, { color: '#F59E0B' }]}>{t('members.squadCommanderCanManage')}</Text>
        </View>
      )}
      {/* Squad commander viewing member outside their squad */}
      {isSquadCommander &&
        !canManageTeam &&
        !isSquadCommanderManagingSquadMember &&
        !isTargetSelf &&
        memberRole === 'soldier' && (
          <View style={[styles.noteCard, { backgroundColor: colors.secondary }]}>
            <Ionicons name="information-circle" size={16} color={colors.textMuted} />
            <Text style={[styles.noteText, { color: colors.textMuted }]}>{t('members.soldierNotInSquad')}</Text>
          </View>
        )}

      <View style={{ height: 40 }} />

      {/* Squad Picker Modal */}
      <Modal
        visible={squadPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setSquadPickerVisible(false);
          setPendingRole(null);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setSquadPickerVisible(false);
                setPendingRole(null);
              }}
            >
              <Text style={[styles.modalCancel, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {pendingRole ? t('squads.selectSquadForCommander') : t('members.assignSquadTitle')}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Current squad indicator */}
            {memberSquadId && !pendingRole && (
              <View style={[styles.currentSquadBadge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.currentSquadText, { color: colors.primary }]}>
                  {t('squads.currentlyIn')} {memberSquadId}
                </Text>
              </View>
            )}

            {/* Squad commander restriction note */}
            {isSquadCommander && !canManageTeam && (
              <View style={[styles.squadNote, { backgroundColor: '#F59E0B15', marginBottom: 16 }]}>
                <Ionicons name="information-circle" size={16} color="#F59E0B" />
                <Text style={[styles.squadNoteText, { color: '#F59E0B' }]}>
                  {t('squads.squadCommanderRestriction', { squad: mySquadId })}
                </Text>
              </View>
            )}

            {/* Squad options - filter for squad commanders */}
            {teamSquads
              .filter((squad) => {
                // Squad commanders can only assign to their own squad
                if (isSquadCommander && !canManageTeam) {
                  return squad === mySquadId;
                }
                return true;
              })
              .map((squad) => {
                const isCurrentSquad = squad === memberSquadId;
                return (
                  <TouchableOpacity
                    key={squad}
                    style={[
                      styles.squadOption,
                      { backgroundColor: colors.card, borderColor: isCurrentSquad ? colors.primary : colors.border },
                    ]}
                    onPress={() => handleSquadSelect(squad)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.squadOptionIcon, { backgroundColor: '#3B82F620' }]}>
                      <Ionicons name="git-branch" size={18} color="#3B82F6" />
                    </View>
                    <Text style={[styles.squadOptionText, { color: colors.text }]}>{squad}</Text>
                    {isCurrentSquad && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}

            {/* Remove from squad option - only for full managers, not squad commanders */}
            {!pendingRole && memberSquadId && canManageTeam && (
              <TouchableOpacity
                style={[
                  styles.squadOption,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 },
                ]}
                onPress={() => handleSquadSelect(null)}
                activeOpacity={0.7}
              >
                <View style={[styles.squadOptionIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.squadOptionText, { color: '#EF4444' }]}>{t('members.removeFromSquad')}</Text>
              </TouchableOpacity>
            )}

            {/* Note for squad commander role assignment */}
            {pendingRole === 'squad_commander' && (
              <View style={[styles.squadNote, { backgroundColor: colors.secondary }]}>
                <Ionicons name="information-circle" size={16} color={colors.textMuted} />
                <Text style={[styles.squadNoteText, { color: colors.textMuted }]}>
                  {t('squads.squadCommanderNote')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  emptyText: { fontSize: 15, marginTop: 8 },

  // Header
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  selfBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selfBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  memberName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  joinedText: {
    fontSize: 12,
    marginTop: 4,
  },

  // Cards
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Actions
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionSubtext: {
    fontSize: 12,
    marginTop: 2,
  },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalContent: { padding: 20 },
  currentSquadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  currentSquadText: { fontSize: 14, fontWeight: '500' },
  squadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  squadOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadOptionText: { flex: 1, fontSize: 16, fontWeight: '500' },
  squadNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  squadNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },

  // Note
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
  },
});
