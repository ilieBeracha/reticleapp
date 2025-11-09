import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type InviteStatus = "processing" | "saved" | "error";

export default function InviteScreen() {
  const colors = useColors();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuth();

  const [status, setStatus] = useState<InviteStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [normalizedCode, setNormalizedCode] = useState<string | null>(null);

  useEffect(() => {
    async function processInvite() {
      if (!code) {
        setErrorMessage("Invalid invite link");
        setStatus("error");
        return;
      }

      try {
        const normalized = code.trim().toUpperCase();

        if (!normalized) {
          setErrorMessage("Invalid invitation code");
          setStatus("error");
          return;
        }

        await AsyncStorage.setItem("pending_invite_code", normalized);
        setNormalizedCode(normalized);
        setStatus("saved");

        if (!user?.id) {
          router.replace("/auth/sign-in");
        }
      } catch (error) {
        console.error("❌ Error storing invitation:", error);
        setErrorMessage(
          "Failed to store the invitation code. Please try again.",
        );
        setStatus("error");
      }
    }

    processInvite();
  }, [code, router, user?.id]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessibilityLabel="Invitation screen"
    >
      {status === "processing" && (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.message, { color: colors.textMuted }]}>
            Saving your invite code...
          </Text>
        </View>
      )}

      {status === "error" && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.red }]}>
            Something went wrong
          </Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {errorMessage || "We couldn’t recognize this invite link."}
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.buttonPrimary },
            ]}
          >
            <Text style={styles.primaryButtonText}>Go home</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "saved" && user?.id && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Invite code saved
          </Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            Open your profile menu and choose “Enter invite code” to join your
            organization.
          </Text>

          {normalizedCode && (
            <View
              style={[
                styles.codeBadge,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text style={[styles.codeText, { color: colors.text }]}>
                {normalizedCode}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.replace("/(protected)/(tabs)")}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.buttonPrimary },
            ]}
          >
            <Text style={styles.primaryButtonText}>Go to dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  codeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  codeText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
  },
  primaryButton: {
    marginTop: 8,
    width: "100%",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});