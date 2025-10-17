import { useThemeColor } from "@/hooks/useThemeColor";
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
  View,
  useColorScheme,
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
  const colorScheme = useColorScheme();

  // Get themed colors
  const textColor = useThemeColor({}, "buttonText");
  const borderColor = useThemeColor({}, "buttonBorder");
  const iconColor = useThemeColor({}, "text");

  const router = useRouter();
  const buttonText = () => {
    if (isLoading) {
      return "Loading...";
    }

    if (strategy === "facebook") {
      return "Continue with Facebook";
    } else if (strategy === "google") {
      return "Continue with Google";
    } else if (strategy === "apple") {
      return "Continue with Apple";
    }
  };

  const buttonIcon = () => {
    if (strategy === "facebook") {
      return <Ionicons name="logo-facebook" size={24} color={iconColor} />;
    } else if (strategy === "google") {
      return <Ionicons name="logo-google" size={24} color={iconColor} />;
    } else if (strategy === "apple") {
      return <Ionicons name="logo-apple" size={24} color={iconColor} />;
    }
  };

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
        router.replace("/(home)");
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
          router.replace("/(home)");
          return;
        }
      }

      // Existing user trying to sign in
      if (signIn) {
        console.log("🔐 Existing user sign-in");
        if (signIn.createdSessionId) {
          await setActive!({ session: signIn.createdSessionId });
          router.replace("/(home)");
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
      style={[styles.container, { borderColor }]}
      onPress={onSocialLoginPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        buttonIcon()
      )}
      <Text style={[styles.buttonText, { color: textColor }]}>
        {buttonText()}
      </Text>
      <View />
    </TouchableOpacity>
  );
};

export default SocialLoginButton;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
