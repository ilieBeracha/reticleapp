import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text, View } from "react-native";

export function SignInHeader() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        Welcome to Reticle Stats
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
