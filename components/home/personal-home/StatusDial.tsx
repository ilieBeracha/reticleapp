import { format } from 'date-fns';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type {
  SessionStats,
  SessionWithDetails,
  ThemeColors,
  WeeklyStats,
} from './types';
import { ActiveSessionCard } from './statusDial/ActiveSessionCard';
import { StartSessionButton } from './statusDial/StartSessionButton';
import { TrainingCard } from './statusDial/TrainingCard';
import { WeeklyStatsBar } from './statusDial/WeeklyStatsBar';
import { styles } from './statusDial/styles';
import type { UpcomingTraining } from './statusDial/types';

interface StatsCardProps {
  colors: ThemeColors;
  activeSession: SessionWithDetails | undefined;
  sessionTitle: string;
  sessionStats: SessionStats | null;
  weeklyStats: WeeklyStats;
  lastSession: SessionWithDetails | undefined;
  // Session actions
  starting: boolean;
  onStart: () => void;
  // Training
  nextTraining?: UpcomingTraining;
}

export function StatusDial({
  colors,
  activeSession,
  sessionTitle,
  sessionStats,
  weeklyStats,
  lastSession,
  starting,
  onStart,
  nextTraining,
}: StatsCardProps) {
  // Calculate last session insight
  const lastSessionInsight = lastSession ? {
    date: format(new Date(lastSession.created_at), 'MMM d'),
    type: lastSession.training_title || lastSession.drill_name || 'Freestyle',
  } : null;

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.section}>
      {/* Active Session Card */}
      {activeSession ? (
        <ActiveSessionCard
          colors={colors}
          activeSession={activeSession}
          sessionTitle={sessionTitle}
          sessionStats={sessionStats}
          onPress={onStart}
        />
      ) : (
        /* Start Session Button */
        <StartSessionButton colors={colors} starting={starting} onPress={onStart} />
      )}

      {/* Training Card - if available */}
      {nextTraining && !activeSession && (
        <TrainingCard colors={colors} training={nextTraining} />
      )}

      {/* Weekly Stats - Small summary */}
      {!activeSession && (
        <WeeklyStatsBar colors={colors} weeklyStats={weeklyStats} />
      )}
    </Animated.View>
  );
}
