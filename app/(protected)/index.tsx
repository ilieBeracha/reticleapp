import type { BaseBottomSheetRef } from '@/components/modals/BaseBottomSheet';
import type { BaseDetachedBottomSheetRef } from '@/components/modals/BaseDetachedBottomSheet';
import { ComingSoonSheet } from '@/components/modals/ComingSoonSheet';
import { CreateSessionSheet } from '@/components/modals/CreateSessionSheet';
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
  const createSessionSheetRef = useRef<BaseBottomSheetRef>(null);

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

  // Show organization workspace view
  if (!isMyWorkspace) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          {/* Workspace Stats Overview */}
          <View style={styles.workspaceStatsCard}>
            <View style={styles.workspaceStatsRow}>
              <View style={styles.workspaceStatItem}>
                <View style={[styles.workspaceStatIcon, { backgroundColor: '#5B7A8C15' }]}>
                  <Ionicons name="people-outline" size={20} color="#5B7A8C" />
                </View>
                <View style={styles.workspaceStatText}>
                  <Text style={[styles.workspaceStatValue, { color: colors.text }]}>0</Text>
                  <Text style={[styles.workspaceStatLabel, { color: colors.textMuted }]}>Members</Text>
                </View>
              </View>

              <View style={[styles.workspaceStatDivider, { backgroundColor: colors.border }]} />

              <View style={styles.workspaceStatItem}>
                <View style={[styles.workspaceStatIcon, { backgroundColor: '#E7692515' }]}>
                  <Ionicons name="people-circle-outline" size={20} color="#E76925" />
                </View>
                <View style={styles.workspaceStatText}>
                  <Text style={[styles.workspaceStatValue, { color: colors.text }]}>0</Text>
                  <Text style={[styles.workspaceStatLabel, { color: colors.textMuted }]}>Teams</Text>
                </View>
              </View>

              <View style={[styles.workspaceStatDivider, { backgroundColor: colors.border }]} />

              <View style={styles.workspaceStatItem}>
                <View style={[styles.workspaceStatIcon, { backgroundColor: '#5A847315' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#5A8473" />
                </View>
                <View style={styles.workspaceStatText}>
                  <Text style={[styles.workspaceStatValue, { color: colors.text }]}>0</Text>
                  <Text style={[styles.workspaceStatLabel, { color: colors.textMuted }]}>Sessions</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Teams Section */}
          <View style={styles.workspaceSection}>
            <View style={styles.workspaceSectionHeader}>
              <Text style={[styles.workspaceSectionTitle, { color: colors.text }]}>Teams</Text>
              <TouchableOpacity style={[styles.workspaceAddButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={[styles.workspaceEmptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.workspaceEmptyTitle, { color: colors.text }]}>No teams yet</Text>
              <Text style={[styles.workspaceEmptySubtitle, { color: colors.textMuted }]}>
                Create teams to organize your training groups
              </Text>
            </View>
          </View>

          {/* Members Section */}
          <View style={styles.workspaceSection}>
            <View style={styles.workspaceSectionHeader}>
              <Text style={[styles.workspaceSectionTitle, { color: colors.text }]}>Members</Text>
              <TouchableOpacity style={[styles.workspaceAddButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="person-add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={[styles.workspaceEmptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="person-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.workspaceEmptyTitle, { color: colors.text }]}>No members yet</Text>
              <Text style={[styles.workspaceEmptySubtitle, { color: colors.textMuted }]}>
                Invite members to collaborate on training
              </Text>
            </View>
          </View>

          {/* Activity Section */}
          <View style={styles.workspaceSection}>
            <View style={styles.workspaceSectionHeader}>
              <Text style={[styles.workspaceSectionTitle, { color: colors.text }]}>Recent Activity</Text>
            </View>

            <View style={[styles.workspaceEmptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="time-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.workspaceEmptyTitle, { color: colors.text }]}>No recent activity</Text>
              <Text style={[styles.workspaceEmptySubtitle, { color: colors.textMuted }]}>
                Activity from this workspace will appear here
              </Text>
            </View>
          </View>
        </ScrollView>
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
        {/* User Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <View>
              <Text style={[styles.welcomeGreeting, { color: colors.textMuted }]}>Welcome back,</Text>
              <Text style={[styles.welcomeName, { color: colors.text }]}>{fullName || 'User'}</Text>
            </View>
            <View style={[styles.welcomeAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.welcomeAvatarText}>
                {(fullName || email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.welcomeStats}>
            <View style={styles.welcomeStat}>
              <Text style={[styles.welcomeStatValue, { color: colors.text }]}>0</Text>
              <Text style={[styles.welcomeStatLabel, { color: colors.textMuted }]}>Sessions</Text>
            </View>
            <View style={[styles.welcomeStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.welcomeStat}>
              <Text style={[styles.welcomeStatValue, { color: colors.text }]}>0h</Text>
              <Text style={[styles.welcomeStatLabel, { color: colors.textMuted }]}>Total Time</Text>
            </View>
            <View style={[styles.welcomeStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.welcomeStat}>
              <Text style={[styles.welcomeStatValue, { color: colors.text }]}>0</Text>
              <Text style={[styles.welcomeStatLabel, { color: colors.textMuted }]}>This Week</Text>
            </View>
          </View>
        </View>

        {/* Hero Section with Chart */}
        <View style={[styles.hero, { backgroundColor: colors.card }]}>
          <View style={styles.heroHeader}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Training Distribution</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Track your workout categories
            </Text>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryTabs}>
            {[
              { label: 'All', color: '#6B8FA3' },
              { label: 'Strength', color: '#6B8FA3' },
              { label: 'Cardio', color: '#FF8A5C' },
              { label: 'Flexibility', color: '#7AA493' },
            ].map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryTab,
                  index === 0 && styles.categoryTabActive,
                  { 
                    backgroundColor: index === 0 ? category.color + '15' : 'transparent',
                    borderColor: index === 0 ? category.color : colors.border
                  }
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryTabText,
                  { color: index === 0 ? category.color : colors.textMuted }
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
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
            { 
              icon: 'add-circle', 
              title: 'Start New Session', 
              subtitle: 'Begin your training', 
              isPrimary: true,
              onPress: () => createSessionSheetRef.current?.open()
            },
            { 
              icon: 'bar-chart-outline', 
              title: 'View Progress', 
              subtitle: 'Track your stats', 
              color: '#5B7A8C',
              onPress: () => chartDetailsSheetRef.current?.open()
            },
            { 
              icon: 'calendar', 
              title: 'Schedule Training', 
              subtitle: 'Plan your sessions', 
              color: '#5A8473',
              onPress: () => chartDetailsSheetRef.current?.open()
            },
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
                  onPress={action.onPress}
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

      {/* Create Session Bottom Sheet */}
      <CreateSessionSheet
        ref={createSessionSheetRef}
        onSessionCreated={() => {
          createSessionSheetRef.current?.close();
          // TODO: Refresh dashboard data
        }}
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

  // Workspace View (for non-personal workspaces)
  workspaceStatsCard: {
    marginBottom: 40,
    paddingTop: 8,
  },
  workspaceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  workspaceStatItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    width: '30%',
  },
  workspaceStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceStatText: {
    alignItems: 'center',
    gap: 4,
  },
  workspaceStatValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  workspaceStatLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  workspaceStatDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 0,
  },
  workspaceSection: {
    marginBottom: 40,
  },
  workspaceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  workspaceSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  workspaceAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workspaceEmptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  workspaceEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  workspaceEmptySubtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.1,
  },

  // Welcome Card
  welcomeCard: {
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeGreeting: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  welcomeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  welcomeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  welcomeStat: {
    alignItems: 'center',
  },
  welcomeStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  welcomeStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  welcomeStatDivider: {
    width: 1,
    height: 28,
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
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryTabActive: {
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
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

