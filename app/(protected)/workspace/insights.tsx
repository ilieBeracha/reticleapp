import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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

interface InsightsProps {
  biometricEnabled?: boolean;
}

export default function Insights({ biometricEnabled = false }: InsightsProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  const primaryColor = '#FF6B35'; // Orange accent
  const secondaryColor = colors.text; // Use theme text color

  const stats = useMemo(
    () => ({
      sessions: { value: 42, icon: 'radio-button-on', label: 'Total Sessions', unit: '' },
      accuracy: { value: 89, icon: 'analytics', label: 'Avg Accuracy', unit: '%' },
      totalTime: { value: '12.5h', icon: 'timer-outline', label: 'Total Time', unit: '' },
      streak: { value: 7, icon: 'flame', label: 'Day Streak', unit: '' },
      avgDuration: '18m',
      improvement: '+12%',
    }),
    []
  );

  const weeklyData = useMemo(
    () => [
      { day: 'Mon', value: 3, label: 'M' },
      { day: 'Tue', value: 5, label: 'T' },
      { day: 'Wed', value: 2, label: 'W' },
      { day: 'Thu', value: 7, label: 'T' },
      { day: 'Fri', value: 4, label: 'F' },
      { day: 'Sat', value: 6, label: 'S' },
      { day: 'Sun', value: 1, label: 'S' },
    ],
    []
  );

  const recentActivity = useMemo(
    () => [
      { id: 1, title: 'Accuracy Drill', time: '2h ago', score: 94, duration: '15m' },
      { id: 2, title: 'Quick Training', time: 'Yesterday', score: 87, duration: '12m' },
      { id: 3, title: 'Full Session', time: '2 days ago', score: 91, duration: '22m' },
    ],
    []
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const isGlassAvailable = isLiquidGlassAvailable();
  const glassStyle = theme === 'dark' ? 'clear' : 'regular';
  const maxValue = Math.max(...weeklyData.map((d) => d.value));

  const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    if (isGlassAvailable) {
      return (
        <GlassView style={[styles.glassCard, style]} glassEffectStyle={glassStyle}>
          {children}
        </GlassView>
      );
    }
  return (
      <View style={[styles.fallbackCard, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
        {children}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />

      {/* Background Gradient */}
      <LinearGradient
        colors={
          theme === 'dark'
            ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']
            : ['rgba(255,255,255,0)', 'rgba(240,240,245,0.4)']
        }
        style={styles.gradient}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Hero Header */}
        <View style={styles.hero}>
          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Insights</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>Personal analytics</Text>
          </View>
        </View>

        {/* Quick Stats - Horizontal Scroll */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickStats}
            style={{ marginHorizontal: -16 }}
          >
            <View style={{ width: 16 }} />
            {[
              stats.sessions,
              stats.accuracy,
              stats.totalTime,
              stats.streak,
            ].map((stat, index) => (
              <GlassCard key={index} style={styles.quickStatCard}>
                <View style={[styles.iconCircle, { backgroundColor: colors.text + '06' }]}>
                  <Ionicons name={stat.icon as any} size={20} color={colors.text} style={{ opacity: 0.3 }} />
                </View>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {stat.value}{stat.unit || ''}
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              </GlassCard>
            ))}
            <View style={{ width: 16 }} />
          </ScrollView>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSection}>
          <GlassCard style={styles.periodSelector}>
            {(['week', 'month', 'year'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && [styles.periodButtonActive, { backgroundColor: colors.text + '15' }],
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod(period);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    { color: selectedPeriod === period ? colors.text : colors.textMuted },
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </GlassCard>
        </View>

        {/* Activity Chart */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity</Text>
            <View style={[styles.badge, { backgroundColor: colors.text + '08' }]}>
              <Text style={[styles.badgeText, { color: colors.textMuted }]}>This {selectedPeriod}</Text>
            </View>
          </View>

          <GlassCard style={styles.chartCard}>
            <View style={styles.barsContainer}>
              {weeklyData.map((item, index) => {
                const height = (item.value / maxValue) * 100;
                const isToday = index === new Date().getDay() - 1 || (index === 6 && new Date().getDay() === 0);

                return (
                  <View key={item.day} style={styles.barColumn}>
                    <View style={styles.barWrapper}>
                      <LinearGradient
                        colors={
                          isToday
                            ? [primaryColor, primaryColor + 'CC']
                            : [colors.text + '15', colors.text + '08']
                        }
                        style={[
                          styles.bar,
                          {
                            height: `${height}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: isToday ? colors.text : colors.textMuted }]}>
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <GlassCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIconCircle, { backgroundColor: colors.text + '08' }]}>
                <Ionicons name="trending-up" size={18} color={colors.text} style={{ opacity: 0.5 }} />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Improvement</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.improvement}</Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>vs last week</Text>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIconCircle, { backgroundColor: colors.text + '08' }]}>
                <Ionicons name="time-outline" size={18} color={colors.text} style={{ opacity: 0.5 }} />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Avg Duration</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{stats.avgDuration}</Text>
            <Text style={[styles.metricSub, { color: colors.textMuted }]}>per session</Text>
          </GlassCard>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: colors.textMuted }]}>See all →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {recentActivity.map((item) => (
              <GlassCard key={item.id} style={styles.activityCard}>
                <View style={styles.activityContent}>
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
                    <View style={styles.activityMeta}>
                      <Text style={[styles.activityTime, { color: colors.textMuted }]}>{item.time}</Text>
                      <Text style={[styles.activityDot, { color: colors.textMuted }]}>•</Text>
                      <Text style={[styles.activityDuration, { color: colors.textMuted }]}>{item.duration}</Text>
                    </View>
                  </View>
                  <View style={[styles.scoreCircle, { backgroundColor: colors.text + '06' }]}>
                    <Text style={[styles.activityScore, { color: colors.text }]}>{item.score}%</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 32,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroContent: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -2,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
  quickStats: {
    gap: 12,
    paddingBottom: 20,
  },
  quickStatCard: {
    width: 135,
    padding: 20,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  colorDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
  },
  periodSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodButtonActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    padding: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '75%',
    borderRadius: 8,
    minHeight: 12,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 18,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  metricColorDot: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    flex: 1,
    opacity: 0.6,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  metricSub: {
    fontSize: 12,
    opacity: 0.6,
  },
  recentSection: {
    paddingHorizontal: 16,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityList: {
    gap: 10,
  },
  activityCard: {
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  activityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 6,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityTime: {
    fontSize: 13,
    opacity: 0.6,
  },
  activityDot: {
    fontSize: 13,
    opacity: 0.3,
  },
  activityDuration: {
    fontSize: 13,
    opacity: 0.6,
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityScore: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.5,
    opacity: 0.7,
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  fallbackCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
});
