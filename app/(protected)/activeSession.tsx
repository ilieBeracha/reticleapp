/**
 * Active Session Screen
 * 
 * Clean, refined design matching the training detail screen.
 * Inline action buttons instead of FAB.
 */

import { TargetCard } from '@/components/session/TargetCard';
import {
  COLORS,
  formatTime,
  SessionPrepView,
  styles,
  useActiveSession,
} from '@/components/session/activeSession';
import { useColors } from '@/hooks/ui/useColors';
import { formatMaxShots } from '@/utils/drillShots';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Check,
  Clock,
  Crosshair,
  Focus,
  MapPin,
  Square,
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
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// HERO TARGET - Large display of most recent target
// ============================================================================
function HeroTarget({
  target,
  onPress,
  colors,
}: {
  target: any;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const hasImage = !!target.image_url;
  const accuracy = target.shots_fired > 0 ? Math.round((target.hits / target.shots_fired) * 100) : 0;

  return (
    <TouchableOpacity
      style={[localStyles.heroTarget, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasImage ? (
        <Image source={{ uri: target.image_url }} style={localStyles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[localStyles.heroPlaceholder, { backgroundColor: colors.secondary }]}>
          <Target size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={localStyles.heroOverlay}>
        <View style={localStyles.heroStats}>
          <View style={localStyles.heroStatItem}>
            <Text style={localStyles.heroStatValue}>{target.shots_fired}</Text>
            <Text style={localStyles.heroStatLabel}>shots</Text>
          </View>
          <View style={[localStyles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={localStyles.heroStatItem}>
            <Text style={localStyles.heroStatValue}>{target.hits}</Text>
            <Text style={localStyles.heroStatLabel}>hits</Text>
          </View>
          <View style={[localStyles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={localStyles.heroStatItem}>
            <Text style={localStyles.heroStatValue}>{accuracy}%</Text>
            <Text style={localStyles.heroStatLabel}>acc</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// COMPACT STATS
// ============================================================================
function CompactStats({
  accuracy,
  totalShots,
  totalHits,
  totalTargets,
  colors,
}: {
  accuracy: number;
  totalShots: number;
  totalHits: number;
  totalTargets: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[localStyles.compactStats, { backgroundColor: colors.card }]}>
      <View style={localStyles.compactStatItem}>
        <Text style={[localStyles.compactStatValue, { color: colors.text }]}>{accuracy}%</Text>
        <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>accuracy</Text>
      </View>
      <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={localStyles.compactStatItem}>
        <Text style={[localStyles.compactStatValue, { color: colors.text }]}>{totalShots}</Text>
        <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>shots</Text>
      </View>
      <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={localStyles.compactStatItem}>
        <Text style={[localStyles.compactStatValue, { color: colors.text }]}>{totalHits}</Text>
        <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>hits</Text>
      </View>
      <View style={[localStyles.compactStatDivider, { backgroundColor: colors.border }]} />
      <View style={localStyles.compactStatItem}>
        <Text style={[localStyles.compactStatValue, { color: colors.text }]}>{totalTargets}</Text>
        <Text style={[localStyles.compactStatLabel, { color: colors.textMuted }]}>targets</Text>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
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
    isGroupingDrill,
    isAchievementDrill,
    isTacticalDrill,
    watchState,
    handleRefresh,
    handleManualRoute,
    handleScanRoute,
    handleTargetPress,
    handleEndSession,
    handleClose,
    handleContinueWithoutWatch,
    handleRetryWatchConnection,
    canAddTarget,
  } = useActiveSession({ sessionId });

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Target size={28} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to shoot</Text>
        <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
          Add your first target to get started
        </Text>
      </View>
    ),
    [colors]
  );

  // Loading
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  // Error / Completed / Cancelled
  if (!session || (session.status !== 'active' && session.status !== 'pending')) {
    const isCompleted = session?.status === 'completed';
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
        <TouchableOpacity
          style={[styles.statusButton, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.statusButtonText, { color: colors.text }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Pending session - show prep view to select watch or phone
  if (session.status === 'pending') {
    return (
      <SessionPrepView
        session={session}
        insets={insets}
        onSessionActivated={(activated) => {
          // Session is now active, the hook will reload data
          handleRefresh();
        }}
        onClose={handleClose}
      />
    );
  }

  // Watch controlled states
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
        />
      );
    }

    if (watchState.watchStarting) {
      return <WatchStartingView colors={colors} insets={insets} drillName={drillName} onClose={handleClose} />;
    }

    // Watch app not open - waiting for user to open it
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
        />
      );
    }

    // Watch has preview queued - waiting for user to tap watch to start
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
        />
      );
    }

    // Session is actively running on watch
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

  // Main render
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={handleClose}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || session.training_title || 'Practice'}
          </Text>
        </View>

        {/* Only show timer if drill has time limit */}
        {drill?.time_limit_seconds ? (
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

      {/* Drill Requirements */}
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

      {/* Hero Target */}
      {targets.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={localStyles.heroContainer}>
          <HeroTarget target={targets[0]} onPress={() => handleTargetPress(targets[0])} colors={colors} />
        </Animated.View>
      )}

      {/* Stats Bar */}
      <Animated.View entering={FadeInDown.delay(50).duration(300)} style={localStyles.statsContainer}>
        <CompactStats
          accuracy={accuracy}
          totalShots={totalShots}
          totalHits={totalHits}
          totalTargets={targets.length}
          colors={colors}
        />
      </Animated.View>

      {/* Add Target Buttons - User chooses scan or manual */}
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
              style={[localStyles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={handleManualRoute}
            >
              <Crosshair size={18} color={colors.text} />
              <Text style={[localStyles.actionBtnText, { color: colors.text }]}>Manual</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Previous Targets */}
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

      {/* End Session Button */}
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
                    color:
                      drillProgress?.isComplete && drillProgress?.meetsAccuracy ? colors.background : colors.text,
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function WatchFailedView({
  colors,
  insets,
  drillName,
  elapsedTime,
  watchStarting,
  onClose,
  onRetry,
  onContinueWithoutWatch,
}: any) {
  // Simple, non-stressful error view
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
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

function WatchStartingView({ colors, insets, drillName, onClose }: any) {
  // Simple connecting state
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
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
        <View style={[localStyles.watchIconLarge, { backgroundColor: colors.secondary }]}>
          <Watch size={56} color={colors.textMuted} strokeWidth={1.5} />
        </View>
        <Text style={[localStyles.calmTitle, { color: colors.text }]}>Connecting to Watch</Text>
        <Text style={[localStyles.calmSubtitle, { color: colors.textMuted }]}>
          Just a moment...
        </Text>
        <ActivityIndicator size="small" color={colors.textMuted} style={{ marginTop: 24 }} />
      </View>
    </View>
  );
}

// Watch has preview queued - waiting for user to tap watch to start
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
}: any) {
  // Calm, focused view
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
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
        <View style={[localStyles.watchIconLarge, { backgroundColor: watchAppNotOpen ? '#F59E0B15' : '#10B98115' }]}>
          <Watch size={56} color={watchAppNotOpen ? '#F59E0B' : '#10B981'} strokeWidth={1.5} />
        </View>
        
        <Text style={[localStyles.calmTitle, { color: colors.text }]}>
          {watchAppNotOpen ? 'Open Watch App' : 'Tap Watch to Start'}
        </Text>
        <Text style={[localStyles.calmSubtitle, { color: colors.textMuted, paddingHorizontal: 40 }]}>
          {watchAppNotOpen 
            ? 'Open ReticleIQ on your Garmin and tap to begin'
            : 'Session is ready. Tap your watch when you\'re in position.'
          }
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

        {/* Subtle waiting indicator */}
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={[{ fontSize: 12, marginTop: 8 }, { color: colors.textMuted }]}>
            Waiting...
          </Text>
        </View>
      </View>

      <View style={[localStyles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[localStyles.subtleBtn, { borderColor: colors.border }]}
          onPress={onContinueWithoutWatch}
          disabled={ending}
        >
          <Text style={[localStyles.subtleBtnText, { color: colors.textMuted }]}>
            Use Phone Instead
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
}: any) {
  // Clean, calm view - no timer on phone (watch has it)
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Minimal header - no timer */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
        </View>
        {/* Status indicator instead of timer */}
        <View style={[localStyles.statusBadge, { backgroundColor: isWatchConnected ? '#10B98120' : '#F59E0B20' }]}>
          <View style={[localStyles.statusDot, { backgroundColor: isWatchConnected ? '#10B981' : '#F59E0B' }]} />
          <Text style={[localStyles.statusText, { color: isWatchConnected ? '#10B981' : '#F59E0B' }]}>
            {isWatchConnected ? 'Active' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Calm center content */}
      <View style={styles.watchWaitingContainer}>
        <View style={[localStyles.watchIconLarge, { backgroundColor: isWatchConnected ? '#10B98115' : colors.secondary }]}>
          <Watch size={56} color={isWatchConnected ? '#10B981' : colors.textMuted} strokeWidth={1.5} />
        </View>
        
        <Text style={[localStyles.calmTitle, { color: colors.text }]}>
          Session Running on Watch
        </Text>
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

      {/* Subtle end button */}
      <View style={[localStyles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[localStyles.subtleBtn, { borderColor: colors.border }]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={[localStyles.subtleBtnText, { color: colors.textMuted }]}>
              End Session from Phone
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DrillBanner({ colors, drill, drillProgress, targets, isGroupingDrill, isTacticalDrill }: any) {
  return (
    <View style={styles.drillBanner}>
      <View style={[styles.drillBannerInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.drillInfoRow}>
          <View style={[styles.drillTypeIcon, { backgroundColor: colors.secondary }]}>
            {isGroupingDrill ? <Focus size={16} color={colors.text} /> : <Trophy size={16} color={colors.text} />}
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

// ============================================================================
// LOCAL STYLES
// ============================================================================
const localStyles = StyleSheet.create({
  // Hero
  heroContainer: { paddingHorizontal: 16, marginBottom: 12 },
  heroTarget: { borderRadius: 12, overflow: 'hidden', height: 160 },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  heroStatItem: { alignItems: 'center' },
  heroStatValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroStatDivider: { width: 1, height: 24 },

  // Stats
  statsContainer: { paddingHorizontal: 16, marginBottom: 12 },
  compactStats: { flexDirection: 'row', borderRadius: 10, padding: 12 },
  compactStatItem: { flex: 1, alignItems: 'center' },
  compactStatValue: { fontSize: 16, fontWeight: '700' },
  compactStatLabel: { fontSize: 11, marginTop: 2 },
  compactStatDivider: { width: 1, height: 28 },

  // Actions
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

  // Bottom
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

  // Drill meta
  drillMeta: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  drillMetaText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  // Watch preview queued
  pulseIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseText: { fontSize: 14, fontWeight: '500' },

  // Calm watch-controlled styles
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  watchIconLarge: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    alignItems: 'center', 
    justifyContent: 'center' 
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
    marginTop: 28 
  },
  drillChipText: { fontSize: 14, fontWeight: '600' },
  drillChipDivider: { width: 1, height: 14 },
  subtleBtn: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 44, 
    borderRadius: 10, 
    borderWidth: 1 
  },
  subtleBtnText: { fontSize: 14, fontWeight: '500' },
  
  // Failed view
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
});
