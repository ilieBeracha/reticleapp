import { useColors } from "@/hooks/useColors";
import { Session } from "@/types/database";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface ActivityChartProps {
  sessions: Session[];
  isPersonalMode: boolean;
}

export function ActivityChart({ sessions, isPersonalMode }: ActivityChartProps) {
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
          <Text style={[styles.subtitle, { color: colors.description }]}>
            Combined from all workspaces
          </Text>
        )}
      </View>

      <View style={styles.chart}>
        {weekActivity.map((item, idx) => {
          const height =
            item.sessions === 0 ? 4 : (item.sessions / maxSessions) * 80 + 20;

          return (
            <View key={idx} style={styles.chartColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: item.isToday
                        ? colors.tint
                        : item.sessions > 0
                        ? isPersonalMode
                          ? colors.tint + "50"
                          : colors.tint + "35"
                        : colors.border,
                    },
                  ]}
                >
                  {item.sessions > 0 && (
                    <Text
                      style={[
                        styles.barText,
                        { color: item.isToday ? "#FFF" : colors.text },
                      ]}
                    >
                      {item.sessions}
                    </Text>
                  )}
                </View>
                {item.isToday && (
                  <View
                    style={[
                      styles.todayIndicator,
                      { backgroundColor: colors.tint },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.dayText,
                  {
                    color: item.isToday ? colors.tint : colors.description,
                    fontWeight: item.isToday ? "700" : "500",
                  },
                ]}
              >
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend for Personal Mode */}
      {isPersonalMode && sessions.length > 0 && (
        <View style={[styles.legend, { borderColor: colors.border }]}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.tint + "50" },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.description }]}>
              Personal Sessions
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.tint }]}
            />
            <Text style={[styles.legendText, { color: colors.description }]}>
              Today
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "400",
    opacity: 0.7,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
    paddingTop: 20,
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
    width: "70%",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 4,
  },
  todayIndicator: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  barText: {
    fontSize: 9,
    fontWeight: "700",
  },
  dayText: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.7,
  },
});