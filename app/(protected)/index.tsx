import { ActivityCard } from '@/components/dashboard/ActivityCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useDashboard } from '@/hooks/services/useDashboard';
import { useColors } from '@/hooks/ui/useColors';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type TimePeriod = 'week' | 'month' | 'all';

export default function HomePage() {
  const router = useRouter();
  const { stats, recentActivity, loading, error } = useDashboard();
  const colors = useColors();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  const handleNewSession = () => {
    // TODO: Navigate to new session flow
    router.push('/(protected)/modal');
  };

  const handleViewStats = () => {
    // TODO: Navigate to stats page
    router.push('/(protected)/modal');
  };

  const handleViewLoadouts = () => {
    // TODO: Navigate to loadouts page
    router.push('/(protected)/modal');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <Animated.View 
          entering={FadeInDown.delay(0).duration(400)}
          style={styles.welcomeSection}
        >
          <Text style={[styles.welcomeText, { color: colors.textMuted }]}>
            Welcome back
          </Text>
          <DashboardHeader title="Your Performance" count={stats.totalSessions} />
        </Animated.View>

        {/* Time Period Filter */}
        <Animated.View 
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.filterSection}
        >
          <View style={styles.filterContainer}>
            <Pressable
              style={[
                styles.filterDropdown,
                { backgroundColor: colors.card }
              ]}
              onPress={() => {
                // Cycle through periods
                if (timePeriod === 'week') setTimePeriod('month');
                else if (timePeriod === 'month') setTimePeriod('all');
                else setTimePeriod('week');
              }}
            >
              <Text style={[styles.filterLabel, { color: colors.textMuted }]}>
                Period:
              </Text>
              <Text style={[styles.filterValue, { color: colors.text }]}>
                {timePeriod === 'week' ? 'Week' : timePeriod === 'month' ? 'Month' : 'All Time'}
              </Text>
              <Text style={[styles.filterIcon, { color: colors.textMuted }]}>
                ▼
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.section}
        >
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {stats.totalSessions}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Sessions
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {stats.hitRate}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Hit Rate
              </Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {stats.avgGrouping}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Grouping
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.section}
        >
          <SectionHeader title="Quick Actions" />
          <View style={styles.actionsGrid}>
            <Pressable 
              style={[styles.actionCard, { backgroundColor: colors.accent }]}
              onPress={handleNewSession}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionTitle}>New</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={handleViewStats}
            >
              <Text style={styles.actionIcon}>📈</Text>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Stats</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={handleViewLoadouts}
            >
              <Text style={styles.actionIcon}>🎯</Text>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Loadouts</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(400)}
          style={styles.section}
        >
          <SectionHeader title="Recent Activity" />
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <Animated.View
                key={activity.id}
                entering={FadeInDown.delay(350 + (index * 50)).duration(400)}
              >
                <ActivityCard activity={activity} />
              </Animated.View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.emptyIcon]}>🎯</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No sessions yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Start tracking your performance by creating your first session
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Personal Best Section */}
        <Animated.View 
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.section}
        >
          <SectionHeader title="Personal Best" />
          <View style={[styles.bestCard, { backgroundColor: colors.card }]}>
            <View style={styles.bestRow}>
              <Text style={[styles.bestLabel, { color: colors.textMuted }]}>
                Tightest Grouping
              </Text>
              <Text style={[styles.bestValue, { color: colors.accent }]}>
                1.2 cm
              </Text>
            </View>
            <View style={styles.bestRow}>
              <Text style={[styles.bestLabel, { color: colors.textMuted }]}>
                Best Hit Rate
              </Text>
              <Text style={[styles.bestValue, { color: colors.accent }]}>
                98%
              </Text>
            </View>
            <View style={styles.bestRow}>
              <Text style={[styles.bestLabel, { color: colors.textMuted }]}>
                Longest Streak
              </Text>
              <Text style={[styles.bestValue, { color: colors.accent }]}>
                12 days
              </Text>
            </View>
          </View>
        </Animated.View>
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  welcomeSection: {
    gap: 4,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  filterSection: {
    gap: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterIcon: {
    fontSize: 10,
    marginLeft: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 40,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  bestCard: {
    padding: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'left',
  },
  bestValue: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
  },
});
