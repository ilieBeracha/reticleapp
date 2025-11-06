import { useColors } from "@/hooks/ui/useColors";
import { SessionStats } from "@/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface RecentSessionsProps {
  sessions: SessionStats[];
  loading: boolean;
}

export function RecentSessions({ sessions, loading }: RecentSessionsProps) {
  const colors = useColors();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.widgetCard, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.blue + "20" }]}>
            <Ionicons name="calendar-outline" size={22} color={colors.blue} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Upcoming Sessions
            </Text>
            {!loading && sessions.length > 0 && (
              <Text style={[styles.cardCount, { color: colors.textMuted }]}>
                {sessions.length} scheduled
              </Text>
            )}
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.blue} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading sessions...
            </Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.blue + "10" }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.blue} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Upcoming Sessions
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Create a new session to get started
            </Text>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {sessions.slice(0, 3).map((session, index) => {
              const date = formatDate(session.created_at);
              const time = formatTime(session.created_at);
              const isLast = index === Math.min(sessions.length, 3) - 1;

              return (
                <View key={session.id}>
                  <View style={styles.sessionRow}>
                    {/* Time Badge */}
                    <View style={[styles.timeBadge, { backgroundColor: colors.blue + "15", borderColor: colors.blue + "30" }]}>
                      <Text style={[styles.timeText, { color: colors.blue }]}>
                        {time}
                      </Text>
                    </View>

                    {/* Session Info */}
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                        {session.name}
                      </Text>
                      <View style={styles.sessionMeta}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
                          {date}
                        </Text>
                      </View>
                    </View>

                    {/* Indicator */}
                    <View style={[styles.statusDot, { backgroundColor: colors.blue }]} />
                  </View>
                  
                  {!isLast && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  widgetCard: {
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.08)",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  cardCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 200,
  },
  sessionsList: {
    gap: 0,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  timeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionDate: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    marginLeft: 84,
    opacity: 0.5,
  },
});

