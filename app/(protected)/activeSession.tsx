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
    showManual,
    showScan,
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

        <View style={styles.timerContainer}>
          <View style={[styles.liveDot, drillProgress?.overTime && { backgroundColor: COLORS.error }]} />
          <Text style={[styles.timerText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}>
            {formatTime(elapsedTime)}
          </Text>
        </View>
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

      {/* Add Target Button */}
      {(showScan || showManual) && !drillLimitReached && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={localStyles.actionsContainer}>
          <TouchableOpacity
            style={[localStyles.addBtn, { backgroundColor: colors.text }]}
            onPress={showScan ? handleScanRoute : handleManualRoute}
          >
            {showScan ? <Camera size={18} color={colors.background} /> : <Crosshair size={18} color={colors.background} />}
            <Text style={[localStyles.addBtnText, { color: colors.background }]}>
              {showScan ? 'Scan Target' : 'Add Entry'}
            </Text>
          </TouchableOpacity>
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
        <View style={styles.timerContainer}>
          <View style={[styles.liveDot, { backgroundColor: COLORS.error }]} />
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
        </View>
      </View>

      <View style={styles.watchWaitingContainer}>
        <View style={[styles.watchWaitingIconBg, { backgroundColor: colors.secondary }]}>
          <Watch size={48} color={colors.textMuted} />
        </View>
        <Text style={[styles.watchWaitingTitle, { color: colors.text, marginTop: 24 }]}>Watch Not Responding</Text>
        <Text style={[styles.watchWaitingDesc, { color: colors.textMuted }]}>
          Could not start session on watch.
        </Text>

        <View style={styles.watchFailedActions}>
          <TouchableOpacity
            style={[localStyles.actionBtn, { backgroundColor: colors.text, borderWidth: 0 }]}
            onPress={onRetry}
            disabled={watchStarting}
          >
            {watchStarting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color={colors.background} />
                <Text style={[localStyles.actionBtnText, { color: colors.background }]}>Retry</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[localStyles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onContinueWithoutWatch}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={colors.text} />
            <Text style={[localStyles.actionBtnText, { color: colors.text }]}>Continue Without Watch</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => router.back()}>
            <Text style={[localStyles.actionBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function WatchStartingView({ colors, insets, drillName, onClose }: any) {
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
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={[styles.watchWaitingTitle, { color: colors.text, marginTop: 24 }]}>Starting Watch...</Text>
        <Text style={[styles.watchWaitingDesc, { color: colors.textMuted }]}>Sending session to your watch</Text>
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
        <View style={styles.timerContainer}>
          <View style={[styles.liveDot, { backgroundColor: isWatchConnected ? '#10B981' : COLORS.warning }]} />
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(elapsedTime)}</Text>
        </View>
      </View>

      <View style={styles.watchWaitingContainer}>
        <View style={[styles.watchWaitingIconBg, { backgroundColor: colors.secondary }]}>
          <Watch size={48} color={isWatchConnected ? '#10B981' : colors.textMuted} />
        </View>
        <Text style={[styles.watchWaitingTitle, { color: colors.text, marginTop: 24 }]}>
          {isWatchConnected ? 'Watch in Control' : 'Watch Disconnected'}
        </Text>
        <Text style={[styles.watchWaitingDesc, { color: colors.textMuted }]}>
          {isWatchConnected
            ? 'End the session on your watch when finished.'
            : 'Reconnect your watch or end manually.'}
        </Text>

        {drill && (
          <View style={[localStyles.drillMeta, { backgroundColor: colors.card, marginTop: 20 }]}>
            <Text style={[localStyles.drillMetaText, { color: colors.text }]}>
              {drill.distance_m}m • {drill.rounds_per_shooter} shots
              {drill.time_limit_seconds ? ` • ${formatTime(drill.time_limit_seconds)}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={[localStyles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[localStyles.endBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <Square size={16} color={colors.text} />
              <Text style={[localStyles.endBtnText, { color: colors.text }]}>End Session Manually</Text>
            </>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 15, fontWeight: '600' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },

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
});
