import SocialLoginButton from "@/components/SocialLoginButton";
import { StyleSheet, View } from "react-native";

export function SocialButtons() {
  return (
    <View style={styles.container}>
      <SocialLoginButton strategy="facebook" />
      <SocialLoginButton strategy="google" />
      <SocialLoginButton strategy="apple" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 20,
    gap: 10,
  },
});
