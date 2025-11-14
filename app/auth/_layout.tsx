import { useAuth } from "@/contexts/AuthContext";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function AuthRoutesLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.id) {
      router.replace('/(protected)');
    }
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="(protected)" options={{ headerShown: false }} />
    </Stack>
  );
}
