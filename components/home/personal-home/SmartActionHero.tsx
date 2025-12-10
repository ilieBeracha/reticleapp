import { format, isToday, isTomorrow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowRight, Clock, Play, Target, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { ElapsedTime, SessionStats, SessionWithDetails, ThemeColors } from './types';

interface UpcomingTraining {
  id: string;
  title: string;
  status: string;
  team?: { name: string } | null;
  drill_count?: number;
  drills?: { id: string }[];
  scheduled_at?: string | null;
}

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

// ═══════════════════════════════════════════════════════════════════════════

function TrainingCard({
  training,
  colors,
  completedDrills,
}: {
  training: UpcomingTraining;
  colors: ThemeColors;
  completedDrills: number;
}) {
  const isLive = training.status === 'ongoing';
  const scheduledDate = training.scheduled_at ? new Date(training.scheduled_at) : null;
  const totalDrills = training.drill_count || 0;

  const getTimeLabel = () => {
    if (isLive) return 'NOW';
    if (!scheduledDate) return '';
    if (isToday(scheduledDate)) return format(scheduledDate, 'h:mm a');
    if (isTomorrow(scheduledDate)) return `Tomorrow`;
    return format(scheduledDate, 'MMM d');
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.trainingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
      }}
    >
      <View style={styles.trainingLeft}>
        {isLive ? (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.timeText, { color: colors.textMuted }]}>{getTimeLabel()}</Text>
          </View>
        )}
        
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        
        <View style={styles.trainingMeta}>
          {training.team?.name && (
            <View style={styles.metaItem}>
              <Users size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{training.team.name}</Text>
            </View>
          )}
          {totalDrills > 0 && (
            <View style={styles.metaItem}>
              <Target size={11} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {completedDrills}/{totalDrills}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <ArrowRight size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function StartSessionCard({
  colors,
  starting,
  onStart,
  hasActiveSession,
  elapsed,
  sessionStats,
  onResume,
}: {
  colors: ThemeColors;
  starting: boolean;
  onStart: () => void;
  hasActiveSession: boolean;
  elapsed: ElapsedTime;
  sessionStats: SessionStats | null;
  onResume: () => void;
}) {
  // Active session mode
  if (hasActiveSession) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.mainCard, { backgroundColor: colors.card, borderColor: '#10B981' + '40' }]}
        onPress={onResume}
      >
        <View style={styles.mainContent}>
          <View style={[styles.iconBox, { backgroundColor: '#10B981' + '20' }]}>
            <View style={styles.activeDot} />
          </View>
          
          <View style={styles.mainText}>
            <Text style={[styles.mainTitle, { color: colors.text }]}>
              {elapsed.minutes}:{elapsed.seconds.toString().padStart(2, '0')}
            </Text>
            <Text style={[styles.mainMeta, { color: colors.textMuted }]}>
              Active · {sessionStats?.targetCount || 0} targets
            </Text>
          </View>
          
          <View style={[styles.actionButton, { backgroundColor: '#10B981' }]}>
            <Text style={styles.actionText}>Resume</Text>
            <ArrowRight size={14} color="#000" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Start new session
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={starting}
      style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onStart}
    >
      <View style={styles.mainContent}>
        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
          {starting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Play size={18} color={colors.text} fill={colors.text} />
          )}
        </View>
        
        <View style={styles.mainText}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>Start Session</Text>
          <Text style={[styles.mainMeta, { color: colors.textMuted }]}>
            Freestyle practice
          </Text>
        </View>
        
        <ArrowRight size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  
  // Main card (Start/Active session)
  mainCard: {
    borderRadius: 14,
    borderWidth: 1,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  mainText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  mainMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  
  // Training card
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    paddingRight: 14,
  },
  trainingLeft: {
    flex: 1,
    gap: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#EF4444',
  },
  trainingTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
