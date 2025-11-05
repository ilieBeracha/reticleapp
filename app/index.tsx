
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";

export default function Index() {
  const { user } = useAuth();

  if (user?.id) {
    return <Redirect href="/(protected)/(tabs)" />;
  } else {
    return <Redirect href="/auth/sign-in" />;
  }
}
