/**
 * Team Squads Management
 *
 * Manage squad sub-groups within a team
 * - Create/edit/delete squads
 * - Assign soldiers to squads
 */
import { BaseAvatar } from '@/components/shared/Avatar';
import { useColors } from '@/hooks/ui/useColors';
import { getTeamMembers, updateTeam, updateTeamMemberRole } from '@/services/teamService';
import { useTeamStore } from '@/stores/teamStore';
import type { TeamMemberWithProfile, TeamRole } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TeamSquadsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams, loadTeams } = useTeamStore();

  const team = teams.find((t) => t.id === teamId);
  const [squads, setSquads] = useState<string[]>(team?.squads || []);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  // Member assignment modal state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<string | null>(null);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);

  // Load members to show squad counts
  const loadMembers = useCallback(async () => {
    if (teamId) {
      try {
        const data = await getTeamMembers(teamId);
        setMembers(data);
      } catch (error) {
        console.error('Failed to load members:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [teamId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Get soldiers that can be assigned (soldiers only, not commanders)
  const assignableSoldiers = useMemo(() => {
    return members.filter((m) => {
      const role = m.role?.role || 'soldier';
      return role === 'soldier';
    });
  }, [members]);

  // Get soldiers in a specific squad
  const getSoldiersInSquad = useCallback(
    (squadName: string) => {
      return members.filter((m) => {
        const memberSquad = m.role?.squad_id || m.details?.squad_id;
        return memberSquad === squadName;
      });
    },
    [members]
  );

  // Get unassigned soldiers (not in any squad)
  const unassignedSoldiers = useMemo(() => {
    return assignableSoldiers.filter((m) => {
      const memberSquad = m.role?.squad_id || m.details?.squad_id;
      return !memberSquad;
    });
  }, [assignableSoldiers]);

  // Get member count for a squad
  const getSquadMemberCount = useCallback(
    (squadName: string) => {
      return members.filter((m) => m.role?.squad_id === squadName || m.details?.squad_id === squadName).length;
    },
    [members]
  );

  // Add new squad
  const handleAddSquad = async () => {
    const name = newSquadName.trim();
    if (!name) return;

    if (squads.includes(name)) {
      Alert.alert('Duplicate', 'A squad with this name already exists.');
      return;
    }

    const newSquads = [...squads, name];
    await saveSquads(newSquads);
    setNewSquadName('');
  };

  // Remove squad
  const handleRemoveSquad = (index: number) => {
    const squadName = squads[index];
    const memberCount = getSquadMemberCount(squadName);

    if (memberCount > 0) {
      Alert.alert(
        t('teams.squadHasMembers'),
        t('teams.squadHasMembersMessage', { squad: squadName, count: memberCount }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('teams.removeAnyway'),
            style: 'destructive',
            onPress: () => {
              const newSquads = squads.filter((_, i) => i !== index);
              saveSquads(newSquads);
            },
          },
        ]
      );
    } else {
      const newSquads = squads.filter((_, i) => i !== index);
      saveSquads(newSquads);
    }
  };

  // Start editing squad name
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingName(squads[index]);
  };

  // Save edited squad name
  const handleSaveEdit = async () => {
    if (editingIndex === null) return;

    const name = editingName.trim();
    if (!name) {
      setEditingIndex(null);
      return;
    }

    // Check for duplicates (excluding current)
    if (squads.some((s, i) => s === name && i !== editingIndex)) {
      Alert.alert(t('teams.duplicateSquad'), t('teams.duplicateSquadMessage'));
      return;
    }

    const newSquads = squads.map((s, i) => (i === editingIndex ? name : s));
    await saveSquads(newSquads);
    setEditingIndex(null);
  };

  // Save squads to database
  const saveSquads = async (newSquads: string[]) => {
    if (!teamId) return;

    setSaving(true);
    try {
      await updateTeam({ team_id: teamId, squads: newSquads });
      setSquads(newSquads);
      await loadTeams();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to update squads:', error);
      Alert.alert(t('common.error'), t('teams.failedUpdateSquads'));
    } finally {
      setSaving(false);
    }
  };

  // Move squad up/down
  const handleMoveSquad = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= squads.length) return;

    const newSquads = [...squads];
    [newSquads[index], newSquads[newIndex]] = [newSquads[newIndex], newSquads[index]];
    saveSquads(newSquads);
    Haptics.selectionAsync();
  };

  // Open member assignment modal for a squad
  const handleOpenAssignModal = (squadName: string) => {
    setSelectedSquad(squadName);
    setAssignModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Assign a member to a squad
  const handleAssignMember = async (memberId: string, targetSquad: string | null) => {
    if (!teamId) return;

    setAssigningMemberId(memberId);
    try {
      const member = members.find((m) => m.user_id === memberId);
      const currentRole = (member?.role?.role || 'soldier') as TeamRole;

      await updateTeamMemberRole(teamId, memberId, currentRole, { squad_id: targetSquad });
      await loadMembers();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to assign member:', error);
      Alert.alert(t('common.error'), t('teams.failedAssignMember'));
    } finally {
      setAssigningMemberId(null);
    }
  };

  // Remove member from squad
  const handleRemoveFromSquad = async (memberId: string) => {
    Alert.alert(t('teams.removeFromSquadTitle'), t('teams.removeFromSquadConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => handleAssignMember(memberId, null),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="git-branch" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('teams.squadManagement')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t('teams.organizeIntoSquads', { teamName: team?.name || t('teams.team') })}
          </Text>
        </View>

        {/* Add New Squad */}
        <View style={[styles.addSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.addInput, { color: colors.text }]}
            placeholder={t('teams.newSquadName')}
            placeholderTextColor={colors.textMuted}
            value={newSquadName}
            onChangeText={setNewSquadName}
            onSubmitEditing={handleAddSquad}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: newSquadName.trim() ? colors.primary : colors.secondary }]}
            onPress={handleAddSquad}
            disabled={!newSquadName.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="add" size={22} color={newSquadName.trim() ? '#fff' : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {/* Squads List */}
        {squads.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="git-branch-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('teams.noSquadsYet')}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('teams.createSquadsToOrganize')}
            </Text>
          </View>
        ) : (
          <View style={styles.squadsList}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {t('teams.squadsCount', { count: squads.length })}
            </Text>
            {squads.map((squad, index) => {
              const squadSoldiers = getSoldiersInSquad(squad);
              const memberCount = squadSoldiers.length;
              const isEditing = editingIndex === index;

              return (
                <View
                  key={`${squad}-${index}`}
                  style={[styles.squadCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Squad Header */}
                  <View style={styles.squadHeader}>
                    {/* Reorder buttons */}
                    <View style={styles.reorderBtns}>
                      <TouchableOpacity
                        onPress={() => handleMoveSquad(index, 'up')}
                        disabled={index === 0}
                        style={styles.reorderBtn}
                      >
                        <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.border : colors.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveSquad(index, 'down')}
                        disabled={index === squads.length - 1}
                        style={styles.reorderBtn}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={index === squads.length - 1 ? colors.border : colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Squad info */}
                    <View style={styles.squadInfo}>
                      {isEditing ? (
                        <TextInput
                          style={[styles.editInput, { color: colors.text, borderColor: colors.primary }]}
                          value={editingName}
                          onChangeText={setEditingName}
                          onBlur={handleSaveEdit}
                          onSubmitEditing={handleSaveEdit}
                          autoFocus
                          selectTextOnFocus
                        />
                      ) : (
                        <TouchableOpacity onPress={() => handleStartEdit(index)}>
                          <Text style={[styles.squadName, { color: colors.text }]}>{squad}</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={[styles.squadMeta, { color: colors.textMuted }]}>
                        {t('teams.soldiersCount', { count: memberCount })}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.squadActions}>
                      {isEditing ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                          onPress={handleSaveEdit}
                        >
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      ) : (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                            onPress={() => handleStartEdit(index)}
                          >
                            <Ionicons name="pencil" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
                            onPress={() => handleRemoveSquad(index)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Squad Members */}
                  {squadSoldiers.length > 0 && (
                    <View style={[styles.squadMembers, { borderTopColor: colors.border }]}>
                      {squadSoldiers.map((soldier) => (
                        <View key={soldier.user_id} style={styles.memberRow}>
                          <BaseAvatar
                            source={soldier.profile?.avatar_url ? { uri: soldier.profile.avatar_url } : undefined}
                            fallbackText={soldier.profile?.full_name || 'S'}
                            size="sm"
                          />
                          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                            {soldier.profile?.full_name || t('common.unknown')}
                          </Text>
                          <TouchableOpacity
                            style={[styles.removeMemberBtn, { backgroundColor: '#EF444410' }]}
                            onPress={() => handleRemoveFromSquad(soldier.user_id)}
                          >
                            <Ionicons name="close" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Assign Button */}
                  <TouchableOpacity
                    style={[styles.assignBtn, { borderTopColor: colors.border }]}
                    onPress={() => handleOpenAssignModal(squad)}
                  >
                    <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                    <Text style={[styles.assignBtnText, { color: colors.primary }]}>{t('teams.assignSoldiers')}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Unassigned Soldiers */}
        {unassignedSoldiers.length > 0 && (
          <View style={[styles.unassignedSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.unassignedHeader}>
              <Ionicons name="people-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.unassignedTitle, { color: colors.text }]}>{t('teams.unassignedSoldiers')}</Text>
              <View style={[styles.unassignedCount, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.unassignedCountText, { color: colors.text }]}>{unassignedSoldiers.length}</Text>
              </View>
            </View>
            <Text style={[styles.unassignedHint, { color: colors.textMuted }]}>
              {t('teams.unassignedHint')}
            </Text>
          </View>
        )}

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.helpText, { color: colors.textMuted }]}>
            {t('teams.squadHelpText')}
          </Text>
        </View>
      </ScrollView>

      {/* Member Assignment Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textMuted }]}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('teams.assignToSquad', { squad: selectedSquad })}</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Current Squad Members */}
            {selectedSquad && getSoldiersInSquad(selectedSquad).length > 0 && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.textMuted }]}>{t('teams.inThisSquad')}</Text>
                {getSoldiersInSquad(selectedSquad).map((soldier) => (
                  <View
                    key={soldier.user_id}
                    style={[styles.modalMemberRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <BaseAvatar
                      source={soldier.profile?.avatar_url ? { uri: soldier.profile.avatar_url } : undefined}
                      fallbackText={soldier.profile?.full_name || 'S'}
                      size="sm"
                    />
                    <Text style={[styles.modalMemberName, { color: colors.text }]} numberOfLines={1}>
                      {soldier.profile?.full_name || 'Unknown'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.modalRemoveBtn, { backgroundColor: '#EF444415' }]}
                      onPress={() => handleAssignMember(soldier.user_id, null)}
                      disabled={assigningMemberId === soldier.user_id}
                    >
                      {assigningMemberId === soldier.user_id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="remove-circle" size={18} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Available Soldiers */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textMuted }]}>{t('teams.availableToAssign')}</Text>
              {unassignedSoldiers.length === 0 ? (
                <View style={[styles.modalEmptyState, { backgroundColor: colors.card }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  <Text style={[styles.modalEmptyText, { color: colors.textMuted }]}>
                    {t('teams.allSoldiersAssigned')}
                  </Text>
                </View>
              ) : (
                unassignedSoldiers.map((soldier) => (
                  <TouchableOpacity
                    key={soldier.user_id}
                    style={[styles.modalMemberRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => selectedSquad && handleAssignMember(soldier.user_id, selectedSquad)}
                    disabled={assigningMemberId === soldier.user_id}
                    activeOpacity={0.7}
                  >
                    <BaseAvatar
                      source={soldier.profile?.avatar_url ? { uri: soldier.profile.avatar_url } : undefined}
                      fallbackText={soldier.profile?.full_name || 'S'}
                      size="sm"
                    />
                    <Text style={[styles.modalMemberName, { color: colors.text }]} numberOfLines={1}>
                      {soldier.profile?.full_name || t('common.unknown')}
                    </Text>
                    {assigningMemberId === soldier.user_id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <View style={[styles.modalAddBtn, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="add" size={18} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Other Squads */}
            {selectedSquad && squads.filter((s) => s !== selectedSquad).length > 0 && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.textMuted }]}>{t('teams.fromOtherSquads')}</Text>
                {squads
                  .filter((s) => s !== selectedSquad)
                  .flatMap((squadName) =>
                    getSoldiersInSquad(squadName).map((soldier) => ({
                      ...soldier,
                      currentSquad: squadName,
                    }))
                  )
                  .map((soldier) => (
                    <TouchableOpacity
                      key={soldier.user_id}
                      style={[styles.modalMemberRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => selectedSquad && handleAssignMember(soldier.user_id, selectedSquad)}
                      disabled={assigningMemberId === soldier.user_id}
                      activeOpacity={0.7}
                    >
                      <BaseAvatar
                        source={soldier.profile?.avatar_url ? { uri: soldier.profile.avatar_url } : undefined}
                        fallbackText={soldier.profile?.full_name || 'S'}
                        size="sm"
                      />
                      <View style={styles.modalMemberInfo}>
                        <Text style={[styles.modalMemberName, { color: colors.text }]} numberOfLines={1}>
                          {soldier.profile?.full_name || t('common.unknown')}
                        </Text>
                        <Text style={[styles.modalMemberSquad, { color: colors.textMuted }]}>
                          {t('teams.currentlyInSquad', { squad: soldier.currentSquad })}
                        </Text>
                      </View>
                      {assigningMemberId === soldier.user_id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <View style={[styles.modalAddBtn, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { alignItems: 'center', paddingVertical: 24 },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },

  // Add Section
  addSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 24,
  },
  addInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Squads List
  squadsList: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },

  // Squad Card
  squadCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  squadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  reorderBtns: {
    gap: 2,
  },
  reorderBtn: {
    padding: 4,
  },
  squadInfo: {
    flex: 1,
    gap: 2,
  },
  squadName: {
    fontSize: 16,
    fontWeight: '600',
  },
  squadMeta: {
    fontSize: 12,
  },
  editInput: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 8,
  },
  squadActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Squad Members
  squadMembers: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  removeMemberBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Assign Button
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Unassigned Section
  unassignedSection: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  unassignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unassignedTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  unassignedCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unassignedCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unassignedHint: {
    fontSize: 12,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Help
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 4,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
  modalContent: { flex: 1, padding: 20 },
  modalSection: { marginBottom: 24 },
  modalSectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
  modalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  modalMemberInfo: {
    flex: 1,
    gap: 2,
  },
  modalMemberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  modalMemberSquad: {
    fontSize: 12,
  },
  modalAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRemoveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 10,
  },
  modalEmptyText: {
    flex: 1,
    fontSize: 14,
  },
});
