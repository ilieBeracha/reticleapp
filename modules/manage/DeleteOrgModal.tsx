import BaseBottomSheet from "@/components/BaseBottomSheet";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

interface DeleteOrgModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  organizationName: string;
}

export function DeleteOrgModal({
  visible,
  onClose,
  onSuccess,
  organizationId,
  organizationName,
}: DeleteOrgModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { deleteOrg } = useOrganizationsStore();

  const [isDeleting, setIsDeleting] = useState(false);

  // Theme colors
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");

  const handleDelete = async () => {
    if (!userId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setIsDeleting(true);

    try {
      await deleteOrg(organizationId, userId);
      Alert.alert(
        "Success",
        "Organization and all its children have been deleted"
      );
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to delete organization. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      keyboardBehavior="interactive"
      snapPoints={["40%"]}
      enablePanDownToClose={!isDeleting}
      backdropOpacity={0.45}
    >
      {/* Header */}
      <View style={[styles.header, { borderColor: borderColor }]}>
        <View style={styles.warningIcon}>
          <Ionicons name="warning" size={48} color="#ef4444" />
        </View>

        <ThemedText style={[styles.title, { color: textColor }]}>
          Delete Organization?
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
          Are you sure you want to delete "{organizationName}"?
        </ThemedText>
      </View>

      {/* Warning Message */}
      <View style={[styles.warningBox, { backgroundColor: "#ef444415" }]}>
        <Ionicons name="alert-circle" size={20} color="#ef4444" />
        <ThemedText style={[styles.warningText, { color: "#ef4444" }]}>
          This will permanently delete the organization and all its child
          organizations. This action cannot be undone.
        </ThemedText>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { borderColor }]}
          onPress={onClose}
          disabled={isDeleting}
        >
          <ThemedText
            style={[
              styles.buttonText,
              { color: textColor },
              isDeleting && { opacity: 0.5 },
            ]}
          >
            Cancel
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.deleteButton,
            isDeleting && styles.buttonDisabled,
          ]}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting && (
            <Ionicons
              name="hourglass-outline"
              size={16}
              color="#fff"
              style={{ marginRight: 8 }}
            />
          )}
          <ThemedText style={styles.deleteButtonText}>
            {isDeleting ? "Deleting..." : "Delete"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center",
  },
  warningIcon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
