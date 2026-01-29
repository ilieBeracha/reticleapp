/**
 * Active Session Screen
 *
 * Clean router that picks the right view based on session state.
 * All UI logic lives in the view components.
 *
 * View Selection:
 * 1. Loading        → Loading spinner
 * 2. Not found      → Error screen with exit
 * 3. Pending        → SessionPrepView (pre-session setup)
 * 4. Group mode     → GroupSessionView
 * 5. Squad mode     → SquadSessionView
 * 6. Watch states   → WatchFailedView, WatchStartingView, WatchPreviewView, WatchWaitingView
 * 7. Team training  → TeamTrainingView (focused, locked)
 * 8. Solo           → SoloSessionView (full features)
 */

import { PAPER_TYPE } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupSessionView } from '@/components/session/activeSession/GroupSessionView';
import { SessionPrepView } from '@/components/session/activeSession/SessionPrepView';
import { SoloSessionView } from '@/components/session/activeSession/SoloSessionView';
import { SquadSessionView } from '@/components/session/activeSession/SquadSessionView';
import { TeamTrainingView } from '@/components/session/activeSession/TeamTrainingView';
import { styles } from '@/components/session/activeSession/activeSession.styles';
import { useActiveSession } from '@/components/session/activeSession/useActiveSession';
import { WatchFailedView } from '@/components/session/activeSession/watch/WatchFailedView';
import { WatchPreviewView } from '@/components/session/activeSession/watch/WatchPreviewView';
import { WatchStartingView } from '@/components/session/activeSession/watch/WatchStartingView';
import { WatchWaitingView } from '@/components/session/activeSession/watch/WatchWaitingView';

export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useTranslation();
  const {
    sessionId,
    engagementMode: routeEngagementMode,
    viewOnly,
  } = useLocalSearchParams<{
    sessionId: string;
    engagementMode?: 'solo' | 'squad' | 'group';
    viewOnly?: string;
  }>();

  const isViewOnly = viewOnly === 'true';

  const {
    session,
    targets,
    loading,
    refreshing,
    ending,
    elapsedTime,
    drill,
    hasDrill,
    drillProgress,
    watchState,
    isTeamTraining,
    handleRefresh,
    handleManualRoute,
    handleScanRoute,
    handleTargetPress,
    handleEndSession,
    handleClose,
    handleContinueWithoutWatch,
    handleRetryWatchConnection,
    canAddTarget,
    isSquadEngagement,
    participants,
    loadData,
  } = useActiveSession({ sessionId });

  const { weather, loading: weatherLoading, error: weatherError } = useOpenWeather();

  // Get current user ID for commander check
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOT FOUND / COMPLETED STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if (!session || (session.status !== 'active' && session.status !== 'pending')) {
    const isCompleted = session?.status === 'completed';
    const hasTraining = !!session?.training_id;

    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={isCompleted ? colors.green : colors.destructive}
          />
        </View>
        <Text style={[styles.statusTitle, { color: colors.text }]}>
          {isCompleted ? t('session.sessionComplete') : t('session.sessionNotFound')}
        </Text>

        <View style={localStyles.exitButtonsWrap}>
          {hasTraining && session?.training_id ? (
            <>
              <TouchableOpacity
                style={[localStyles.exitPrimaryBtn, { backgroundColor: colors.text }]}
                onPress={() =>
                  router.replace({
                    pathname: '/(protected)/trainingDetail',
                    params: { id: session.training_id },
                  })
                }
              >
                <Text style={[localStyles.exitPrimaryText, { color: colors.background }]}>
                  {t('session.returnToTraining')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.exitSecondaryBtn}
                onPress={() => router.replace('/(protected)/(tabs)')}
              >
                <Text style={[localStyles.exitSecondaryText, { color: colors.textMuted }]}>
                  {t('session.exitToHome')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: colors.secondary }]}
              onPress={() => router.replace('/(protected)/(tabs)')}
            >
              <Text style={[styles.statusButtonText, { color: colors.text }]}>{t('session.goHome')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING STATE → SessionPrepView
  // ═══════════════════════════════════════════════════════════════════════════

  const drillExecutionPolicy = session.drill_config?.execution_policy;
  const isConfigLocked = drillExecutionPolicy === 'locked';

  if (session.status === 'pending') {
    return (
      <SessionPrepView
        session={session}
        insets={insets}
        onSessionActivated={() => handleRefresh()}
        onBack={
          isConfigLocked
            ? undefined
            : () => {
                router.replace({
                  pathname: '/(protected)/startEngagement',
                  params: {
                    purpose: session.drill_config?.drill_goal || PAPER_TYPE.GROUPING,
                    distance: String(session.drill_config?.distance_m || 25),
                    shots: String(session.drill_config?.rounds_per_shooter || 5),
                    executionPolicy: drillExecutionPolicy || 'free',
                  },
                });
              }
        }
        onClose={handleClose}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SQUAD/GROUP MODE
  // ═══════════════════════════════════════════════════════════════════════════

  const actualEngagementMode = session?.engagement?.engagement_mode || routeEngagementMode;
  const isGroupEngagement = actualEngagementMode === 'group';
  const isCommander = currentUserId === session.user_id;

  if (isGroupEngagement) {
    return (
      <GroupSessionView
        sessionId={sessionId}
        engagementId={session.engagement?.id || ''}
        session={{
          id: session.id,
          user_id: session.user_id,
          drill_name: session.drill_name,
          drill_config: session.drill_config as any,
          training_id: session.training_id,
        }}
        participants={participants}
        isCommander={isCommander && !isViewOnly}
        isViewOnly={isViewOnly}
        onRefresh={loadData}
        onEndSession={handleEndSession}
      />
    );
  }

  if (isSquadEngagement) {
    return (
      <SquadSessionView
        sessionId={sessionId}
        engagementId={session.engagement?.id || ''}
        session={{
          id: session.id,
          user_id: session.user_id,
          drill_name: session.drill_name,
          drill_config: session.drill_config as any,
          training_id: session.training_id,
        }}
        participants={participants}
        targets={targets}
        isCommander={isCommander && !isViewOnly}
        isViewOnly={isViewOnly}
        onRefresh={loadData}
        onEndSession={handleEndSession}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WATCH STATES
  // ═══════════════════════════════════════════════════════════════════════════

  const drillName = session.drill_name || session.training_title || 'Practice Session';

  if (watchState.isWatchControlled) {
    if (watchState.watchStartFailed) {
      return (
        <WatchFailedView
          insets={insets}
          drillName={drillName}
          watchStarting={watchState.watchStarting}
          onClose={handleClose}
          onRetry={handleRetryWatchConnection}
          onContinueWithoutWatch={handleContinueWithoutWatch}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    if (watchState.watchStarting) {
      return (
        <WatchStartingView
          insets={insets}
          drillName={drillName}
          onClose={handleClose}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    if (watchState.watchAppNotOpen) {
      return (
        <WatchPreviewView
          insets={insets}
          drillName={drillName}
          drill={drill}
          isWatchConnected={false}
          watchAppNotOpen={true}
          ending={ending}
          onClose={handleClose}
          onContinueWithoutWatch={handleContinueWithoutWatch}
          weaponName={session.weapon_name}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    if (watchState.watchPreviewQueued) {
      return (
        <WatchPreviewView
          insets={insets}
          drillName={drillName}
          drill={drill}
          isWatchConnected={watchState.watchActivelyControlling}
          watchAppNotOpen={false}
          ending={ending}
          onClose={handleClose}
          onContinueWithoutWatch={handleContinueWithoutWatch}
          weaponName={session.weapon_name}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    return (
      <WatchWaitingView
        insets={insets}
        session={session}
        drillName={drillName}
        drill={drill}
        isWatchConnected={watchState.watchActivelyControlling}
        ending={ending}
        onClose={handleClose}
        onEndSession={handleEndSession}
        isTeamTraining={isTeamTraining}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM TRAINING MODE
  // ═══════════════════════════════════════════════════════════════════════════

  if (isTeamTraining) {
    return (
      <TeamTrainingView
        session={session}
        targets={targets}
        insets={insets}
        elapsedTime={elapsedTime}
        drill={drill}
        drillProgress={drillProgress}
        watchState={watchState}
        canAddTarget={canAddTarget}
        onScanRoute={handleScanRoute}
        onManualRoute={handleManualRoute}
        onTargetPress={handleTargetPress}
        onEndSession={handleEndSession}
        ending={ending}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLO SESSION (default)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <SoloSessionView
      session={session}
      targets={targets}
      insets={insets}
      elapsedTime={elapsedTime}
      drill={drill}
      hasDrill={hasDrill}
      drillProgress={drillProgress}
      watchState={watchState}
      canAddTarget={canAddTarget}
      refreshing={refreshing}
      ending={ending}
      weather={weather}
      weatherLoading={weatherLoading}
      weatherError={weatherError}
      onRefresh={handleRefresh}
      onScanRoute={handleScanRoute}
      onManualRoute={handleManualRoute}
      onTargetPress={handleTargetPress}
      onEndSession={handleEndSession}
      onClose={handleClose}
    />
  );
}

const localStyles = StyleSheet.create({
  exitButtonsWrap: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 32,
    gap: 12,
  },
  exitPrimaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
  },
  exitPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exitSecondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  exitSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
