import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity
} from "react-native";

const SocialLoginButton = ({
  strategy,
  onPress,
}: {
  strategy: "facebook" | "google" | "apple";
  onPress: () => void | Promise<void>;
}) => {

  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();

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
  
  const handlePress = async () => {
    try {
      setIsLoading(true);
      await onPress();
    } catch (error: any) {
      console.error('Social login button error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: colors.border,
        },
      ]}
      onPress={handlePress}
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
