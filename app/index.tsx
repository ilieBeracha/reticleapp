import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const colors = useColors();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not authenticated - send to sign in
  if (!user) {
    return <Redirect href="/auth/sign-in" />;
  }

  // User is authenticated - send to app (regardless of org status)
  return <Redirect href="/(protected)/workspace" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
