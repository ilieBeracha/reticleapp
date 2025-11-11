import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { acceptInvitationService } from "@/services/invitationService";
import { useOrganizationsStore } from "@/store/organizationsStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface EnterInviteCodeFormProps {
  initialInviteCode?: string;
  onCancel: () => void;
  onSuccess: () => void;
  onPendingInviteCleared?: () => void;
}

export function EnterInviteCodeForm({
  initialInviteCode,
  onCancel,
  onSuccess,
  onPendingInviteCleared,
}: EnterInviteCodeFormProps) {
  const colors = useColors();
  const { user } = useAuth();
  const fetchUserOrgs = useOrganizationsStore((state) => state.fetchUserOrgs);
  const fetchUserContext = useOrganizationsStore((state) => state.fetchUserContext);

  const [inviteCode, setInviteCode] = useState(
    (initialInviteCode || "").toUpperCase(),
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    setInviteCode((initialInviteCode || "").toUpperCase());
  }, [initialInviteCode]);

  const handleInviteChange = (value: string) => {
    setJoinError(null);
    const sanitized = value.replace(/[^a-zA-Z0-9]/g, "");
    setInviteCode(sanitized.toUpperCase());
  };

  const handleJoinOrganization = async () => {
    const trimmed = inviteCode.trim();

    if (!trimmed) {
      setJoinError("Enter the invite code you received.");
      return;
    }

    if (!user?.id) {
      setJoinError("You need to sign in before joining an organization.");
      return;
    }

    try {
      setJoinLoading(true);
      setJoinError(null);
      const normalized = trimmed.toUpperCase();

      const result = await acceptInvitationService(normalized, user.id);

      await Promise.allSettled([
        fetchUserOrgs(user.id, { silent: true }),
        fetchUserContext(user.id, { silent: true }),
      ]);

      await AsyncStorage.removeItem("pending_invite_code");
      onPendingInviteCleared?.();

      setInviteCode("");

      Alert.alert(
        "Invitation accepted",
        result?.orgName
          ? `You're now a member of ${result.orgName}.`
          : "You're now a member of the organization.",
      );

      onSuccess();
    } catch (error: any) {
      setJoinError(error?.message || "Failed to accept invitation.");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        Enter invite code
      </Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        Paste or type the code that was sent to you to join the organization.
      </Text>

      <TextInput
        value={inviteCode}
        onChangeText={handleInviteChange}
        autoCorrect={false}
        autoCapitalize="characters"
        placeholder="ABC123"
        placeholderTextColor={colors.placeholderText}
        style={[
          styles.input,
          {
            borderColor: joinError ? colors.red : colors.border,
            color: colors.text,
            backgroundColor: colors.cardBackground,
          },
        ]}
        maxLength={12}
        accessibilityLabel="Invitation code"
      />

      {joinError && (
        <Text style={[styles.error, { color: colors.red }]}>{joinError}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          {
            backgroundColor: colors.buttonPrimary,
            opacity: joinLoading ? 0.7 : 1,
          },
        ]}
        onPress={handleJoinOrganization}
        disabled={joinLoading}
        accessibilityRole="button"
      >
        {joinLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Join organization</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onCancel}
        disabled={joinLoading}
        accessibilityRole="button"
      >
        <Text style={[styles.cancelText, { color: colors.textMuted }]}>
          Back to menu
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: "600",
  },
  error: {
    fontSize: 13,
    fontWeight: "500",
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
});


