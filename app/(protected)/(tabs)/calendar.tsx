import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Calendar() {
  const colors = useColors();

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyState}>
          <View style={styles.emptyContent}>
            <Ionicons name="calendar-outline" size={64} color={colors.textMuted} style={{ opacity: 0.3 }} />
            <ThemedText style={[styles.emptyTitle, { marginTop: 24 }]}>
              No events scheduled
            </ThemedText>
            <ThemedText
              style={[
                styles.emptyDescription,
                { color: colors.textMuted, marginTop: 8 },
              ]}
            >
              Your upcoming events and schedules will appear here
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyContent: {
    alignItems: "center",
    maxWidth: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
