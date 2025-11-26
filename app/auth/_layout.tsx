import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function AuthRoutesLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (user?.id) {
      router.replace('/(protected)/workspace');
    }
  }, [user, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
