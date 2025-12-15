/**
 * Active Session Screen
 * 
 * Shows the current active shooting session with targets, stats, and actions.
 * Clear separation between Paper (scan) and Tactical (manual) target flows.
 */

import { TargetCard } from '@/components/session/TargetCard';
import { useColors } from '@/hooks/ui/useColors';
import {
  calculateSessionStats,
  endSession,
  getSessionById,
  getSessionTargetsWithResults,
  SessionStats,
  SessionTargetWithResults,
  SessionWithDetails
} from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, CheckCircle, Clock, Crosshair, Focus, MapPin, Target, Trophy, X, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { loadPersonalSessions, loadTeamSessions } = useSessionStore();

  // State
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);
  
  // Drill completion modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const completionShownRef = useRef(false);

  // Live timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Live timer
  useEffect(() => {
    if (session?.started_at) {
      const startTime = new Date(session.started_at).getTime();
      const updateElapsed = () => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      };
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [session?.started_at]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const drill = session?.drill_config;
  const hasDrill = !!drill;
  
  const totalShots = stats?.totalShotsFired ?? 0;
  const totalHits = stats?.totalHits ?? 0;
  const accuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

  // Drill progress tracking
  const drillProgress = useMemo(() => {
    if (!drill) return null;
    
    // === Drill semantics (IMPORTANT) ===
    // - strings_count = how many rounds/repetitions
    // - rounds_per_shooter = bullets per round (per entry)
    // Each "round" corresponds to one target entry (user fills the form once per round).
    const rounds = drill.strings_count && drill.strings_count > 0 ? drill.strings_count : 1;
    const bulletsPerRound = drill.rounds_per_shooter;

    const requiredRounds = bulletsPerRound * rounds; // total bullets required
    const requiredTargets = rounds; // number of entries required

    const shotsProgress = requiredRounds > 0 ? Math.min(100, Math.round((totalShots / requiredRounds) * 100)) : 0;
    const targetsProgress = requiredTargets > 0 ? Math.min(100, Math.round((targets.length / requiredTargets) * 100)) : 0;
    
    const isComplete = totalShots >= requiredRounds && targets.length >= requiredTargets;
    const meetsAccuracy = !drill.min_accuracy_percent || accuracy >= drill.min_accuracy_percent;
    const meetsTime = !drill.time_limit_seconds || elapsedTime <= drill.time_limit_seconds;
    
    return {
      rounds,
      bulletsPerRound,
      requiredRounds,
      requiredTargets,
      shotsProgress,
      targetsProgress,
      isComplete,
      meetsAccuracy,
      meetsTime,
      overTime: drill.time_limit_seconds ? elapsedTime > drill.time_limit_seconds : false,
    };
  }, [drill, totalShots, targets.length, accuracy, elapsedTime]);

  // Next target planning (drill-driven)
  const nextTargetPlan = useMemo(() => {
    if (!drillProgress || !drill) return null;

    const remainingShots = Math.max(0, drillProgress.requiredRounds - totalShots);
    const remainingTargets = Math.max(0, drillProgress.requiredTargets - targets.length);

    if (remainingShots <= 0 || remainingTargets <= 0) {
      return { remainingShots, remainingTargets, nextBullets: 0 };
    }

    // Drill contract: fixed bullets per round
    const nextBullets = remainingTargets === 1
      ? remainingShots
      : Math.min(remainingShots, drillProgress.bulletsPerRound);

    return { remainingShots, remainingTargets, nextBullets };
  }, [drillProgress, drill, totalShots, targets.length]);

  const drillDistance = drill?.distance_m || 100;
  const defaultDistance = useMemo(() => {
    if (drill) return drill.distance_m;
    if (targets.length === 0) return 100;
    return Math.round(targets.reduce((sum, t) => sum + (t.distance_m || 0), 0) / targets.length);
  }, [drill, targets]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // AUTO-COMPLETION DETECTION
  // ============================================================================
  // Show completion modal when drill requirements are met
  useEffect(() => {
    if (!hasDrill || !drillProgress) return;
    
    // Only show once per session
    if (completionShownRef.current) return;
    
    // Check if drill is complete (all requirements met)
    if (drillProgress.isComplete && drillProgress.meetsAccuracy && drillProgress.meetsTime) {
      completionShownRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCompletionModal(true);
    }
  }, [hasDrill, drillProgress]);

  // Handle completing the drill from the modal
  const handleCompleteDrill = useCallback(async () => {
    setShowCompletionModal(false);
    setEnding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await endSession(sessionId!);
      // Reload sessions and navigate back
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

  // Handle fixing results (dismiss modal, continue editing)
  const handleFixResults = useCallback(() => {
    setShowCompletionModal(false);
    // User can continue editing targets
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  // Paper scan - uses drill distance if available
  const handleScanPaper = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Enforce drill boundaries on the client
    if (hasDrill && drill && nextTargetPlan) {
      if (drill.target_type !== 'paper') {
        Alert.alert('Wrong target type', 'This drill requires tactical targets.');
        return;
      }
      if (nextTargetPlan.remainingShots <= 0 || nextTargetPlan.remainingTargets <= 0) {
        Alert.alert(
          'Drill complete',
          'You have reached the required targets/rounds. End the session to submit.'
        );
        return;
      }
    }

    router.push({
      pathname: '/(protected)/scanTarget',
      params: {
        sessionId,
        distance: defaultDistance.toString(),
        ...(hasDrill ? { locked: '1' } : {}),
        ...(hasDrill && nextTargetPlan?.nextBullets
          ? { bullets: String(nextTargetPlan.nextBullets) }
          : {}),
        // Pass drill_goal so scanTarget knows whether to save as grouping or achievement
        ...(drill?.drill_goal ? { drillGoal: drill.drill_goal } : {}),
      },
    });
  }, [sessionId, defaultDistance, hasDrill, drill, nextTargetPlan]);

  // Tactical entry - uses drill distance if available
  const handleLogTactical = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Enforce drill boundaries on the client
    if (hasDrill && drill && nextTargetPlan) {
      if (drill.target_type !== 'tactical') {
        Alert.alert('Wrong target type', 'This drill requires paper targets.');
        return;
      }
      if (nextTargetPlan.remainingShots <= 0 || nextTargetPlan.remainingTargets <= 0) {
        Alert.alert(
          'Drill complete',
          'You have reached the required targets/rounds. End the session to submit.'
        );
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

  const handleTargetPress = useCallback((target: SessionTargetWithResults) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Open target detail modal
  }, []);

  const handleEndSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isDrillSession = hasDrill && !!drill && !!drillProgress;
    const drillMeetsRequirements = !!drillProgress && drillProgress.isComplete && drillProgress.meetsAccuracy && drillProgress.meetsTime;

    const title = isDrillSession && !drillMeetsRequirements ? 'End Drill Early?' : 'End Session?';
    const message = isDrillSession && drillProgress && !drillMeetsRequirements
      ? [
          `This drill has requirements that are not met yet.`,
          ``,
          `Shots: ${totalShots}/${drillProgress.requiredRounds}`,
          `Targets: ${targets.length}/${drillProgress.requiredTargets}`,
          ...(drill?.min_accuracy_percent
            ? [`Accuracy: ${accuracy}% (min ${drill.min_accuracy_percent}%)`]
            : []),
          ...(drill?.time_limit_seconds
            ? [`Time: ${formatTime(elapsedTime)} (limit ${formatTime(drill.time_limit_seconds)})`]
            : []),
          ``,
          `Ending now will NOT count as a drill completion.`,
        ].join('\n')
      : `${targets.length} target${targets.length !== 1 ? 's' : ''} logged • ${formatTime(elapsedTime)} elapsed`;

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isDrillSession && !drillMeetsRequirements ? 'End Anyway' : 'End Session',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await endSession(sessionId!);
              // Reload sessions and navigate back to home
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
      ]
    );
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
  ]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Leave Session?',
      'Your session stays active. You can return later.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => router.back() },
      ]
    );
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderTarget = useCallback(
    ({ item, index }: { item: SessionTargetWithResults; index: number }) => {
      // Use TargetCard component which properly handles grouping vs achievement display
      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
          <TargetCard
            target={item}
            index={targets.length - index}
            onPress={() => handleTargetPress(item)}
          />
        </Animated.View>
      );
    },
    [targets.length, handleTargetPress]
  );

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: '#10B98115' }]}>
        <Target size={32} color="#10B981" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to shoot</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
        Use the buttons below to scan a{'\n'}paper target or log results manually
      </Text>
    </View>
  ), [colors]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ============================================================================
  // ERROR / COMPLETED STATE
  // ============================================================================
  if (!session || session.status !== 'active') {
    const isCompleted = session?.status === 'completed';
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.statusIcon, { backgroundColor: isCompleted ? '#10B98120' : '#EF444420' }]}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={isCompleted ? '#10B981' : '#EF4444'}
          />
        </View>
        <Text style={[styles.statusTitle, { color: colors.text }]}>
          {isCompleted ? 'Session Completed' : 'Session not found'}
        </Text>
        <TouchableOpacity 
          style={[styles.statusButton, { backgroundColor: colors.secondary }]} 
          onPress={() => router.back()}
        >
          <Text style={[styles.statusButtonText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  // Determine which action buttons to show based on drill_goal
  // - Grouping drills: scan only (no hit % tracking)
  // - Achievement drills: scan OR manual (tracks hit %)
  // - No drill (free practice): both options available
  const isGroupingDrill = drill?.drill_goal === 'grouping';
  const isAchievementDrill = drill?.drill_goal === 'achievement';
  
  // Determine target type from drill config
  const isPaperTarget = !drill || drill.target_type === 'paper';
  const isTacticalTarget = drill?.target_type === 'tactical';
  
  // Show buttons based on target_type:
  // - Paper targets (including paper+achievement): show scan
  // - Tactical targets: show manual entry
  // - No drill (free practice): show both
  const showScan = !drill || isPaperTarget;
  const showManual = !drill || isTacticalTarget;
  
  // Legacy compatibility - keep for UI color hints
  const isPaperDrill = isGroupingDrill || drill?.target_type === 'paper';
  const isTacticalDrill = isTacticalTarget;
  
  const drillLimitReached =
    !!drill && !!nextTargetPlan && (nextTargetPlan.remainingShots <= 0 || nextTargetPlan.remainingTargets <= 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View 
        entering={FadeIn.duration(300)}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary }]}
          onPress={handleClose}
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || session.training_title || 'Practice Session'}
          </Text>
        </View>
        
        <View style={styles.timerContainer}>
          <View style={[styles.liveDot, drillProgress?.overTime && { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.timerText, { color: drillProgress?.overTime ? '#EF4444' : colors.text }]}>
            {formatTime(elapsedTime)}
          </Text>
        </View>
      </Animated.View>

      {/* Drill Requirements Banner */}
      {hasDrill && drill && (
        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.drillBanner}>
          <View style={[styles.drillBannerInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Drill Info Row */}
            <View style={styles.drillInfoRow}>
              <View style={[styles.drillTypeIcon, { backgroundColor: isGroupingDrill ? 'rgba(16,185,129,0.15)' : 'rgba(147,197,253,0.15)' }]}>
                {isGroupingDrill ? <Focus size={16} color="#10B981" /> : <Trophy size={16} color="#93C5FD" />}
              </View>
              <View style={styles.drillInfoText}>
                <View style={styles.drillRequirements}>
                  <View style={styles.drillReqItem}>
                    <MapPin size={12} color={colors.textMuted} />
                    <Text style={[styles.drillReqText, { color: colors.text }]}>{drill.distance_m}m</Text>
                  </View>
                  {/* Show shots/round for tactical, or "Scan" for paper targets */}
                  <View style={styles.drillReqItem}>
                    {isTacticalDrill ? (
                      <>
                        <Zap size={12} color={colors.textMuted} />
                        <Text style={[styles.drillReqText, { color: colors.text }]}>
                          {drillProgress?.bulletsPerRound ?? drill.rounds_per_shooter} shots/round
                        </Text>
                      </>
                    ) : (
                      <>
                        <Camera size={12} color={colors.textMuted} />
                        <Text style={[styles.drillReqText, { color: colors.text }]}>Scan</Text>
                      </>
                    )}
                  </View>
                  {drillProgress?.rounds && drillProgress.rounds > 1 && (
                    <View style={styles.drillReqItem}>
                      <Ionicons name="repeat" size={12} color={colors.textMuted} />
                      <Text style={[styles.drillReqText, { color: colors.text }]}>
                        {drillProgress.rounds} rounds
                      </Text>
                    </View>
                  )}
                  {drill.time_limit_seconds && (
                    <View style={styles.drillReqItem}>
                      <Clock size={12} color={drillProgress?.overTime ? '#EF4444' : colors.textMuted} />
                      <Text style={[styles.drillReqText, { color: drillProgress?.overTime ? '#EF4444' : colors.text }]}>
                        {formatTime(drill.time_limit_seconds)}
                      </Text>
                    </View>
                  )}
                  {drill.min_accuracy_percent && (
                    <View style={styles.drillReqItem}>
                      <Target size={12} color={colors.textMuted} />
                      <Text style={[styles.drillReqText, { color: colors.text }]}>{drill.min_accuracy_percent}%</Text>
                    </View>
                  )}
                </View>
              </View>
              {drillProgress?.isComplete && (
                <View style={[styles.drillCompleteBadge, { backgroundColor: 'rgba(147,197,253,0.15)' }]}>
                  <CheckCircle size={14} color="#93C5FD" />
                </View>
              )}
            </View>

            {/* Progress Bar */}
            <View style={styles.drillProgressContainer}>
              <View style={[styles.drillProgressBg, { backgroundColor: colors.secondary }]}>
                <View 
                  style={[
                    styles.drillProgressFill, 
                    { 
                      width: `${drillProgress?.targetsProgress || 0}%`,
                      backgroundColor: drillProgress?.isComplete ? '#93C5FD' : colors.text,
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.drillProgressText, { color: colors.textMuted }]}>
                {targets.length}/{drillProgress?.requiredTargets ?? 1} rounds
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Stats Card */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsSection}>
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Main Accuracy Display */}
          <View style={styles.accuracyCenter}>
            <Text style={[styles.accuracyValue, { 
              color: drill?.min_accuracy_percent 
                ? (accuracy >= drill.min_accuracy_percent ? '#93C5FD' : accuracy >= drill.min_accuracy_percent * 0.8 ? '#F59E0B' : '#EF4444')
                : (accuracy >= 70 ? '#93C5FD' : accuracy >= 50 ? '#F59E0B' : colors.text)
            }]}>
              {accuracy}%
            </Text>
            <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>
              {drill?.min_accuracy_percent ? `goal: ${drill.min_accuracy_percent}%` : 'accuracy'}
            </Text>
          </View>
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(147,197,253,0.1)' }]}>
                <Target size={16} color="#93C5FD" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{targets.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {hasDrill ? 'rounds' : 'targets'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: colors.secondary }]}>
                <Crosshair size={16} color={colors.textMuted} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalShots}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: 'rgba(147,197,253,0.1)' }]}>
                <Ionicons name="checkmark" size={16} color="#93C5FD" />
              </View>
              <Text style={[styles.statValue, { color: '#93C5FD' }]}>{totalHits}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>hits</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Targets List */}
      <View style={styles.listContainer}>
        {targets.length > 0 && (
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            TARGETS ({targets.length})
          </Text>
        )}
        <FlatList
          data={targets}
          renderItem={renderTarget}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 180 },
            targets.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Bottom Actions - Floating */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.bottomActionsInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* End Session */}
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndSession}
            disabled={ending}
            activeOpacity={0.7}
          >
            {ending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="stop-circle" size={24} color="#EF4444" />
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

          {/* Show appropriate button(s) based on drill_goal */}
          {/* Manual entry - only for achievement drills or free practice */}
          {showManual && (
            <TouchableOpacity
              style={[
                styles.tacticalButton,
                isAchievementDrill && styles.primaryActionBtn,
                drillLimitReached && { opacity: 0.5 },
              ]}
              onPress={handleLogTactical}
              disabled={drillLimitReached}
              activeOpacity={0.8}
            >
              <Crosshair size={20} color={isAchievementDrill ? '#fff' : colors.textMuted} />
              <Text style={[styles.tacticalButtonText, { color: isAchievementDrill ? '#fff' : colors.text }]}>
                {isAchievementDrill
                  ? (nextTargetPlan?.nextBullets
                      ? `Manual (${nextTargetPlan.nextBullets}rds)`
                      : 'Manual Entry')
                  : 'Manual'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Scan - Always available (primary for grouping drills) */}
          {showScan && (
            <TouchableOpacity
              style={[
                styles.scanButton,
                isGroupingDrill && styles.scanButtonPrimary,
                drillLimitReached && { opacity: 0.5 },
              ]}
              onPress={handleScanPaper}
              disabled={drillLimitReached}
              activeOpacity={0.8}
            >
              <Camera size={20} color="#fff" />
              <Text style={styles.scanButtonText}>
                {isGroupingDrill
                  ? (nextTargetPlan?.nextBullets
                      ? `Scan (${nextTargetPlan.nextBullets}rds)`
                      : 'Scan Grouping')
                  : 'Scan'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Drill Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={handleFixResults}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Success Icon */}
            <View style={styles.modalIconContainer}>
              <CheckCircle size={56} color="#10B981" />
            </View>
            
            {/* Title */}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Drill Complete!
            </Text>
            
            {/* Stats Summary */}
            <View style={styles.modalStats}>
              <View style={styles.modalStatRow}>
                <Text style={[styles.modalStatLabel, { color: colors.textMuted }]}>Targets</Text>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>{targets.length}</Text>
              </View>
              <View style={styles.modalStatRow}>
                <Text style={[styles.modalStatLabel, { color: colors.textMuted }]}>Shots</Text>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>{totalShots}</Text>
              </View>
              <View style={styles.modalStatRow}>
                <Text style={[styles.modalStatLabel, { color: colors.textMuted }]}>Accuracy</Text>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>{accuracy}%</Text>
              </View>
              {stats?.bestDispersionCm && (
                <View style={styles.modalStatRow}>
                  <Text style={[styles.modalStatLabel, { color: colors.textMuted }]}>Best Group</Text>
                  <Text style={[styles.modalStatValue, { color: colors.text }]}>{stats.bestDispersionCm.toFixed(1)}cm</Text>
                </View>
              )}
              <View style={styles.modalStatRow}>
                <Text style={[styles.modalStatLabel, { color: colors.textMuted }]}>Time</Text>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
              </View>
            </View>
            
            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, { borderColor: colors.border }]}
                onPress={handleFixResults}
              >
                <Text style={[styles.modalSecondaryButtonText, { color: colors.text }]}>Fix Results</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleCompleteDrill}
                disabled={ending}
              >
                {ending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>Done</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Drill Banner
  drillBanner: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  drillBannerInner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  drillInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drillTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfoText: {
    flex: 1,
  },
  drillRequirements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  drillReqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drillReqText: {
    fontSize: 13,
    fontWeight: '600',
  },
  drillCompleteBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  drillProgressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  drillProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  drillProgressText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  accuracyCenter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  accuracyValue: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  accuracyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  listContent: {
    gap: 10,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Status States
  statusIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  statusButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  bottomActionsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  endButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: 1,
    height: 24,
  },
  tacticalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  tacticalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryActionBtn: {
    backgroundColor: '#93C5FD',
    paddingVertical: 12,
  },
  scanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#93C5FD',
    paddingVertical: 12,
    gap: 6,
  },
  scanButtonPrimary: {
    flex: 1.2,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Completion Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  modalStats: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
