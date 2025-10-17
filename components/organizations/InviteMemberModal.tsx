import { useInviteOrg } from "@/hooks/organizations/useInviteOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../ThemedText";

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InviteMemberModal({
  visible,
  onClose,
}: InviteMemberModalProps) {
  const insets = useSafeAreaInsets();
  const {
    emailAddress,
    setEmailAddress,
    selectedRole,
    setSelectedRole,
    isSubmitting,
    canSubmit,
    inviteMember,
  } = useInviteOrg();

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const placeholderColor = useThemeColor({}, "placeholderText");

  const handleInvite = async () => {
    try {
      await inviteMember();
      Alert.alert(
        "Invitation Sent! ✅",
        `An invitation has been sent to ${emailAddress}`,
        [
          {
            text: "OK",
            onPress: () => onClose(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to send invitation. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleClose = () => {
    setEmailAddress("");
    setSelectedRole("org:member");
    onClose();
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
                Invite Member
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
                Send an invitation to join your organization
              </ThemedText>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor,
                    borderColor,
                    color: textColor,
                  },
                ]}
                value={emailAddress}
                onChangeText={setEmailAddress}
                placeholder="email@example.com"
                placeholderTextColor={placeholderColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={canSubmit ? handleInvite : undefined}
              />

              {/* Role Selection */}
              <View style={styles.roleContainer}>
                <Text style={[styles.roleLabel, { color: mutedColor }]}>
                  Select Role
                </Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      {
                        backgroundColor:
                          selectedRole === "org:member"
                            ? tintColor
                            : backgroundColor,
                        borderColor,
                      },
                    ]}
                    onPress={() => setSelectedRole("org:member")}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={selectedRole === "org:member" ? "#fff" : textColor}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        {
                          color:
                            selectedRole === "org:member" ? "#fff" : textColor,
                        },
                      ]}
                    >
                      Member
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      {
                        backgroundColor:
                          selectedRole === "org:admin"
                            ? tintColor
                            : backgroundColor,
                        borderColor,
                      },
                    ]}
                    onPress={() => setSelectedRole("org:admin")}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={selectedRole === "org:admin" ? "#fff" : textColor}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        {
                          color:
                            selectedRole === "org:admin" ? "#fff" : textColor,
                        },
                      ]}
                    >
                      Admin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { borderColor }]}
                  onPress={handleClose}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.inviteButton,
                    {
                      backgroundColor: tintColor,
                      opacity: canSubmit ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleInvite}
                  disabled={!canSubmit}
                >
                  {isSubmitting && (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text style={styles.inviteButtonText}>
                    {isSubmitting ? "Sending..." : "Send Invite"}
                  </Text>
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
    gap: 20,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  roleContainer: {
    gap: 10,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  roleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  inviteButton: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
