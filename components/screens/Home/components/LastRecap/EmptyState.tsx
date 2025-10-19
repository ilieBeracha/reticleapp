import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  type: "no-organization" | "no-sessions" | "loading";
  isPersonalMode?: boolean;
}

export function EmptyState({ type, isPersonalMode = false }: EmptyStateProps) {
  const colors = useColors();

  if (type === "loading") {
    return (
      <View style={styles.container}>
        <View style={[styles.icon, { backgroundColor: colors.border }]}>
          <Ionicons name="hourglass" size={48} color={colors.description} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Loading sessions...
        </Text>
        <Text style={[styles.description, { color: colors.description }]}>
          Fetching your training data
        </Text>
      </View>
    );
  }

  if (type === "no-sessions") {
    return (
      <View style={styles.container}>
        <View style={[styles.icon, { backgroundColor: colors.tint + "20" }]}>
          <Ionicons name="golf" size={48} color={colors.tint} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          No sessions yet
        </Text>
        <Text style={[styles.description, { color: colors.description }]}>
          {isPersonalMode
            ? "Start your first personal training session"
            : "Start your first team training session"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.border }]}>
        <Ionicons
          name="person-circle-outline"
          size={48}
          color={colors.description}
        />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>
        Welcome to Scope
      </Text>
      <Text style={[styles.description, { color: colors.description }]}>
        Create personal sessions or join an organization to track team sessions
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 18,
    opacity: 0.8,
  },
});