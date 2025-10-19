import { Session } from "@/types/database";
import { useAuth, useOrganization } from "@clerk/clerk-expo";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityChart } from "./LastRecap/ActivityChart";
import { EmptyState } from "./LastRecap/EmptyState";
import { WeeklyStats } from "./LastRecap/WeeklyStats";

interface LastRecapProps {
  sessions: Session[];
  loading: boolean;
  hasOrganization: boolean;
}

export function LastRecap({
  sessions,
  loading,
  hasOrganization,
}: LastRecapProps) {
  const { orgId } = useAuth();
  const { organization } = useOrganization();

  // Determine if we're in personal mode (no organization selected)
  const isPersonalMode = !orgId;

  const today = new Date();
  const currentDay = today.getDay();

  // Calculate weekly stats
  const weekStats = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.created_at);
      return sessionDate >= startOfWeek;
    });

    return {
      totalSessions: thisWeekSessions.length,
      totalAllTime: sessions.length,
    };
  }, [sessions, currentDay]);
  
  if (sessions.length === 0) {
    return <EmptyState type="no-sessions" isPersonalMode={isPersonalMode} />;
  }
  // Loading state
  if (loading) {
    return <EmptyState type="loading" isPersonalMode={isPersonalMode} />;
  }

  // Empty sessions state
  if (sessions.length === 0 && !isPersonalMode && !hasOrganization) {
    return <EmptyState type="no-organization" />;
  }

  return (
    <View style={styles.container}>
      {/* Weekly Stats */}
      <WeeklyStats
        totalSessions={weekStats.totalSessions}
        totalAllTime={weekStats.totalAllTime}
        isPersonalMode={isPersonalMode}
        organizationName={organization?.name}
      />

      {/* Activity Chart */}
      <ActivityChart sessions={sessions} isPersonalMode={isPersonalMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    marginBottom: 16,
  },
});
