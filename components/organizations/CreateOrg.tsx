import useCreateOrg from "@/hooks/organizations/useCreateOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable
            style={[
              styles.container,
              {
                backgroundColor,
                borderTopColor: borderColor,
                paddingBottom: insets.bottom + 20,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: mutedColor }]} />
            </View>

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
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
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
