import { useAuth } from "@/contexts/AuthContext";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function AuthRoutesLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If already authenticated, send user to the app
  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/(protected)/(tabs)");
    }
  }, [user, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="callback" />
      <Stack.Screen name="complete-your-account" />
    </Stack>
  );
}
