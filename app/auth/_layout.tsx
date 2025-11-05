import { useAuth, useSignUp, useUser } from "@clerk/clerk-expo";
import { Redirect, Stack, usePathname } from "expo-router";

export default function AuthRoutesLayout() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signUp } = useSignUp();
  const pathName = usePathname();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  console.log("authLoaded", authLoaded);
  console.log("userLoaded", userLoaded);
  console.log("isSignedIn", isSignedIn);
  console.log("signUp", signUp);
  console.log("pathName", pathName);

  // Wait for Clerk to load before making routing decisions
  if (!authLoaded || !userLoaded) {
    return null;
  }

  // Handle incomplete signup (no session yet, but signUp exists)
  if (!isSignedIn && signUp && signUp.status === "missing_requirements") {
    if (pathName !== "/auth/complete-your-account") {
      return <Redirect href="/auth/complete-your-account" />;
    }
  }

  // User is signed in but hasn't completed onboarding
  if (isSignedIn && user?.unsafeMetadata?.onboarding_completed !== true) {
    if (pathName !== "/auth/complete-your-account") {
      return <Redirect href="/auth/complete-your-account" />;
    }
  }

  // User is signed in and has completed onboarding
  if (isSignedIn && user?.unsafeMetadata?.onboarding_completed === true) {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
