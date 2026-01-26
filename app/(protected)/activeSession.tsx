/**
 * Active Session Screen
 *
 * Clean, refined design matching the training detail screen.
 * Inline action buttons instead of FAB.
 */

import { TargetCard } from '@/components/session/TargetCard';
import { WeatherStrip } from '@/components/session/WeatherDisplay';
import { COLORS, formatTime, SessionPrepView, SquadSessionView, styles, useActiveSession } from '@/components/session/activeSession';
import { PAPER_TYPE } from '@/constants';
import { isGroupingPaper, isPaperTarget } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import { useOpenWeather } from '@/hooks/useOpenWeather';
import { isGroupingSession } from '@/utils/drillGoal';
import { formatMaxShots } from '@/utils/drillShots';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Check,
  Clock,
  Crosshair,
  Focus,
  Lock,
  MapPin,
  Square,
  Target,
  Trophy,
  Watch,
  X,
  Zap
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function HeroTarget({
  target,
  onPress,
  colors,
}: {
  target: any;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isPaper = isPaperTarget(target.target_type);
  const paperResult = target.paper_result;

  const imageUrl = paperResult?.scanned_image_url;
  const hasImage = !!imageUrl;

  const isScanned = isPaper && !!paperResult?.scanned_image_url;
  const isGrouping = isPaper && isGroupingPaper(paperResult?.paper_type);

  const distance = target.distance_m;
  const dispersion = paperResult?.dispersion_cm;
  const hits = paperResult?.hits_total ?? target.tactical_result?.hits ?? 0;

  const typeLabel = isGrouping ? 'Grouping' : isScanned ? 'Scanned' : 'Manual';
  const typeColor = isGrouping ? '#22C55E' : isScanned ? '#A78BFA' : '#60A5FA';

  return (
    <TouchableOpacity
      style={[localStyles.heroTarget, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasImage ? (
        <Image source={{ uri: imageUrl }} style={localStyles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[localStyles.heroPlaceholder, { backgroundColor: colors.secondary }]}>
          <Target size={32} color={colors.textMuted} />
        </View>
      )}

      {/* Top badges: Distance + Type */}
      <View style={localStyles.heroBadgeRow}>
        {distance && (
          <View style={localStyles.heroDistanceBadge}>
            <Text style={localStyles.heroDistanceText}>{distance}m</Text>
          </View>
        )}
        <View style={[localStyles.heroTypeBadge, { backgroundColor: typeColor }]}>
          <Text style={localStyles.heroTypeText}>{typeLabel}</Text>
        </View>
      </View>

      {/* Bottom: Key metric only */}
      <View style={localStyles.heroOverlay}>
        <Text style={localStyles.heroMetricValue}>
          {isGrouping && dispersion != null ? `${dispersion.toFixed(1)}cm` : `${hits} ${isScanned ? 'holes' : 'hits'}`}
        </Text>
        <Text style={localStyles.heroMetricLabel}>
          {isGrouping ? 'group size' : isScanned ? 'detected' : 'recorded'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CompactStats({ targets, colors }: { targets: any[]; colors: ReturnType<typeof useColors> }) {
  let manualShots = 0;
  let manualHits = 0;
  let scannedHoles = 0;
  let bestDispersion: number | null = null;
  let groupingCount = 0;
  let scanCount = 0;
  let manualCount = 0;

  for (const t of targets) {
    const isPaper = isPaperTarget(t.target_type);
    const paperResult = t.paper_result;
    const tacticalResult = t.tactical_result;
    const isScanned = isPaper && !!paperResult?.scanned_image_url;
    const isGrouping = isPaper && isGroupingPaper(paperResult?.paper_type);

    if (isGrouping) {
      groupingCount++;
      const disp = paperResult?.dispersion_cm;
      if (disp != null && (bestDispersion == null || disp < bestDispersion)) {
        bestDispersion = disp;
      }
    } else if (isScanned) {
      scanCount++;
      scannedHoles += paperResult?.hits_total ?? 0;
    } else {
      manualCount++;
      manualShots += paperResult?.bullets_fired ?? tacticalResult?.bullets_fired ?? 0;
      manualHits += paperResult?.hits_total ?? tacticalResult?.hits ?? 0;
    }
  }

  const manualAccuracy = manualShots > 0 ? Math.round((manualHits / manualShots) * 100) : 0;
  const totalTargets = targets.length;

  const hasManual = manualCount > 0;
  const hasScan = scanCount > 0;
  const hasGrouping = groupingCount > 0;

  return (
    <View style={[localStyles.compactStats, { backgroundColor: colors.card }]}>
      <View style={localStyles.compactStatItem}>
        <Text style={[localStyles.compactStatValue, { color: colors.text }]}>{totalTargets}</Text>
        <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>targets</Text>
      </View>

      <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />

      {hasManual ? (
        <>
          <View style={localStyles.compactStatItem}>
            <Text
              style={[
                localStyles.compactStatValue,
                { color: manualAccuracy >= 70 ? '#22C55E' : manualAccuracy >= 50 ? '#F59E0B' : colors.text },
              ]}
            >
              {manualAccuracy}%
            </Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>accuracy</Text>
          </View>
          <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />
          <View style={localStyles.compactStatItem}>
            <Text style={[localStyles.compactStatValue, { color: colors.text }]}>
              {manualHits}/{manualShots}
            </Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>hits</Text>
          </View>
        </>
      ) : hasScan ? (
        <>
          <View style={localStyles.compactStatItem}>
            <Text style={[localStyles.compactStatValue, { color: '#A78BFA' }]}>{scannedHoles}</Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>holes</Text>
          </View>
          <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />
          <View style={localStyles.compactStatItem}>
            <Text style={[localStyles.compactStatValue, { color: colors.textMuted, fontSize: 11 }]}>no acc</Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>scanned</Text>
          </View>
        </>
      ) : hasGrouping && bestDispersion != null ? (
        <>
          <View style={localStyles.compactStatItem}>
            <Text style={[localStyles.compactStatValue, { color: '#22C55E' }]}>{bestDispersion.toFixed(1)}cm</Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>best</Text>
          </View>
          <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />
          <View style={localStyles.compactStatItem}>
            <Text style={[localStyles.compactStatValue, { color: colors.text }]}>{groupingCount}</Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>groups</Text>
          </View>
        </>
      ) : (
        <>
          <View style={localStyles.compactStatItem}>
            <Text style={[localStyles.compactStatValue, { color: colors.textMuted }]}>-</Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>awaiting</Text>
          </View>
          <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />
          <View style={localStyles.compactStatItem}>
            <Text style={[localStyles.compactStatValue, { color: colors.textMuted }]}>-</Text>
            <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>data</Text>
          </View>
        </>
      )}
    </View>
  );
}

export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const {
    session,
    targets,
    loading,
    refreshing,
    ending,
    elapsedTime,
    drill,
    hasDrill,
    totalShots,
    totalHits,
    accuracy,
    drillProgress,
    drillLimitReached,
    score,
    isTacticalDrill,
    watchState,
    isTeamTraining,
    sessionMode,
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

  // Get current user ID for squad session commander check
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Target size={28} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to shoot</Text>
        <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Add your first target to get started</Text>
      </View>
    ),
    [colors]
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

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
          {isCompleted ? 'Session Completed' : 'Session not found'}
        </Text>

        {/* Clear exit buttons based on context */}
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
                <Text style={[localStyles.exitPrimaryText, { color: colors.background }]}>Return to Training</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={localStyles.exitSecondaryBtn}
                onPress={() => router.replace('/(protected)/(tabs)')}
              >
                <Text style={[localStyles.exitSecondaryText, { color: colors.textMuted }]}>Exit to Home</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: colors.secondary }]}
              onPress={() => router.replace('/(protected)/(tabs)')}
            >
              <Text style={[styles.statusButtonText, { color: colors.text }]}>Go Home</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Show prep view for ALL sessions (both solo and team)
  // Execution policy controls whether user can go back to reconfigure:
  // - 'locked' = config set by commander, no changes allowed
  // - 'guided' or 'free' = user can reconfigure
  const drillExecutionPolicy = session.drill_config?.execution_policy;
  const isConfigLocked = drillExecutionPolicy === 'locked';
  
  if (session.status === 'pending') {
    return (
      <SessionPrepView
        session={session}
        insets={insets}
        onSessionActivated={(activated) => {
          handleRefresh();
        }}
        onBack={
          isConfigLocked
            ? undefined
            : () => {
                // Go back to start engagement to reconfigure
                router.replace({
                  pathname: '/(protected)/startEngagement',
                  params: {
                    purpose: session.drill_config?.drill_goal || PAPER_TYPE.GROUPING,
                    distance: String(session.drill_config?.distance_m || 25),
                    shots: String(session.drill_config?.rounds_per_shooter || 5),
                    // Pass execution policy so startEngagement knows what's editable
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
  // SQUAD SESSION: Collaborative data entry mode
  // Show for any squad engagement (even with 0 participants - commander can start alone)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isSquadEngagement) {
    const isCommander = currentUserId === session.user_id;
    return (
      <SquadSessionView
        sessionId={sessionId}
        session={{
          id: session.id,
          user_id: session.user_id,
          drill_name: session.drill_name,
          drill_config: session.drill_config as any,
          training_id: session.training_id,
        }}
        participants={participants}
        targets={targets}
        isCommander={isCommander}
        onRefresh={loadData}
        onEndSession={handleEndSession}
      />
    );
  }

  if (watchState.isWatchControlled) {
    const drillName = session.drill_name || session.training_title || 'Practice Session';

    if (watchState.watchStartFailed) {
      return (
        <WatchFailedView
          colors={colors}
          insets={insets}
          drillName={drillName}
          elapsedTime={elapsedTime}
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
          colors={colors}
          insets={insets}
          drillName={drillName}
          onClose={handleClose}
          isTeamTraining={isTeamTraining}
        />
      );
    }

    if (watchState.watchAppNotOpen) {
      return (
        <WatchPreviewQueuedView
          colors={colors}
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
        <WatchPreviewQueuedView
          colors={colors}
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
        colors={colors}
        insets={insets}
        drillName={drillName}
        elapsedTime={elapsedTime}
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
  // TEAM TRAINING: Focused execution mode (no clutter, no distractions)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isTeamTraining) {
    const isGrouping = isGroupingSession(session);
    const drillComplete = drillProgress?.isComplete && drillProgress?.meetsAccuracy;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Minimal header - no close button */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={{ width: 36 }} />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {session.drill_name || 'Drill'}
            </Text>
          </View>
          {drill?.time_limit_seconds && watchState.isWatchControlled ? (
            <View style={styles.timerContainer}>
              <View style={[styles.liveDot, drillProgress?.overTime && { backgroundColor: COLORS.error }]} />
              <Text style={[styles.timerText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}>
                {formatTime(elapsedTime)}
              </Text>
            </View>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* Focused drill info card */}
        <View style={localStyles.trainingFocusCard}>
          <View style={[localStyles.trainingFocusInner, { backgroundColor: colors.card }]}>
            {/* Status row */}
            <View style={localStyles.trainingStatusRow}>
              <View style={[localStyles.trainingModeBadge, { backgroundColor: colors.primary + '15' }]}>
                <Lock size={12} color={colors.primary} />
                <Text style={[localStyles.trainingModeText, { color: colors.primary }]}>LOCKED</Text>
              </View>
              {drillComplete && (
                <View style={[localStyles.trainingModeBadge, { backgroundColor: '#10B98120' }]}>
                  <Check size={12} color="#10B981" />
                  <Text style={[localStyles.trainingModeText, { color: '#10B981' }]}>COMPLETE</Text>
                </View>
              )}
            </View>

            {/* Drill params - tight horizontal layout */}
            <View style={localStyles.trainingParamsRow}>
              {session.weapon_name && (
                <View style={localStyles.trainingParam}>
                  <Target size={14} color={colors.primary} />
                  <Text style={[localStyles.trainingParamText, { color: colors.text }]}>{session.weapon_name}</Text>
                </View>
              )}
              <View style={localStyles.trainingParam}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={[localStyles.trainingParamText, { color: colors.text }]}>{drill?.distance_m || 25}m</Text>
              </View>
              <View style={localStyles.trainingParam}>
                <Zap size={14} color={colors.textMuted} />
                <Text style={[localStyles.trainingParamText, { color: colors.text }]}>
                  {drill?.rounds_per_shooter || 5} shots
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={localStyles.trainingProgressWrap}>
              <View style={[localStyles.trainingProgressBg, { backgroundColor: colors.secondary }]}>
                <View
                  style={[
                    localStyles.trainingProgressFill,
                    {
                      width: `${drillProgress?.targetsProgress || 0}%`,
                      backgroundColor: drillComplete ? '#10B981' : colors.text,
                    },
                  ]}
                />
              </View>
              <Text style={[localStyles.trainingProgressText, { color: colors.textMuted }]}>
                {targets.length}/{drillProgress?.requiredTargets ?? 1} targets
              </Text>
            </View>
          </View>
        </View>

        {/* Latest target (if any) */}
        {targets.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)} style={localStyles.heroContainer}>
            <HeroTarget target={targets[0]} onPress={() => handleTargetPress(targets[0])} colors={colors} />
          </Animated.View>
        )}

        {/* Single focused action - based on drill type */}
        {canAddTarget && !drillComplete && (
          <Animated.View entering={FadeInDown.duration(200)} style={localStyles.trainingActionWrap}>
            <TouchableOpacity
              style={[localStyles.trainingActionBtn, { backgroundColor: colors.text }]}
              onPress={isGrouping ? handleScanRoute : handleManualRoute}
            >
              {isGrouping ? (
                <>
                  <Camera size={20} color={colors.background} />
                  <Text style={[localStyles.trainingActionText, { color: colors.background }]}>Scan Target</Text>
                </>
              ) : (
                <>
                  <Crosshair size={20} color={colors.background} />
                  <Text style={[localStyles.trainingActionText, { color: colors.background }]}>Log Result</Text>
                </>
              )}
            </TouchableOpacity>
            {/* Alternative option (small, subtle) */}
            <TouchableOpacity
              style={localStyles.trainingAltAction}
              onPress={isGrouping ? handleManualRoute : handleScanRoute}
            >
              <Text style={[localStyles.trainingAltText, { color: colors.textMuted }]}>
                {isGrouping ? 'or enter manually' : 'or scan paper'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Previous targets list */}
        {targets.length > 1 && (
          <View style={localStyles.trainingPrevList}>
            <Text style={[localStyles.trainingPrevLabel, { color: colors.textMuted }]}>
              PREVIOUS ({targets.length - 1})
            </Text>
            <FlatList
              data={targets.slice(1)}
              renderItem={({ item, index }) => (
                <TargetCard target={item} index={targets.length - 1 - index} onPress={() => handleTargetPress(item)} />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* Bottom action - End Execution */}
        <View
          style={[localStyles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}
        >
          <TouchableOpacity
            style={[
              localStyles.endBtn,
              drillComplete
                ? { backgroundColor: '#10B981' }
                : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={handleEndSession}
            disabled={ending}
          >
            {ending ? (
              <ActivityIndicator size="small" color={drillComplete ? '#fff' : colors.text} />
            ) : (
              <>
                {drillComplete ? <Check size={18} color="#fff" /> : <Square size={16} color={colors.text} />}
                <Text style={[localStyles.endBtnText, { color: drillComplete ? '#fff' : colors.text }]}>
                  {drillComplete ? 'Complete & Return' : 'End Execution'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLO SESSION: Full featured UI with all options
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={handleClose}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || session.training_title || 'Practice'}
          </Text>
        </View>

        {drill?.time_limit_seconds && watchState.isWatchControlled ? (
          <View style={styles.timerContainer}>
            <View style={[styles.liveDot, drillProgress?.overTime && { backgroundColor: COLORS.error }]} />
            <Text style={[styles.timerText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}>
              {formatTime(elapsedTime)}
            </Text>
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {(weather || weatherLoading || weatherError) && (
        <View style={localStyles.weatherContainer}>
          {weatherLoading ? (
            <View style={[localStyles.weatherLoading, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={[localStyles.weatherLoadingText, { color: colors.textMuted }]}>Loading weather...</Text>
            </View>
          ) : weatherError ? (
            <View style={[localStyles.weatherLoading, { backgroundColor: colors.card }]}>
              <Text style={[localStyles.weatherLoadingText, { color: colors.textMuted }]}>{weatherError}</Text>
            </View>
          ) : weather ? (
            <WeatherStrip weather={weather} />
          ) : null}
        </View>
      )}

      {hasDrill && drill && (
        <DrillBanner
          colors={colors}
          drill={drill}
          drillProgress={drillProgress}
          targets={targets}
          isGroupingDrill={isGroupingSession(session)}
          isTacticalDrill={!isGroupingSession(session)}
          weaponName={session.weapon_name}
          isLocked={false}
        />
      )}

      {!hasDrill && session.weapon_name && (
        <View style={[localStyles.weaponBar, { backgroundColor: colors.card }]}>
          <Target size={14} color={colors.primary} />
          <Text style={[localStyles.weaponBarText, { color: colors.text }]}>{session.weapon_name}</Text>
        </View>
      )}

      {targets.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={localStyles.heroContainer}>
          <HeroTarget target={targets[0]} onPress={() => handleTargetPress(targets[0])} colors={colors} />
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(50).duration(300)} style={localStyles.statsContainer}>
        <CompactStats targets={targets} colors={colors} />
      </Animated.View>

      {canAddTarget && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={localStyles.actionsContainer}>
          <View style={localStyles.actionRow}>
            <TouchableOpacity
              style={[localStyles.actionBtn, { backgroundColor: colors.text }]}
              onPress={handleScanRoute}
            >
              <Camera size={18} color={colors.background} />
              <Text style={[localStyles.actionBtnText, { color: colors.background }]}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                localStyles.actionBtn,
                { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
              onPress={handleManualRoute}
            >
              <Crosshair size={18} color={colors.text} />
              <Text style={[localStyles.actionBtnText, { color: colors.text }]}>Manual</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <View style={styles.listContainer}>
        {targets.length > 1 && (
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PREVIOUS ({targets.length - 1})</Text>
        )}
        <FlatList
          data={targets.length > 1 ? targets.slice(1) : []}
          renderItem={({ item, index }) => (
            <TargetCard target={item} index={targets.length - 1 - index} onPress={() => handleTargetPress(item)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={targets.length === 0 ? renderEmpty : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View style={[localStyles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            localStyles.endBtn,
            drillProgress?.isComplete && drillProgress?.meetsAccuracy
              ? { backgroundColor: colors.text }
              : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
          ]}
          onPress={handleEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={drillProgress?.isComplete ? colors.background : colors.text} />
          ) : (
            <>
              {drillProgress?.isComplete && drillProgress?.meetsAccuracy ? (
                <Check size={18} color={colors.background} />
              ) : (
                <Square size={16} color={colors.text} />
              )}
              <Text
                style={[
                  localStyles.endBtnText,
                  {
                    color: drillProgress?.isComplete && drillProgress?.meetsAccuracy ? colors.background : colors.text,
                  },
                ]}
              >
                {drillProgress?.isComplete && drillProgress?.meetsAccuracy ? 'Complete Drill' : 'End Session'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WatchFailedView({
  colors,
  insets,
  drillName,
  elapsedTime,
  watchStarting,
  onClose,
  onRetry,
  onContinueWithoutWatch,
  isTeamTraining,
}: any) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {isTeamTraining ? (
          <View style={{ width: 36 }} />
        ) : (
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.watchWaitingContainer}>
        <View style={[localStyles.watchIconLarge, { backgroundColor: colors.secondary }]}>
          <Watch size={56} color={colors.textMuted} strokeWidth={1.5} />
        </View>

        <Text style={[localStyles.calmTitle, { color: colors.text }]}>Watch Not Responding</Text>
        <Text style={[localStyles.calmSubtitle, { color: colors.textMuted }]}>
          No worries — you can continue on your phone
        </Text>

        <View style={[localStyles.failedActions, { marginTop: 32 }]}>
          <TouchableOpacity
            style={[localStyles.primaryBtn, { backgroundColor: colors.text }]}
            onPress={onContinueWithoutWatch}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={colors.background} />
            <Text style={[localStyles.primaryBtnText, { color: colors.background }]}>Use Phone</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[localStyles.subtleBtn, { borderColor: colors.border, marginTop: 12 }]}
            onPress={onRetry}
            disabled={watchStarting}
          >
            {watchStarting ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Text style={[localStyles.subtleBtnText, { color: colors.textMuted }]}>Try Watch Again</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function WatchStartingView({ colors, insets, drillName, onClose, isTeamTraining }: any) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {isTeamTraining ? (
          <View style={{ width: 36 }} />
        ) : (
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.watchWaitingContainer}>
        <View style={[localStyles.watchIconLarge, { backgroundColor: colors.secondary }]}>
          <Watch size={56} color={colors.textMuted} strokeWidth={1.5} />
        </View>
        <Text style={[localStyles.calmTitle, { color: colors.text }]}>Connecting to Watch</Text>
        <Text style={[localStyles.calmSubtitle, { color: colors.textMuted }]}>Just a moment...</Text>
        <ActivityIndicator size="small" color={colors.textMuted} style={{ marginTop: 24 }} />
      </View>
    </View>
  );
}

function WatchPreviewQueuedView({
  colors,
  insets,
  drillName,
  drill,
  isWatchConnected,
  watchAppNotOpen,
  ending,
  onClose,
  onContinueWithoutWatch,
  weaponName,
  isTeamTraining,
}: any) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {isTeamTraining ? (
          <View style={{ width: 36 }} />
        ) : (
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.watchWaitingContainer}>
        <View style={[localStyles.watchIconLarge, { backgroundColor: watchAppNotOpen ? '#F59E0B15' : '#10B98115' }]}>
          <Watch size={56} color={watchAppNotOpen ? '#F59E0B' : '#10B981'} strokeWidth={1.5} />
        </View>

        <Text style={[localStyles.calmTitle, { color: colors.text }]}>
          {watchAppNotOpen ? 'Open Watch App' : 'Tap Watch to Start'}
        </Text>
        <Text style={[localStyles.calmSubtitle, { color: colors.textMuted, paddingHorizontal: 40 }]}>
          {watchAppNotOpen
            ? 'Open ReticleIQ on your Garmin and tap to begin'
            : "Session is ready. Tap your watch when you're in position."}
        </Text>

        {drill && (
          <View style={[localStyles.drillChip, { backgroundColor: colors.card }]}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={[localStyles.drillChipText, { color: colors.text }]}>{drill.distance_m}m</Text>
            <View style={[localStyles.drillChipDivider, { backgroundColor: colors.border }]} />
            <Zap size={14} color={colors.textMuted} />
            <Text style={[localStyles.drillChipText, { color: colors.text }]}>{drill.rounds_per_shooter} shots</Text>
          </View>
        )}

        {weaponName && (
          <View style={[localStyles.drillChip, { backgroundColor: colors.card, marginTop: 8 }]}>
            <Target size={14} color={colors.primary} />
            <Text style={[localStyles.drillChipText, { color: colors.text }]}>{weaponName}</Text>
          </View>
        )}

        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={[{ fontSize: 12, marginTop: 8 }, { color: colors.textMuted }]}>Waiting...</Text>
        </View>
      </View>

      <View style={[localStyles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[localStyles.subtleBtn, { borderColor: colors.border }]}
          onPress={onContinueWithoutWatch}
          disabled={ending}
        >
          <Text style={[localStyles.subtleBtnText, { color: colors.textMuted }]}>Use Phone Instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WatchWaitingView({
  colors,
  insets,
  drillName,
  drill,
  isWatchConnected,
  ending,
  onClose,
  onEndSession,
  isTeamTraining,
}: any) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {isTeamTraining ? (
          <View style={{ width: 36 }} />
        ) : (
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>
        <View style={[localStyles.statusBadge, { backgroundColor: isWatchConnected ? '#10B98120' : '#F59E0B20' }]}>
          <View style={[localStyles.statusDot, { backgroundColor: isWatchConnected ? '#10B981' : '#F59E0B' }]} />
          <Text style={[localStyles.statusText, { color: isWatchConnected ? '#10B981' : '#F59E0B' }]}>
            {isWatchConnected ? 'Active' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.watchWaitingContainer}>
        <View
          style={[localStyles.watchIconLarge, { backgroundColor: isWatchConnected ? '#10B98115' : colors.secondary }]}
        >
          <Watch size={56} color={isWatchConnected ? '#10B981' : colors.textMuted} strokeWidth={1.5} />
        </View>

        <Text style={[localStyles.calmTitle, { color: colors.text }]}>Session Running on Watch</Text>
        <Text style={[localStyles.calmSubtitle, { color: colors.textMuted }]}>
          Focus on your shooting. Check your wrist for time.
        </Text>

        {drill && (
          <View style={[localStyles.drillChip, { backgroundColor: colors.card }]}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={[localStyles.drillChipText, { color: colors.text }]}>{drill.distance_m}m</Text>
            <View style={[localStyles.drillChipDivider, { backgroundColor: colors.border }]} />
            <Target size={14} color={colors.textMuted} />
            <Text style={[localStyles.drillChipText, { color: colors.text }]}>{drill.rounds_per_shooter} shots</Text>
          </View>
        )}
      </View>

      <View style={[localStyles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[localStyles.subtleBtn, { borderColor: colors.border }]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={[localStyles.subtleBtnText, { color: colors.textMuted }]}>End Session from Phone</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DrillBanner({
  colors,
  drill,
  drillProgress,
  targets,
  isGroupingDrill,
  isTacticalDrill,
  weaponName,
  isLocked,
}: any) {
  return (
    <View style={styles.drillBanner}>
      <View style={[styles.drillBannerInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.drillInfoRow}>
          <View
            style={[styles.drillTypeIcon, { backgroundColor: isLocked ? colors.primary + '20' : colors.secondary }]}
          >
            {isLocked ? (
              <Lock size={16} color={colors.primary} />
            ) : isGroupingDrill ? (
              <Focus size={16} color={colors.text} />
            ) : (
              <Trophy size={16} color={colors.text} />
            )}
          </View>
          <View style={styles.drillInfoText}>
            <View style={styles.drillRequirements}>
              {weaponName && (
                <View style={styles.drillReqItem}>
                  <Target size={12} color={colors.primary} />
                  <Text style={[styles.drillReqText, { color: colors.primary, fontWeight: '600' }]}>{weaponName}</Text>
                </View>
              )}
              <View style={styles.drillReqItem}>
                <MapPin size={12} color={colors.textMuted} />
                <Text style={[styles.drillReqText, { color: colors.text }]}>{drill.distance_m}m</Text>
              </View>
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
                    <Text style={[styles.drillReqText, { color: colors.text }]}>
                      Scan (max {formatMaxShots(drill.rounds_per_shooter)})
                    </Text>
                  </>
                )}
              </View>
              {drill.time_limit_seconds && (
                <View style={styles.drillReqItem}>
                  <Clock size={12} color={drillProgress?.overTime ? COLORS.error : colors.textMuted} />
                  <Text style={[styles.drillReqText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}>
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
            <View style={[styles.drillCompleteBadge, { backgroundColor: colors.secondary }]}>
              <Check size={14} color={colors.text} />
            </View>
          )}
        </View>

        <View style={styles.drillProgressContainer}>
          <View style={[styles.drillProgressBg, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.drillProgressFill,
                {
                  width: `${drillProgress?.targetsProgress || 0}%`,
                  backgroundColor: drillProgress?.isComplete ? colors.green : colors.text,
                },
              ]}
            />
          </View>
          <Text style={[styles.drillProgressText, { color: colors.textMuted }]}>
            {targets.length}/{drillProgress?.requiredTargets ?? 1} entries
          </Text>
        </View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  weatherContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  weatherLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  weatherLoadingText: {
    fontSize: 13,
  },
  weaponBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  weaponBarText: {
    fontSize: 14,
    fontWeight: '600',
  },

  heroContainer: { paddingHorizontal: 16, marginBottom: 12 },
  heroTarget: { borderRadius: 12, overflow: 'hidden', height: 160 },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroDistanceBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroDistanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  heroTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
  },
  heroMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroMetricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsContainer: { paddingHorizontal: 16, marginBottom: 12 },
  compactStats: { flexDirection: 'row', borderRadius: 10, padding: 12 },
  compactStatItem: { flex: 1, alignItems: 'center' },
  compactStatValue: { fontSize: 16, fontWeight: '700' },
  compactStatLabel: { fontSize: 11, marginTop: 2 },
  compactStatDivider: { width: 1, height: 28 },
  actionsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 15, fontWeight: '600' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12 },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 12,
  },
  endBtnText: { fontSize: 16, fontWeight: '600' },

  drillMeta: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  drillMetaText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  pulseIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseText: { fontSize: 14, fontWeight: '500' },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  watchIconLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calmTitle: { fontSize: 22, fontWeight: '700', marginTop: 28, letterSpacing: -0.3 },
  calmSubtitle: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  drillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 28,
  },
  drillChipText: { fontSize: 14, fontWeight: '600' },
  drillChipDivider: { width: 1, height: 14 },
  subtleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  subtleBtnText: { fontSize: 14, fontWeight: '500' },
  failedActions: { width: '100%', paddingHorizontal: 32 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },

  // Training mode badge (for solo sessions showing training context)
  trainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  trainingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAM TRAINING FOCUSED UI STYLES
  // Clean, tight, no distractions - execution mode
  // ═══════════════════════════════════════════════════════════════════════════

  trainingFocusCard: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  trainingFocusInner: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  trainingStatusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trainingModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  trainingModeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trainingParamsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  trainingParam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trainingParamText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainingProgressWrap: {
    gap: 6,
  },
  trainingProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trainingProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  trainingProgressText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Training single action button
  trainingActionWrap: {
    paddingHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  trainingActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 54,
    borderRadius: 14,
  },
  trainingActionText: {
    fontSize: 17,
    fontWeight: '600',
  },
  trainingAltAction: {
    marginTop: 10,
    paddingVertical: 6,
  },
  trainingAltText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Training previous targets list
  trainingPrevList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  trainingPrevLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Exit buttons for completed/not found sessions
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
