/**
 * Active Session Screen
 * 
 * Shows the current active shooting session with targets, stats, and actions.
 * Clear separation between Paper (scan) and Tactical (manual) target flows.
 */

import { TargetCard } from '@/components/session/TargetCard';
import {
  COLORS,
  formatTime,
  styles,
  useActiveSession,
} from '@/components/session/activeSession';
import { useColors } from '@/hooks/ui/useColors';
import type { SessionTargetWithResults } from '@/services/sessionService';
import { formatMaxShots } from '@/utils/drillShots';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  CheckCircle,
  Clock,
  Crosshair,
  Focus,
  MapPin,
  Target,
  Trophy,
  Watch,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
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

  // Use the extracted hook for all logic
  const {
    session,
    targets,
    stats,
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
    nextTargetPlan,
    drillLimitReached,
    score,
    isGroupingDrill,
    isAchievementDrill,
    isTacticalDrill,
    watchState,
    showCompletionModal,
    handleRefresh,
    handleManualRoute,
    handleScanRoute,
    handleTargetPress,
    handleEndSession,
    handleClose,
    handleCompleteDrill,
    handleFixResults,
    handleContinueWithoutWatch,
    handleRetryWatchConnection,
    showManual,
    showScan,
  } = useActiveSession({ sessionId });

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderTarget = useCallback(
    ({ item, index }: { item: SessionTargetWithResults; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
          <TargetCard
            target={item}
            index={targets.length - index}
            onPress={() => handleTargetPress(item)}
          />
        </Animated.View>
    ),
    [targets.length, handleTargetPress]
  );

  const renderEmpty = useCallback(
    () => (
    <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: `${COLORS.success}15` }]}>
          <Target size={32} color={COLORS.success} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to shoot</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
        Use the buttons below to scan a{'\n'}paper target or log results manually
      </Text>
    </View>
    ),
    [colors]
  );

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
        <View
          style={[
            styles.statusIcon,
            { backgroundColor: isCompleted ? `${COLORS.success}20` : `${COLORS.error}20` },
          ]}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={isCompleted ? COLORS.success : COLORS.error}
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
  // WATCH CONTROLLED - FULL PAGE WAITING STATE
  // ============================================================================
  if (watchState.isWatchControlled) {
    const drillName = session.drill_name || session.training_title || 'Practice Session';

    // Show failure state if watch start failed
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
        />
      );
    }

    // Show "starting" state while sending to watch
    if (watchState.watchStarting) {
      return (
        <WatchStartingView
          colors={colors}
          insets={insets}
          drillName={drillName}
          onClose={handleClose}
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
      />
    );
  }

  // ============================================================================
  // MAIN RENDER (Phone-controlled session)
  // ============================================================================
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
          <View style={[styles.liveDot, drillProgress?.overTime && { backgroundColor: COLORS.error }]} />
          <Text
            style={[styles.timerText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}
          >
            {formatTime(elapsedTime)}
          </Text>
        </View>
      </Animated.View>

      {/* Drill Requirements Banner */}
      {hasDrill && drill && (
        <DrillBanner
          colors={colors}
          drill={drill}
          drillProgress={drillProgress}
          targets={targets}
          isGroupingDrill={isGroupingDrill}
          isTacticalDrill={isTacticalDrill}
        />
      )}

      {/* Stats Card */}
      <StatsCard
        colors={colors}
        accuracy={accuracy}
        drill={drill}
        drillProgress={drillProgress}
        hasDrill={hasDrill}
        targets={targets}
        totalShots={totalShots}
        totalHits={totalHits}
        score={score}
      />

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

      {/* Bottom Actions */}
      <BottomActions
        colors={colors}
        insets={insets}
        ending={ending}
        drillLimitReached={drillLimitReached}
        isAchievementDrill={isAchievementDrill}
        isGroupingDrill={isGroupingDrill}
        hasDrill={hasDrill}
        drill={drill}
        nextTargetPlan={nextTargetPlan}
        showManual={showManual}
        showScan={showScan}
        onEndSession={handleEndSession}
        onManualRoute={handleManualRoute}
        onScanRoute={handleScanRoute}
      />

      {/* Drill Completion Modal */}
      <CompletionModal
        visible={showCompletionModal}
        colors={colors}
        targets={targets}
        totalShots={totalShots}
        accuracy={accuracy}
        stats={stats}
        elapsedTime={elapsedTime}
        ending={ending}
        onFixResults={handleFixResults}
        onComplete={handleCompleteDrill}
      />
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS (could be extracted to separate files if needed)
// ============================================================================

interface WatchFailedViewProps {
  colors: any;
  insets: any;
  drillName: string;
  elapsedTime: number;
  watchStarting: boolean;
  onClose: () => void;
  onRetry: () => void;
  onContinueWithoutWatch: () => void;
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
}: WatchFailedViewProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary }]}
          onPress={onClose}
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>

        <View style={styles.timerContainer}>
          <View style={[styles.liveDot, { backgroundColor: COLORS.error }]} />
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
        </View>
      </View>

      <View style={styles.watchWaitingContainer}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.watchWaitingIconContainer}>
          <View style={[styles.watchWaitingIconBg, { backgroundColor: COLORS.errorBg }]}>
            <Watch size={48} color={COLORS.error} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.watchWaitingText}>
          <Text style={[styles.watchWaitingTitle, { color: colors.text }]}>Watch Not Responding</Text>
          <Text style={[styles.watchWaitingDesc, { color: colors.textMuted }]}>
            Could not start session on watch after 3 attempts.{'\n'}
            The watch may not be in range or the app may not be open.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.watchFailedActions}>
          <TouchableOpacity
            style={[styles.watchFailedButton, styles.watchFailedRetryButton]}
            onPress={onRetry}
            disabled={watchStarting}
          >
            {watchStarting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.watchFailedRetryText}>Retry Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.watchFailedButton,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={onContinueWithoutWatch}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={colors.text} />
            <Text style={[styles.watchFailedButtonText, { color: colors.text }]}>
              Continue Without Watch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.watchFailedButton, { backgroundColor: 'transparent' }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.watchFailedCancelText, { color: colors.textMuted }]}>
              Cancel Session
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

interface WatchStartingViewProps {
  colors: any;
  insets: any;
  drillName: string;
  onClose: () => void;
}

function WatchStartingView({ colors, insets, drillName, onClose }: WatchStartingViewProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary }]}
          onPress={onClose}
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <View style={styles.watchWaitingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.watchWaitingTitle, { color: colors.text, marginTop: 24 }]}>
          Starting Watch Session...
        </Text>
        <Text style={[styles.watchWaitingDesc, { color: colors.textMuted }]}>
          Sending session data to your watch
        </Text>
      </View>
    </View>
  );
}

interface WatchWaitingViewProps {
  colors: any;
  insets: any;
  drillName: string;
  elapsedTime: number;
  drill: any;
  isWatchConnected: boolean;
  ending: boolean;
  onClose: () => void;
  onEndSession: () => void;
}

function WatchWaitingView({
  colors,
  insets,
  drillName,
  elapsedTime,
  drill,
  isWatchConnected,
  ending,
  onClose,
  onEndSession,
}: WatchWaitingViewProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.secondary }]}
          onPress={onClose}
        >
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>

        <View style={styles.timerContainer}>
          <View style={[styles.liveDot, { backgroundColor: COLORS.success }]} />
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
        </View>
      </View>

      <View style={styles.watchWaitingContainer}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.watchWaitingIconContainer}>
          <View
            style={[
              styles.watchWaitingPulseOuter,
              { borderColor: isWatchConnected ? COLORS.success : COLORS.warning },
            ]}
          />
          <View
            style={[
              styles.watchWaitingIconBg,
              { backgroundColor: isWatchConnected ? COLORS.successBg : COLORS.warningBg },
            ]}
          >
            <Watch size={48} color={isWatchConnected ? COLORS.success : COLORS.warning} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.watchWaitingText}>
          <Text style={[styles.watchWaitingTitle, { color: colors.text }]}>
            {isWatchConnected ? 'Watch in Control' : 'Watch Disconnected'}
          </Text>
          <Text style={[styles.watchWaitingDesc, { color: colors.textMuted }]}>
            {isWatchConnected
              ? 'Your Garmin watch is tracking this session.\nEnd the session on your watch when finished.'
              : 'Reconnect your watch to continue tracking,\nor end the session manually below.'}
          </Text>
        </Animated.View>

        {drill && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={[styles.watchWaitingDrillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.watchWaitingDrillRow}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={[styles.watchWaitingDrillText, { color: colors.text }]}>{drill.distance_m}m</Text>
            </View>
            {drill.rounds_per_shooter && (
              <View style={styles.watchWaitingDrillRow}>
                <Zap size={14} color={colors.textMuted} />
                <Text style={[styles.watchWaitingDrillText, { color: colors.text }]}>
                  {drill.rounds_per_shooter} shots
                </Text>
              </View>
            )}
            {drill.time_limit_seconds && (
              <View style={styles.watchWaitingDrillRow}>
                <Clock size={14} color={colors.textMuted} />
                <Text style={[styles.watchWaitingDrillText, { color: colors.text }]}>
                  {formatTime(drill.time_limit_seconds)} limit
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          style={[
            styles.watchWaitingStatusBadge,
            { backgroundColor: isWatchConnected ? `${COLORS.success}15` : `${COLORS.warning}15` },
          ]}
        >
          <View
            style={[styles.watchWaitingStatusDot, { backgroundColor: isWatchConnected ? COLORS.success : COLORS.warning }]}
          />
          <Text
            style={[styles.watchWaitingStatusText, { color: isWatchConnected ? COLORS.success : COLORS.warning }]}
          >
            {isWatchConnected ? 'Watch Connected' : 'Watch Not Connected'}
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.watchWaitingBottom, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.watchWaitingEndButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={COLORS.error} />
          ) : (
            <>
              <Ionicons name="stop-circle" size={20} color={COLORS.error} />
              <Text style={[styles.watchWaitingEndText, { color: colors.text }]}>End Session Manually</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface DrillBannerProps {
  colors: any;
  drill: any;
  drillProgress: any;
  targets: any[];
  isGroupingDrill: boolean;
  isTacticalDrill: boolean;
}

function DrillBanner({ colors, drill, drillProgress, targets, isGroupingDrill, isTacticalDrill }: DrillBannerProps) {
  return (
        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.drillBanner}>
          <View style={[styles.drillBannerInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.drillInfoRow}>
          <View
            style={[
              styles.drillTypeIcon,
              { backgroundColor: isGroupingDrill ? COLORS.successBg : COLORS.accentBg },
            ]}
          >
            {isGroupingDrill ? <Focus size={16} color={COLORS.success} /> : <Trophy size={16} color={COLORS.accent} />}
              </View>
              <View style={styles.drillInfoText}>
                <View style={styles.drillRequirements}>
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
                  {drillProgress?.rounds && drillProgress.rounds > 1 && (
                    <View style={styles.drillReqItem}>
                      <Ionicons name="repeat" size={12} color={colors.textMuted} />
                  <Text style={[styles.drillReqText, { color: colors.text }]}>{drillProgress.rounds} rounds</Text>
                    </View>
                  )}
                  {drill.time_limit_seconds && (
                    <View style={styles.drillReqItem}>
                  <Clock size={12} color={drillProgress?.overTime ? COLORS.error : colors.textMuted} />
                  <Text
                    style={[styles.drillReqText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}
                  >
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
            <View style={[styles.drillCompleteBadge, { backgroundColor: COLORS.accentBg }]}>
              <CheckCircle size={14} color={COLORS.accent} />
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
                  backgroundColor: drillProgress?.isComplete ? COLORS.accent : colors.text,
                },
                  ]} 
                />
              </View>
              <Text style={[styles.drillProgressText, { color: colors.textMuted }]}>
                {targets.length}/{drillProgress?.requiredTargets ?? 1} entries
              </Text>
            </View>
          </View>
        </Animated.View>
  );
}

interface StatsCardProps {
  colors: any;
  accuracy: number;
  drill: any;
  drillProgress: any;
  hasDrill: boolean;
  targets: any[];
  totalShots: number;
  totalHits: number;
  score: any;
}

function StatsCard({ colors, accuracy, drill, drillProgress, hasDrill, targets, totalShots, totalHits, score }: StatsCardProps) {
  const getAccuracyColor = () => {
    if (drill?.min_accuracy_percent) {
      if (accuracy >= drill.min_accuracy_percent) return COLORS.accent;
      if (accuracy >= drill.min_accuracy_percent * 0.8) return COLORS.warning;
      return COLORS.error;
    }
    if (accuracy >= 70) return COLORS.accent;
    if (accuracy >= 50) return COLORS.warning;
    return colors.text;
  };

  return (
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsSection}>
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.accuracyCenter}>
          <Text style={[styles.accuracyValue, { color: getAccuracyColor() }]}>{accuracy}%</Text>
            <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>
              {drill?.min_accuracy_percent ? `goal: ${drill.min_accuracy_percent}%` : 'accuracy'}
            </Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: COLORS.accentBg }]}>
              <Target size={16} color={COLORS.accent} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{targets.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {hasDrill ? 'entries' : 'targets'}
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
            <View style={[styles.statIconBg, { backgroundColor: COLORS.accentBg }]}>
              <Ionicons name="checkmark" size={16} color={COLORS.accent} />
              </View>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>{totalHits}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>hits</Text>
            </View>
            {score?.mode === 'points' && (
              <View style={styles.statItem}>
              <View style={[styles.statIconBg, { backgroundColor: `${COLORS.warning}12` }]}>
                <Trophy size={16} color={COLORS.warning} />
                </View>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{Math.round(score.value)}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>points</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
  );
}

interface BottomActionsProps {
  colors: any;
  insets: any;
  ending: boolean;
  drillLimitReached: boolean;
  isAchievementDrill: boolean;
  isGroupingDrill: boolean;
  hasDrill: boolean;
  drill: any;
  nextTargetPlan: any;
  showManual: boolean;
  showScan: boolean;
  onEndSession: () => void;
  onManualRoute: () => void;
  onScanRoute: () => void;
}

function BottomActions({
  colors,
  insets,
  ending,
  drillLimitReached,
  isAchievementDrill,
  isGroupingDrill,
  hasDrill,
  drill,
  nextTargetPlan,
  showManual,
  showScan,
  onEndSession,
  onManualRoute,
  onScanRoute,
}: BottomActionsProps) {
  return (
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <View style={[styles.bottomActionsInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.endButton} onPress={onEndSession} disabled={ending} activeOpacity={0.7}>
            {ending ? (
            <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
            <Ionicons name="stop-circle" size={24} color={COLORS.error} />
            )}
          </TouchableOpacity>

          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />

          {showManual && (
            <TouchableOpacity
              style={[
                styles.tacticalButton,
                isAchievementDrill && styles.primaryActionBtn,
                drillLimitReached && { opacity: 0.5 },
              ]}
            onPress={onManualRoute}
              disabled={drillLimitReached}
              activeOpacity={0.8}
            >
              <Crosshair size={20} color={isAchievementDrill ? '#fff' : colors.textMuted} />
              <Text style={[styles.tacticalButtonText, { color: isAchievementDrill ? '#fff' : colors.text }]}>
              {nextTargetPlan?.nextBullets ? `Manual (${nextTargetPlan.nextBullets}rds)` : 'Manual'}
              </Text>
            </TouchableOpacity>
          )}

          {showScan && (
            <TouchableOpacity
              style={[
                styles.scanButton,
                isGroupingDrill && styles.scanButtonPrimary,
                drillLimitReached && { opacity: 0.5 },
              ]}
            onPress={onScanRoute}
              disabled={drillLimitReached}
              activeOpacity={0.8}
            >
              <Camera size={20} color="#fff" />
              <Text style={styles.scanButtonText}>
                {hasDrill && drill?.target_type === 'paper'
                  ? `Scan (max ${formatMaxShots(drill.rounds_per_shooter)})`
                  : isGroupingDrill
                    ? 'Scan Grouping'
                    : 'Scan'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
  );
}

interface CompletionModalProps {
  visible: boolean;
  colors: any;
  targets: any[];
  totalShots: number;
  accuracy: number;
  stats: any;
  elapsedTime: number;
  ending: boolean;
  onFixResults: () => void;
  onComplete: () => void;
}

function CompletionModal({
  visible,
  colors,
  targets,
  totalShots,
  accuracy,
  stats,
  elapsedTime,
  ending,
  onFixResults,
  onComplete,
}: CompletionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFixResults}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalIconContainer}>
            <CheckCircle size={56} color={COLORS.success} />
            </View>
            
          <Text style={[styles.modalTitle, { color: colors.text }]}>Drill Complete!</Text>
            
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
                <Text style={[styles.modalStatValue, { color: colors.text }]}>
                  {stats.bestDispersionCm.toFixed(1)}cm
                </Text>
                </View>
              )}
              <View style={styles.modalStatRow}>
                <Text style={[styles.modalStatLabel, { color: colors.textMuted }]}>Time</Text>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalSecondaryButton, { borderColor: colors.border }]}
              onPress={onFixResults}
              >
                <Text style={[styles.modalSecondaryButtonText, { color: colors.text }]}>Fix Results</Text>
              </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={onComplete} disabled={ending}>
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
  );
}
