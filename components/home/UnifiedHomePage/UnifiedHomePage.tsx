/**
 * UnifiedHomePage
 *
 * Mode-aware home page that adapts to team vs personal context.
 * When in team mode: Shows team branding, team stats, and team-focused content.
 * When in personal mode: Shows solo training focus, personal stats, and individual goals.
 *
 * This component is the main orchestrator - it uses the hook for state
 * and delegates rendering to sub-components.
 */

import { useUnifiedHomePage } from '@/hooks/home/useUnifiedHomePage';
import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Clock, HelpCircle, History } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { styles } from './UnifiedHomePage.styles';
import { CoachMessage } from './components/CoachMessage';
import { DailyTip } from './components/DailyTip';
import { HeroActions } from './components/HeroActions';
import { HomeHeader } from './components/HomeHeader';
import { PersonalModeBanner } from './components/PersonalModeBanner';
import { RecentActivitySection } from './components/RecentActivitySection';
import { TeamContextBanner } from './components/TeamContextBanner';
import { TeamSection } from './components/TeamSection';
import { TeamStatsCard } from './components/TeamStatsCard';
import { WeeklyStatsCard } from './components/WeeklyStatsCard';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ════════════════════════════════════════════════════════════════════════════
// SECTION HEADER - Clean and minimal
// ════════════════════════════════════════════════════════════════════════════

interface SectionHeaderProps {
  title: string;
  tooltip: string;
  colors: ReturnType<typeof useColors>;
}

function SectionHeader({ title, tooltip, colors }: SectionHeaderProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTooltip(!showTooltip);
  }, [showTooltip]);

  return (
    <View style={localStyles.sectionBlock}>
      <View style={localStyles.sectionHeader}>
        <Text style={[localStyles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
        <TouchableOpacity
          onPress={handlePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[localStyles.helpButton, { backgroundColor: showTooltip ? `${colors.primary}15` : colors.secondary }]}
        >
          <HelpCircle size={12} color={showTooltip ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>
      {showTooltip && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[localStyles.tooltipBubble, { backgroundColor: colors.text, borderColor: colors.text }]}
        >
          <Text style={[localStyles.tooltipText, { color: colors.background }]}>{tooltip}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export function UnifiedHomePage() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
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
    myUpcomingTrainings,
    hasActiveSession,
    hasTeams,
    heroMode,
    activeTeam,
    activeTeamTraining,
    isTrainingCommander,
    nextUpcomingTraining,
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
  // MODE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const isTeamMode = !!activeTeam;

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
        {/* MODE CONTEXT BANNER */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isTeamMode && activeTeam ? (
          <TeamContextBanner team={activeTeam} colors={colors} />
        ) : (
          <PersonalModeBanner
            streak={streak}
            weeklyProgress={weeklyStats.sessions}
            weeklyGoal={3}
            colors={colors}
          />
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* COACH MESSAGE */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <CoachMessage message={coachMessage} colors={colors} />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION: QUICK ACTIONS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader
          title={t('home.quickActions')}
          tooltip={t('home.quickActionsTooltip')}
          colors={colors}
        />
        <HeroActions
          colors={colors}
          heroMode={heroMode}
          activeSession={homeState.activeSession}
          hasActiveSession={!!hasActiveSession}
          starting={starting}
          onStartSession={handleStartSession}
          onActiveSessionPress={handleActiveSessionPress}
          activeTeam={activeTeam}
          activeTeamTraining={activeTeamTraining}
          isTrainingCommander={isTrainingCommander}
          hasTeams={hasTeams}
          onTrainingPress={handleTrainingPress}
          nextUpcomingTraining={nextUpcomingTraining}
          defaultWeapon={defaultWeapon}
          defaultWeaponStats={defaultWeaponStats}
          upcomingTrainings={myUpcomingTrainings}
        />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* TEAM MODE: TEAM STATS & TRAININGS */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isTeamMode && activeTeam && (
          <>
            <TeamStatsCard
              team={activeTeam}
              upcomingTrainingsCount={myUpcomingTrainings.length}
              weeklyTeamSessions={weeklyStats.sessions}
              colors={colors}
            />
            {myUpcomingTrainings.length > 0 && (
              <TeamSection
                trainings={myUpcomingTrainings}
                hasTeams={hasTeams}
                colors={colors}
                onTrainingPress={handleTrainingPress}
              />
            )}
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION: THIS WEEK */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader
          title={t('home.thisWeek')}
          tooltip={t('home.thisWeekTooltip')}
          colors={colors}
        />
        <DailyTip
          colors={colors}
          streak={streak}
          accuracy={weeklyStats.accuracy}
          sessionsThisWeek={weeklyStats.sessions}
          totalSessions={allSessions.length}
        />
        <WeeklyStatsCard stats={weeklyStats} streak={streak} colors={colors} sessionsData={allSessions} />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* SECTION: RECENT ACTIVITY */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <SectionHeader
          title={t('home.recentActivity')}
          tooltip={t('home.recentActivityTooltip')}
          colors={colors}
        />
        <RecentActivitySection sessions={recentSessions} colors={colors} onSessionPress={handleSessionPress} />

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* VIEW ALL SESSIONS LINK */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.delay(200)}>
          <AnimatedTouchable
            style={[
              localStyles.viewAllLink,
              { backgroundColor: colors.card, borderColor: colors.border },
              viewAllAnimStyle,
            ]}
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
                  {recentSessions.length > 0 ? t('home.viewAllSessions') : t('home.sessionHistory')}
                </Text>
                <Text style={[localStyles.viewAllSubtitle, { color: colors.textMuted }]}>
                  {recentSessions.length > 0 ? t('home.browseFullHistory') : t('home.yourTrainingLog')}
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
  sectionBlock: {
    marginTop: 14,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  helpButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBubble: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  viewAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewAllIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  viewAllSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  viewAllArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default UnifiedHomePage;
