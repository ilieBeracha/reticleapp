import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // If user is authenticated, redirect to app
    if (user) {
      console.log('OAuth callback: User authenticated, redirecting...');
      router.replace('/(protected)/home');
    } else {
      // If not authenticated after callback, something went wrong
      console.log('OAuth callback: No user found');
      setTimeout(() => {
        router.replace('/auth/sign-in');
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" />
      <ThemedText style={styles.text}>Completing sign in...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  text: {
    fontSize: 16,
    opacity: 0.7,
  },
});

