import BaseBottomSheet from "@/components/BaseBottomSheet";
import { OrgRole, useInviteOrg } from "@/hooks/useInviteOrg";

import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InviteMemberModal({
  visible,
  onClose,
}: InviteMemberModalProps) {
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
    setSelectedRole('soldier');
    onClose();
  };

  const roles = [
    { value: "soldier" as const, label: "Soldier", icon: "person" },
    {
      value: "squad_commander" as const,
      label: "Squad Commander",
      icon: "shield-half",
    },
    {
      value: "team_commander" as const,
      label: "Team Commander",
      icon: "shield-checkmark",
    },
  ];

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["60%", "88%"]}
      keyboardBehavior="interactive"
      enablePanDownToClose={!isSubmitting}
      backdropOpacity={0.5}
    >
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
          <Text style={[styles.roleLabel, { color: textColor }]}>
            Select Rank
          </Text>
          <View style={styles.roleButtons}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleButton,
                  {
                    backgroundColor,
                    borderColor:
                      selectedRole === role.value ? tintColor : borderColor,
                  },
                ]}
                onPress={() => setSelectedRole(role.value as OrgRole)}
              >
                <Ionicons
                  name={role.icon as any}
                  size={18}
                  color={selectedRole === role.value ? tintColor : mutedColor}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    {
                      color:
                        selectedRole === role.value ? tintColor : textColor,
                    },
                  ]}
                >
                  {role.label}
                </Text>
                {selectedRole === role.value && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={tintColor}
                  />
                )}
              </TouchableOpacity>
            ))}
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
    flexDirection: "column",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 10,
  },
  roleButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
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
    borderWidth: 2,
  },
  inviteButton: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
