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
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { History } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ActiveTrainingBanner } from './components/ActiveTrainingBanner';
import { TeamActivityCard } from './components/TeamActivityCard';
import { TeamDashboardHeader } from './components/TeamDashboardHeader';
import { TeamHeroSection } from './components/TeamHeroSection';
import { TeamLeaderboard } from './components/TeamLeaderboard';
import { TeammateFeed } from './components/TeammateFeed';
import { TeamQuickActions, type ContentTab } from './components/TeamQuickActions';
import { TeamWeeklyCalendar } from './components/TeamWeeklyCalendar';
import { UpcomingTrainingsCard } from './components/UpcomingTrainingsCard';

export function TeamHomePage() {
  const { t } = useTranslation();
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
    liveTrainings,
    upcomingTrainings,
    teamTrainings,
    weeklyStats,
    streak,
    recentActivity,
    sessionsThisWeek,
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
      groupingCm: a.groupingCm,
    }));
  }, [recentActivity]);

  const router = useRouter();

  const handleViewHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  };

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

        {/* Weekly Calendar */}
        <TeamWeeklyCalendar colors={colors} trainings={teamTrainings} teamColor={teamColor} />

        {/* Live Training Banner(s) */}
        {liveTrainings.length === 1 ? (
          <ActiveTrainingBanner
            training={liveTrainings[0]}
            teamColor={teamColor}
            onJoin={() => handleJoinTraining(liveTrainings[0])}
            colors={colors}
          />
        ) : liveTrainings.length > 1 ? (
          <View style={[s.multiLiveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.multiLiveHeader}>
              <View style={[s.multiLiveDot, { backgroundColor: '#10B981' }]} />
              <Text style={[s.multiLiveTitle, { color: colors.text }]}>
                {t('teamHome.liveTrainingsCount', { count: liveTrainings.length })}
              </Text>
            </View>
            {liveTrainings.map((training, i) => (
              <TouchableOpacity
                key={training.id}
                style={[
                  s.multiLiveRow,
                  i < liveTrainings.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
                onPress={() => handleJoinTraining(training)}
                activeOpacity={0.6}
              >
                <Text style={[s.multiLiveRowTitle, { color: colors.text }]} numberOfLines={1}>
                  {training.title}
                </Text>
                <View style={[s.multiLiveJoinBtn, { backgroundColor: colors.text }]}>
                  <Text style={[s.multiLiveJoinText, { color: colors.background }]}>{t('teamHome.join')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Merged Hero Card - team info + stats + commander insights */}
        <TeamHeroSection
          teamName={activeTeam?.name || t('teamHome.team')}
          teamColor={teamColor}
          memberCount={memberCount}
          weeklyProgress={sessionsThisWeek}
          weeklyAccuracy={weeklyStats.accuracy}
          streak={streak}
          isCommander={isCommander}
          leaderboard={leaderboard}
          totalShots={teamTotals.shots}
          onViewDetails={handleViewTeamInsights}
          userId={userId}
          myStats={myStats}
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
              hasLiveTraining={liveTrainings.length > 0}
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
                  <Text style={[s.emptyTabTitle, { color: colors.text }]}>{t('teamHome.noUpcomingTrainings')}</Text>
                  <Text style={[s.emptyTabText, { color: colors.textMuted }]}>
                    {t('teamHome.scheduledWillAppear')}
                  </Text>
                </Animated.View>
              )
            )}

            {contentTab === 'insights' && (
              leaderboard.length > 0 ? (
                <TeamLeaderboard
                  entries={leaderboard}
                  currentUserId={userId}
                  teamColor={teamColor}
                  onViewAll={handleViewLeaderboard}
                  colors={colors}
                />
              ) : (
                <Animated.View entering={FadeIn} style={[s.emptyTabCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.emptyTabTitle, { color: colors.text }]}>{t('teamHome.noRankingsYet')}</Text>
                  <Text style={[s.emptyTabText, { color: colors.textMuted }]}>
                    {t('teamHome.completeSessionsRankings')}
                  </Text>
                </Animated.View>
              )
            )}

            {contentTab === 'activity' && (
              <TeamActivityCard activities={activityItems} colors={colors} />
            )}
          </>
        ) : (
          /* ─── MEMBER: upcoming trainings + team context ─── */
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

            {/* Team Context - compact summary of team activity */}
            <Animated.View entering={FadeIn.delay(100)} style={s.teamContext}>
              <View style={[s.teamContextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.teamContextRow}>
                  <View style={s.teamContextStat}>
                    <Text style={[s.teamContextValue, { color: colors.text }]}>{teamTotals.activeMembers}</Text>
                    <Text style={[s.teamContextLabel, { color: colors.textMuted }]}>{t('teamHome.activeThisWeek')}</Text>
                  </View>
                  <View style={[s.teamContextDivider, { backgroundColor: colors.border }]} />
                  <View style={s.teamContextStat}>
                    <Text style={[s.teamContextValue, { color: colors.text }]}>{teamTotals.sessions}</Text>
                    <Text style={[s.teamContextLabel, { color: colors.textMuted }]}>{t('teamHome.teamSessions')}</Text>
                  </View>
                  {myStats.sessions > 0 && teamTotals.sessions > 0 && (
                    <>
                      <View style={[s.teamContextDivider, { backgroundColor: colors.border }]} />
                      <View style={s.teamContextStat}>
                        <Text style={[s.teamContextValue, { color: colors.text }]}>
                          {Math.round((myStats.sessions / teamTotals.sessions) * 100)}%
                        </Text>
                        <Text style={[s.teamContextLabel, { color: colors.textMuted }]}>{t('teamHome.yourShare')}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>

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

        {/* Session History Link */}
        <TouchableOpacity
          style={[s.historyLink, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleViewHistory}
          activeOpacity={0.7}
        >
          <View style={[s.historyIcon, { backgroundColor: colors.border }]}>
            <History size={14} color={colors.textMuted} />
          </View>
          <Text style={[s.historyText, { color: colors.text }]}>{t('teamHome.sessionHistory')}</Text>
        </TouchableOpacity>

        {/* Empty State */}
        {!hasActivity && !isCommander && (
          <Animated.View entering={FadeIn} style={[s.emptyState, { borderColor: colors.border }]}>
            <Text style={[s.emptyTitle, { color: colors.text }]}>{t('teamHome.readyToTrain')}</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>{t('teamHome.readyToTrainSubtitle')}</Text>
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
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  multiLiveCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  multiLiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  multiLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  multiLiveTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  multiLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiLiveRowTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 10,
  },
  multiLiveJoinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  multiLiveJoinText: {
    fontSize: 12,
    fontWeight: '600',
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
  // ─── Team Context (soldier view) ───
  teamContext: {
    marginBottom: 12,
  },
  teamContextCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  teamContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  teamContextStat: {
    flex: 1,
    alignItems: 'center',
  },
  teamContextValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  teamContextLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  teamContextDivider: {
    width: 1,
    height: 20,
  },
});

export default TeamHomePage;
