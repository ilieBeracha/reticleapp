import { SignIn } from "@/modules/auth/SignIn";
import { useLocalSearchParams } from "expo-router";

export default function SignInPage() {
  const { inviteCode } = useLocalSearchParams<{ inviteCode?: string }>();
  
  return <SignIn inviteCode={inviteCode} />;
}
