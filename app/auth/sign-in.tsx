import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import SocialLoginButton from "../../components/SocialLoginButton";

export default function Page() {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const descriptionColor = useThemeColor({}, "description");

  return (
    <View
      style={[
        styles.container,
        { paddingTop: 40, paddingBottom: 40, backgroundColor },
      ]}
    >
      <View style={styles.headingContainer}>
        <Text style={[styles.label, { color: textColor }]}>
          Login on Dev Inteprid
        </Text>
        <Text style={[styles.description, { color: descriptionColor }]}>
          Start your journey with thousands of developers around the world.
        </Text>
      </View>

      <View style={styles.socialButtonsContainer}>
        <SocialLoginButton strategy="facebook" />
        <SocialLoginButton strategy="google" />
        <SocialLoginButton strategy="apple" />
      </View>
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
  headingContainer: {
    width: "100%",
    gap: 5,
  },
  label: {
    fontSize: 20,
    fontWeight: "bold",
  },
  description: {
    fontSize: 16,
  },
  socialButtonsContainer: {
    width: "100%",
    marginTop: 20,
    gap: 10,
  },
});
