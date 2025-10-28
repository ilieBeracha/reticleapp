import { useThemeColor } from "@/hooks/useThemeColor";
import { Session } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View } from "react-native";

interface RecentSessionsProps {
  sessions: Session[];
  loading: boolean;
}

export function RecentSessions({ sessions, loading }: RecentSessionsProps) {
  const text = useThemeColor({}, "text");
  const description = useThemeColor({}, "description");
  const border = useThemeColor({}, "border");
  const cardBackground = useThemeColor({}, "cardBackground");

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: text }]}>
        Recent Sessions
      </Text>
      {loading ? (
        <Text style={[styles.emptyText, { color: description }]}>
          Loading...
        </Text>
      ) : sessions.length === 0 ? (
        <Text style={[styles.emptyText, { color: description }]}>
          No sessions yet
        </Text>
      ) : (
        <View
          style={[
            styles.sessionsList,
            { backgroundColor: cardBackground, borderColor: border },
          ]}
        >
          {sessions.map((session, index) => (
            <View
              key={session.id}
              style={[
                styles.sessionItem,
                index > 0 && styles.sessionItemSeparator,
                { borderColor: border },
              ]}
            >
              <View style={styles.sessionContent}>
                <Text style={[styles.sessionTitle, { color: text }]}>
                  {session.name}
                </Text>
                <Text style={[styles.sessionDate, { color: description }]}>
                  {new Date(session.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={description} />
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  sessionsList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  sessionItemSeparator: {
    borderTopWidth: 1,
    opacity: 0.6,
  },
  sessionContent: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 15,
    paddingVertical: 20,
    fontWeight: "500",
    opacity: 0.8,
  },
});
