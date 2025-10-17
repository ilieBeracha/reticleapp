import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, View } from "react-native";

export function SwitcherHeader() {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");

  return (
    <View style={styles.header}>
      <ThemedText style={[styles.title, { color: textColor }]}>
        Switch Workspace
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
        Choose your active workspace
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
});
