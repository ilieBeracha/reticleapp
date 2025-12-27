import { BaseAvatar } from "@/components/BaseAvatar";
import { useColors } from "@/hooks/ui/useColors";
import { removeTeamMember, updateTeamMemberRole } from "@/services/teamService";
import { useCanManageTeam, useMyTeamRole, useTeamStore } from "@/store/teamStore";
import type { TeamRole } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-native";

// ═══════════════════════════════════════════════════════════════════════════
// ROLE CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  owner: { color: '#8B5CF6', bg: '#8B5CF620', label: 'Owner', icon: 'crown' },
  commander: { color: '#EF4444', bg: '#EF444420', label: 'Commander', icon: 'shield-checkmark' },
  squad_commander: { color: '#F59E0B', bg: '#F59E0B20', label: 'Squad Commander', icon: 'shield' },
  soldier: { color: '#22C55E', bg: '#22C55E20', label: 'Soldier', icon: 'person' },
};

/**
 * MEMBER PREVIEW - Native Form Sheet (Team-First)
 * 
 * Permission Matrix:
 * - Team Owner/Commander: Can change team role, remove from team
 * - Everyone: Can view basic info and activity
 */
export default function MemberPreviewSheet() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const { activeTeamId, activeTeam, members, loadMembers } = useTeamStore();
  const myRole = useMyTeamRole();
  const canManage = useCanManageTeam();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [squadPickerVisible, setSquadPickerVisible] = useState(false);
  const [pendingRole, setPendingRole] = useState<TeamRole | null>(null);

  // Get team squads
  const teamSquads = activeTeam?.squads || [];

  // Get current user ID
  useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setCurrentUserId(data.user.id);
      });
    });
  }, []);

  // Find member from store
  const member = useMemo(() => {
    if (!params.id) return null;
    return members.find(m => m.user_id === params.id);
  }, [params.id, members]);

  // Get role config
  const memberRole = member?.role?.role || 'soldier';
  const roleConfig = ROLE_CONFIG[memberRole] || ROLE_CONFIG.soldier;

  // Permission checks
  const isTargetOwner = memberRole === 'owner';
  const isTargetSelf = member?.user_id === currentUserId;
  const canManageTeamRole = canManage && !isTargetOwner && !isTargetSelf;
  const canRemoveFromTeam = canManage && !isTargetOwner && !isTargetSelf;

  // Team role options (excluding owner)
  const teamRoleOptions: TeamRole[] = ['commander', 'squad_commander', 'soldier'];

  const handleViewActivity = useCallback(() => {
    if (!member) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/memberActivity',
      params: { memberId: member.user_id, memberName: member.profile?.full_name || 'Member' }
    });
  }, [member]);

  const handleChangeTeamRole = useCallback(() => {
    if (!activeTeamId || !member) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const currentRole = memberRole;
    const availableRoles = teamRoleOptions.filter(r => r !== currentRole);
    
    const options = [...availableRoles.map(r => {
      if (r === 'squad_commander') return 'Squad Commander';
      return r.charAt(0).toUpperCase() + r.slice(1);
    }), 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    
    const handleRoleSelect = (role: TeamRole) => {
      // Squad commander requires a squad
      if (role === 'squad_commander') {
        if (teamSquads.length === 0) {
          Alert.alert(
            'No Squads',
            'Create squads first before assigning a Squad Commander.',
            [{ text: 'OK' }]
          );
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
          title: 'Change Team Role',
          message: `Current role: ${ROLE_CONFIG[currentRole]?.label || currentRole}`,
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
        'Change Team Role',
        `Current role: ${ROLE_CONFIG[currentRole]?.label || currentRole}\n\nSelect new role:`,
        [
          ...availableRoles.map(role => ({
            text: role === 'squad_commander' ? 'Squad Commander' : role.charAt(0).toUpperCase() + role.slice(1),
            onPress: () => handleRoleSelect(role),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  }, [activeTeamId, member, memberRole, teamSquads]);

  const updateTeamRole = async (newRole: TeamRole, squadId: string | null) => {
    if (!activeTeamId || !member) return;
    try {
      setLoading(true);
      const details = squadId ? { squad_id: squadId } : undefined;
      await updateTeamMemberRole(activeTeamId, member.user_id, newRole, details);
      await loadMembers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const roleLabel = ROLE_CONFIG[newRole]?.label || newRole;
      Alert.alert('Success', `Role changed to ${roleLabel}${squadId ? ` (${squadId})` : ''}`);
      router.back();
    } catch (error: any) {
      console.error('Failed to update team role:', error);
      Alert.alert('Error', error.message || 'Failed to update team role');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSquad = useCallback(() => {
    if (teamSquads.length === 0) {
      Alert.alert('No Squads', 'Create squads first in Team Settings.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingRole(null); // null means just assigning squad, not changing role
    setSquadPickerVisible(true);
  }, [teamSquads]);

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
        Alert.alert('Success', squadId ? `Assigned to ${squadId}` : 'Removed from squad');
      } catch (error: any) {
        console.error('Failed to assign squad:', error);
        Alert.alert('Error', error.message || 'Failed to assign squad');
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
      'Remove from Team',
      `Remove ${member.profile?.full_name || 'this member'} from ${activeTeam?.name || 'this team'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
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
              Alert.alert('Error', error.message || 'Failed to remove from team');
              setLoading(false);
            }
          }
        },
      ]
    );
  }, [activeTeamId, activeTeam, member, loadMembers]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Processing...</Text>
      </View>
    );
  }

  // No member state
  if (!member) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Member not found</Text>
      </View>
    );
  }

  const joinedAt = member.joined_at
    ? formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })
    : null;

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
              <Text style={styles.selfBadgeText}>You</Text>
            </View>
          )}
        </View>

        <Text style={[styles.memberName, { color: colors.text }]}>
          {member.profile?.full_name || 'Unknown'}
        </Text>

        {member.profile?.email && (
          <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
            {member.profile.email}
          </Text>
        )}

        {/* Role Badge */}
        <View style={[styles.roleBadge, { backgroundColor: roleConfig.bg }]}>
          <Ionicons name={roleConfig.icon as any} size={14} color={roleConfig.color} />
          <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
        </View>

        {joinedAt && (
          <Text style={[styles.joinedText, { color: colors.textMuted }]}>
            Joined {joinedAt}
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
            <Text style={[styles.cardTitle, { color: colors.text }]}>Team</Text>
          </View>
          <Text style={[styles.teamName, { color: colors.text }]}>{activeTeam.name}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACTIONS</Text>

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
            <Text style={[styles.actionText, { color: colors.text }]}>View Activity</Text>
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
                <Text style={[styles.actionText, { color: colors.text }]}>Change Role</Text>
                <Text style={[styles.actionSubtext, { color: colors.textMuted }]}>
                  {ROLE_CONFIG[memberRole]?.label || memberRole}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Assign to Squad - Managers only */}
        {canManage && teamSquads.length > 0 && (
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={handleAssignSquad}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="git-branch" size={18} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.actionText, { color: colors.text }]}>Assign Squad</Text>
                <Text style={[styles.actionSubtext, { color: colors.textMuted }]}>
                  {member?.role?.squad_id || member?.details?.squad_id || 'Not assigned'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Remove from Team - Managers only */}
        {canRemoveFromTeam && (
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleRemoveFromTeam}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="person-remove" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Remove from Team</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Info notes */}
      {isTargetOwner && (
        <View style={[styles.noteCard, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle" size={16} color={colors.textMuted} />
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            Team owners cannot be edited or removed
          </Text>
        </View>
      )}
      {isTargetSelf && !isTargetOwner && (
        <View style={[styles.noteCard, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle" size={16} color={colors.textMuted} />
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            You cannot modify your own role
          </Text>
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
            <TouchableOpacity onPress={() => {
              setSquadPickerVisible(false);
              setPendingRole(null);
            }}>
              <Text style={[styles.modalCancel, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {pendingRole ? 'Select Squad for Commander' : 'Assign to Squad'}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Current squad indicator */}
            {(member?.role?.squad_id || member?.details?.squad_id) && !pendingRole && (
              <View style={[styles.currentSquadBadge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.currentSquadText, { color: colors.primary }]}>
                  Currently in: {member?.role?.squad_id || member?.details?.squad_id}
                </Text>
              </View>
            )}

            {/* Squad options */}
            {teamSquads.map((squad) => {
              const isCurrentSquad = squad === (member?.role?.squad_id || member?.details?.squad_id);
              return (
                <TouchableOpacity
                  key={squad}
                  style={[
                    styles.squadOption,
                    { backgroundColor: colors.card, borderColor: isCurrentSquad ? colors.primary : colors.border }
                  ]}
                  onPress={() => handleSquadSelect(squad)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.squadOptionIcon, { backgroundColor: '#3B82F620' }]}>
                    <Ionicons name="git-branch" size={18} color="#3B82F6" />
                  </View>
                  <Text style={[styles.squadOptionText, { color: colors.text }]}>{squad}</Text>
                  {isCurrentSquad && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Remove from squad option */}
            {!pendingRole && (member?.role?.squad_id || member?.details?.squad_id) && (
              <TouchableOpacity
                style={[styles.squadOption, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}
                onPress={() => handleSquadSelect(null)}
                activeOpacity={0.7}
              >
                <View style={[styles.squadOptionIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.squadOptionText, { color: '#EF4444' }]}>Remove from Squad</Text>
              </TouchableOpacity>
            )}

            {/* Note for squad commander */}
            {pendingRole === 'squad_commander' && (
              <View style={[styles.squadNote, { backgroundColor: colors.secondary }]}>
                <Ionicons name="information-circle" size={16} color={colors.textMuted} />
                <Text style={[styles.squadNoteText, { color: colors.textMuted }]}>
                  Squad Commanders can manage members in their assigned squad.
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

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
    paddingVertical: 14,
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
