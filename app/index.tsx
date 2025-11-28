import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";

export default function Index() {
  const { user, loading: authLoading, transitioning } = useAuth();

  // Show loading while checking auth or during transitions
  if (authLoading || transitioning) {
    return <LoadingScreen />;
  }

  // Not authenticated - send to sign in
  if (!user) {
    return <Redirect href="/auth/sign-in" />;
  }

  // User is authenticated - send to app (regardless of org status)
  return <Redirect href="/(protected)/personal" />;
}
