import { EmailOTPSheet } from "@/components/auth/EmailOTPSheet";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SignInHeader } from "./SignInHeader";
import { SocialButtons } from "./SocialButtons";

interface SignInProps {
  inviteCode: string | undefined;
}

export function SignIn({ inviteCode }: SignInProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showEmailOTP, setShowEmailOTP] = useState(false);

  useEffect(() => {
    if (inviteCode) {
      AsyncStorage.setItem("pending_invite_code", inviteCode);
    }
  }, [inviteCode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {inviteCode && (
            <View style={[styles.inviteBanner, { backgroundColor: colors.tint + "15" }]}>
              <Text style={[styles.inviteText, { color: colors.tint }]}>
                You've been invited to join an organization
              </Text>
            </View>
          )}
          <SignInHeader />
          <SocialButtons />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email OTP Button */}
          <TouchableOpacity
            style={[styles.emailButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => setShowEmailOTP(true)}
          >
            <Ionicons name="mail-outline" size={20} color={colors.tint} />
            <Text style={[styles.emailButtonText, { color: colors.text }]}>
              Continue with Email
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Email OTP Bottom Sheet */}
      <EmailOTPSheet
        visible={showEmailOTP}
        onClose={() => setShowEmailOTP(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  inviteBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  inviteText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
