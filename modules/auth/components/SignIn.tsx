import { useColors } from "@/hooks/useColors";
import { StyleSheet, View } from "react-native";
import { SignInHeader } from "./SignInHeader";
import { SocialButtons } from "./SocialButtons";

export function SignIn() {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SignInHeader />
      <SocialButtons />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});
