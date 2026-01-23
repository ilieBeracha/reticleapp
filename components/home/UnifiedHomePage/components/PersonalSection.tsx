/**
 * PersonalSection Component
 *
 * Displays active session or start practice card, weekly stats, and insights.
 */

import Animated, { FadeInDown } from 'react-native-reanimated';
import type { HomeSession } from '../../types';
import { styles } from '../UnifiedHomePage.styles';
import type { Colors, WeeklyStats } from '../UnifiedHomePage.types';
import { ActiveSessionCard } from './ActiveSessionCard';
import { StartPracticeCard } from './StartPracticeCard';
import { WeeklyStatsCard } from './WeeklyStatsCard';

interface PersonalSectionProps {
  activeSession: HomeSession | null;
  hasActiveSession: boolean;
  weeklyStats: WeeklyStats;
  streak: number;
  lastSessionDaysAgo: number | null;
  starting: boolean;
  colors: Colors;
  onActiveSessionPress: () => void;
  onStartSession: () => void;
}

export function PersonalSection({
  activeSession,
  hasActiveSession,
  weeklyStats,
  streak,
  lastSessionDaysAgo,
  starting,
  colors,
  onActiveSessionPress,
  onStartSession,
}: PersonalSectionProps) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(50)} style={styles.section}>
      {/* Active Session or Start Practice */}
      {hasActiveSession && activeSession ? (
        <ActiveSessionCard session={activeSession} colors={colors} onPress={onActiveSessionPress} />
      ) : (
        <StartPracticeCard
          colors={colors}
          onPress={onStartSession}
          starting={starting}
          lastSessionDaysAgo={lastSessionDaysAgo}
        />
      )}

      {/* Weekly Stats */}
      <WeeklyStatsCard stats={weeklyStats} streak={streak} colors={colors} />
    </Animated.View>
  );
}
