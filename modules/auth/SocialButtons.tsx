import SocialLoginButton from "@/components/SocialLoginButton";
import { useAuth } from "@/contexts/AuthContext";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

export function SocialButtons() {
  const { signInWithOAuth } = useAuth();

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

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      await signInWithOAuth(provider);
      Alert.alert('Success', 'Signed in successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <SocialLoginButton
        onPress={() => handleOAuthLogin('google')}
        strategy="google"
      />
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
});
