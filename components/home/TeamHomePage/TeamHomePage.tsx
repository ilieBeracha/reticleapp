/**
 * TeamHomePage
 *
 * Role-based team dashboard:
 *
 * COMMANDER VIEW (owner/commander):
 * - Team insights with comparisons
 * - Leaderboard with rankings
 * - Performance analytics
 *
 * MEMBER VIEW (squad_commander/soldier):
 * - Personal progress
 * - Team activity (collaborative, no rankings)
 * - What teammates accomplished
 *
 * Design: Professional, compact, minimal color.
 */

import { useTeamHomePage } from '@/hooks/home/useTeamHomePage';
import { useColors } from '@/hooks/ui/useColors';
import { getTeamColor } from '@/utils/teamColors';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ActiveMembers } from './components/ActiveMembers';
import { ActiveTrainingBanner } from './components/ActiveTrainingBanner';
import { CommanderInsights } from './components/CommanderInsights';
import { MyProgressCard } from './components/MyProgressCard';
import { TeamDashboardHeader } from './components/TeamDashboardHeader';
import { TeamHeroSection } from './components/TeamHeroSection';
import { TeamLeaderboard } from './components/TeamLeaderboard';
import { TeammateFeed } from './components/TeammateFeed';
import { TeamMemberActivity } from './components/TeamMemberActivity';
import { TeamQuickActions } from './components/TeamQuickActions';
import { UpcomingTrainingsCard } from './components/UpcomingTrainingsCard';

export function TeamHomePage() {
  const colors = useColors();
  const {
    // User info
    greeting,
    firstName,
    avatarUrl,
    fallbackInitial,
    isGarminConnected,
    userId,

    // Role
    isCommander,

    // Team info
    activeTeam,
    memberCount,
    members,

    // State
    refreshing,
    shouldShowLoading,

    // Data
    liveTraining,
    upcomingTrainings,
    weeklyStats,
    streak,
    recentActivity,
    sessionsThisWeek,
    weeklyGoal,
    leaderboard,
    myStats,
    teamTotals,

    // Handlers
    onRefresh,
    handleTrainingPress,
    handleJoinTraining,
    handleTeamSettings,
    handleViewTeamInsights,
    handleStartTraining,
    handleViewSchedule,
    handleViewLeaderboard,
    handleViewAllMembers,
  } = useTeamHomePage();

  const teamColor = useMemo(() => {
    return activeTeam?.id ? getTeamColor(activeTeam.id) : colors.primary;
  }, [activeTeam?.id, colors.primary]);

  if (shouldShowLoading) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.textMuted} />
      </View>
    );
  }

  const hasActivity = recentActivity.length > 0;

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
        {/* Header - Same for all */}
        <TeamDashboardHeader
          greeting={greeting}
          firstName={firstName}
          avatarUrl={avatarUrl}
          fallbackInitial={fallbackInitial}
          isGarminConnected={isGarminConnected}
          team={activeTeam}
          teamColor={teamColor}
          onTeamSettings={handleTeamSettings}
          colors={colors}
        />

        {/* Live Training - Same for all */}
        {liveTraining && (
          <ActiveTrainingBanner
            training={liveTraining}
            teamColor={teamColor}
            onJoin={() => handleJoinTraining(liveTraining)}
            colors={colors}
          />
        )}

        {/* Team Summary - Same for all */}
        <TeamHeroSection
          teamName={activeTeam?.name || 'Team'}
          teamColor={teamColor}
          memberCount={memberCount}
          weeklyGoal={weeklyGoal}
          weeklyProgress={sessionsThisWeek}
          weeklyAccuracy={weeklyStats.accuracy}
          streak={streak}
          onViewDetails={handleViewTeamInsights}
          colors={colors}
        />

        {/* Actions - Leaderboard hidden for members */}
        <TeamQuickActions
          onStartTraining={handleStartTraining}
          onViewSchedule={handleViewSchedule}
          onViewLeaderboard={handleViewLeaderboard}
          onTeamSettings={handleTeamSettings}
          hasLiveTraining={!!liveTraining}
          upcomingCount={upcomingTrainings.length}
          showLeaderboard={isCommander}
          teamColor={teamColor}
          colors={colors}
        />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ROLE-SPECIFIC CONTENT BELOW */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {isCommander ? (
          /* ─────────────────────────────────────────────────────────── */
          /* COMMANDER VIEW */
          /* ─────────────────────────────────────────────────────────── */
          <>
            {/* Commander Insights */}
            <CommanderInsights
              leaderboard={leaderboard}
              avgAccuracy={weeklyStats.accuracy}
              totalSessions={sessionsThisWeek}
              totalShots={teamTotals.shots}
              memberCount={memberCount}
              weeklyGoal={weeklyGoal}
              onViewDetails={handleViewTeamInsights}
              colors={colors}
            />

            {/* Members */}
            {members.length > 0 && (
              <ActiveMembers
                members={members}
                totalMembers={memberCount}
                teamColor={teamColor}
                onViewAll={handleViewAllMembers}
                colors={colors}
              />
            )}

            {/* Leaderboard - Commanders see rankings */}
            {leaderboard.length > 0 && (
              <TeamLeaderboard
                entries={leaderboard}
                currentUserId={userId}
                teamColor={teamColor}
                onViewAll={handleViewLeaderboard}
                colors={colors}
              />
            )}

            {/* Recent Activity - with accuracy details for commanders */}
            {recentActivity.length > 0 && (
              <TeamMemberActivity activities={recentActivity} teamColor={teamColor} colors={colors} />
            )}
          </>
        ) : (
          /* ─────────────────────────────────────────────────────────── */
          /* MEMBER VIEW */
          /* ─────────────────────────────────────────────────────────── */
          <>
            {/* My Progress */}
            <MyProgressCard
              sessions={myStats.sessions}
              shots={myStats.shots}
              accuracy={myStats.accuracy}
              teamTotalSessions={teamTotals.sessions}
              colors={colors}
            />

            {/* Teammate Activity - No rankings, just what they did */}
            <TeammateFeed
              activities={recentActivity}
              teamTotalSessions={teamTotals.sessions}
              teamTotalShots={teamTotals.shots}
              activeMembers={teamTotals.activeMembers}
              colors={colors}
            />
          </>
        )}

        {/* Schedule - Same for all */}
        {upcomingTrainings.length > 0 && (
          <UpcomingTrainingsCard
            trainings={upcomingTrainings}
            teamColor={teamColor}
            onTrainingPress={handleTrainingPress}
            colors={colors}
          />
        )}

        {/* Empty State */}
        {!hasActivity && !isCommander && (
          <Animated.View entering={FadeIn} style={[s.emptyState, { borderColor: colors.border }]}>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Ready to train</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Complete a session to track your progress.</Text>
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
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
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

export default TeamHomePage;
