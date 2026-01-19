/**
 * Team Members Sheet
 * 
 * View and manage team members - native form sheet
 */
import { BaseAvatar } from '@/components/shared/Avatar';
import { useColors } from '@/hooks/ui/useColors';
import { useTeamRealtime } from '@/hooks/realtime';
import { usePermissions } from '@/hooks/usePermissions';
import { getTeamMembers, updateTeamMemberRole } from '@/services/teamService';
import { useTeamRoleFlags, useTeamStore } from '@/store/teamStore';
import type { TeamMemberWithProfile, TeamRole } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  commander: 'Commander',
  team_commander: 'Commander',
  squad_commander: 'Squad Lead',
  soldier: 'Soldier',
};

function getRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Soldier';
  const normalized = role === 'commander' ? 'team_commander' : role;
  return ROLE_LABELS[normalized] || 'Soldier';
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER ROW
// ─────────────────────────────────────────────────────────────────────────────

function MemberRow({ 
  member, 
  colors, 
  onPress,
  onAssignSquad,
  canAssignSquad,
  isMySquadMember,
  showDivider,
}: { 
  member: TeamMemberWithProfile; 
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onAssignSquad?: () => void;
  canAssignSquad?: boolean;
  isMySquadMember?: boolean;
  showDivider?: boolean;
}) {
  const memberSquadId = member.role?.squad_id || member.details?.squad_id;
  const isSoldier = (member.role?.role || 'soldier') === 'soldier';
  const roleLabel = getRoleLabel(member.role?.role);

  return (
    <TouchableOpacity
      style={[
        styles.memberRow,
        showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.5}
    >
      <BaseAvatar
        source={member.profile.avatar_url ? { uri: member.profile.avatar_url } : undefined}
        fallbackText={member.profile.full_name || member.profile.email || 'U'}
        size="sm"
      />
      
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
          {member.profile.full_name || member.profile.email?.split('@')[0] || 'Unknown'}
        </Text>
        <Text style={[styles.memberMeta, { color: colors.textMuted }]}>
          {roleLabel}{memberSquadId ? ` · ${memberSquadId}` : ''}
          {isMySquadMember && ' ✓'}
        </Text>
      </View>
      
      {isSoldier && canAssignSquad && onAssignSquad && (
        <TouchableOpacity
          style={[styles.assignBtn, { borderColor: colors.border }]}
          onPress={(e) => { e.stopPropagation(); onAssignSquad(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="git-branch-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}
      
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TeamMembersSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams } = useTeamStore();
  const permissions = usePermissions();
  const { isSquadCommander, squadId: mySquadId, canManage: canManageTeam } = useTeamRoleFlags();

  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [squadModalVisible, setSquadModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberWithProfile | null>(null);
  const [assigning, setAssigning] = useState(false);

  const team = teams.find(t => t.id === teamId);
  const canManage = team?.my_role === 'owner' || team?.my_role === 'commander';
  const teamSquads = team?.squads || [];
  const canInviteMembers = canManage || (isSquadCommander && mySquadId);

  const loadMembers = useCallback(async (options?: { silent?: boolean }) => {
    if (!teamId) return;
    if (!options?.silent) setLoading(true);
    try {
      const data = await getTeamMembers(teamId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [teamId]);

  useFocusEffect(useCallback(() => { loadMembers(); }, [loadMembers]));

  // ═══════════════════════════════════════════════════════════════════════════
  // REALTIME SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  useTeamRealtime({
    teamId,
    enabled: !!teamId,
    onMemberJoined: useCallback(() => {
      console.log('[TeamMembers] Realtime: New member joined, refreshing silently...');
      loadMembers({ silent: true });
    }, [loadMembers]),
    onMemberLeft: useCallback(() => {
      console.log('[TeamMembers] Realtime: Member left, refreshing silently...');
      loadMembers({ silent: true });
    }, [loadMembers]),
    onMemberUpdated: useCallback(() => {
      console.log('[TeamMembers] Realtime: Member updated, refreshing silently...');
      loadMembers({ silent: true });
    }, [loadMembers]),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadMembers();
    setRefreshing(false);
  }, [loadMembers]);

  const handleMemberPress = (member: TeamMemberWithProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/memberPreview?id=${member.profile.id}` as any);
  };

  const handleInvite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/inviteTeamMember?teamId=${teamId}` as any);
  };
  
  const handleOpenSquadAssign = (member: TeamMemberWithProfile) => {
    if (teamSquads.length === 0) {
      Alert.alert('No Squads', 'Create squads first in Team Settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Squads', onPress: () => router.push(`/(protected)/teamSquads?teamId=${teamId}` as any) },
      ]);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMember(member);
    setSquadModalVisible(true);
  };
  
  const handleAssignToSquad = async (squadId: string | null) => {
    if (!teamId || !selectedMember) return;
    setAssigning(true);
    try {
      const currentRole = selectedMember.role?.role || 'soldier';
      await updateTeamMemberRole(teamId, selectedMember.user_id, currentRole as TeamRole, { squad_id: squadId });
      await loadMembers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSquadModalVisible(false);
      setSelectedMember(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to assign squad');
    } finally {
      setAssigning(false);
    }
  };

  const groupedMembers = useMemo(() => {
    const roleOrder: TeamRole[] = ['owner', 'commander', 'squad_commander', 'soldier'];
    const grouped = members.reduce((acc, member) => {
      const role = member.role?.role || 'soldier';
      const normalizedRole = role === 'commander' ? 'commander' : role;
      if (!acc[normalizedRole]) acc[normalizedRole] = [];
      acc[normalizedRole].push(member);
      return acc;
    }, {} as Record<string, TeamMemberWithProfile[]>);

    return roleOrder
      .filter(role => grouped[role]?.length > 0)
      .map(role => ({ role, label: getRoleLabel(role), members: grouped[role] || [] }));
  }, [members]);

  const currentMemberSquad = selectedMember?.role?.squad_id || selectedMember?.details?.squad_id;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Members</Text>
        {team && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{team.name} · {members.length} total</Text>}
      </View>

      {/* Squad Commander Note */}
      {isSquadCommander && !canManageTeam && mySquadId && !loading && (
        <View style={[styles.note, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            Managing <Text style={{ color: colors.text, fontWeight: '600' }}>{mySquadId}</Text> squad
          </Text>
        </View>
      )}

      {/* Invite */}
      {canInviteMembers && !loading && (
        <TouchableOpacity style={[styles.inviteRow, { borderColor: colors.border }]} onPress={handleInvite} activeOpacity={0.6}>
          <Ionicons name="add" size={18} color={colors.text} />
          <Text style={[styles.inviteText, { color: colors.text }]}>
            {isSquadCommander && !canManageTeam ? `Add to ${mySquadId}` : 'Add member'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      )}

      {/* Members */}
      {!loading && groupedMembers.map(({ role, label, members: roleMembers }) => (
        <View key={role} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{label}</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{roleMembers.length}</Text>
          </View>
          
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {roleMembers.map((member, idx) => {
              const memberSquadId = member.role?.squad_id || member.details?.squad_id;
              const memberRole = (member.role?.role || 'soldier') as TeamRole;
              const isMySquadMember = !!(isSquadCommander && mySquadId && memberSquadId === mySquadId && memberRole === 'soldier');
              const canAssign = (canManage && memberRole === 'soldier') || isMySquadMember;
              
              return (
                <MemberRow
                  key={member.profile.id}
                  member={member}
                  colors={colors}
                  onPress={() => handleMemberPress(member)}
                  onAssignSquad={canAssign ? () => handleOpenSquadAssign(member) : undefined}
                  canAssignSquad={canAssign}
                  isMySquadMember={isMySquadMember}
                  showDivider={idx < roleMembers.length - 1}
                />
              );
            })}
          </View>
        </View>
      ))}

      {/* Empty */}
      {!loading && members.length === 0 && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members yet</Text>
        </View>
      )}
      
      {/* ═══════════════════════════════════════════════════════════════════════
          SQUAD ASSIGNMENT MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={squadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setSquadModalVisible(false); setSelectedMember(null); }}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              onPress={() => { setSquadModalVisible(false); setSelectedMember(null); }}
              disabled={assigning}
            >
              <Text style={[styles.modalCancel, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Assign Squad</Text>
            <View style={{ width: 50 }} />
          </View>
          
          {selectedMember && (
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              {/* Selected Member */}
              <View style={[styles.selectedMember, { borderBottomColor: colors.border }]}>
                <BaseAvatar
                  source={selectedMember.profile.avatar_url ? { uri: selectedMember.profile.avatar_url } : undefined}
                  fallbackText={selectedMember.profile.full_name || 'U'}
                  size="md"
                />
                <View style={styles.selectedMemberInfo}>
                  <Text style={[styles.selectedMemberName, { color: colors.text }]}>
                    {selectedMember.profile.full_name || 'Unknown'}
                  </Text>
                  <Text style={[styles.selectedMemberSquad, { color: colors.textMuted }]}>
                    {currentMemberSquad ? `Currently: ${currentMemberSquad}` : 'No squad assigned'}
                  </Text>
                </View>
              </View>
              
              {/* Squad Commander Note */}
              {isSquadCommander && !canManage && mySquadId && (
                <Text style={[styles.modalNote, { color: colors.textMuted }]}>
                  Limited to your squad: {mySquadId}
                </Text>
              )}
              
              {/* Squad Options */}
              <View style={[styles.squadList, { borderColor: colors.border }]}>
                {teamSquads
                  .filter(squad => isSquadCommander && !canManage ? squad === mySquadId : true)
                  .map((squad, idx, arr) => {
                    const isSelected = squad === currentMemberSquad;
                    return (
                      <TouchableOpacity
                        key={squad}
                        style={[
                          styles.squadRow,
                          idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                        ]}
                        onPress={() => !isSelected && handleAssignToSquad(squad)}
                        disabled={assigning || isSelected}
                        activeOpacity={0.5}
                      >
                        <Ionicons name="git-branch-outline" size={16} color={colors.textMuted} />
                        <Text style={[styles.squadName, { color: colors.text }]}>{squad}</Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
              </View>
              
              {/* Remove */}
              {canManage && currentMemberSquad && (
                <TouchableOpacity
                  style={[styles.removeRow, { borderColor: colors.border }]}
                  onPress={() => handleAssignToSquad(null)}
                  disabled={assigning}
                  activeOpacity={0.5}
                >
                  <Ionicons name="close-outline" size={16} color="#EF4444" />
                  <Text style={styles.removeText}>Remove from squad</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
          
          {assigning && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Header
  header: { paddingTop: 8, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Note
  note: { 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    borderWidth: 1,
    marginBottom: 16,
  },
  noteText: { fontSize: 13 },

  // Invite
  inviteRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  inviteText: { fontSize: 14, fontWeight: '500' },

  // Loading
  loading: { paddingVertical: 40, alignItems: 'center' },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { fontSize: 12 },
  sectionCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },

  // Member Row
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontSize: 15, fontWeight: '500' },
  memberMeta: { fontSize: 12 },
  assignBtn: { 
    width: 28, 
    height: 28, 
    borderRadius: 6, 
    borderWidth: 1,
    alignItems: 'center', 
    justifyContent: 'center',
    marginRight: 4,
  },

  // Empty
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },

  // Modal
  modal: { flex: 1 },
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
  modalTitle: { fontSize: 16, fontWeight: '600' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20 },
  modalNote: { fontSize: 12, marginBottom: 16 },
  
  // Selected Member
  selectedMember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  selectedMemberInfo: { flex: 1, gap: 2 },
  selectedMemberName: { fontSize: 16, fontWeight: '600' },
  selectedMemberSquad: { fontSize: 13 },
  
  // Squad List
  squadList: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  squadRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  squadName: { flex: 1, fontSize: 15, fontWeight: '500' },
  
  // Remove
  removeRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  removeText: { fontSize: 14, fontWeight: '500', color: '#EF4444' },
  
  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
