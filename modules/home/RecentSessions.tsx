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
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Recent Sessions
        </Text>
        {sessions.length > 0 && (
          <Text style={[styles.viewAll, { color: colors.textMuted }]}>
            View All
          </Text>
        )}
      </View>
      {loading ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Loading...
        </Text>
      ) : sessions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons
            name="calendar-outline"
            size={28}
            color={colors.textMuted}
            style={{ opacity: 0.3 }}
          />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No sessions yet
          </Text>
        </View>
      ) : (
        <View style={styles.sessionsList}>
          {sessions.map((session, index) => {
            // Subtle color rotation for elegance
            const accentColor = index % 3 === 0 ? colors.blue : index % 3 === 1 ? colors.purple : colors.green;

            return (
              <View
                key={session.id}
                style={[
                  styles.sessionItem,
                  {
                    backgroundColor: colors.card,
                    borderLeftWidth: 2,
                    borderLeftColor: accentColor + "35",
                  },
                ]}
              >
                <View
                  style={[
                    styles.sessionIcon,
                    { backgroundColor: accentColor + "15" },
                  ]}
                >
                  <Ionicons name="play-circle" size={17} color={accentColor} />
                </View>
                <View style={styles.sessionContent}>
                  <Text style={[styles.sessionTitle, { color: colors.text }]}>
                    {session.name}
                  </Text>
                  <Text
                    style={[styles.sessionDate, { color: colors.textMuted }]}
                  >
                    {new Date(session.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={accentColor}
                  style={{ opacity: 0.3 }}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.6,
  },
  sessionsList: {
    gap: 8,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  sessionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionContent: {
    flex: 1,
    gap: 3,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  sessionDate: {
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.5,
  },
});
