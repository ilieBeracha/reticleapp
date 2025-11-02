// components/CreateOrg.tsx
import BaseBottomSheet from "@/components/BaseBottomSheet";
import useCreateOrg from "@/hooks/useCreateOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";

interface CreateOrgModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  parentId?: string; // If provided, creates a child org instead of root
  autoSwitch?: boolean; // If true, switches to new org after creation (default: true for root, false for child)
}

export function CreateOrgModal({
  visible,
  onClose,
  onSuccess,
  parentId,
  autoSwitch = !parentId, // Default: auto-switch for root orgs, don't auto-switch for child orgs
}: CreateOrgModalProps) {
  const {
    createOrg,
    isSubmitting,
    organizationName,
    setOrganizationName,
    organizationType,
    setOrganizationType,
    description,
    setDescription,
  } = useCreateOrg({ parentId, autoSwitch });

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const placeholderColor = useThemeColor({}, "placeholderText");

  const handleCreate = async () => {
    try {
      const result = await createOrg();
      if (result) {
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create organization. Please try again."
      );
    }
  };

  const handleClose = () => {
    setOrganizationName("");
    setOrganizationType("Organization");
    setDescription("");
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      keyboardBehavior="interactive"
      snapPoints={["50%", "70%"]} // ✅ Larger for additional fields
      enablePanDownToClose={!isSubmitting}
      backdropOpacity={0.45}
    >
      {/* Header */}
      <View style={[styles.header, { borderColor: borderColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Create Organization
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
          {parentId
            ? "Create a new child organization"
            : "Create a new root organization"}
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
          onSubmitEditing={handleCreate}
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
              styles.createButton,
              { backgroundColor: tintColor },
              (!organizationName.trim() || isSubmitting) &&
                styles.buttonDisabled,
            ]}
            onPress={handleCreate}
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
            <ThemedText style={styles.createButtonText}>
              {isSubmitting ? "Creating..." : "Create"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </BaseBottomSheet>
  );
}

export default CreateOrgModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  createButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
