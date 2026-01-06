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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const router = useRouter();

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

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW ALL SESSIONS LINK */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {recentSessions.length > 0 && (
          <TouchableOpacity
            style={[localStyles.viewAllLink, { borderColor: colors.border }]}
            onPress={() => router.push('/sessionHistory')}
            activeOpacity={0.7}
          >
            <View style={localStyles.viewAllContent}>
              <View style={[localStyles.viewAllIcon, { backgroundColor: `${colors.primary}12` }]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[localStyles.viewAllTitle, { color: colors.text }]}>
                  View All Sessions
                </Text>
                <Text style={[localStyles.viewAllSubtitle, { color: colors.textMuted }]}>
                  Full history with filters
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewAllIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewAllSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});

export default UnifiedHomePage;

