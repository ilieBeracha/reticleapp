/**
 * UnifiedHomePage
 *
 * Personal mode home page. Clean, professional, compact.
 * Mirrors TeamHomePage design language.
 *
 * Layout:
 * - Header (compact)
 * - Active Session Banner (if active)
 * - Personal Hero Section (stats summary)
 * - Quick Actions toolbar
 * - Weekly Stats card
 * - Recent Activity list
 * - View All Sessions link
 */

import { useUnifiedHomePage } from '@/hooks/home/useUnifiedHomePage';
import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { History } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ActiveSessionBanner } from './components/ActiveSessionBanner';
import { AllTeamsUpcomingCard } from './components/AllTeamsUpcomingCard';
import { HomeHeader } from './components/HomeHeader';
import { PersonalHeroSection } from './components/PersonalHeroSection';
import { PersonalQuickActions } from './components/PersonalQuickActions';
import { RecentActivitySection } from './components/RecentActivitySection';
import { WeeklyStatsCard } from './components/WeeklyStatsCard';

export function UnifiedHomePage() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();

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
    recentSessions,
    hasActiveSession,
    allSessions,

    // All-teams upcoming (personal mode)
    allTeamsUpcoming,
    teamNameMap,

    // Handlers
    onRefresh,
    handleStartSession,
    handleActiveSessionPress,
    handleSessionPress,
    handleTrainingPress,
  } = useUnifiedHomePage();

  const handleViewHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  };

  const handleViewInsights = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/(tabs)/insights');
  };

  // Loading state - matches TeamHomePage
  if (shouldShowLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textMuted}
            colors={[colors.textMuted]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Header */}
        <HomeHeader
          greeting={greeting}
          firstName={firstName}
          avatarUrl={avatarUrl}
          fallbackInitial={fallbackInitial}
          isGarminConnected={isGarminConnected}
          colors={colors}
        />

        {/* Active Session Banner */}
        {hasActiveSession && homeState.activeSession && (
          <ActiveSessionBanner
            session={homeState.activeSession}
            onPress={handleActiveSessionPress}
            colors={colors}
          />
        )}

        {/* Personal Stats Summary */}
        <PersonalHeroSection
          sessions={weeklyStats.sessions}
          accuracy={weeklyStats.accuracy}
          streak={streak}
          totalShots={weeklyStats.shots}
          onViewInsights={handleViewInsights}
          colors={colors}
        />

        {/* Quick Actions */}
        <PersonalQuickActions
          onStartSession={handleStartSession}
          onViewHistory={handleViewHistory}
          onViewInsights={handleViewInsights}
          hasActiveSession={hasActiveSession}
          starting={starting}
          colors={colors}
        />

        {/* Upcoming Trainings from all teams */}
        {allTeamsUpcoming.length > 0 && (
          <AllTeamsUpcomingCard
            trainings={allTeamsUpcoming}
            teamNameMap={teamNameMap}
            onTrainingPress={handleTrainingPress}
            colors={colors}
          />
        )}

        {/* Section: This Week */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
          {t('home.thisWeek').toUpperCase()}
        </Text>
        <WeeklyStatsCard stats={weeklyStats} streak={streak} colors={colors} sessionsData={allSessions} />

        {/* Section: Recent Activity */}
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>
          {t('home.recentActivity').toUpperCase()}
        </Text>
        <RecentActivitySection sessions={recentSessions} colors={colors} onSessionPress={handleSessionPress} />

        {/* View All Sessions */}
        <Animated.View entering={FadeIn.delay(100)}>
          <TouchableOpacity
            style={[s.viewAllLink, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleViewHistory}
            activeOpacity={0.7}
          >
            <View style={s.viewAllContent}>
              <View style={[s.viewAllIcon, { backgroundColor: colors.border }]}>
                <History size={14} color={colors.textMuted} />
              </View>
              <Text style={[s.viewAllText, { color: colors.text }]}>
                {recentSessions.length > 0 ? t('home.viewAllSessions') : t('home.sessionHistory')}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Empty State */}
        {allSessions.length === 0 && !shouldShowLoading && (
          <Animated.View entering={FadeIn} style={[s.emptyState, { borderColor: colors.border }]}>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Ready to train</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              Complete a session to track your progress.
            </Text>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default UnifiedHomePage;
