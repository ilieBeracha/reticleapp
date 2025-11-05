
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

export default function Index() {
  const { user } = useAuth();
  const url = Linking.useURL();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkForInviteCode();
  }, [url]);

  useEffect(() => {
    // Check for pending invite when user signs in
    if (user?.id) {
      checkPendingInvite();
    }
  }, [user?.id]);

  const checkForInviteCode = async () => {
    console.log("🔍 Checking URL for invite code:", url);
    
    // Check deep link for invite code
    if (url?.includes("invite?code=") || url?.includes("invite/")) {
      const code = url.includes("code=")
        ? url.split("code=")[1]?.split("&")[0]
        : url.split("invite/")[1]?.split("?")[0];
        
      if (code) {
        console.log("✅ Found invite code:", code);
        setInviteCode(code);
      }
    }
    
    setReady(true);
  };

  const checkPendingInvite = async () => {
    try {
      const pendingCode = await AsyncStorage.getItem("pending_invite_code");
      if (pendingCode) {
        console.log("✅ Found pending invite code:", pendingCode);
        setInviteCode(pendingCode);
        await AsyncStorage.removeItem("pending_invite_code");
      }
    } catch (error) {
      console.error("Error checking pending invite:", error);
    }
  };

  // Wait for initial check
  if (!ready) {
    console.log("⏳ Not ready yet...");
    return null;
  }

  console.log("🎯 Routing decision:", { 
    hasUser: !!user?.id, 
    hasInviteCode: !!inviteCode,
    inviteCode 
  });

  // If user is authenticated
  if (user && user.id) {
    if (inviteCode) {
      console.log("→ Redirecting to invite acceptance");
      return <Redirect href={`/(protected)/invite?code=${inviteCode}`} />;
    }
    console.log("→ Redirecting to main app");
    return <Redirect href="/(protected)/(tabs)/stats" />;
  }

  // If user is NOT authenticated
  if (inviteCode) {
    console.log("→ Redirecting to sign-in with invite code");
    return <Redirect href={`/auth/sign-in?inviteCode=${inviteCode}`} />;
  }

  console.log("→ Redirecting to sign-in (default)");
  return <Redirect href="/auth/sign-in" />;
}
