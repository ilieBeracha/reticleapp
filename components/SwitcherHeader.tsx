import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, View } from "react-native";

export function SwitcherHeader() {
  const textColor = useThemeColor({}, "text");

  return (
    <View style={styles.header}>
      <ThemedText style={[styles.title, { color: textColor }]}>
        Workspaces
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
});
