import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SignInHeader() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* App Icon/Logo */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.indigo + "15" },
        ]}
      >
        <Ionicons name="shield-checkmark" size={32} color={colors.indigo} />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        Welcome to Scopes
      </Text>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]}>
        Choose your preferred sign-in method to get started
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 22,
  },
});
