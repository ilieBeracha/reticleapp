import { useColors } from "@/hooks/ui/useColors";
import { SignIn } from "@/modules/auth/SignIn";
import { View } from "react-native";

export default function SignInPage() {
  const colors = useColors();
  return (
    <View style={{backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <SignIn />
    </View>
  );
}
