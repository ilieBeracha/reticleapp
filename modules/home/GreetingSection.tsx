import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { sessionsStore } from "@/store/sessionsStore";
import { Session } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

interface GreetingSectionProps {
  userName: string;
  organizationName?: string;
  isPersonalWorkspace?: boolean;
}

export function GreetingSection({
  isPersonalWorkspace = false,
}: GreetingSectionProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, allOrgs, memberships } = useOrganizationsStore();
  const { sessions } = useStore(sessionsStore);

  const currentHour = new Date().getHours();
  let greeting = "Good Morning";
  if (currentHour >= 12 && currentHour < 17) greeting = "Good Afternoon";
  if (currentHour >= 17) greeting = "Good Evening";

  // Get current organization details
  const currentOrg = selectedOrgId
    ? allOrgs.find((org) => org.id === selectedOrgId)
    : null;

  // Get user's role in current org
  const userMembership = memberships?.find(
    (m) => m.user_id === user?.id && m.org_id === selectedOrgId
  );

  // Calculate meaningful stats
  const now = new Date();
  const thisMonth = sessions.filter((s: Session) => {
    const sessionDate = new Date(s.created_at);
    return (
      sessionDate.getMonth() === now.getMonth() &&
      sessionDate.getFullYear() === now.getFullYear() &&
      s.organization_id === selectedOrgId
    );
  }).length;

  const lastWeek = sessions.filter((s: Session) => {
    const sessionDate = new Date(s.created_at);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return sessionDate >= weekAgo && s.organization_id === selectedOrgId;
  }).length;

  const totalMembers = memberships?.length || 0;
  const commanders = memberships?.filter((m) => m.role === "commander").length || 0;

  // Last session info
  const lastSession = sessions
    .filter((s: Session) => s.organization_id === selectedOrgId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const lastSessionDaysAgo = lastSession
    ? Math.floor(
        (now.getTime() - new Date(lastSession.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Today's date
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      {/* Minimal Date */}
      <Text style={[styles.dateText, { color: colors.textMuted }]}>{today}</Text>

      {/* Profile Picture - Subtle */}
      {user?.user_metadata?.avatar_url ? (
        <Image
          source={{ uri: user.user_metadata.avatar_url }}
          style={styles.profileImage}
        />
      ) : (
        <View
          style={[
            styles.profilePlaceholder,
            { backgroundColor: colors.border },
          ]}
        >
          <Ionicons name="person" size={26} color={colors.textMuted} />
        </View>
      )}

      {/* Greeting - Clean Typography */}
      <Text style={[styles.greeting, { color: colors.description }]}>{greeting}</Text>
      <Text style={[styles.userName, { color: colors.text }]}>
        {user?.user_metadata?.full_name || "User"}
      </Text>

      {/* Organization Context - Minimal */}
      {!isPersonalWorkspace && currentOrg && (
        <View style={styles.orgSection}>
          {/* Org Title Line */}
          <View style={styles.orgTitleRow}>
            <Text style={[styles.orgName, { color: colors.text }]}>
              {currentOrg.name}
            </Text>
            {userMembership && (
              <Text style={[styles.roleText, { color: colors.textMuted }]}>
                {userMembership.role}
              </Text>
            )}
          </View>

          {/* Subtle Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Clean Story Insights */}
          <View style={styles.insights}>
            {/* Team Composition */}
            <Text style={[styles.insightText, { color: colors.description }]}>
              {totalMembers === 1
                ? "Solo training workspace"
                : commanders > 1
                ? `Leading ${totalMembers - commanders} members with ${
                    commanders - 1
                  } other ${commanders === 2 ? "commander" : "commanders"}`
                : `Training with ${totalMembers - 1} ${
                    totalMembers === 2 ? "teammate" : "teammates"
                  }`}
            </Text>

            {/* Recent Activity */}
            {lastSession && lastSessionDaysAgo !== null && (
              <Text style={[styles.insightText, { color: colors.description }]}>
                {lastSessionDaysAgo === 0
                  ? "Active today"
                  : lastSessionDaysAgo === 1
                  ? "Last active yesterday"
                  : lastSessionDaysAgo <= 3
                  ? `Last active ${lastSessionDaysAgo} days ago`
                  : lastSessionDaysAgo <= 7
                  ? `${lastSessionDaysAgo} days since last session`
                  : "It's been a while since your last session"}
              </Text>
            )}

            {/* Monthly Progress */}
            {thisMonth > 0 && (
              <Text style={[styles.insightText, { color: colors.description }]}>
                {thisMonth === 1
                  ? "1 session this month"
                  : thisMonth < 5
                  ? `${thisMonth} sessions this month`
                  : `${thisMonth} sessions this month — on track`}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 28,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 20,
    opacity: 0.6,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    opacity: 0.95,
  },
  profilePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: 0.2,
    marginBottom: 4,
    opacity: 0.7,
  },
  userName: {
    fontSize: 34,
    fontWeight: "600",
    letterSpacing: -1,
    marginBottom: 6,
  },
  orgSection: {
    marginTop: 24,
  },
  orgTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orgName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.5,
  },
  divider: {
    height: 1,
    marginBottom: 16,
    opacity: 0.3,
  },
  insights: {
    gap: 14,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
    letterSpacing: 0.1,
    opacity: 0.85,
  },
});
