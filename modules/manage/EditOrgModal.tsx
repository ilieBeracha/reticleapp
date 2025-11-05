import BaseBottomSheet from "@/components/BaseBottomSheet";
import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Organization } from "@/types/organizations";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

interface EditOrgModalProps {
  visible: boolean;
  onClose: () => void;
  organization: Organization;
}

export function EditOrgModal({
  visible,
  onClose,
  organization,
}: EditOrgModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { updateOrg, fetchAllOrgs } = useOrganizationsStore();

  const [organizationName, setOrganizationName] = useState(organization.name);
  const [organizationType, setOrganizationType] = useState(
    organization.org_type
  );
  const [description, setDescription] = useState(
    organization.description || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const placeholderColor = useThemeColor({}, "placeholderText");

  const handleUpdate = async () => {
    if (!organizationName.trim()) {
      Alert.alert("Error", "Organization name cannot be empty");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateOrg(
        organization.id,
        {
          name: organizationName.trim(),
          org_type: organizationType.trim() || "Organization",
          description: description.trim() || undefined,
        },
        userId
      );

      // Refresh org data
      await fetchAllOrgs(userId);

      Alert.alert("Success", "Organization updated successfully");
      onClose();
    } catch (error: any) {
      console.error("Error updating organization:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update organization. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset to original values
    setOrganizationName(organization.name);
    setOrganizationType(organization.org_type);
    setDescription(organization.description || "");
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      keyboardBehavior="interactive"
      snapPoints={["60%", "80%"]}
      enablePanDownToClose={!isSubmitting}
      backdropOpacity={0.45}
    >
      {/* Header */}
      <View style={[styles.header, { borderColor: borderColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Edit Organization
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
          Update organization details
        </ThemedText>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Organization Name */}
        <BottomSheetTextInput
          style={[
            styles.input,
            {
              backgroundColor,
              borderColor,
              color: textColor,
            },
          ]}
          value={organizationName}
          onChangeText={setOrganizationName}
          placeholder="Organization name"
          placeholderTextColor={placeholderColor}
          autoFocus
          returnKeyType="next"
          editable={!isSubmitting}
        />

        {/* Organization Type */}
        <BottomSheetTextInput
          style={[
            styles.input,
            {
              backgroundColor,
              borderColor,
              color: textColor,
            },
          ]}
          value={organizationType}
          onChangeText={setOrganizationType}
          placeholder="Type (e.g., Battalion, Company, Unit)"
          placeholderTextColor={placeholderColor}
          returnKeyType="next"
          editable={!isSubmitting}
        />

        {/* Description */}
        <BottomSheetTextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor,
              borderColor,
              color: textColor,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={placeholderColor}
          multiline
          numberOfLines={3}
          returnKeyType="done"
          onSubmitEditing={handleUpdate}
          editable={!isSubmitting}
        />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor }]}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <ThemedText
              style={[
                styles.buttonText,
                { color: textColor },
                isSubmitting && { opacity: 0.5 },
              ]}
            >
              Cancel
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.updateButton,
              { backgroundColor: tintColor },
              (!organizationName.trim() || isSubmitting) &&
                styles.buttonDisabled,
            ]}
            onPress={handleUpdate}
            disabled={!organizationName.trim() || isSubmitting}
          >
            {isSubmitting && (
              <Ionicons
                name="hourglass-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 8 }}
              />
            )}
            <ThemedText style={styles.updateButtonText}>
              {isSubmitting ? "Updating..." : "Update"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  form: {
    gap: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
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
  updateButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
