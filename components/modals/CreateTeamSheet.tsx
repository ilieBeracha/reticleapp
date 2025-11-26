import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useTeamStore } from "@/store/teamStore";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Haptics from 'expo-haptics';
import { forwardRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface CreateTeamSheetProps {
  onTeamCreated?: () => void;
}

// ============================================================================
// SQUAD CHIP COMPONENT
// ============================================================================
const SquadChip = ({
  name,
  onRemove,
  colors,
}: {
  name: string;
  onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) => (
  <View style={[styles.squadChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
    <Ionicons name="shield" size={14} color={colors.primary} />
    <Text style={[styles.squadChipText, { color: colors.primary }]}>{name}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close-circle" size={16} color={colors.primary} />
    </TouchableOpacity>
  </View>
);

// ============================================================================
// QUICK SQUAD TEMPLATES
// ============================================================================
const SQUAD_TEMPLATES = [
  { label: 'Alpha, Bravo, Charlie', squads: ['Alpha', 'Bravo', 'Charlie'] },
  { label: '1st, 2nd, 3rd', squads: ['1st Squad', '2nd Squad', '3rd Squad'] },
  { label: 'Red, Blue, Green', squads: ['Red', 'Blue', 'Green'] },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const CreateTeamSheet = forwardRef<BaseBottomSheetRef, CreateTeamSheetProps>(
  ({ onTeamCreated }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId } = useAppContext();
    const { createTeam, loading } = useTeamStore();

    // Form state
    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");
    const [squads, setSquads] = useState<string[]>([]);
    const [newSquadName, setNewSquadName] = useState("");
    const [showSquadSection, setShowSquadSection] = useState(false);

    // ========== HANDLERS ==========

    const handleCreateTeam = async () => {
      if (!teamName.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Team Name Required", "Please enter a name for your team.");
        return;
      }

      if (!activeWorkspaceId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "No active workspace");
        return;
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        await createTeam({
          org_workspace_id: activeWorkspaceId,
          name: teamName.trim(),
          description: teamDescription.trim() || undefined,
          squads: squads.length > 0 ? squads : undefined,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close sheet and reset form
        if (typeof ref === 'object' && ref?.current) {
          ref.current.close();
        }
        resetForm();

        // Callback
        onTeamCreated?.();

        // Success message
        setTimeout(() => {
          Alert.alert("✓ Team Created", `"${teamName}" is ready to go!`);
        }, 300);
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error("Failed to create team:", error);
        Alert.alert("Error", error.message || "Failed to create team");
      }
    };

    const handleAddSquad = () => {
      const trimmedName = newSquadName.trim();
      if (!trimmedName) return;

      if (squads.includes(trimmedName)) {
        Alert.alert("Duplicate", "This squad name already exists");
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSquads([...squads, trimmedName]);
      setNewSquadName("");
    };

    const handleRemoveSquad = (squadName: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSquads(squads.filter(s => s !== squadName));
    };

    const handleApplyTemplate = (template: string[]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSquads(template);
    };

    const resetForm = () => {
      setTeamName("");
      setTeamDescription("");
      setSquads([]);
      setNewSquadName("");
      setShowSquadSection(false);
    };

    // ========== RENDER ==========

    return (
      <BaseBottomSheet ref={ref} snapPoints={['80%']} backdropOpacity={0.6}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="people" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Create Team</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Organize your members into groups
            </Text>
          </View>

          {/* Team Name Input */}
          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Ionicons name="flag" size={16} color={colors.primary} />
              <Text style={[styles.inputLabel, { color: colors.text }]}>Team Name</Text>
              <Text style={[styles.required, { color: colors.destructive }]}>*</Text>
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: teamName ? colors.primary : colors.border }]}>
              <BottomSheetTextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Alpha Team, First Platoon..."
                placeholderTextColor={colors.textMuted}
                value={teamName}
                onChangeText={setTeamName}
                returnKeyType="next"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
              <Text style={[styles.optional, { color: colors.textMuted }]}>optional</Text>
            </View>
            <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <BottomSheetTextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="What's this team's purpose?"
                placeholderTextColor={colors.textMuted}
                value={teamDescription}
                onChangeText={setTeamDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Squads Section Toggle */}
          <TouchableOpacity
            style={[styles.squadToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowSquadSection(!showSquadSection)}
            activeOpacity={0.7}
          >
            <View style={styles.squadToggleLeft}>
              <View style={[styles.squadToggleIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="shield-outline" size={18} color={colors.text} />
              </View>
              <View>
                <Text style={[styles.squadToggleTitle, { color: colors.text }]}>Add Squads</Text>
                <Text style={[styles.squadToggleDesc, { color: colors.textMuted }]}>
                  {squads.length > 0 ? `${squads.length} squad${squads.length > 1 ? 's' : ''} added` : 'Organize into sub-units'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showSquadSection ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {/* Squads Section (Collapsible) */}
          {showSquadSection && (
            <View style={[styles.squadSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Quick Templates */}
              {squads.length === 0 && (
                <View style={styles.templatesSection}>
                  <Text style={[styles.templatesLabel, { color: colors.textMuted }]}>Quick templates:</Text>
                  <View style={styles.templateChips}>
                    {SQUAD_TEMPLATES.map((template, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.templateChip, { backgroundColor: colors.secondary }]}
                        onPress={() => handleApplyTemplate(template.squads)}
                      >
                        <Text style={[styles.templateChipText, { color: colors.text }]}>{template.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Squad Input */}
              <View style={styles.squadInputRow}>
                <View style={[styles.squadInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <BottomSheetTextInput
                    style={[styles.squadInput, { color: colors.text }]}
                    placeholder="Enter squad name..."
                    placeholderTextColor={colors.textMuted}
                    value={newSquadName}
                    onChangeText={setNewSquadName}
                    onSubmitEditing={handleAddSquad}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.addSquadBtn,
                    { backgroundColor: newSquadName.trim() ? colors.primary : colors.muted },
                  ]}
                  onPress={handleAddSquad}
                  disabled={!newSquadName.trim()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Squad Chips */}
              {squads.length > 0 && (
                <View style={styles.squadChipsContainer}>
                  {squads.map((squad) => (
                    <SquadChip
                      key={squad}
                      name={squad}
                      onRemove={() => handleRemoveSquad(squad)}
                      colors={colors}
                    />
                  ))}
                </View>
              )}

              {/* Clear All */}
              {squads.length > 0 && (
                <TouchableOpacity
                  style={styles.clearAllBtn}
                  onPress={() => setSquads([])}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                  <Text style={[styles.clearAllText, { color: colors.destructive }]}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              You can invite members and assign them to squads after creating the team.
            </Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: (!teamName.trim() || loading) ? colors.muted : colors.primary,
              },
            ]}
            onPress={handleCreateTeam}
            disabled={!teamName.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.createButtonText}>Creating...</Text>
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create Team</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </BaseBottomSheet>
    );
  }
);

CreateTeamSheet.displayName = 'CreateTeamSheet';

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // Input Sections
  inputSection: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    fontSize: 14,
    fontWeight: '600',
  },
  optional: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  textAreaWrapper: {
    minHeight: 80,
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

  // Squad Toggle
  squadToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  squadToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  squadToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  squadToggleDesc: {
    fontSize: 12,
  },

  // Squad Section
  squadSection: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  templatesSection: {
    marginBottom: 14,
  },
  templatesLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  templateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  templateChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  squadInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  squadInputWrapper: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
  },
  squadInput: {
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addSquadBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  squadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  squadChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
