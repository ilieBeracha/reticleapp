import { SignIn } from "@/modules/auth/SignIn";

export default function SignInPage( { inviteCode }: { inviteCode: string } ) {
  
  return <SignIn inviteCode={inviteCode ?? undefined as string | undefined} />;
}
