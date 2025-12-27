/**
 * useActiveSession Hook
 * 
 * Manages all stateful logic for the Active Session Screen.
 * Handles data loading, timer, watch integration, and actions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import type { GarminSessionData } from '@/services/garminService';
import { getDrillInputRoutes } from '@/services/session/drillInputRecipe';
import { computeSessionScore } from '@/services/session/scoring';
import {
  calculateSessionStats,
  endSession,
  getSessionById,
  getSessionTargetsWithResults,
  SessionStats,
  SessionTargetWithResults,
  SessionWithDetails,
  updateSession,
} from '@/services/sessionService';
import { useGarminStore, useIsGarminConnected, useSessionStartStatus } from '@/store/garminStore';
import { useSessionStore } from '@/store/sessionStore';
import { formatMaxShots, isInfiniteShots } from '@/utils/drillShots';

import type { DrillProgress, NextTargetPlan, UseActiveSessionParams, UseActiveSessionReturn } from './activeSession.types';
import { AUTO_DETECT_ENABLED, SHOT_SENSITIVITY_DEFAULT, TIMER_INTERVAL_MS } from './activeSession.constants';
import {
  buildEndSessionMessage,
  buildWatchSessionPayload,
  calculateAccuracy,
  calculateDrillProgress,
  calculateElapsedSeconds,
  calculateNextTargetPlan,
  formatTime,
  getDefaultDistance,
  isDrillLimitReached,
} from './activeSession.helpers';

export function useActiveSession({ sessionId }: UseActiveSessionParams): UseActiveSessionReturn {
  const { loadPersonalSessions, loadTeamSessions } = useSessionStore();
  const {
    status: garminStatus,
    send: sendToGarmin,
    lastSessionData,
    setSessionDataCallback,
    clearLastSessionData,
    startSessionWithRetry,
    resetSessionStartStatus,
  } = useGarminStore();
  const isWatchConnected = useIsGarminConnected();
  const sessionStartStatus = useSessionStartStatus();

  // ============================================================================
  // STATE
  // ============================================================================
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);

  // Drill completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const completionShownRef = useRef(false);

  // Watch session start failure state
  const [watchStartFailed, setWatchStartFailed] = useState(false);
  const [watchStarting, setWatchStarting] = useState(false);

  // Watch data processing
  const watchDataProcessedRef = useRef<Set<string>>(new Set());

  // Live timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Garmin notification tracking
  const garminNotifiedRef = useRef(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      const [sessionData, targetsData, statsData] = await Promise.all([
        getSessionById(sessionId),
        getSessionTargetsWithResults(sessionId),
        calculateSessionStats(sessionId),
      ]);

      setSession(sessionData);
      setTargets(targetsData);
      setStats(statsData);
    } catch (error) {
      console.error('[Session] Failed to load:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ============================================================================
  // LIVE TIMER
  // ============================================================================
  useEffect(() => {
    if (session?.started_at) {
      const updateElapsed = () => {
        setElapsedTime(calculateElapsedSeconds(session.started_at));
      };
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, TIMER_INTERVAL_MS);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [session?.started_at]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const drill = session?.drill_config ?? null;
  const hasDrill = !!drill;

  const totalShots = stats?.totalShotsFired ?? 0;
  const totalHits = stats?.totalHits ?? 0;
  const accuracy = calculateAccuracy(totalShots, totalHits);

  const drillProgress = useMemo(
    () => calculateDrillProgress(drill, totalShots, targets.length, accuracy, elapsedTime),
    [drill, totalShots, targets.length, accuracy, elapsedTime]
  );

  const nextTargetPlan = useMemo(
    () => calculateNextTargetPlan(drillProgress, drill, totalShots, targets.length),
    [drillProgress, drill, totalShots, targets.length]
  );

  const defaultDistance = useMemo(
    () => getDefaultDistance(targets, drill),
    [targets, drill]
  );

  const drillLimitReached = isDrillLimitReached(drill, nextTargetPlan);

  // Drill type flags
  const isGroupingDrill = drill?.drill_goal === 'grouping';
  const isAchievementDrill = drill?.drill_goal === 'achievement';
  const isPaperDrill = isGroupingDrill || drill?.target_type === 'paper';
  const isTacticalDrill = drill?.target_type === 'tactical';

  // Watch state
  const isWatchControlled = session?.watch_controlled === true;
  const watchActivelyControlling = isWatchControlled && isWatchConnected;

  const watchState = {
    isWatchControlled,
    watchActivelyControlling,
    watchStartFailed,
    watchStarting: watchStarting || sessionStartStatus === 'sending',
  };

  // Score
  const score = useMemo(() => {
    if (!stats) return null;
    return computeSessionScore(stats, drill);
  }, [stats, drill]);

  // Input routes
  const inputRoutes = useMemo(() => {
    if (!sessionId) return null;
    return getDrillInputRoutes({
      sessionId,
      defaultDistance,
      drill: drill ?? null,
      nextBullets: nextTargetPlan?.nextBullets ?? null,
      allowMoreTargets: !drillLimitReached,
    });
  }, [sessionId, defaultDistance, drill, nextTargetPlan?.nextBullets, drillLimitReached]);

  const manualRoute = inputRoutes?.primary.kind === 'manual_tactical' ? inputRoutes.primary : inputRoutes?.secondary;
  const scanRoute = inputRoutes?.primary.kind === 'scan_paper' ? inputRoutes.primary : undefined;
  const showManual = !!manualRoute;
  const showScan = !!scanRoute;

  // ============================================================================
  // GARMIN INTEGRATION - Start session on watch
  // ============================================================================
  const startWatchSessionWithRetry = useCallback(async () => {
    if (!session || garminStatus !== 'CONNECTED') return;

    const payload = buildWatchSessionPayload(session, AUTO_DETECT_ENABLED, SHOT_SENSITIVITY_DEFAULT);

    setWatchStarting(true);
    setWatchStartFailed(false);

    console.log('[Garmin] 📤 Starting SESSION_START with retry...');
    const success = await startSessionWithRetry(payload);

    setWatchStarting(false);

    if (!success) {
      console.warn('[Garmin] ❌ Watch did not acknowledge SESSION_START');
      setWatchStartFailed(true);
    } else {
      console.log('[Garmin] ✅ Watch acknowledged SESSION_START');
      setWatchStartFailed(false);
    }
  }, [session, garminStatus, startSessionWithRetry]);

  useEffect(() => {
    if (!session || garminNotifiedRef.current || garminStatus !== 'CONNECTED') return;

    garminNotifiedRef.current = true;

    if (session.watch_controlled) {
      startWatchSessionWithRetry();
    } else {
      const payload = buildWatchSessionPayload(session, AUTO_DETECT_ENABLED, SHOT_SENSITIVITY_DEFAULT);
      sendToGarmin('SESSION_START', payload);
      console.log('[Garmin] 📤 Sent SESSION_START to watch (no retry)');
    }
  }, [session, garminStatus, sendToGarmin, startWatchSessionWithRetry]);

  // Reset session start status when leaving screen
  useEffect(() => {
    return () => {
      resetSessionStartStatus();
    };
  }, [resetSessionStartStatus]);

  // ============================================================================
  // GARMIN INTEGRATION - Listen for watch session data
  // ============================================================================
  useEffect(() => {
    if (lastSessionData && lastSessionData.sessionId && lastSessionData.sessionId !== sessionId) {
      console.log('[Garmin] Clearing stale session data from previous session');
      clearLastSessionData();
    }
  }, [sessionId, lastSessionData, clearLastSessionData]);

  useEffect(() => {
    const handleWatchSessionData = (data: GarminSessionData) => {
      console.log('[Garmin] 📩 Received session data from watch:', data);

      if (data.sessionId && data.sessionId !== sessionId) {
        console.log('[Garmin] 📩 Session ID mismatch, ignoring');
        return;
      }

      const dataKey = `${data.sessionId}-${data.shotsRecorded}-${data.durationMs}`;
      if (watchDataProcessedRef.current.has(dataKey)) {
        console.log('[Garmin] 📩 Already processed this data, ignoring');
        return;
      }
      watchDataProcessedRef.current.add(dataKey);

      clearLastSessionData();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/(protected)/watchSessionResult',
        params: {
          sessionId: sessionId!,
          shots: String(data.shotsRecorded),
          duration: String(Math.round((data.durationMs || 0) / 1000)),
          distance: String(data.distance || 0),
          completed: data.completed ? '1' : '0',
          teamId: session?.team_id || '',
        },
      });
    };

    setSessionDataCallback(handleWatchSessionData);

    return () => {
      setSessionDataCallback(null);
    };
  }, [sessionId, session?.team_id, setSessionDataCallback, clearLastSessionData]);

  // ============================================================================
  // AUTO-COMPLETION DETECTION
  // ============================================================================
  useEffect(() => {
    if (!hasDrill || !drillProgress) return;
    if (completionShownRef.current) return;

    if (drillProgress.isComplete && drillProgress.meetsAccuracy && drillProgress.meetsTime) {
      completionShownRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCompletionModal(true);
    }
  }, [hasDrill, drillProgress]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  const handleScanPaper = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (hasDrill && drill && nextTargetPlan) {
      if (drill.target_type !== 'paper') {
        Alert.alert('Wrong target type', 'This drill requires tactical targets.');
        return;
      }
      if (nextTargetPlan.remainingTargets <= 0) {
        Alert.alert('Drill complete', 'You have reached the required targets/rounds. End the session to submit.');
        return;
      }
    }

    router.push({
      pathname: '/(protected)/scanTarget',
      params: {
        sessionId,
        distance: defaultDistance.toString(),
        ...(hasDrill ? { locked: '1' } : {}),
        ...(hasDrill && drill && !isInfiniteShots(drill.rounds_per_shooter)
          ? { maxShots: String(drill.rounds_per_shooter) }
          : {}),
        ...(drill?.drill_goal ? { drillGoal: drill.drill_goal } : {}),
      },
    });
  }, [sessionId, defaultDistance, hasDrill, drill, nextTargetPlan]);

  const handleLogTactical = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (hasDrill && drill && nextTargetPlan) {
      if (drill.target_type !== 'tactical') {
        Alert.alert('Wrong target type', 'This drill requires paper targets.');
        return;
      }
      if (nextTargetPlan.remainingShots <= 0 || nextTargetPlan.remainingTargets <= 0) {
        Alert.alert('Drill complete', 'You have reached the required targets/rounds. End the session to submit.');
        return;
      }
    }

    router.push({
      pathname: '/(protected)/tacticalTarget',
      params: {
        sessionId,
        distance: defaultDistance.toString(),
        ...(hasDrill ? { locked: '1' } : {}),
        ...(hasDrill && nextTargetPlan?.nextBullets
          ? { bullets: String(nextTargetPlan.nextBullets) }
          : {}),
      },
    });
  }, [sessionId, defaultDistance, hasDrill, drill, nextTargetPlan]);

  const handleManualRoute = useCallback(() => {
    if (!manualRoute) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: manualRoute.pathname, params: manualRoute.params } as any);
  }, [manualRoute]);

  const handleScanRoute = useCallback(() => {
    if (!scanRoute) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: scanRoute.pathname, params: scanRoute.params } as any);
  }, [scanRoute]);

  const handleTargetPress = useCallback((target: SessionTargetWithResults) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Open target detail modal
  }, []);

  const handleCompleteDrill = useCallback(async () => {
    setShowCompletionModal(false);
    setEnding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await endSession(sessionId!);
      if (session?.team_id) {
        await loadTeamSessions();
      } else {
        await loadPersonalSessions();
      }
      router.replace('/(protected)/(tabs)');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to end session');
      setEnding(false);
    }
  }, [sessionId, session?.team_id, loadPersonalSessions, loadTeamSessions]);

  const handleFixResults = useCallback(() => {
    setShowCompletionModal(false);
  }, []);

  const handleEndSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const meetsRequirements = !!drillProgress && drillProgress.isComplete && drillProgress.meetsAccuracy && drillProgress.meetsTime;
    const { title, message } = buildEndSessionMessage(
      hasDrill,
      drill,
      drillProgress,
      meetsRequirements,
      totalShots,
      targets.length,
      accuracy,
      elapsedTime
    );

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: hasDrill && !meetsRequirements ? 'End Anyway' : 'End Session',
        style: 'destructive',
        onPress: async () => {
          setEnding(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await endSession(sessionId!);

            if (garminStatus === 'CONNECTED') {
              sendToGarmin('SESSION_END', {
                sessionId: sessionId,
                duration: elapsedTime,
                targetsCount: targets.length,
                accuracy: accuracy,
              });
              console.log('[Garmin] 📤 Sent SESSION_END to watch');
            }

            if (session?.team_id) {
              await loadTeamSessions();
            } else {
              await loadPersonalSessions();
            }
            router.replace('/(protected)/(tabs)');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', error.message || 'Failed to end session');
            setEnding(false);
          }
        },
      },
    ]);
  }, [
    sessionId,
    targets.length,
    elapsedTime,
    session?.team_id,
    loadPersonalSessions,
    loadTeamSessions,
    hasDrill,
    drill,
    drillProgress,
    totalShots,
    accuracy,
    garminStatus,
    sendToGarmin,
  ]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hasData = targets.length > 0;
    const sessionName = drill?.name || 'Session';

    if (hasData) {
      Alert.alert(
        'What would you like to do?',
        `"${sessionName}" has ${targets.length} target${targets.length !== 1 ? 's' : ''} recorded.\n\nSession timer: ${formatTime(elapsedTime)}`,
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'End & Save',
            style: 'destructive',
            onPress: async () => {
              setEnding(true);
              try {
                await endSession(sessionId!);
                if (session?.team_id) {
                  await loadTeamSessions();
                } else {
                  await loadPersonalSessions();
                }
                router.replace('/(protected)/(tabs)');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', error.message || 'Failed to end session');
                setEnding(false);
              }
            },
          },
          {
            text: 'Leave Active',
            onPress: () => {
              Alert.alert(
                'Session Will Stay Active',
                'Remember to return and end your session. Sessions left active for more than 2 hours will be prompted for resolution.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'No targets recorded yet',
        'Would you like to cancel this session or keep it active?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Cancel Session',
            style: 'destructive',
            onPress: async () => {
              try {
                const { deleteSession } = await import('@/services/sessionService');
                await deleteSession(sessionId!);
                if (session?.team_id) {
                  await loadTeamSessions();
                } else {
                  await loadPersonalSessions();
                }
                router.replace('/(protected)/(tabs)');
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel session');
              }
            },
          },
          {
            text: 'Leave Active',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [sessionId, session?.team_id, targets.length, drill?.name, elapsedTime, loadPersonalSessions, loadTeamSessions]);

  const handleContinueWithoutWatch = useCallback(async () => {
    try {
      await updateSession(session!.id, { watch_controlled: false });
      setWatchStartFailed(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update session');
    }
  }, [session, loadData]);

  const handleRetryWatchConnection = useCallback(() => {
    garminNotifiedRef.current = false;
    setWatchStartFailed(false);
    startWatchSessionWithRetry();
  }, [startWatchSessionWithRetry]);

  // ============================================================================
  // RETURN
  // ============================================================================
  return {
    // Data
    session,
    targets,
    stats,

    // Loading states
    loading,
    refreshing,
    ending,

    // Timer
    elapsedTime,

    // Computed values
    drill,
    hasDrill,
    totalShots,
    totalHits,
    accuracy,
    drillProgress,
    nextTargetPlan,
    defaultDistance,
    drillLimitReached,
    score,

    // Drill type flags
    isGroupingDrill,
    isAchievementDrill,
    isPaperDrill,
    isTacticalDrill,

    // Watch state
    watchState,

    // Completion modal
    showCompletionModal,

    // Actions
    loadData,
    handleRefresh,
    handleScanPaper,
    handleLogTactical,
    handleManualRoute,
    handleScanRoute,
    handleTargetPress,
    handleEndSession,
    handleClose,
    handleCompleteDrill,
    handleFixResults,
    handleContinueWithoutWatch,
    handleRetryWatchConnection,

    // Route helpers
    showManual,
    showScan,
  };
}

