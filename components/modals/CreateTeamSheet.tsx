import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { useTeamStore } from "@/store/teamStore";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Haptics from 'expo-haptics';
import { forwardRef, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BaseBottomSheet, type BaseBottomSheetRef } from "./BaseBottomSheet";

interface CreateTeamSheetProps {
  onTeamCreated?: () => void;
}

export const CreateTeamSheet = forwardRef<BaseBottomSheetRef, CreateTeamSheetProps>(
  ({ onTeamCreated }, ref) => {
    const colors = useColors();
    const { activeWorkspaceId, activeWorkspace } = useAppContext();
    const { createTeam, loading } = useTeamStore();
    const sheetRef = useRef<BaseBottomSheetRef>(null);
    
    const [teamName, setTeamName] = useState("");
    const [teamDescription, setTeamDescription] = useState("");

    const handleCreateTeam = async () => {
      if (!teamName.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Please enter a team name");
        return;
      }

      if (!activeWorkspaceId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "No active workspace");
        return;
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const isOrgWorkspace = activeWorkspace?.workspace_type === 'org';
        
        await createTeam({
          workspace_type: isOrgWorkspace ? 'org' : 'personal',
          workspace_owner_id: isOrgWorkspace ? undefined : activeWorkspaceId,
          org_workspace_id: isOrgWorkspace ? activeWorkspaceId : undefined,
          name: teamName.trim(),
          description: teamDescription.trim() || undefined,
        });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Close the sheet first
        if (typeof ref === 'object' && ref?.current) {
          ref.current.close();
        }
        
        // Reset form
        setTeamName("");
        setTeamDescription("");
        
        // Call the callback
        onTeamCreated?.();
        
        // Show success message after sheet closes
        setTimeout(() => {
          Alert.alert("Success", `Team "${teamName}" created successfully!`);
        }, 300);
      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error("Failed to create team:", error);
        Alert.alert("Error", error.message || "Failed to create team");
      }
    };

    return (
      <BaseBottomSheet ref={ref} snapPoints={['60%']} backdropOpacity={0.6}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Create Team
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Organize your members into groups
          </Text>
        </View>

        {/* Team Name */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Team Name</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <BottomSheetTextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Alpha Squad"
              placeholderTextColor={colors.textMuted + 'CC'}
              value={teamName}
              onChangeText={setTeamName}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Team Description (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Description (Optional)</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <BottomSheetTextInput
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
                backgroundColor: (!teamName.trim() || loading) ? colors.secondary : colors.primary,
                shadowColor: (!teamName.trim() || loading) ? 'transparent' : colors.primary
              },
              (!teamName.trim() || loading) && styles.primaryButtonDisabled
            ]}
            onPress={handleCreateTeam}
            disabled={!teamName.trim() || loading}
            activeOpacity={0.8}
          >
            <View style={styles.primaryButtonContent}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={[styles.primaryButtonText, { color: '#fff' }]}>
                {loading ? "Creating..." : "Create Team"}
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.1,
    opacity: 0.7,
  },

  // Input
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    borderRadius: 10,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "400",
    backgroundColor: 'transparent',
  },

  // Info Card
  infoCard: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    flex: 1,
    opacity: 0.8,
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    gap: 10,
  },
  primaryButton: {
    borderRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
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
    height: 48,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});