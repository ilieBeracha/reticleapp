import { useAuth } from "@/contexts/AuthContext";
import {
  Stack
} from "expo-router";

export default function AuthRoutesLayout() {
  const { user, loading } = useAuth();


  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="sign-in" />
    <Stack.Screen name="sign-up" />
    <Stack.Screen name="complete-your-account" />
  </Stack>;
}
