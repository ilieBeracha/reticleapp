import SocialLoginButton from "@/components/auth/SocialLoginButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

export function SocialButtons() {
  const { signInWithOAuth } = useAuth();
  const colors = useColors();
  const [googleLoading, setGoogleLoading] = useState(false);

  // Warm up browser on mount for better UX
  useEffect(() => {
    if (Platform.OS === 'ios') {
      WebBrowser.warmUpAsync();
    }
    return () => {
      if (Platform.OS === 'ios') {
        WebBrowser.coolDownAsync();
      }
    };
  }, []);

  const handleOAuthLogin = async (provider: 'google' | 'apple', forceAccountPicker = false) => {
    try {
      if (provider === 'google') setGoogleLoading(true);
      await signInWithOAuth(provider, forceAccountPicker);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      Alert.alert('Error', errorMessage);
    } finally {
      if (provider === 'google') setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Google Sign-In with integrated switch option */}
      <View style={[styles.googleContainer, { backgroundColor: '#DB443715', borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.googleMainBtn}
          onPress={() => handleOAuthLogin('google')}
          disabled={googleLoading}
          activeOpacity={0.7}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#DB4437" />
          ) : (
            <Ionicons name="logo-google" size={22} color="#DB4437" />
          )}
          <Text style={[styles.googleMainText, { color: colors.text }]}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        <View style={[styles.googleDivider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          style={styles.googleSwitchBtn}
          onPress={() => handleOAuthLogin('google', true)}
          disabled={googleLoading}
          activeOpacity={0.6}
        >
          <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.switchHint, { color: colors.textMuted }]}>
        Tap the arrow to use a different account
      </Text>

      <SocialLoginButton
        onPress={() => handleOAuthLogin('apple')}
        strategy="apple"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
  },

  // Google container with main button + switch button
  googleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  googleMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  googleMainText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  googleDivider: {
    width: 1,
    height: 24,
  },
  googleSwitchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  switchHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 4,
  },
});
