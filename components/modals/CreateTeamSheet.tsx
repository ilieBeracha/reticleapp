import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createTeam } from "@/services/workspaceService";
import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface CreateTeamSheetProps {
  onTeamCreated?: () => void;
}

export const CreateTeamSheet = forwardRef<BaseBottomSheetRef, CreateTeamSheetProps>(
  ({ onTeamCreated }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId, activeWorkspace, isMyWorkspace } = useAppContext();
    
    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");
    const [teamType, setTeamType] = useState<'field' | 'back_office'>('field');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateTeam = async () => {
      if (!teamName.trim()) {
        Alert.alert("Error", "Please enter a team name");
        return;
      }

      if (!activeWorkspaceId) {
        Alert.alert("Error", "No active workspace");
        return;
      }

      setIsCreating(true);
      try {
        // Determine workspace type and IDs
        const isOrgWorkspace = activeWorkspace?.workspace_type === 'org';
        
        await createTeam({
          workspace_type: isOrgWorkspace ? 'org' : 'personal',
          workspace_owner_id: isOrgWorkspace ? undefined : activeWorkspaceId,
          org_workspace_id: isOrgWorkspace ? activeWorkspaceId : undefined,
          name: teamName.trim(),
          team_type: teamType,
          description: teamDescription.trim() || undefined,
        });
        
        Alert.alert("Success", `Team "${teamName}" created successfully!`);
        setTeamName("");
        setTeamDescription("");
        setTeamType('field');
        onTeamCreated?.();
      } catch (error: any) {
        console.error("Failed to create team:", error);
        Alert.alert("Error", error.message || "Failed to create team");
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={['90%']} backdropOpacity={0.6}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Create Team
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Organize your training groups
          </Text>
        </View>

        {/* Team Name */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Team Name</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Alpha Squad"
              placeholderTextColor={colors.textMuted + 'CC'}
              value={teamName}
              onChangeText={setTeamName}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Team Type */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Team Type</Text>
          <View style={styles.teamTypeContainer}>
            <TouchableOpacity
              style={[
                styles.teamTypeButton,
                teamType === 'field' && styles.teamTypeButtonActive,
                { 
                  backgroundColor: teamType === 'field' ? colors.primary + '15' : colors.card,
                  borderColor: teamType === 'field' ? colors.primary : colors.border
                }
              ]}
              onPress={() => setTeamType('field')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="shield" 
                size={20} 
                color={teamType === 'field' ? colors.primary : colors.textMuted} 
              />
              <Text style={[
                styles.teamTypeText,
                { color: teamType === 'field' ? colors.primary : colors.textMuted }
              ]}>
                Field Team
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.teamTypeButton,
                teamType === 'back_office' && styles.teamTypeButtonActive,
                { 
                  backgroundColor: teamType === 'back_office' ? colors.primary + '15' : colors.card,
                  borderColor: teamType === 'back_office' ? colors.primary : colors.border
                }
              ]}
              onPress={() => setTeamType('back_office')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="desktop" 
                size={20} 
                color={teamType === 'back_office' ? colors.primary : colors.textMuted} 
              />
              <Text style={[
                styles.teamTypeText,
                { color: teamType === 'back_office' ? colors.primary : colors.textMuted }
              ]}>
                Back Office
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team Description (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Description (Optional)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.textArea, { color: colors.text }]}
              placeholder="Describe the team's purpose..."
              placeholderTextColor={colors.textMuted + 'CC'}
              value={teamDescription}
              onChangeText={setTeamDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Team Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.secondary }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              You can add members after creating the team
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: (!teamName.trim() || isCreating) ? colors.secondary : colors.primary,
                shadowColor: (!teamName.trim() || isCreating) ? 'transparent' : colors.primary
              },
              (!teamName.trim() || isCreating) && styles.primaryButtonDisabled
            ]}
            onPress={handleCreateTeam}
            disabled={!teamName.trim() || isCreating}
            activeOpacity={0.8}
          >
            <View style={styles.primaryButtonContent}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                {isCreating ? "Creating..." : "Create Team"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </BaseBottomSheet>
    );
  }
);

CreateTeamSheet.displayName = 'CreateTeamSheet';

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },

  // Info Card
  infoCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
    flex: 1,
  },

  // Team Type Selection
  teamTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  teamTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamTypeButtonActive: {
    borderWidth: 2,
  },
  teamTypeText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});

