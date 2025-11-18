import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();
  const colors = useColors();
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (user && user.id) {
    return <Redirect href="/(protected)" />;
  }

  return <Redirect href="/auth/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
