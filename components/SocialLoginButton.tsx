import { useColors } from "@/hooks/useColors";
import { useSSO, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

const SocialLoginButton = ({
  strategy,
}: {
  strategy: "facebook" | "google" | "apple";
}) => {
  const getStrategy = () => {
    if (strategy === "facebook") {
      return "oauth_facebook";
    } else if (strategy === "google") {
      return "oauth_google";
    } else if (strategy === "apple") {
      return "oauth_apple";
    }
    return "oauth_facebook";
  };

  const { startSSOFlow } = useSSO();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();
  const router = useRouter();

  const getButtonConfig = () => {
    const configs = {
      facebook: {
        text: "Continue with Facebook",
        icon: "logo-facebook" as const,
        color: "#1877F2",
        backgroundColor: "#1877F215",
      },
      google: {
        text: "Continue with Google",
        icon: "logo-google" as const,
        color: "#DB4437",
        backgroundColor: "#DB443715",
      },
      apple: {
        text: "Continue with Apple",
        icon: "logo-apple" as const,
        color: colors.text,
        backgroundColor: colors.card,
      },
    };
    return configs[strategy];
  };

  const config = getButtonConfig();

  const onSocialLoginPress = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const redirectUrl =
        Platform.OS === "web"
          ? window.location.origin
          : AuthSession.makeRedirectUri({ scheme: "scopeuinativeclerk" });

      const { createdSessionId, signIn, signUp, setActive } =
        await startSSOFlow({
          strategy: getStrategy(),
          redirectUrl,
        });

      console.log("createdSessionId", createdSessionId);
      console.log("signIn", signIn);
      console.log("signUp", signUp);
      console.log("setActive", setActive);

      // Existing user with complete profile
      if (createdSessionId) {
        await setActive!({
          session: createdSessionId,
        });
        router.replace("/(protected)/(tabs)");
        return;
      }

      // New user signup - needs to complete profile
      if (signUp) {
        console.log("🆕 New user via Google OAuth");

        // Check if signup has missing requirements
        if (
          signUp.status === "missing_requirements" ||
          signUp.missingFields?.length > 0
        ) {
          console.log("Missing fields:", signUp.missingFields);
          // Redirect to complete account page where user will provide username
          router.replace("/auth/complete-your-account");
          return;
        }

        // If signup is complete, set the session
        if (signUp.createdSessionId) {
          await setActive!({ session: signUp.createdSessionId });
          router.replace("/(protected)/(tabs)");
          return;
        }
      }

      // Existing user trying to sign in
      if (signIn) {
        console.log("🔐 Existing user sign-in");
        if (signIn.createdSessionId) {
          await setActive!({ session: signIn.createdSessionId });
          router.replace("/(protected)/(tabs)");
          return;
        }
      }

      console.warn("Unexpected OAuth flow state");
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: colors.border,
        },
      ]}
      onPress={onSocialLoginPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={config.color} />
      ) : (
        <Ionicons name={config.icon} size={22} color={config.color} />
      )}
      <Text style={[styles.buttonText, { color: colors.text }]}>
        {config.text}
      </Text>
    </TouchableOpacity>
  );
};

export default SocialLoginButton;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
