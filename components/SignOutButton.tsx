import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
    <>
      {/* Divider above logout */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignOut}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.red} />
        <Text style={[styles.text, { color: colors.red }]}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginVertical: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
  },
});