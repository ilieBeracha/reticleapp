import { useColors } from "@/hooks/useColors";
import { Session } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface RecentSessionsProps {
  sessions: Session[];
  loading: boolean;
}

export function RecentSessions({ sessions, loading }: RecentSessionsProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={[styles.widgetCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Loading...
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={[styles.widgetCard, { backgroundColor: colors.card }]}>
          <View style={styles.iconWrapper}>
            <Ionicons
              name="calendar"
              size={20}
              color={colors.blue}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Calendar
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              No upcoming sessions
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.widgetCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <Ionicons
                name="calendar"
                size={20}
                color={colors.blue}
              />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Calendar
            </Text>
          </View>
          <View style={styles.sessionsList}>
            {sessions.slice(0, 3).map((session, index) => {
              const time = new Date(session.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });

              return (
                <View key={session.id} style={styles.sessionRow}>
                  <Text style={[styles.sessionTime, { color: colors.text }]}>
                    {time}
                  </Text>
                  <View style={styles.sessionDot} />
                  <Text style={[styles.sessionTitle, { color: colors.text }]}>
                    {session.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  widgetCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#3b82f620",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.6,
  },
  sessionsList: {
    gap: 16,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionTime: {
    fontSize: 15,
    fontWeight: "600",
    width: 40,
  },
  sessionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#000",
    opacity: 0.3,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.6,
    textAlign: "center",
  },
});
