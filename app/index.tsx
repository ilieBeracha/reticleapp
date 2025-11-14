import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();
  
  if(loading) return <ActivityIndicator size="large" />;

  if (user && user.id) {
    return <Redirect href="/(protected)" />;
  } else {  // If user is not authenticated, redirect to sign in
    return <Redirect href="/auth/sign-in" />;
  }
}
