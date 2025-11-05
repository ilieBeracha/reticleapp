import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface ActivityItem {
  type: string;
  count: number;
  percentage: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface ActivityBreakdownProps {
  isPersonalMode: boolean;
}

export function ActivityBreakdown({ isPersonalMode }: ActivityBreakdownProps) {
  const colors = useColors();

  // Mock data - replace with real data from API
  const activities: ActivityItem[] = [
    {
      type: "Range Training",
      count: 45,
      percentage: 45,
      icon: "barbell",
      color: colors.blue,
    },
    {
      type: "Tactical Drills",
      count: 30,
      percentage: 30,
      icon: "shield-checkmark",
      color: colors.purple,
    },
    {
      type: "Team Exercises",
      count: 15,
      percentage: 15,
      icon: "people",
      color: colors.green,
    },
    {
      type: "Solo Practice",
      count: 10,
      percentage: 10,
      icon: "person",
      color: colors.orange,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Activity Breakdown
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {activities.map((activity, index) => (
            <View key={index} style={styles.progressRow}>
              <View style={styles.progressHeader}>
                <View style={styles.activityInfo}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: activity.color + "15" },
                    ]}
                  >
                    <Ionicons
                      name={activity.icon}
                      size={16}
                      color={activity.color}
                    />
                  </View>
                  <Text style={[styles.activityLabel, { color: colors.text }]}>
                    {activity.type}
                  </Text>
                </View>
                <Text
                  style={[styles.activityCount, { color: colors.textMuted }]}
                >
                  {activity.count}
                </Text>
              </View>

              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.border + "40" },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${activity.percentage}%`,
                      backgroundColor: activity.color,
                      opacity: 0.8,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  card: {
    borderRadius: 14,
    padding: 18,
  },
  progressContainer: {
    gap: 16,
  },
  progressRow: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  activityCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
});
