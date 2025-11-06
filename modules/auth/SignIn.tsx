import { useColors } from "@/hooks/ui/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SignInHeader } from "./SignInHeader";
import { SocialButtons } from "./SocialButtons";

interface SignInProps {
  inviteCode: string | undefined;
}

export function SignIn({ inviteCode }: SignInProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

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
        </View>
      </ScrollView>
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
});
