/**
 * UnifiedHomePage
 *
 * Elegant, flowing layout with personal overview first,
 * team content below, and coach-like guidance throughout.
 *
 * This component is the main orchestrator - it uses the hook for state
 * and delegates rendering to sub-components.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Clock, History } from 'lucide-react-native';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { styles } from './UnifiedHomePage.styles';
import {
  CoachMessage,
  DailyTip,
  HeroActions,
  HomeHeader,
  RecentActivitySection
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
    lastSessionDaysAgo,
    coachMessage,
    recentSessions,
    todayTrainings,
    hasActiveSession,
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
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* HEADER */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <HomeHeader
          greeting={greeting}
          firstName={firstName}
          avatarUrl={avatarUrl}
          fallbackInitial={fallbackInitial}
          isGarminConnected={isGarminConnected}
          colors={colors}
        />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* COACH MESSAGE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <CoachMessage message={coachMessage} colors={colors} />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION: QUICK ACTIONS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Text style={[localStyles.sectionTitle, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
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

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION: THIS WEEK */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Text style={[localStyles.sectionTitle, { color: colors.textMuted }]}>THIS WEEK</Text>
        <DailyTip
          colors={colors}
          streak={streak}
          accuracy={weeklyStats.accuracy}
          sessionsThisWeek={weeklyStats.sessions}
          totalSessions={allSessions.length}
        />
        <WeeklyStatsCard stats={weeklyStats} streak={streak} colors={colors} />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION: RECENT ACTIVITY */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Text style={[localStyles.sectionTitle, { color: colors.textMuted }]}>RECENT ACTIVITY</Text>
        <RecentActivitySection
          sessions={recentSessions}
          colors={colors}
          onSessionPress={handleSessionPress}
        />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW ALL SESSIONS LINK */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.delay(200)}>
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

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
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

