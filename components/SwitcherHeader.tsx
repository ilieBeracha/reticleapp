import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, Text, View } from "react-native";

export function SwitcherHeader() {
  const colors = useColors();

  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>Workspaces</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Switch between your personal and organization accounts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 20,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: -0.1,
    opacity: 0.8,
  },
});
