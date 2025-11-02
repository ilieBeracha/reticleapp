import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface WeeklyStatsProps {
  totalSessions: number;
  totalAllTime: number;
  isPersonalMode: boolean;
  organizationName?: string;
}

export function WeeklyStats({
  totalSessions,
  totalAllTime,
  isPersonalMode,
  organizationName,
}: WeeklyStatsProps) {
  const colors = useColors();

  // Add streak calculation
  const weekStreak = totalSessions > 0 ? Math.min(totalSessions, 7) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>This Week</Text>
        <View
          style={[
            styles.contextBadge,
            { backgroundColor: colors.purple + "08" },
          ]}
        >
          <Ionicons
            name={isPersonalMode ? "person" : "people"}
            size={12}
            color={colors.purple}
            style={{ opacity: 0.7 }}
          />
          <Text
            style={[
              styles.contextBadgeText,
              { color: colors.purple },
            ]}
          >
            {isPersonalMode ? "Personal" : organizationName || "Team"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.blue + "12" }]}>
            <Ionicons name="calendar" size={17} color={colors.blue} style={{ opacity: 0.8 }} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              This Week
            </Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.green + "12" }]}>
            <Ionicons
              name={isPersonalMode ? "trophy" : "people"}
              size={17}
              color={colors.green}
              style={{ opacity: 0.8 }}
            />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {totalAllTime}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              All Time
            </Text>
          </View>
        </View>
      </View>

      {weekStreak > 0 && (
        <View style={styles.streakContainer}>
          <View style={styles.streakDots}>
            {[...Array(7)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.streakDot,
                  {
                    backgroundColor: i < weekStreak ? colors.orange : colors.border,
                    opacity: i < weekStreak ? 0.7 : 0.25,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.streakText, { color: colors.textMuted }]}>
            {weekStreak === 7 ? "Perfect week" : `${weekStreak} day streak`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  contextBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.75,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    gap: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.5,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  streakDots: {
    flexDirection: "row",
    gap: 3,
  },
  streakDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  streakText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.5,
  },
});
