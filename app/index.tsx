
import { useAuth } from "@/contexts/AuthContext";
import * as Linking from 'expo-linking';
import { Redirect } from "expo-router";

export default function Index() {
  const { user } = useAuth();
  
  if (Linking.useLinkingURL()?.includes('invite/')) {
    const token = Linking.useLinkingURL()?.split('invite/')[1].split('?')[0]
    return <Redirect href={`/(protected)/invite?token=${token}`} />;
}

  if (user && user.id) {
    return <Redirect href="/(protected)/(tabs)/stats" />;
  } else {
    return <Redirect href="/auth/sign-in" />;
  }
}
