import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export function SignOutButton() {
  const { signOut } = useAuth();
  const colors = useColors();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/auth/sign-in");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <TouchableOpacity onPress={handleSignOut}>
      <Text style={[styles.text, { color: colors.red }]}>Sign out</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: "600",
  },
});