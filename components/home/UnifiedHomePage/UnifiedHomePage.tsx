/**
 * UnifiedHomePage
 *
 * Clean, organized layout with three distinct sections:
 * - ME: Personal overview, quick actions, coach guidance
 * - TEAM: Team training and collaboration
 * - LAST WEEK: Recent activity and performance stats
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Calendar, Clock, History, Users } from 'lucide-react-native';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { styles } from './UnifiedHomePage.styles';
import {
  CoachMessage,
  DailyTip,
  HeroActions,
  HomeHeader,
  RecentActivitySection,
  TeamSection,
} from './components';
import { WeeklyStatsCard } from './components/WeeklyStatsCard';
import { useUnifiedHomePage } from './useUnifiedHomePage';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function UnifiedHomePage() {
  const colors = useColors();
  const router = useRouter();
  const viewAllScale = useSharedValue(1);

  const viewAllAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: viewAllScale.value }],
  }));

  const handleViewAllPressIn = () => {
    viewAllScale.value = withSpring(0.98);
  };

  const handleViewAllPressOut = () => {
    viewAllScale.value = withSpring(1);
  };

  const handleViewAllPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  };

  const {
    // User info
    greeting,
    firstName,
    avatarUrl,
    fallbackInitial,
    isGarminConnected,

    // State
    refreshing,
    starting,
    shouldShowLoading,

    // Data
    homeState,
    weeklyStats,
    streak,
    coachMessage,
    recentSessions,
    upcomingTrainings,
    todayTrainings,
    hasActiveSession,
    hasTeams,
    allSessions,
    defaultWeapon,
    defaultWeaponStats,

    // Handlers
    onRefresh,
    handleStartSession,
    handleActiveSessionPress,
    handleSessionPress,
    handleTrainingPress,
  } = useUnifiedHomePage();

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════
  if (shouldShowLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION: ME                                                         */}
        {/* Personal overview, quick actions, and coach guidance                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.duration(300)} style={localStyles.sectionContainer}>
          {/* Section Header */}
        

          {/* Header with greeting */}
          <HomeHeader
            greeting={greeting}
            firstName={firstName}
            avatarUrl={avatarUrl}
            fallbackInitial={fallbackInitial}
            isGarminConnected={isGarminConnected}
            colors={colors}
          />

          {/* Coach Message */}
          <CoachMessage message={coachMessage} colors={colors} />

          {/* Quick Actions */}
          <HeroActions
            colors={colors}
            activeSession={homeState.activeSession}
            hasActiveSession={!!hasActiveSession}
            starting={starting}
            onStartSession={handleStartSession}
            onActiveSessionPress={handleActiveSessionPress}
            defaultWeapon={defaultWeapon}
            defaultWeaponStats={defaultWeaponStats}
            todayTrainings={todayTrainings}
            onTrainingPress={handleTrainingPress}
          />
        </Animated.View>

        {/* Section Divider */}
        <View style={[localStyles.sectionDivider, { backgroundColor: colors.border }]} />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION: TEAM                                                       */}
        {/* Team training and collaboration                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)} style={localStyles.sectionContainer}>
          {/* Section Header */}
          <View style={localStyles.sectionHeader}>
            <View style={[localStyles.sectionIcon, { backgroundColor: `${colors.orange}15` }]}>
              <Users size={14} color={colors.orange} />
            </View>
            <Text style={[localStyles.sectionLabel, { color: colors.textMuted }]}>TEAM</Text>
          </View>

          {/* Team Content */}
          <TeamSection
            trainings={upcomingTrainings}
            hasTeams={hasTeams}
            colors={colors}
            onTrainingPress={handleTrainingPress}
          />
        </Animated.View>

        {/* Section Divider */}
        <View style={[localStyles.sectionDivider, { backgroundColor: colors.border }]} />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION: LAST WEEK                                                  */}
        {/* Recent activity and performance stats                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)} style={localStyles.sectionContainer}>
          {/* Section Header */}
          <View style={localStyles.sectionHeader}>
            <View style={[localStyles.sectionIcon, { backgroundColor: `${colors.green}15` }]}>
              <Calendar size={14} color={colors.green} />
            </View>
            <Text style={[localStyles.sectionLabel, { color: colors.textMuted }]}>LAST WEEK</Text>
          </View>

          {/* Weekly Stats */}
          <DailyTip
            colors={colors}
            streak={streak}
            accuracy={weeklyStats.accuracy}
            sessionsThisWeek={weeklyStats.sessions}
            totalSessions={allSessions.length}
          />
          <WeeklyStatsCard stats={weeklyStats} streak={streak} colors={colors} />

          {/* Recent Activity */}
          <Text style={[localStyles.subsectionTitle, { color: colors.textMuted }]}>Recent Sessions</Text>
          <RecentActivitySection
            sessions={recentSessions}
            colors={colors}
            onSessionPress={handleSessionPress}
          />

          {/* View All Sessions Link */}
          <Animated.View entering={FadeIn.delay(300)}>
            <AnimatedTouchable
              style={[localStyles.viewAllLink, { backgroundColor: colors.card, borderColor: colors.border }, viewAllAnimStyle]}
              onPress={handleViewAllPress}
              onPressIn={handleViewAllPressIn}
              onPressOut={handleViewAllPressOut}
              activeOpacity={1}
            >
              <View style={localStyles.viewAllContent}>
                <View style={[localStyles.viewAllIcon, { backgroundColor: `${colors.primary}12` }]}>
                  <History size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={[localStyles.viewAllTitle, { color: colors.text }]}>
                    {recentSessions.length > 0 ? 'View All Sessions' : 'Session History'}
                  </Text>
                  <Text style={[localStyles.viewAllSubtitle, { color: colors.textMuted }]}>
                    {recentSessions.length > 0 ? 'Browse full history' : 'Your training log'}
                  </Text>
                </View>
              </View>
              <View style={[localStyles.viewAllArrow, { backgroundColor: colors.secondary }]}>
                <Clock size={13} color={colors.textMuted} />
              </View>
            </AnimatedTouchable>
          </Animated.View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  sectionContainer: {
    paddingVertical: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sectionDivider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.5,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW ALL LINK
  // ═══════════════════════════════════════════════════════════════════════════
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewAllIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  viewAllSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  viewAllArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default UnifiedHomePage;

