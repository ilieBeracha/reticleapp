/**
 * Upcoming Trainings Card
 * 
 * Shows upcoming trainings EXPLICITLY with:
 * - Training name
 * - Team name
 * - Drill count and progress
 * - Scheduled time or "expires in"
 */

import { useColors } from '@/hooks/ui/useColors';
import type { TrainingWithDetails } from '@/types/workspace';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { router } from 'expo-router';
import { ChevronRight, Clock, Target, Users, AlertTriangle } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UpcomingTrainingsCardProps {
  trainings: TrainingWithDetails[];
  /** Map of training_id → number of drills completed by current user */
  drillProgress?: Map<string, number>;
}

export function UpcomingTrainingsCard({ trainings, drillProgress }: UpcomingTrainingsCardProps) {
  const colors = useColors();
  
  if (trainings.length === 0) return null;
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clock size={14} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Next Up</Text>
        </View>
        <TouchableOpacity 
          style={[styles.scheduleBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.push('/(protected)/(tabs)/trainings')}
        >
          <Text style={[styles.scheduleBtnText, { color: colors.primary }]}>Full Schedule</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {trainings.slice(0, 2).map((training, idx) => (
        <TrainingRow 
          key={training.id} 
          training={training} 
          drillsCompleted={drillProgress?.get(training.id) ?? 0}
          isLast={idx === Math.min(trainings.length, 2) - 1}
          colors={colors}
        />
      ))}
    </View>
  );
}

interface TrainingRowProps {
  training: TrainingWithDetails;
  drillsCompleted: number;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
}

function TrainingRow({ training, drillsCompleted, isLast, colors }: TrainingRowProps) {
  const drillCount = training.drill_count ?? 0;
  const scheduledAt = training.scheduled_at ? new Date(training.scheduled_at) : null;
  const expiresAt = (training as any).expires_at ? new Date((training as any).expires_at) : null;
  const isLive = training.status === 'ongoing';
  
  // Determine time display
  const getTimeDisplay = () => {
    // If expired or past deadline
    if (expiresAt && isPast(expiresAt)) {
      return { text: 'Expired', urgent: true, icon: AlertTriangle };
    }
    
    // If expires soon (within 24h)
    if (expiresAt) {
      const hoursLeft = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
      if (hoursLeft <= 24) {
        return { text: `Expires in ${hoursLeft}h`, urgent: true, icon: Clock };
      }
    }
    
    // Otherwise show scheduled time
    if (scheduledAt) {
      if (isToday(scheduledAt)) {
        return { text: `Today ${format(scheduledAt, 'h:mm a')}`, urgent: false, icon: Clock };
      }
      if (isTomorrow(scheduledAt)) {
        return { text: 'Tomorrow', urgent: false, icon: Clock };
      }
      return { text: formatDistanceToNow(scheduledAt, { addSuffix: true }), urgent: false, icon: Clock };
    }
    
    return null;
  };
  
  const timeDisplay = getTimeDisplay();
  const isComplete = drillCount > 0 && drillsCompleted >= drillCount;
  const progressPct = drillCount > 0 ? Math.round((drillsCompleted / drillCount) * 100) : 0;
  
  const handlePress = () => {
    router.push(`/(protected)/trainingDetail?id=${training.id}`);
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.row, 
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        isLive && { backgroundColor: `${colors.primary}08` }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.rowContent}>
        {/* Training title with Live badge */}
        <View style={styles.titleRow}>
          <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          )}
        </View>
        
        {/* Team + drill info */}
        <View style={styles.metaRow}>
          {training.team?.name && (
            <View style={styles.metaItem}>
              <Users size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{training.team.name}</Text>
            </View>
          )}
          {drillCount > 0 && (
            <View style={styles.metaItem}>
              <Target size={12} color={isComplete ? '#22C55E' : colors.textMuted} />
              <Text style={[
                styles.metaText, 
                { color: isComplete ? '#22C55E' : colors.textMuted }
              ]}>
                {drillsCompleted}/{drillCount} drills
              </Text>
            </View>
          )}
        </View>
        
        {/* Time display */}
        {timeDisplay && (
          <View style={styles.timeRow}>
            <timeDisplay.icon size={12} color={timeDisplay.urgent ? '#F59E0B' : colors.textMuted} />
            <Text style={[
              styles.timeText, 
              { color: timeDisplay.urgent ? '#F59E0B' : colors.textMuted }
            ]}>
              {timeDisplay.text}
            </Text>
          </View>
        )}
      </View>
      
      {/* Progress bar */}
      {drillCount > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPct}%`, 
                  backgroundColor: isComplete ? '#22C55E' : colors.primary 
                }
              ]} 
            />
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  scheduleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
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
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  progressBg: {
    width: 40,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

