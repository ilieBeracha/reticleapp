import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View } from "react-native";

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
            {
              backgroundColor: isPersonalMode
                ? colors.border
                : colors.tint + "15",
            },
          ]}
        >
          <Ionicons
            name={isPersonalMode ? "person" : "people"}
            size={14}
            color={isPersonalMode ? colors.description : colors.tint}
          />
          <Text
            style={[
              styles.contextBadgeText,
              {
                color: isPersonalMode ? colors.description : colors.tint,
              },
            ]}
          >
            {isPersonalMode ? "Personal" : organizationName || "Team"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {/* This Week Card */}
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.tint + "10",
              borderColor: colors.tint + "30",
            },
          ]}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.tint }]}>
            <Ionicons name="calendar" size={20} color="#FFF" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.description }]}>
              This Week
            </Text>
          </View>
          {totalSessions > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.tint }]}>
              <Text style={styles.badgeText}>+{totalSessions}</Text>
            </View>
          )}
        </View>

        {/* All Time Card */}
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.statIcon, { backgroundColor: colors.border }]}>
            <Ionicons
              name={isPersonalMode ? "trophy" : "people"}
              size={20}
              color={colors.text}
            />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {totalAllTime}
            </Text>
            <Text style={[styles.statLabel, { color: colors.description }]}>
              {isPersonalMode ? "All Personal" : "All Team"}
            </Text>
          </View>
        </View>
      </View>

      {/* Streak Indicator */}
      {weekStreak > 0 && (
        <View style={styles.streakContainer}>
          <View style={styles.streakDots}>
            {[...Array(7)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.streakDot,
                  {
                    backgroundColor:
                      i < weekStreak ? colors.tint : colors.border,
                    opacity: i < weekStreak ? 1 : 0.3,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.streakText, { color: colors.description }]}>
            {weekStreak === 7 ? "Perfect week!" : `${weekStreak} day streak`}
          </Text>
        </View>
      )}

      {isPersonalMode && totalAllTime > 0 && (
        <View
          style={[styles.infoBox, { backgroundColor: colors.border + "20" }]}
        >
          <Ionicons
            name="information-circle"
            size={16}
            color={colors.description}
          />
          <Text style={[styles.infoText, { color: colors.description }]}>
            Showing sessions from all your organizations
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
    marginBottom: 4,
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  contextBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    gap: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: -4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    opacity: 0.8,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  streakDots: {
    flexDirection: "row",
    gap: 4,
  },
  streakDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
