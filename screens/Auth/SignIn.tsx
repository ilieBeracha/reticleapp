import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, View } from "react-native";
import { SignInHeader } from "./components/SignInHeader";
import { SocialButtons } from "./components/SocialButtons";

export function SignIn() {
  const backgroundColor = useThemeColor({}, "background");

  return (
    <View
      style={[
        styles.container,
        { paddingTop: 40, paddingBottom: 40, backgroundColor },
      ]}
    >
      <SignInHeader />
      <SocialButtons />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
