import { useColors } from "@/hooks/useColors";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SignInHeader } from "./SignInHeader";
import { SocialButtons } from "./SocialButtons";

export function SignIn() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const token = useLocalSearchParams<{ token: string }>();

  useEffect(() => {
    if (token) {
      console.log('token', token);
    }
  }, [token]);

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
});
