/**
 * TeamHomePage
 *
 * Role-based team dashboard:
 *
 * COMMANDER VIEW (owner/commander):
 * - Merged hero card (team info + stats + commander insights)
 * - Quick actions with content tabs (schedule/insights/activity)
 * - Members, Leaderboard, Recent activity
 *
 * MEMBER VIEW (squad_commander/soldier):
 * - Merged hero card (team info + stats, no commander insights)
 * - Upcoming trainings (no tabs, just the list)
 * - My Progress + Teammate feed
 *
 * Design: Professional, compact, minimal color.
 */

import { useTeamHomePage } from '@/hooks/home/useTeamHomePage';
import { useColors } from '@/hooks/ui/useColors';
import { getTeamColor } from '@/utils/teamColors';
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ActiveMembers } from './components/ActiveMembers';
import { ActiveTrainingBanner } from './components/ActiveTrainingBanner';
import { MyProgressCard } from './components/MyProgressCard';
import { TeamActivityCard } from './components/TeamActivityCard';
import { TeamDashboardHeader } from './components/TeamDashboardHeader';
import { TeamHeroSection } from './components/TeamHeroSection';
import { TeamLeaderboard } from './components/TeamLeaderboard';
import { TeammateFeed } from './components/TeammateFeed';
import { TeamMemberActivity } from './components/TeamMemberActivity';
import { TeamQuickActions, type ContentTab } from './components/TeamQuickActions';
import { TeamWeeklyInsightsCard } from './components/TeamWeeklyInsightsCard';
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

  // Content tab state (commander only)
  const [contentTab, setContentTab] = useState<ContentTab>('schedule');

  // Map recentActivity for TeamActivityCard
  const activityItems = useMemo(() => {
    return recentActivity.map((a: any) => ({
      id: a.id || `${a.userName}-${a.timeAgo}`,
      userName: a.userName || 'Unknown',
      type: 'session' as const,
      detail: a.action || `${a.shotCount || 0} shots`,
      timestamp: a.timeAgo || '',
      accuracy: a.accuracy,
    }));
  }, [recentActivity]);

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
        {/* Header */}
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

        {/* Live Training Banner */}
        {liveTraining && (
          <ActiveTrainingBanner
            training={liveTraining}
            teamColor={teamColor}
            onJoin={() => handleJoinTraining(liveTraining)}
            colors={colors}
          />
        )}

        {/* Merged Hero Card - team info + stats + commander insights */}
        <TeamHeroSection
          teamName={activeTeam?.name || 'Team'}
          teamColor={teamColor}
          memberCount={memberCount}
          weeklyProgress={sessionsThisWeek}
          weeklyAccuracy={weeklyStats.accuracy}
          streak={streak}
          isCommander={isCommander}
          leaderboard={leaderboard}
          totalShots={teamTotals.shots}
          onViewDetails={handleViewTeamInsights}
          colors={colors}
        />

        {/* ═══════════════════════════════════════════════════════════ */}

        {isCommander ? (
          /* ─── COMMANDER: tabs + role content ─── */
          <>
            {/* Quick Actions with Content Tabs */}
            <TeamQuickActions
              onStartTraining={handleStartTraining}
              activeTab={contentTab}
              onTabChange={setContentTab}
              hasLiveTraining={!!liveTraining}
              upcomingCount={upcomingTrainings.length}
              teamColor={teamColor}
              colors={colors}
            />

            {/* Tab Content */}
            {contentTab === 'schedule' && (
              upcomingTrainings.length > 0 ? (
                <UpcomingTrainingsCard
                  trainings={upcomingTrainings}
                  teamColor={teamColor}
                  onTrainingPress={handleTrainingPress}
                  colors={colors}
                />
              ) : (
                <Animated.View entering={FadeIn} style={[s.emptyTabCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.emptyTabTitle, { color: colors.text }]}>No upcoming trainings</Text>
                  <Text style={[s.emptyTabText, { color: colors.textMuted }]}>
                    Scheduled trainings will appear here
                  </Text>
                </Animated.View>
              )
            )}

            {contentTab === 'insights' && (
              <TeamWeeklyInsightsCard
                sessions={sessionsThisWeek}
                shots={teamTotals.shots}
                accuracy={weeklyStats.accuracy}
                activeMembers={teamTotals.activeMembers}
                totalMembers={memberCount}
                weeklyGoal={weeklyGoal}
                onViewDetails={handleViewTeamInsights}
                colors={colors}
              />
            )}

            {contentTab === 'activity' && (
              <TeamActivityCard activities={activityItems} colors={colors} />
            )}

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

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <TeamLeaderboard
                entries={leaderboard}
                currentUserId={userId}
                teamColor={teamColor}
                onViewAll={handleViewLeaderboard}
                colors={colors}
              />
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <TeamMemberActivity activities={recentActivity} teamColor={teamColor} colors={colors} />
            )}
          </>
        ) : (
          /* ─── MEMBER: upcoming trainings + progress ─── */
          <>
            {/* Upcoming Trainings - shown directly, no tabs */}
            {upcomingTrainings.length > 0 && (
              <UpcomingTrainingsCard
                trainings={upcomingTrainings}
                teamColor={teamColor}
                onTrainingPress={handleTrainingPress}
                colors={colors}
              />
            )}

            {/* My Progress */}
            <MyProgressCard
              sessions={myStats.sessions}
              shots={myStats.shots}
              accuracy={myStats.accuracy}
              teamTotalSessions={teamTotals.sessions}
              colors={colors}
            />

            {/* Teammate Activity */}
            <TeammateFeed
              activities={recentActivity}
              teamTotalSessions={teamTotals.sessions}
              teamTotalShots={teamTotals.shots}
              activeMembers={teamTotals.activeMembers}
              colors={colors}
            />
          </>
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
  emptyTabCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTabTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptyTabText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

export default TeamHomePage;
