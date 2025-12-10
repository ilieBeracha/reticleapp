import { useColors } from '@/hooks/ui/useColors';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  CompletionCard,
  EmptyState,
  HeroStatsRow,
  InsightsHeader,
  MiniStatsRow,
  RecentSessionsSection,
  StreakCard,
  useInsightsData
} from './index';

export function InsightsDashboard() {
  const colors = useColors();
  const {
    sessions,
    stats,
    myStats,
    totalTime,
    completionRate,
    recentSessions,
    refreshing,
    onRefresh,
  } = useInsightsData();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <InsightsHeader colors={colors} />

        <HeroStatsRow totalSessions={stats.totalSessions} totalTime={totalTime} colors={colors} />

        <CompletionCard completionRate={completionRate} stats={stats} colors={colors} />

        <MiniStatsRow stats={stats} myStats={myStats} totalTime={totalTime} colors={colors} />


        <StreakCard sessions={sessions} colors={colors} />

        <RecentSessionsSection sessions={recentSessions} colors={colors} />

        {sessions.length === 0 && <EmptyState colors={colors} />}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default InsightsDashboard;
