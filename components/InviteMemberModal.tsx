import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { invitationStore } from "@/store/invitationStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
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
  const { selectedOrgId, userOrgContext, orgChildren } = useOrganizationsStore();
  const { createInvitation } = useStore(invitationStore);

  const [selectedRole, setSelectedRole] = useState<"commander" | "member">("member");
  const [targetOrgId, setTargetOrgId] = useState<string | null>(selectedOrgId);
  const [maxUses, setMaxUses] = useState<number>(5); // Default: 5 uses for members
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");

  // Build list of organizations in scope
  const scopeOrgs = [
    ...(userOrgContext ? [{
      id: userOrgContext.orgId,
      name: userOrgContext.orgName,
      org_type: userOrgContext.orgType,
      depth: userOrgContext.orgDepth,
    }] : []),
    ...orgChildren.map(child => ({
      id: child.id,
      name: child.name,
      org_type: child.org_type,
      depth: child.depth,
    }))
  ];

  const targetOrg = scopeOrgs.find(o => o.id === targetOrgId);
  const targetOrgName = targetOrg?.name || userOrgContext?.orgName || "organization";

  // Reset targetOrgId when modal opens
  useEffect(() => {
    if (visible) {
      setTargetOrgId(selectedOrgId);
    }
  }, [visible, selectedOrgId]);

  const handleGenerateLink = async () => {
    if (!targetOrgId || !user?.id || !userOrgContext) return;

    setIsGenerating(true);
    try {
      // Generate 6-character invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create invitation in database with code
      // Commander invites = single use, member invites = custom
      const inviteMaxUses = selectedRole === "commander" ? 1 : maxUses;
      await createInvitation(inviteCode, targetOrgId, selectedRole, user.id, inviteMaxUses);

      setGeneratedCode(inviteCode);

      // Generate magic link
      const magicLink = `reticle://invite?code=${inviteCode}`;
      const shareMessage = `🎯 You're invited to join ${targetOrgName} as ${selectedRole}!\n\nInvite Code: ${inviteCode}\n\nTap to join instantly:\n${magicLink}\n\n—\nScopes Training App`;

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
          title: `Join ${targetOrgName}`,
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
    setTargetOrgId(selectedOrgId);
    setMaxUses(5);
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

  const maxUsesOptions = [
    { value: 1, label: "1 person" },
    { value: 5, label: "5 people" },
    { value: 10, label: "10 people" },
    { value: 25, label: "25 people" },
    { value: null, label: "Unlimited" },
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
          Invite members to organizations in your scope
        </ThemedText>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Organization Selection (if commander with children) */}
        {scopeOrgs.length > 1 && (
          <View style={styles.orgSelectionContainer}>
            <Text style={[styles.orgSelectionLabel, { color: textColor }]}>
              Invite to Organization
            </Text>
            <View style={styles.orgButtons}>
              {scopeOrgs.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={[
                    styles.orgButton,
                    {
                      backgroundColor: cardBackground,
                      borderColor: targetOrgId === org.id ? tintColor : borderColor,
                    },
                  ]}
                  onPress={() => setTargetOrgId(org.id)}
                >
                  <Ionicons
                    name={
                      org.depth === 0 ? 'business' :
                      org.depth === 1 ? 'people' :
                      'shield'
                    }
                    size={16}
                    color={targetOrgId === org.id ? tintColor : mutedColor}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.orgButtonText,
                        {
                          color: targetOrgId === org.id ? tintColor : textColor,
                        },
                      ]}
                    >
                      {org.name}
                    </Text>
                    <Text style={[styles.orgButtonType, { color: mutedColor }]}>
                      {org.org_type}
                    </Text>
                  </View>
                  {targetOrgId === org.id && (
                    <Ionicons name="checkmark-circle" size={18} color={tintColor} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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

        {/* Max Uses Selection (Only for Members) */}
        {selectedRole === "member" && (
          <View style={styles.maxUsesContainer}>
            <Text style={[styles.roleLabel, { color: textColor }]}>
              Number of Uses
            </Text>
            <View style={styles.maxUsesButtons}>
              {maxUsesOptions.map((option) => (
                <TouchableOpacity
                  key={option.value || 'unlimited'}
                  style={[
                    styles.maxUsesButton,
                    {
                      backgroundColor: cardBackground,
                      borderColor: maxUses === option.value ? tintColor : borderColor,
                    },
                  ]}
                  onPress={() => setMaxUses(option.value as number)}
                >
                  <Text
                    style={[
                      styles.maxUsesButtonText,
                      {
                        color: maxUses === option.value ? tintColor : textColor,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {maxUses === option.value && (
                    <Ionicons name="checkmark" size={16} color={tintColor} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.maxUsesHint, { color: mutedColor }]}>
              {maxUses === null 
                ? "Link can be used unlimited times" 
                : `Link can be used by ${maxUses} ${maxUses === 1 ? 'person' : 'people'}`}
            </Text>
          </View>
        )}

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
            {selectedRole === "commander" 
              ? `Single-use link for commander role. Expires in 7 days.`
              : maxUses === null
              ? `Unlimited-use link for ${targetOrgName}. Expires in 7 days.`
              : `Link can be used ${maxUses} times for ${targetOrgName}. Expires in 7 days.`}
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
  orgSelectionContainer: {
    gap: 12,
  },
  orgSelectionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  orgButtons: {
    gap: 10,
  },
  orgButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  orgButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  orgButtonType: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  maxUsesContainer: {
    gap: 12,
  },
  maxUsesButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  maxUsesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
  },
  maxUsesButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  maxUsesHint: {
    fontSize: 12,
    fontWeight: "500",
    fontStyle: "italic",
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
