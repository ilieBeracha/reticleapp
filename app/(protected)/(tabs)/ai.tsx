import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AIPage() {
  const colors = useColors();

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyState}>
          <View style={styles.emptyContent}>
            <Ionicons
              name="sparkles-outline"
              size={64}
              color={colors.textMuted}
              style={{ opacity: 0.3 }}
            />
            <ThemedText style={[styles.emptyTitle, { marginTop: 24 }]}>
              AI Features Coming Soon
            </ThemedText>
            <ThemedText
              style={[
                styles.emptyDescription,
                { color: colors.textMuted, marginTop: 8 },
              ]}
            >
              Intelligent features to enhance your experience are currently in
              development
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
