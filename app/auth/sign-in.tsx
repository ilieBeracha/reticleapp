import { SignIn } from "@/modules/auth/SignIn";
import React from "react";
import { View } from "react-native";

export default function SignInPage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <SignIn />
    </View>
  );
}
