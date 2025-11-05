import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface MemberStats {
  id: string;
  name: string;
  sessions: number;
  accuracy: number;
  rank: number;
}

interface MemberComparisonProps {
  currentUserId?: string;
}

export function MemberComparison({ currentUserId }: MemberComparisonProps) {
  const colors = useColors();

  // Mock data - replace with real data from API
  const topMembers: MemberStats[] = [
    { id: "1", name: "John Doe", sessions: 85, accuracy: 94, rank: 1 },
    { id: "2", name: "Jane Smith", sessions: 78, accuracy: 92, rank: 2 },
    { id: "3", name: "Mike Johnson", sessions: 72, accuracy: 89, rank: 3 },
    { id: "4", name: "You", sessions: 65, accuracy: 87, rank: 4 },
    { id: "5", name: "Sarah Wilson", sessions: 58, accuracy: 85, rank: 5 },
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: "trophy" as const, color: colors.yellow };
    if (rank === 2) return { icon: "medal" as const, color: colors.textMuted };
    if (rank === 3) return { icon: "medal" as const, color: colors.orange };
    return { icon: "person" as const, color: colors.textMuted };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Team Leaderboard
        </Text>
        <Ionicons name="people" size={20} color={colors.textMuted} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {topMembers.map((member, index) => {
          const isCurrentUser = member.name === "You" || member.id === currentUserId;
          const rankData = getRankIcon(member.rank);

          return (
            <View
              key={member.id}
              style={[
                styles.memberRow,
                index !== topMembers.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border + "30",
                },
                isCurrentUser && {
                  backgroundColor: colors.indigo + "08",
                  marginHorizontal: -12,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                },
              ]}
            >
              <View style={styles.memberInfo}>
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: rankData.color + "15" },
                  ]}
                >
                  <Ionicons name={rankData.icon} size={16} color={rankData.color} />
                </View>
                <View style={styles.memberDetails}>
                  <Text
                    style={[
                      styles.memberName,
                      { color: colors.text },
                      isCurrentUser && { fontWeight: "600" },
                    ]}
                  >
                    {member.name}
                    {isCurrentUser && " (You)"}
                  </Text>
                  <Text style={[styles.memberSessions, { color: colors.textMuted }]}>
                    {member.sessions} sessions
                  </Text>
                </View>
              </View>
              <View style={styles.accuracyBadge}>
                <Text style={[styles.accuracyText, { color: colors.green }]}>
                  {member.accuracy}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  header: {
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
  card: {
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberDetails: {
    gap: 3,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
  },
  memberSessions: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.6,
  },
  accuracyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  accuracyText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
