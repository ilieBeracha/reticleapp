import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { Redirect, Stack } from "expo-router";

export default function AuthRoutesLayout() {
  const { user, loading, transitioning } = useAuth();
  const colors = useColors();

  // Show loading during auth check or transitions
  if (loading || transitioning) {
    return <LoadingScreen />;
  }

  // If user is already authenticated, redirect to app
  // AuthContext will handle the actual navigation
  if (user?.id) {
    return <Redirect href="/(protected)/(tabs)" />;
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
