/**
 * Team Squads Management
 * 
 * Manage squad sub-groups within a team
 */
import { useColors } from '@/hooks/ui/useColors';
import { getTeamMembers, updateTeam } from '@/services/teamService';
import { useTeamStore } from '@/store/teamStore';
import type { TeamMemberWithProfile } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { teams, loadTeams } = useTeamStore();

  const team = teams.find(t => t.id === teamId);
  const [squads, setSquads] = useState<string[]>(team?.squads || []);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  // Load members to show squad counts
  useEffect(() => {
    if (teamId) {
      getTeamMembers(teamId)
        .then(setMembers)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [teamId]);

  // Get member count for a squad
  const getSquadMemberCount = useCallback((squadName: string) => {
    return members.filter(m => m.role?.squad_id === squadName || m.details?.squad_id === squadName).length;
  }, [members]);

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
        'Squad Has Members',
        `${squadName} has ${memberCount} member${memberCount !== 1 ? 's' : ''} assigned. They will be unassigned from this squad.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove Anyway',
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
      Alert.alert('Duplicate', 'A squad with this name already exists.');
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
      Alert.alert('Error', 'Failed to update squads. Please try again.');
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
          <Text style={[styles.title, { color: colors.text }]}>Squad Management</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Organize {team?.name} into sub-groups
          </Text>
        </View>

        {/* Add New Squad */}
        <View style={[styles.addSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.addInput, { color: colors.text }]}
            placeholder="New squad name..."
            placeholderTextColor={colors.textMuted}
            value={newSquadName}
            onChangeText={setNewSquadName}
            onSubmitEditing={handleAddSquad}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: newSquadName.trim() ? colors.primary : colors.secondary },
            ]}
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
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Squads Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Create squads to organize your team into smaller groups
            </Text>
          </View>
        ) : (
          <View style={styles.squadsList}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {squads.length} SQUAD{squads.length !== 1 ? 'S' : ''}
            </Text>
            {squads.map((squad, index) => {
              const memberCount = getSquadMemberCount(squad);
              const isEditing = editingIndex === index;

              return (
                <View
                  key={`${squad}-${index}`}
                  style={[styles.squadRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Reorder buttons */}
                  <View style={styles.reorderBtns}>
                    <TouchableOpacity
                      onPress={() => handleMoveSquad(index, 'up')}
                      disabled={index === 0}
                      style={styles.reorderBtn}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={16}
                        color={index === 0 ? colors.border : colors.textMuted}
                      />
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
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
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
              );
            })}
          </View>
        )}

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.helpText, { color: colors.textMuted }]}>
            Assign members to squads from the Members screen. Squad commanders can manage their own squad.
          </Text>
        </View>
      </ScrollView>
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
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
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
  squadsList: { gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },

  // Squad Row
  squadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
});

