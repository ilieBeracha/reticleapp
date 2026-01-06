/**
 * useActiveSession Hook
 * 
 * Manages all stateful logic for the Active Session Screen.
 * Handles data loading, timer, watch integration, and actions.
 */

import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { GarminSessionData } from '@/services/garminService';
// getDrillInputRoutes no longer used - user always chooses scan vs manual
import { computeSessionScore } from '@/services/session/scoring';
import {
  calculateSessionStats,
  endSession,
  getSessionById,
  getSessionTargetsWithResults,
  saveWatchSessionData,
  SessionStats,
  SessionTargetWithResults,
  SessionWithDetails,
  updateSession,
} from '@/services/sessionService';
import { useGarminStore, useIsGarminConnected, useSessionStartStatus } from '@/store/garminStore';
import { useSessionStore } from '@/store/sessionStore';
import { isInfiniteShots } from '@/utils/drillShots';

import { deriveDetectionConfig } from '@/utils/detectionSensitivity';
import {
  SHOT_MARKING_ENABLED,
  TIMER_INTERVAL_MS,
  VIBRATE_ON_SHOT
} from './activeSession.constants';
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
import type { UseActiveSessionParams, UseActiveSessionReturn } from './activeSession.types';

export function useActiveSession({ sessionId }: UseActiveSessionParams): UseActiveSessionReturn {
  const { loadPersonalSessions, loadTeamSessions } = useSessionStore();
  const {
    status: garminStatus,
    send: sendToGarmin,
    lastSessionData,
    setSessionDataCallback,
    setWatchSessionCompleteCallback,
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
  
  // Watch preview queued - watch received SESSION_START and is showing preview
  // User must tap watch to actually start the session
  const [watchPreviewQueued, setWatchPreviewQueued] = useState(false);
  
  // Watch app not open - user needs to open it manually
  const [watchAppNotOpen, setWatchAppNotOpen] = useState(false);

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
  const isEngagementDrill = drill?.drill_goal === 'engagement';
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
    // True when watch has received SESSION_START and is showing preview
    // User must tap watch to actually start - mobile shows "Start on your watch"
    watchPreviewQueued,
    // True when watch is reachable but app not open - user needs to open manually
    watchAppNotOpen,
  };

  // Score
  const score = useMemo(() => {
    if (!stats) return null;
    return computeSessionScore(stats, drill);
  }, [stats, drill]);

  // Input routes - user always chooses scan vs manual
  // Routes are always available (not determined by drill config)
  const canAddTarget = !drillLimitReached && !!sessionId;

  // ============================================================================
  // GARMIN INTEGRATION - Start session on watch
  // ============================================================================
  
  const startWatchSessionWithRetry = useCallback(async () => {
    if (!session) return;
    
    // Can only send messages when app is open (CONNECTED)
    // ONLINE means watch is reachable but app not running - can't send!
    if (garminStatus === 'ONLINE') {
      console.log('[Garmin] ⚠️ Watch ONLINE but app not open - waiting for user to open app');
      setWatchAppNotOpen(true);
      setWatchStartFailed(false);
      setWatchPreviewQueued(false);
      setWatchStarting(false);
      return;
    }
    
    if (garminStatus !== 'CONNECTED') {
      console.log('[Garmin] ⚠️ Watch not reachable, status:', garminStatus);
      setWatchStartFailed(true);
      setWatchAppNotOpen(false);
      setWatchPreviewQueued(false);
      return;
    }
    
    // App is open - can send!
    setWatchAppNotOpen(false);

    // Derive detection sensitivity from weapon
    // Uses caliber-specific thresholds for accurate shot detection
    const weaponInfo = session.weapon_id ? {
      category: session.weapon_category,
      caliber: session.weapon_caliber,
      // Could add suppressor detection from weapon config
    } : undefined;
    
    const detectionConfig = deriveDetectionConfig({
      category: weaponInfo?.category as any,
      caliber: weaponInfo?.caliber,
    });
    
    console.log(`[Garmin] 🎯 Weapon: ${weaponInfo?.caliber || 'unknown'} (${weaponInfo?.category || 'any'})`);
    console.log(`[Garmin] 🎯 Detection: ${detectionConfig.sensitivity}G, cooldown=${detectionConfig.cooldownMs}ms, profile=${detectionConfig.profile} (${detectionConfig.description})`);

    const payload = buildWatchSessionPayload(session, {
      autoDetect: true,
      weapon: weaponInfo ? {
        category: weaponInfo.category,
        caliber: weaponInfo.caliber,
      } : undefined,
      emkv: SHOT_MARKING_ENABLED,
      vrcv: VIBRATE_ON_SHOT,
    });

    setWatchStarting(true);
    setWatchStartFailed(false);

    console.log('[Garmin] 📤 Sending SESSION_START...');
    const success = await startSessionWithRetry(payload);
    setWatchStarting(false);

    if (!success) {
      console.warn('[Garmin] ❌ Watch did not acknowledge SESSION_START');
      setWatchStartFailed(true);
      setWatchPreviewQueued(false);
    } else {
      console.log('[Garmin] ✅ Watch acknowledged SESSION_START - waiting for user to start on watch');
      setWatchStartFailed(false);
      setWatchPreviewQueued(true);
    }
  }, [session, garminStatus, startSessionWithRetry]);

  useEffect(() => {
    // Only send to watch if user explicitly chose watch control
    if (!session || !session.watch_controlled || garminNotifiedRef.current) return;
    if (garminStatus !== 'CONNECTED' && garminStatus !== 'ONLINE') return;

    garminNotifiedRef.current = true;
    startWatchSessionWithRetry();
  }, [session, garminStatus, startWatchSessionWithRetry]);

  // Auto-send when watch app opens (transitions from ONLINE to CONNECTED)
  useEffect(() => {
    if (!session || !session.watch_controlled) return;
    if (!watchAppNotOpen) return; // Only if we were waiting for app to open
    if (garminStatus === 'CONNECTED') {
      console.log('[Garmin] 📲 Watch app now CONNECTED - sending session...');
      setWatchAppNotOpen(false);
      garminNotifiedRef.current = false; // Allow retry
      startWatchSessionWithRetry();
    }
  }, [session, watchAppNotOpen, garminStatus, startWatchSessionWithRetry]);

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
    const handleWatchSessionData = async (data: GarminSessionData) => {
      console.log('[Garmin] 📩 Received session data from watch:', data);

      if (data.sessionId && data.sessionId !== sessionId) {
        console.log('[Garmin] 📩 Session ID mismatch, ignoring');
        return;
      }

      // Use just sessionId as key - we should only process ONE summary per session
      // This prevents duplicates from watch retries (which may have slightly different durations)
      const dataKey = `summary-${data.sessionId}`;
      if (watchDataProcessedRef.current.has(dataKey)) {
        console.log('[Garmin] 📩 Already processed summary for this session (retry detected), ignoring');
        return;
      }
      watchDataProcessedRef.current.add(dataKey);

      // =========================================================================
      // AUTO-SAVE: Save immediately so SESSION_DETAILS can merge into it
      // =========================================================================
      console.log('[Garmin] 📩 Auto-saving watch summary to DB...');
      try {
        await saveWatchSessionData({
          sessionId: sessionId!,
          shotsRecorded: data.shotsRecorded,
          hitsRecorded: data.shotsRecorded, // Default hits = shots
          durationMs: data.durationMs || 0,
          distance: data.distance,
          completed: false, // Don't end session yet - user can review
          splitTimes: data.splitTimes,
          avgSplitMs: data.avgSplitMs,
          performance: data.performance,
          biometrics: data.biometrics,
          steadiness: data.steadiness,
        }, false); // false = don't end session
        console.log('[Garmin] ✅ Watch summary auto-saved successfully');
      } catch (saveError) {
        console.error('[Garmin] ❌ Failed to auto-save watch data:', saveError);
        // Continue to results page anyway - user can retry save there
      }

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
          trainingId: session?.training_id || '',
          // Flag indicating data was auto-saved
          autoSaved: '1',
          // Split times from watch
          splitTimes: data.splitTimes ? JSON.stringify(data.splitTimes) : '',
          avgSplitMs: data.avgSplitMs ? String(data.avgSplitMs) : '',
          // Legacy heart rate fields (backwards compatible)
          heartRateAvg: data.heartRate?.avg ? String(data.heartRate.avg) : '',
          heartRateMax: data.heartRate?.max ? String(data.heartRate.max) : '',
          heartRateMin: data.heartRate?.min ? String(data.heartRate.min) : '',
          drillName: session?.drill_name || drill?.name || '',
          weaponName: session?.weapon_name || '',
          // Drill goal (grouping vs engagement) - determines input type
          drillGoal: drill?.drill_goal || 'engagement',
          // Performance analytics (JSON stringified)
          performance: data.performance ? JSON.stringify(data.performance) : '',
          // Full biometrics data (JSON stringified)
          biometrics: data.biometrics ? JSON.stringify(data.biometrics) : '',
          // Steadiness data (JSON stringified)
          steadiness: data.steadiness ? JSON.stringify(data.steadiness) : '',
          // Weather conditions (JSON stringified)
          weather: data.weather ? JSON.stringify(data.weather) : '',
        },
      });
    };

    setSessionDataCallback(handleWatchSessionData);

    return () => {
      setSessionDataCallback(null);
    };
  }, [sessionId, session?.team_id, session?.training_id, setSessionDataCallback, clearLastSessionData]);

  // ============================================================================
  // WATCH SESSION COMPLETE DETECTION (via heartbeat state)
  // When watch goes from active/preview to idle, session is complete
  // This catches completion even if SESSION_SUMMARY was lost
  // ============================================================================
  useEffect(() => {
    if (!sessionId || !isWatchConnected) return;

    const handleWatchSessionComplete = (watchSessionId: string, shotCount: number) => {
      console.log(`[ActiveSession] 🏁 Watch session complete: ${watchSessionId}, shots: ${shotCount}`);
      
      // Only process if this is our session
      if (watchSessionId !== sessionId) {
        console.log(`[ActiveSession] ⚠️ Session ID mismatch (expected: ${sessionId})`);
        return;
      }

      // Reload data to get latest from DB (timeline should be saved by now)
      console.log('[ActiveSession] 🔄 Reloading session data after watch completion...');
      loadData();

      // Show completion feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    setWatchSessionCompleteCallback(handleWatchSessionComplete);

    return () => {
      setWatchSessionCompleteCallback(null);
    };
  }, [sessionId, isWatchConnected, setWatchSessionCompleteCallback, loadData]);

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
        ...(isGroupingDrill ? { isGrouping: '1' } : {}),
      },
    });
  }, [sessionId, defaultDistance, hasDrill, drill, nextTargetPlan, isGroupingDrill]);

  const handleManualRoute = useCallback(() => {
    if (!canAddTarget) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(protected)/tacticalTarget',
      params: {
        sessionId,
        distance: defaultDistance.toString(),
        ...(hasDrill ? { locked: '1' } : {}),
        ...(hasDrill && nextTargetPlan?.nextBullets
          ? { bullets: String(nextTargetPlan.nextBullets) }
          : {}),
        ...(isGroupingDrill ? { isGrouping: '1' } : {}),
      },
    });
  }, [canAddTarget, sessionId, defaultDistance, hasDrill, nextTargetPlan, isGroupingDrill]);

  const handleScanRoute = useCallback(() => {
    if (!canAddTarget) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const maxShots = hasDrill && drill?.rounds_per_shooter && !isInfiniteShots(drill.rounds_per_shooter)
      ? String(drill.rounds_per_shooter)
      : undefined;
    router.push({
      pathname: '/(protected)/scanTarget',
      params: {
        sessionId,
        distance: String(defaultDistance),
        ...(maxShots ? { maxShots } : {}),
        drillGoal: isGroupingDrill ? 'grouping' : 'engagement',
        ...(hasDrill ? { locked: '1' } : {}),
      },
    });
  }, [canAddTarget, sessionId, defaultDistance, hasDrill, drill, isGroupingDrill]);

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
      
      // Smart navigation: Only show results recap if watch data exists
      if (lastSessionData) {
        // Has watch data → show results page with charts
        const resultsParams: Record<string, string> = { 
          sessionId: sessionId!,
          watchData: JSON.stringify(lastSessionData),
        };
        if (session?.training_id) {
          resultsParams.trainingId = session.training_id;
        }
        router.replace({
          pathname: '/(protected)/sessionResults',
          params: resultsParams,
        });
      } else if (session?.training_id) {
        // Team training, no watch data → back to training
        router.replace({
          pathname: '/(protected)/trainingDetail',
          params: { id: session.training_id },
        });
      } else {
        // Solo, no watch data → back to home
        router.replace('/(protected)/(tabs)');
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to end session');
      setEnding(false);
    }
  }, [sessionId, session?.team_id, session?.training_id, loadPersonalSessions, loadTeamSessions, lastSessionData]);

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

            // Smart navigation: Only show results recap if watch data exists
            if (lastSessionData) {
              // Has watch data → show results page with charts
              const resultsParams: Record<string, string> = { 
                sessionId: sessionId!,
                watchData: JSON.stringify(lastSessionData),
              };
              if (session?.training_id) {
                resultsParams.trainingId = session.training_id;
              }
              router.replace({
                pathname: '/(protected)/sessionResults',
                params: resultsParams,
              });
            } else if (session?.training_id) {
              // Team training, no watch data → back to training
              router.replace({
                pathname: '/(protected)/trainingDetail',
                params: { id: session.training_id },
              });
            } else {
              // Solo, no watch data → back to home
              router.replace('/(protected)/(tabs)');
            }
            
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
    session?.training_id,
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
                
                // Navigate to results page
                const resultsParams: Record<string, string> = { sessionId: sessionId! };
                if (lastSessionData) {
                  resultsParams.watchData = JSON.stringify(lastSessionData);
                }
                if (session?.training_id) {
                  resultsParams.trainingId = session.training_id;
                }
                router.replace({
                  pathname: '/(protected)/sessionResults',
                  params: resultsParams,
                });
                
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
                // Redirect back to training if session was part of one
                if (session?.training_id) {
                  router.replace({
                    pathname: '/(protected)/trainingDetail',
                    params: { id: session.training_id },
                  });
                } else {
                  router.replace('/(protected)/(tabs)');
                }
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
  }, [sessionId, session?.team_id, session?.training_id, targets.length, drill?.name, elapsedTime, loadPersonalSessions, loadTeamSessions]);

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
    setWatchPreviewQueued(false);
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
    isEngagementDrill,
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
    canAddTarget,
  };
}

