import { isToday } from 'date-fns';
import { useMemo } from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StartSessionCard } from './smartActionHero/StartSessionCard';
import { TrainingCard } from './smartActionHero/TrainingCard';
import { styles } from './smartActionHero/styles';
import type { UpcomingTraining } from './smartActionHero/types';
import type { ElapsedTime, SessionStats, SessionWithDetails, ThemeColors } from './types';

interface SmartActionHeroProps {
  colors: ThemeColors;
  myUpcomingTrainings: UpcomingTraining[];
  activeSession: SessionWithDetails | undefined;
  elapsed: ElapsedTime;
  sessionStats: SessionStats | null;
  starting: boolean;
  sessions: SessionWithDetails[];
  onStart: () => void;
  onResume: () => void;
}

export function SmartActionHero({
  colors,
  myUpcomingTrainings,
  activeSession,
  elapsed,
  sessionStats,
  starting,
  sessions,
  onStart,
  onResume,
}: SmartActionHeroProps) {
  // Get next scheduled training (live or upcoming today)
  const nextTraining = useMemo(() => {
    const live = myUpcomingTrainings.find((t) => t.status === 'ongoing');
    if (live) return live;
    
    return myUpcomingTrainings.find((t) => {
      if (!t.scheduled_at) return false;
      return isToday(new Date(t.scheduled_at));
    });
  }, [myUpcomingTrainings]);

  // Calculate completed drills
  const completedDrills = useMemo(() => {
    if (!nextTraining?.drills || nextTraining.drills.length === 0) return 0;
    const drillIds = new Set(nextTraining.drills.map(d => d.id));
    const completedDrillIds = new Set(
      sessions
        .filter(s => 
          s.training_id === nextTraining.id && 
          s.drill_id && 
          drillIds.has(s.drill_id) &&
          s.status === 'completed'
        )
        .map(s => s.drill_id)
    );
    return completedDrillIds.size;
  }, [nextTraining, sessions]);

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.container}>
      {/* Start Session - Always visible */}
      <StartSessionCard 
        colors={colors} 
        starting={starting} 
        onStart={onStart}
        hasActiveSession={!!activeSession}
        elapsed={elapsed}
        sessionStats={sessionStats}
        onResume={onResume}
      />

      {/* Next Training - if available */}
      {nextTraining && (
        <TrainingCard 
          training={nextTraining} 
          colors={colors} 
          completedDrills={completedDrills}
        />
      )}
    </Animated.View>
  );
}
