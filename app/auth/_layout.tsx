import { useAuth } from "@/contexts/AuthContext";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function AuthRoutesLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If already authenticated, send user to the app
  useEffect(() => {
    if (user) {
      router.replace("/(protected)/(tabs)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return ;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="callback" />
      <Stack.Screen name="complete-your-account" />
    </Stack>
  );
}
