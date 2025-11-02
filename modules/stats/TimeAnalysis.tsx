import { useColors } from "@/hooks/useColors";
import { StyleSheet, Text, View } from "react-native";

interface TimeAnalysisProps {
  isPersonalMode: boolean;
}

export function TimeAnalysis({ isPersonalMode }: TimeAnalysisProps) {
  const colors = useColors();

  // Mock data - replace with real data
  const weekData = [
    { day: "Mon", hours: 2.5 },
    { day: "Tue", hours: 3.2 },
    { day: "Wed", hours: 1.8 },
    { day: "Thu", hours: 2.9 },
    { day: "Fri", hours: 3.5 },
    { day: "Sat", hours: 4.1 },
    { day: "Sun", hours: 2.2 },
  ];

  const maxHours = Math.max(...weekData.map((d) => d.hours));
  const totalHours = weekData.reduce((sum, d) => sum + d.hours, 0);
  const avgHours = totalHours / weekData.length;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Weekly Training Time
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Stats Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {totalHours.toFixed(1)}h
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Total
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {avgHours.toFixed(1)}h
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Daily Avg
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {maxHours.toFixed(1)}h
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Peak
            </Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chart}>
          {weekData.map((item, index) => {
            const height = (item.hours / maxHours) * 100;
            const isToday = index === 5; // Saturday for demo

            return (
              <View key={index} style={styles.barColumn}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${height}%`,
                        backgroundColor: isToday ? colors.indigo : colors.blue,
                        opacity: isToday ? 0.9 : 0.5,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.barValue,
                        {
                          color: isToday ? "#FFFFFF" : colors.text,
                          fontSize: 9,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {item.hours.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isToday ? colors.indigo : colors.textMuted,
                      fontWeight: isToday ? "600" : "500",
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
    gap: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.6,
  },
  divider: {
    width: 1,
    height: 30,
    opacity: 0.3,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
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
    minHeight: 20,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "600",
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});
