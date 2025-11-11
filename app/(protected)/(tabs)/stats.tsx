import FilterModal from "@/components/FilterModal";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { CircularProgress } from "@/modules/stats/CircularProgress";
import { GoalsCard } from "@/modules/stats/GoalsCard";
import { MemberComparison } from "@/modules/stats/MemberComparison";
import { MetricCards } from "@/modules/stats/MetricCards";
import { StatsHeader } from "@/modules/stats/StatsHeader";
import { TimeAnalysis } from "@/modules/stats/TimeAnalysis";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { sessionStatsStore } from "@/store/sessionsStore";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useStore } from "zustand";

export default function Stats() {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, userOrgContext } = useOrganizationsStore();
  const { sessions, loading: sessionsLoading, fetchSessions } = useStore(sessionStatsStore);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");

  const isPersonalMode = selectedOrgId === null;
  const userName =
    user?.user_metadata?.full_name ||
    user?.email ||
    "User";

  const handleOpenFilters = () => {
    setFilterVisible(true);
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    // Add your filter logic here
  };

  // Fetch sessions on mount and when org changes
  useEffect(() => {
    if (user?.id) {
      fetchSessions(user?.id, selectedOrgId);
    }
  }, [user?.id, selectedOrgId, fetchSessions]);

  // Calculate metrics from sessions
  const totalSessions = sessions?.length || 0 as number;
  const targetSessions = 100;
  const avgAccuracy = totalSessions > 0 ? 87 : 0;

  // Circular progress data
  const progressSegments = [
    {
      value: targetSessions,
      label: "Target",
      sublabel: "sessions",
      color: colors.purple,
    },
    {
      value: totalSessions,
      label: "Completed",
      sublabel: "sessions",
      color: colors.orange,
    },
    {
      value: Math.max(0, targetSessions - totalSessions),
      label: "Remaining",
      sublabel: "sessions",
      color: colors.yellow,
    },
  ];

  // Metric cards data
  const metricCardsData = [
    {
      icon: "flame" as const,
      label: "Sessions",
      value: totalSessions,
      unit: "total",
      change: 12.5,
      color: colors.orange,
    },
    {
      icon: "barbell" as const,
      label: "Accuracy",
      value: avgAccuracy,
      unit: "%",
      change: 9.2,
      color: colors.blue,
    },
  ];

  const goalsPercentage = Math.round((totalSessions / targetSessions) * 100);

  return (
    <>
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Fixed Header - Does not scroll */}
        <View style={styles.headerContainer}>
          <StatsHeader
            isPersonalMode={isPersonalMode}
            organizationName={userOrgContext?.orgName}
            userName={userName}
            selectedFilter={selectedFilter}
            onFilterPress={handleOpenFilters}
          />
        </View>

        {/* Scrollable Content */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Circular Progress Chart */}
          <CircularProgress
            segments={progressSegments}
            size={220}
            strokeWidth={35}
          />

          {/* Metric Cards */}
          <MetricCards metrics={metricCardsData} />

          {/* Goals Card */}
          <GoalsCard percentage={goalsPercentage} />

          {/* Time Analysis */}
          <TimeAnalysis isPersonalMode={isPersonalMode} />

          {/* Member Comparison (Org only) */}
          {!isPersonalMode && (
            <MemberComparison currentUserId={user?.id || undefined} />
          )}
        </ScrollView>
      </ThemedView>

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selectedFilter={selectedFilter}
        onFilterChange={handleFilterChange}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 24,
  },
});
