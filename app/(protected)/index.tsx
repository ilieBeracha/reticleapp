import type { BaseDetachedBottomSheetRef } from '@/components/modals/BaseDetachedBottomSheet';
import { ComingSoonSheet } from '@/components/modals/ComingSoonSheet';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

export default function HomePage() {
  // ✨ SINGLE SOURCE OF TRUTH
  const {
    userId,
    email,
    fullName,
    myWorkspaceId,
    activeWorkspaceId,
    activeWorkspace,
    isMyWorkspace,
    isOtherWorkspace,
    workspaces,
  } = useAppContext();

  console.log('📍 HomePage Context:')
  console.log('  myWorkspaceId:', myWorkspaceId)
  console.log('  activeWorkspaceId:', activeWorkspaceId)
  console.log('  activeWorkspace:', activeWorkspace)
  console.log('  isMyWorkspace:', isMyWorkspace)
  console.log('  isOtherWorkspace:', isOtherWorkspace)
  console.log('  workspaces count:', workspaces.length)

  const colors = useColors();
  const workspaceName = activeWorkspace?.workspace_name || activeWorkspace?.full_name;
  const chartDetailsSheetRef = useRef<BaseDetachedBottomSheetRef>(null);

  // Pie chart data - elegant muted tones with depth
  const pieData = [
    { 
      value: 40, 
      color: '#6B8FA3', 
      gradientCenterColor: '#8BADC1',
      focused: true,
    },
    { 
      value: 30, 
      color: '#FF8A5C',
      gradientCenterColor: '#FFA880',
    },
    { 
      value: 20, 
      color: '#7AA493',
      gradientCenterColor: '#98C2B1',
    },
    { 
      value: 10, 
      color: '#8A8A8A',
      gradientCenterColor: '#A8A8A8',
    },
  ];

  // Handle chart double tap
  let lastTap = 0;
  const handleChartPress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      chartDetailsSheetRef.current?.open();
    }
    lastTap = now;
  };

  // iOS-style press animation
  const createPressAnimation = () => {
    const scaleAnim = new Animated.Value(1);
    const animatePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
    };
    const animatePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
    };
    return { scaleAnim, animatePressIn, animatePressOut };
  };

  // Show simple view for organization workspace
  if (!isMyWorkspace) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.orgContent}>
          <View style={[styles.orgCard, { backgroundColor: colors.card }]}>
            <Ionicons name="business-outline" size={56} color={colors.primary} />
            <Text style={[styles.orgTitle, { color: colors.text }]}>
              {workspaceName}
            </Text>
            <Text style={[styles.orgSubtitle, { color: colors.textMuted }]}>
              Organization Workspace
            </Text>
            <View style={[styles.orgBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.orgBadgeText, { color: colors.primary }]}>
                {activeWorkspace?.access_role || 'Member'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {/* Hero Section with Chart */}
        <View style={[styles.hero, { backgroundColor: colors.cardForeground + 'F2' }]}>
          <View style={styles.heroHeader}>
            <Text style={[styles.heroTitle, { color: colors.background }]}>Training Distribution</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Track your workout categories
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.chartContainer}
            onPress={handleChartPress}
            activeOpacity={0.9}
          >
            <PieChart
              data={pieData}
              donut
              showGradient
              sectionAutoFocus
              radius={120}
              innerRadius={85}
              innerCircleColor={colors.card}
              centerLabelComponent={() => (
                <View style={styles.centerLabel}>
                  <Text style={[styles.centerLabelValue, { color: colors.text }]}>0</Text>
                  <Text style={[styles.centerLabelText, { color: colors.textMuted }]}>Sessions</Text>
                  <Text style={[styles.centerLabelSubtext, { color: colors.textMuted }]}>This Week</Text>
                </View>
              )}
              focusOnPress
              toggleFocusOnPress
            />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          </View>

          {[
            { icon: 'add-circle', title: 'Start New Session', subtitle: 'Begin your training', isPrimary: true },
            { icon: 'bar-chart-outline', title: 'View Progress', subtitle: 'Track your stats', color: '#5B7A8C' },
            { icon: 'calendar', title: 'Schedule Training', subtitle: 'Plan your sessions', color: '#5A8473' },
          ].map((action, index) => {
            const { scaleAnim, animatePressIn, animatePressOut } = createPressAnimation();
            const isPrimary = action.isPrimary;
            const actionColor = action.color || colors.primary;

            return (
              <Animated.View key={index} style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.actionCard,
                    { backgroundColor: isPrimary ? colors.primary : colors.card }
                  ]}
                  onPressIn={animatePressIn}
                  onPressOut={animatePressOut}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionContent}>
                    <View style={[
                      styles.actionIcon,
                      { backgroundColor: isPrimary ? 'rgba(255, 255, 255, 0.2)' : actionColor + '15' }
                    ]}>
                      <Ionicons 
                        name={action.icon as any} 
                        size={20} 
                        color={isPrimary ? '#fff' : actionColor} 
                      />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[
                        styles.actionTitle,
                        { color: isPrimary ? '#fff' : colors.text }
                      ]}>
                        {action.title}
                      </Text>
                      <Text style={[
                        styles.actionSubtitle,
                        { color: isPrimary ? 'rgba(255, 255, 255, 0.8)' : colors.textMuted }
                      ]}>
                        {action.subtitle}
                      </Text>
                    </View>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={18} 
                    color={isPrimary ? '#fff' : colors.textMuted} 
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          </View>

          <View style={[styles.emptyActivityState, { backgroundColor: colors.card }]}>
            <Ionicons name="fitness-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyActivityTitle, { color: colors.text }]}>No recent activity</Text>
            <Text style={[styles.emptyActivitySubtitle, { color: colors.textMuted }]}>
              Start your first training session to see your activity here
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Chart Details Bottom Sheet */}
      <ComingSoonSheet
        ref={chartDetailsSheetRef}
        title="Detailed Analytics"
        subtitle="Get insights into your training patterns"
        icon="bar-chart"
      />
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
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 32,
  },

  // Organization View
  orgContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  orgCard: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  orgTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  orgSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  orgBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  orgBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  // Section Headers
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionHeader: {
    paddingBottom: 8,
  },

  // Hero Section
  hero: {
    marginBottom: 32,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroHeader: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  chartContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelValue: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 2,
  },
  centerLabelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  centerLabelSubtext: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: -0.1,
  },

  // Actions Section
  actionsSection: {
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  actionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.1,
  },

  // Activity Section
  activitySection: {
    marginBottom: 20,
  },
  emptyActivityState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  emptyActivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptyActivitySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});

