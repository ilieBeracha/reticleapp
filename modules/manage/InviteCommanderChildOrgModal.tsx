import BaseBottomSheet from "@/components/BaseBottomSheet";
import { OrgTypePicker } from "@/components/OrgTypePicker";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { invitationStore } from "@/store/invitationStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useStore } from "zustand";

interface InviteCommanderChildOrgModalProps {
  visible: boolean;
  onClose: () => void;
  parentId: string;
  parentName: string;
  parentType: string;
}

export function InviteCommanderChildOrgModal({
  visible,
  onClose,
  parentId,
  parentName,
  parentType,
}: InviteCommanderChildOrgModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();
  const { createInvitation } = useStore(invitationStore);

  const [childName, setChildName] = useState("");
  const [childType, setChildType] = useState("Team");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const nextTypeDefault = useMemo(() => {
    const typeHierarchy = ["Unit", "Team", "Squad"];
    const idx = typeHierarchy.indexOf(parentType);
    if (idx >= 0 && idx < typeHierarchy.length - 1) {
      return typeHierarchy[idx + 1];
    }
    return "Squad";
  }, [parentType]);

  // Initialize child type on open
  useMemo(() => {
    if (visible) setChildType(nextTypeDefault);
  }, [visible, nextTypeDefault]);

  const handleGenerateInvite = async () => {
    if (!user?.id || !selectedOrgId) return;
    if (!childName.trim()) {
      Alert.alert("Name required", "Please enter a name for the new sub-organization.");
      return;
    }

    setIsGenerating(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await createInvitation(code, selectedOrgId, "commander", user.id);
      setGeneratedCode(code);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to generate invitation");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    await Clipboard.setStringAsync(generatedCode);
    Alert.alert("Copied!", "Invite code copied to clipboard");
  };

  const handleShare = async () => {
    if (!generatedCode) return;
    const deepLink = `reticle://invite?code=${generatedCode}`;
    const message =
      `🎯 You're invited to lead ${childName}!\n\n` +
      `Join as Commander of this new ${childType} under ${parentName}.\n\n` +
      `Invite Code: ${generatedCode}\n` +
      `Link: ${deepLink}`;

    try {
      await Share.share({
        title: `Lead ${childName}`,
        message: message,
        url: deepLink, // iOS will show this separately
      });
    } catch (error: any) {
      // User cancelled or error occurred
      console.log("Share error:", error);
    }
  };

  const handleClose = () => {
    setChildName("");
    setChildType(nextTypeDefault);
    setGeneratedCode(null);
    onClose();
  };

  const isAtMaxDepth = parentType === "Squad";

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={handleClose}
      snapPoints={["65%", "85%"]}
      enableDynamicSizing={false}
      scrollable={true}
      enablePanDownToClose={!isGenerating}
      keyboardBehavior="interactive"
      enableKeyboardAutoSnap={true}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Invite Commander to Create Sub-Org
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Parent: {parentName} ({parentType})
        </Text>
      </View>

      {isAtMaxDepth ? (
        <View style={[styles.infoBox, { backgroundColor: colors.yellow + "10", borderColor: colors.yellow + "40" }]}>
          <Ionicons name="alert-circle" size={18} color={colors.yellow} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Maximum depth reached. You can't create or invite for a lower level.
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Sub-Organization Name *</Text>
            <BottomSheetTextInput
              style={[
                styles.input,
                { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text },
              ]}
              value={childName}
              onChangeText={setChildName}
              placeholder={`e.g., Bravo ${nextTypeDefault}`}
              placeholderTextColor={colors.description}
              autoFocus
              returnKeyType="done"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Sub-Organization Type</Text>
            <OrgTypePicker selectedType={childType} onTypeSelect={setChildType} parentType={parentType} />
          </View>

          {!generatedCode ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.buttonPrimary }]}
              onPress={handleGenerateInvite}
              disabled={isGenerating || !childName.trim()}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="key" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Generate Invite Code</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.inviteCard}>
              {/* Big Invite Code Display */}
              <View style={[styles.codeDisplay, { backgroundColor: colors.tint + "10", borderColor: colors.tint + "30" }]}>
                <Text style={[styles.codeLabel, { color: colors.textMuted }]}>INVITE CODE</Text>
                <Text style={[styles.codeText, { color: colors.tint }]}>{generatedCode}</Text>
                <TouchableOpacity
                  style={[styles.copyCodeButton, { backgroundColor: colors.tint }]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy" size={16} color="#fff" />
                  <Text style={styles.copyCodeText}>Copy Code</Text>
                </TouchableOpacity>
              </View>

              {/* Share Button */}
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <View style={[styles.shareButtonIcon, { backgroundColor: colors.tint + "15" }]}>
                  <Ionicons name="share-social" size={24} color={colors.tint} />
                </View>
                <View style={styles.shareButtonText}>
                  <Text style={[styles.shareButtonTitle, { color: colors.text }]}>Share Invite</Text>
                  <Text style={[styles.shareButtonSubtitle, { color: colors.textMuted }]}>
                    Send via Messages, WhatsApp, Email & more
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: colors.border }]}
        onPress={handleClose}
        disabled={isGenerating}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Close</Text>
      </TouchableOpacity>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  inviteCard: {
    gap: 16,
  },
  codeDisplay: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  codeText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
  },
  copyCodeButton: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  copyCodeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  shareButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    flex: 1,
    gap: 2,
  },
  shareButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  shareButtonSubtitle: {
    fontSize: 12,
  },
});

