import { useAuth, useSignUp, useUser } from "@clerk/clerk-expo";
import { Redirect, Stack, usePathname } from "expo-router";

export default function AuthRoutesLayout() {
  const { user } = useUser();
  const { signUp } = useSignUp();
  const pathName = usePathname();
  const { isSignedIn } = useAuth();

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
    return <Redirect href="/(home)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
