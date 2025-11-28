import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BiometricGuard } from './BiometricGuard';
import { GlassStatCard } from './GlassStatCard';

interface InsightsDashboardProps {
  biometricEnabled?: boolean;
}

// Weekly activity data (mock)
const weeklyData = [
  { day: 'Mon', value: 3 },
  { day: 'Tue', value: 5 },
  { day: 'Wed', value: 2 },
  { day: 'Thu', value: 7 },
  { day: 'Fri', value: 4 },
  { day: 'Sat', value: 6 },
  { day: 'Sun', value: 1 },
];

export const InsightsDashboard = React.memo(function InsightsDashboard({
  biometricEnabled = false,
}: InsightsDashboardProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Mock data - replace with real data
  const stats = useMemo(() => ({
    sessions: 42,
    accuracy: 89,
    totalTime: '12.5h',
    streak: 7,
  }), []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleShake = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const isGlassAvailable = isLiquidGlassAvailable();
  const glassStyle = theme === 'dark' ? 'clear' : 'regular';
  const maxValue = Math.max(...weeklyData.map(d => d.value));

  const renderWeeklyChart = () => (
    <View style={styles.chartSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.text + '08' }]}>
          <Text style={[styles.filterButtonText, { color: colors.textMuted }]}>7 days</Text>
        </TouchableOpacity>
      </View>

      {isGlassAvailable ? (
        <GlassView
          style={styles.chartCard}
          glassEffectStyle={glassStyle}
        >
          <View style={styles.chartContent}>
            {renderChartBars()}
          </View>
        </GlassView>
      ) : (
        <View style={[styles.chartCardFallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartContent}>
            {renderChartBars()}
          </View>
        </View>
      )}
    </View>
  );

  const renderChartBars = () => (
    <View style={styles.barsContainer}>
      {weeklyData.map((item, index) => {
        const height = (item.value / maxValue) * 80;
        const isToday = index === new Date().getDay() - 1 || (index === 6 && new Date().getDay() === 0);
        
        return (
          <View key={item.day} style={styles.barColumn}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: isToday ? colors.text : colors.text + '25',
                  },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: isToday ? colors.text : colors.textMuted }]}>
              {item.day}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.recentSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAllText, { color: colors.textMuted }]}>All →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activityList}>
        {[
          { title: 'Accuracy Drill', time: '2h ago', score: 94 },
          { title: 'Quick Training', time: 'Yesterday', score: 87 },
          { title: 'Full Session', time: '2 days ago', score: 91 },
        ].map((item, index) => (
          <Animated.View
            key={item.title}
            entering={FadeInDown.delay(index * 100).duration(400)}
          >
            <TouchableOpacity
              style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.activityTime, { color: colors.textMuted }]}>{item.time}</Text>
              </View>
              <Text style={[styles.scoreText, { color: colors.text }]}>{item.score}%</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );

  return (
    <BiometricGuard enabled={biometricEnabled}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemedStatusBar />
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <GlassStatCard
              icon="radio-button-on"
              value={stats.sessions}
              label="Sessions"
              trend={{ value: 12, isPositive: true }}
            />
            <GlassStatCard
              icon="pulse"
              value={`${stats.accuracy}%`}
              label="Accuracy"
              trend={{ value: 5, isPositive: true }}
            />
          </View>

          <View style={styles.statsGrid}>
            <GlassStatCard
              icon="hourglass-outline"
              value={stats.totalTime}
              label="Total Time"
            />
            <GlassStatCard
              icon="sunny-outline"
              value={stats.streak}
              label="Day Streak"
              trend={{ value: 2, isPositive: true }}
            />
          </View>

          {/* Weekly Chart */}
          {renderWeeklyChart()}

       

          {/* Recent Activity */}
          {renderRecentActivity()}

          {/* Spacer */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </BiometricGuard>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  chartSection: {
    marginTop: 12,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  chartCardFallback: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chartContent: {
    padding: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  motionSection: {
    marginBottom: 24,
  },
  recentSection: {
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 13,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.6,
  },
});

