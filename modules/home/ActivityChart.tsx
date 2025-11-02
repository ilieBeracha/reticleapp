import { useColors } from "@/hooks/useColors";
import { Session } from "@/types/database";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface ActivityChartProps {
  sessions: Session[];
  isPersonalMode: boolean;
}

export function ActivityChart({
  sessions,
  isPersonalMode,
}: ActivityChartProps) {
  const colors = useColors();

  const today = new Date();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDay = today.getDay();

  // Calculate week activity from real sessions
  const weekActivity = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);

    const activity = weekDays.map((day, idx) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + idx);

      const daySessions = sessions.filter((session) => {
        const sessionDate = new Date(session.created_at);
        return sessionDate.toDateString() === dayDate.toDateString();
      });

      // Group by organization if in personal mode
      const orgBreakdown = isPersonalMode
        ? daySessions.reduce((acc, session) => {
            const orgId = session.organization_id || "personal";
            acc[orgId] = (acc[orgId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        : null;

      return {
        day,
        sessions: daySessions.length,
        isToday: idx === currentDay,
        orgBreakdown,
      };
    });

    return activity;
  }, [sessions, currentDay, isPersonalMode]);

  const maxSessions = Math.max(...weekActivity.map((d) => d.sessions || 1));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Weekly Activity
        </Text>
        {isPersonalMode && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            All workspaces
          </Text>
        )}
      </View>

      <View style={styles.chart}>
        {weekActivity.map((item, idx) => {
          const height =
            item.sessions === 0 ? 4 : (item.sessions / maxSessions) * 70 + 16;

          return (
            <View key={idx} style={styles.chartColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: item.isToday
                        ? colors.indigo
                        : item.sessions > 0
                        ? colors.blue
                        : colors.border,
                      opacity: item.sessions === 0 ? 0.2 : item.isToday ? 0.85 : 0.4,
                    },
                  ]}
                >
                  {item.sessions > 0 && (
                    <Text
                      style={[
                        styles.barText,
                        { color: item.isToday ? colors.background : colors.textMuted },
                      ]}
                    >
                      {item.sessions}
                    </Text>
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.dayText,
                  {
                    color: item.isToday ? colors.indigo : colors.textMuted,
                    opacity: item.isToday ? 0.85 : 0.45,
                    fontWeight: item.isToday ? "600" : "500",
                  },
                ]}
              >
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.4,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 100,
    paddingTop: 16,
    paddingHorizontal: 2,
  },
  chartColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "65%",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 4,
  },
  barText: {
    fontSize: 10,
    fontWeight: "600",
  },
  dayText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
