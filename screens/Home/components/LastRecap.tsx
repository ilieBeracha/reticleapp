import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function LastRecap() {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

  const today = new Date();
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1;

  // Mock last session data
  const lastSession = {
    shots: 24,
    accuracy: 92,
    distance: "100m",
    grouping: '2.3"',
  };

  return (
    <View style={styles.container}>
      {/* Last Session Header */}

      {/* Week Calendar */}
      <View style={styles.weekSection}>
        <View style={styles.weekCalendar}>
          {weekDays.map((day, idx) => {
            const isToday = idx === currentDay;
            const dayNumber = today.getDate() - currentDay + idx;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: isToday ? tintColor : cardBackground,
                    borderColor: isToday ? tintColor : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    { color: isToday ? "#FFFFFF" : mutedColor },
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isToday ? "#FFFFFF" : textColor },
                  ]}
                >
                  {dayNumber}
                </Text>
                {isToday && (
                  <Ionicons name="radio-button-on" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  highlightCard: {
    borderWidth: 1.5,
  },
  accuracyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  weekSection: {
    gap: 12,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  weekCalendar: {
    flexDirection: "row",
    gap: 8,
  },
  dayButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  actionsContainer: {
    gap: 12,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    minHeight: 140,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  actionSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  garminCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  garminLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  garminIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  garminTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  garminSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  connectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  connectText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
