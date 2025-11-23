import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";

export default function AuthRoutesLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (user && user.id) {
      router.replace('/(protected)/workspace');
    }
  }, [user]);

  if (loading) {
    return <ActivityIndicator size="large" color={colors.text} />;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
