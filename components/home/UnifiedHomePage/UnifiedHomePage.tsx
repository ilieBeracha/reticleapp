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
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { styles } from './UnifiedHomePage.styles';
import {
  CoachMessage,
  HomeHeader,
  PersonalSection,
  RecentActivitySection,
  TeamSection,
} from './components';
import { useUnifiedHomePage } from './useUnifiedHomePage';

export function UnifiedHomePage() {
  const colors = useColors();

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
    upcomingTrainings,
    hasActiveSession,
    hasTeams,

    // Handlers
    onRefresh,
    handleStartSession,
    handleActiveSessionPress,
    handleCancelSession,
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
        {/* PERSONAL SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <PersonalSection
          activeSession={homeState.activeSession}
          hasActiveSession={!!hasActiveSession}
          weeklyStats={weeklyStats}
          streak={streak}
          lastSessionDaysAgo={lastSessionDaysAgo}
          starting={starting}
          colors={colors}
          onActiveSessionPress={handleActiveSessionPress}
          onCancelSession={handleCancelSession}
          onStartSession={handleStartSession}
        />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TEAM SECTION */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <TeamSection
          trainings={upcomingTrainings}
          hasTeams={hasTeams}
          colors={colors}
          onTrainingPress={handleTrainingPress}
        />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* RECENT ACTIVITY */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <RecentActivitySection
          sessions={recentSessions}
          colors={colors}
          onSessionPress={handleSessionPress}
        />

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

export default UnifiedHomePage;

