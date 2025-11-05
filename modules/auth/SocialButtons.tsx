import SocialLoginButton from "@/components/SocialLoginButton";
import { StyleSheet, View } from "react-native";

export function SocialButtons() {
  return (
    <View style={styles.container}>
      <SocialLoginButton strategy="google" />
      <SocialLoginButton strategy="apple" />
      <SocialLoginButton strategy="facebook" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
  },
});
