import { ThemedView } from "@/components/ThemedView";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Stats() {
  const colors = useColors();

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderLeftWidth: 4,
                borderLeftColor: colors.blue,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Total Sessions
              </Text>
              <Ionicons name="trophy-outline" size={20} color={colors.blue} />
            </View>
            <Text style={[styles.statValue, { marginTop: 12 }]}>0</Text>
            <View style={styles.statFooter}>
              <Ionicons name="arrow-up" size={14} color={colors.green} />
              <Text style={[styles.changeText, { color: colors.green }]}>
                0% from last week
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderLeftWidth: 4,
                borderLeftColor: colors.green,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Accuracy Rate
              </Text>
              <Ionicons
                name="analytics-outline"
                size={20}
                color={colors.green}
              />
            </View>
            <Text style={[styles.statValue, { marginTop: 12 }]}>0%</Text>
            <View style={styles.statFooter}>
              <Ionicons name="remove" size={14} color={colors.textMuted} />
              <Text style={[styles.changeText, { color: colors.textMuted }]}>
                No change
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderLeftWidth: 4,
                borderLeftColor: colors.orange,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Hours Trained
              </Text>
              <Ionicons name="time-outline" size={20} color={colors.orange} />
            </View>
            <Text style={[styles.statValue, { marginTop: 12 }]}>0h</Text>
            <View style={styles.statFooter}>
              <Ionicons name="remove" size={14} color={colors.textMuted} />
              <Text style={[styles.changeText, { color: colors.textMuted }]}>
                No data yet
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderLeftWidth: 4,
                borderLeftColor: colors.purple,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Current Streak
              </Text>
              <Ionicons name="flame-outline" size={20} color={colors.purple} />
            </View>
            <Text style={[styles.statValue, { marginTop: 12 }]}>0 days</Text>
            <View style={styles.statFooter}>
              <Ionicons name="remove" size={14} color={colors.textMuted} />
              <Text style={[styles.changeText, { color: colors.textMuted }]}>
                Start your streak
              </Text>
            </View>
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
  },
  statsGrid: {
    gap: 16,
  },
  statCard: {
    borderRadius: 12,
    padding: 20,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  changeText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
