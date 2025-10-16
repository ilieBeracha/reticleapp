import React from "react";
import { StyleSheet, Text, View } from "react-native";
import SocialLoginButton from "../components/SocialLoginButton";

export default function Page() {
  return (
    <View style={[styles.container, { paddingTop: 40, paddingBottom: 40 }]}>
      <View style={styles.headingContainer}>
        <Text style={styles.label}>Login on Dev Inteprid</Text>
        <Text style={styles.description}>
          Start yo ur journey with thousands of developers around the world.
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
    color: "gray",
  },
  socialButtonsContainer: {
    width: "100%",
    marginTop: 20,
    gap: 10,
  },
});
