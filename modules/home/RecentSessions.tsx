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
          <Text style={[styles.viewAll, { color: colors.indigo }]}>
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
            size={32}
            color={colors.textMuted}
            style={{ opacity: 0.4 }}
          />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No sessions yet
          </Text>
        </View>
      ) : (
        <View style={styles.sessionsList}>
          {sessions.map((session, index) => (
            <View
              key={session.id}
              style={[
                styles.sessionItem,
                {
                  backgroundColor: colors.card,
                  borderLeftColor: colors.blue,
                },
              ]}
            >
              <View
                style={[
                  styles.sessionIcon,
                  { backgroundColor: colors.blue + "15" },
                ]}
              >
                <Ionicons name="play-circle" size={20} color={colors.blue} />
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
                size={18}
                color={colors.textMuted}
              />
            </View>
          ))}
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  viewAll: {
    fontSize: 15,
    fontWeight: "600",
  },
  sessionsList: {
    gap: 12,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 12,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionContent: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
