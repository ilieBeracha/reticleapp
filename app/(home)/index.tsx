import { SignOutButton } from "@/components/SignOutButton";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { Text, View } from "react-native";

export default function Page() {
  const { user } = useUser();

  useEffect(() => {
    console.log("user", user);
  }, [user]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <SignedIn>
        <Text>Hello {user?.emailAddresses[0].emailAddress}</Text>
        <SignOutButton />
      </SignedIn>
    </View>
  );
}
