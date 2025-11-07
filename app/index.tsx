
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLinkingURL } from 'expo-linking';
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function Index() {
  const { user } = useAuth();
  const url = useLinkingURL(); // Hook must be called at top level
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  useEffect(() => {
    async function checkForInvite() {
      // Check URL for invite link (format: reticle://invite?code=ABC123)
      if (url?.includes('invite?code=')) {
        const code = url.split('code=')[1]?.split('&')[0];
        if (code) {
          setInviteCode(code);
        }
      }

      setCheckingInvite(false);
    }

    checkForInvite();
  }, [url]);

  // Show nothing while checking for invite
  if (checkingInvite) {
    return null;
  }

  // If there's an invite code
  if (inviteCode) {
    if (user?.id) {
      // User is authenticated - go directly to accept invite
      return <Redirect href={`/(protected)/invite?token=${inviteCode}`} />;
    } else {
      // User not authenticated - save code and go to sign in
      AsyncStorage.setItem('pending_invite_code', inviteCode);
      return <Redirect href="/auth/sign-in" />;
    }
  }

  // Normal flow - no invite
  if (user && user.id) {
    return <Redirect href="/(protected)/(tabs)" />;
  } else {
    return <Redirect href="/auth/sign-in" />;
  }
}
