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
import { Clock, History, HelpCircle } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

// ════════════════════════════════════════════════════════════════════════════
// SECTION HEADER WITH TOOLTIP
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
    <View style={localStyles.sectionHeaderContainer}>
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
        <SectionHeader
          title="QUICK ACTIONS"
          tooltip="Start a new session, continue an active one, or check your default weapon stats."
          colors={colors}
        />
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
        <SectionHeader
          title="THIS WEEK"
          tooltip="Your weekly stats including shots fired, accuracy, best group, and time spent training. Tap the card for details."
          colors={colors}
        />
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
        <SectionHeader
          title="RECENT ACTIVITY"
          tooltip="Your latest training sessions. Tap any session to view details, targets, and results."
          colors={colors}
        />
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
  sectionHeaderContainer: {
    marginBottom: 12,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  helpButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipBubble: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  tooltipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
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

