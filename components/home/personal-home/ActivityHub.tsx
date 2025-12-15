import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { SessionStats, SessionWithDetails, ThemeColors, WeeklyStats } from './types';
import { ActiveSessionCard } from './activityHub/ActiveSessionCard';
import { EmptyState } from './activityHub/EmptyState';
import { LastSessionCard } from './activityHub/LastSessionCard';
import { LiveTrainingCard } from './activityHub/LiveTrainingCard';
import { StartSessionButton } from './activityHub/StartSessionButton';
import { styles } from './activityHub/styles';
import type { UpcomingTraining } from './activityHub/types';

// ============================================================================
// TYPES
// ============================================================================

interface ActivityHubProps {
  colors: ThemeColors;
  activeSession: SessionWithDetails | undefined;
  sessionTitle: string;
  sessionStats: SessionStats | null;
  lastSession: SessionWithDetails | undefined;
  weeklyStats: WeeklyStats;
  starting: boolean;
  /** Open the current active personal session */
  onOpenActiveSession: () => void;
  /** Start a solo personal session */
  onStartSolo: () => void;
  nextTraining?: UpcomingTraining;
  /** If true, user can manage training (commander). If false, user is soldier. */
  canManageTraining?: boolean;
}

// Subcomponents extracted to `components/home/personal-home/activityHub/*`.

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActivityHub({
  colors,
  activeSession,
  sessionTitle,
  sessionStats,
  lastSession,
  weeklyStats,
  starting,
  onOpenActiveSession,
  onStartSolo,
  nextTraining,
  canManageTraining = false,
}: ActivityHubProps) {
  // Determine what to show
  const hasActiveSession = !!activeSession;
  const hasLiveTraining = nextTraining?.status === 'ongoing';
  const hasUpcomingTraining = nextTraining && nextTraining.status !== 'ongoing';
  const showEmptyState = !lastSession && !hasActiveSession;

  // Navigation handlers
  const goToTraining = () => {
    if (!nextTraining) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If training is ongoing and user is NOT a commander, go directly to trainingLive
    // This avoids the double navigation (trainingDetail opening then redirecting)
    if (nextTraining.status === 'ongoing' && !canManageTraining) {
      router.push(`/(protected)/trainingLive?trainingId=${nextTraining.id}`);
    } else {
      router.push(`/(protected)/trainingDetail?id=${nextTraining.id}`);
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.container}>
      {/* 1. Live Team Training (highest priority) */}
      {hasLiveTraining && nextTraining && (
        <LiveTrainingCard training={nextTraining} colors={colors} onPress={goToTraining} />
      )}
      {/* 2. Active Personal Session */}
      {hasActiveSession && (
        <ActiveSessionCard
          session={activeSession}
          title={sessionTitle}
          stats={sessionStats}
          colors={colors}
          onPress={onOpenActiveSession}
        />
      )}
      {/* 4. Start Session Button (only when no active session) */}
      {!hasActiveSession && (
        <StartSessionButton
          colors={colors}
          starting={starting}
          upcomingTraining={hasUpcomingTraining ? nextTraining : undefined}
          onStartSolo={onStartSolo}
          onGoToTraining={goToTraining}
        />
      )}
     
      {/* 3. Last Session Summary */}
      {lastSession && <LastSessionCard session={lastSession} weeklyCount={weeklyStats.sessions} colors={colors} />}
      {/* 5. Empty State */}
      {showEmptyState && <EmptyState colors={colors} />}
    </Animated.View>
  );
}
