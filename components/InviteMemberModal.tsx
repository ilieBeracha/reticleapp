import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { invitationStore } from "@/store/invitationStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useStore } from "zustand";
import { ThemedText } from "./ThemedText";

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
}

export function InviteMemberModal({
  visible,
  onClose,
}: InviteMemberModalProps) {
  const { user } = useAuth();
  const { selectedOrgId, allOrgs } = useOrganizationsStore();
  const { createInvitation } = useStore(invitationStore);

  const [selectedRole, setSelectedRole] = useState<"commander" | "member">("member");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");

  const currentOrg = selectedOrgId
    ? allOrgs.find((org) => org.id === selectedOrgId)
    : null;

  const handleGenerateLink = async () => {
    if (!selectedOrgId || !user?.id || !currentOrg) return;

    setIsGenerating(true);
    try {
      // Generate 6-character invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create invitation in database with code
      await createInvitation(inviteCode, selectedOrgId, selectedRole, user.id);

      setGeneratedCode(inviteCode);

      // Generate magic link
      const magicLink = `reticle://invite?code=${inviteCode}`;
      const shareMessage = `🎯 You're invited to join ${currentOrg.name} as ${selectedRole}!\n\nInvite Code: ${inviteCode}\n\nTap to join instantly:\n${magicLink}\n\n—\nScopes Training App`;

      // Copy to clipboard (works in simulator!)
      await Clipboard.setStringAsync(magicLink);

      // Try to share (may not work in simulator)
      if (Platform.OS === 'ios' && __DEV__) {
        // Development mode - show link that's been copied
        Alert.alert(
          "Invite Link Generated! ✅",
          `Code: ${inviteCode}\n\nLink copied to clipboard!\n\n${magicLink}\n\nOn a real device, this would open WhatsApp/SMS to share.`,
          [
            { text: "Copy Message", onPress: () => Clipboard.setStringAsync(shareMessage) },
            { text: "Done", onPress: handleClose }
          ]
        );
      } else {
        // Production - use native share
        await Share.share({
          title: `Join ${currentOrg.name}`,
          message: shareMessage,
        });

        Alert.alert(
          "Invite Link Shared!",
          `Anyone with code ${inviteCode} can join as ${selectedRole}`,
          [{ text: "Done", onPress: handleClose }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create invitation. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedRole("member");
    setGeneratedCode(null);
    onClose();
  };

  const roles = [
    { value: "member" as const, label: "Member", icon: "person" },
    {
      value: "commander" as const,
      label: "Commander",
      icon: "shield-checkmark",
    },
  ];

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["55%", "75%"]}
      keyboardBehavior="interactive"
      enablePanDownToClose={!isGenerating}
      backdropOpacity={0.5}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconHeader, { backgroundColor: tintColor + "15" }]}>
          <Ionicons name="link" size={28} color={tintColor} />
        </View>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Generate Invite Link
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
          Create a shareable link for {currentOrg?.name || "your organization"}
        </ThemedText>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Generated Code Display */}
        {generatedCode && (
          <TouchableOpacity
            style={[
              styles.codeDisplay,
              { backgroundColor: cardBackground, borderColor: tintColor },
            ]}
            onPress={() => {
              Clipboard.setStringAsync(generatedCode);
              Alert.alert("Copied!", "Invite code copied to clipboard");
            }}
          >
            <Ionicons name="key" size={20} color={tintColor} />
            <Text style={[styles.codeText, { color: tintColor }]}>
              {generatedCode}
            </Text>
            <Text style={[styles.codeLabel, { color: mutedColor }]}>
              Tap to copy code
            </Text>
          </TouchableOpacity>
        )}

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
                    backgroundColor: cardBackground,
                    borderColor:
                      selectedRole === role.value ? tintColor : borderColor,
                  },
                ]}
                onPress={() => setSelectedRole(role.value)}
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

        {/* Generate & Share Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: tintColor },
          ]}
          onPress={handleGenerateLink}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="share-social" size={22} color="#fff" />
              <Text style={styles.generateButtonText}>
                {generatedCode ? "Share Again" : "Generate & Share Link"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={mutedColor} />
          <Text style={[styles.infoText, { color: mutedColor }]}>
            Anyone with the link can join as {selectedRole}. Link expires in 7 days.
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeButton, { borderColor }]}
          onPress={handleClose}
        >
          <Text style={[styles.closeButtonText, { color: textColor }]}>
            {generatedCode ? "Done" : "Cancel"}
          </Text>
        </TouchableOpacity>
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
    gap: 8,
    alignItems: "center",
  },
  iconHeader: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  form: {
    paddingTop: 20,
    gap: 20,
  },
  codeDisplay: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
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
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "rgba(128, 128, 128, 0.05)",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
