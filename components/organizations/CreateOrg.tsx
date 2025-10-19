import BaseBottomSheet from "@/components/BaseBottomSheet";
import useCreateOrg from "@/hooks/organizations/useCreateOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../ThemedText";

export default function CreateOrg({
  visible,
  setVisible,
}: {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}) {
  const { createOrg, isSubmitting, organizationName, setOrganizationName } =
    useCreateOrg();

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const placeholderColor = useThemeColor({}, "placeholderText");

  const handleCreate = async () => {
    const result = await createOrg();
    if (result) {
      setOrganizationName("");
      setVisible(false);
    }
  };

  const handleClose = () => {
    setOrganizationName("");
    setVisible(false);
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["40%"]}
      enablePanDownToClose={true}
      backdropOpacity={0.5}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: textColor }]}>
            Create Organization
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
            Enter a name for your new organization
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
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
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <ThemedText style={[styles.buttonText, { color: textColor }]}>
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
      </KeyboardAvoidingView>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingVertical: 12,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
  form: {
    paddingTop: 16,
    gap: 16,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  createButton: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
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
