import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ThemeColors, TrainingWithDetails } from './types';
import { formatDate, formatDuration, formatTime } from './utils';

interface InfoCardsProps {
  training: TrainingWithDetails;
  colors: ThemeColors;
}

export function InfoCards({ training, colors }: InfoCardsProps) {
  const isOngoing = training.status === 'ongoing';
  const isFinished = training.status === 'finished';
  
  // Calculate duration if we have start and end times
  const duration = training.started_at && training.ended_at
    ? formatDuration(training.started_at, training.ended_at)
    : null;

  return (
    <View style={styles.container}>
      <InfoCard
        icon="calendar-outline"
        label="Date"
        value={formatDate(training.scheduled_at)}
        colors={colors}
      />
      
      {/* Show actual start time if training started, otherwise scheduled time */}
      {training.started_at ? (
        <InfoCard
          icon="play-circle-outline"
          label="Started"
          value={formatTime(training.started_at)}
          colors={colors}
          highlight={isOngoing}
        />
      ) : (
        <InfoCard
          icon={training.manual_start ? 'hand-left-outline' : 'time-outline'}
          label="Scheduled"
          value={training.manual_start ? 'Manual Start' : formatTime(training.scheduled_at)}
          colors={colors}
        />
      )}
      
      {/* Show end time or duration if finished */}
      {isFinished && training.ended_at && (
        <InfoCard
          icon="checkmark-circle-outline"
          label={duration ? 'Duration' : 'Ended'}
          value={duration || formatTime(training.ended_at)}
          colors={colors}
        />
      )}

      {training.team && (
        <InfoCard
          icon="people-outline"
          label="Team"
          value={training.team.name}
          colors={colors}
        />
      )}
    </View>
  );
}

interface InfoCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ThemeColors;
  highlight?: boolean;
}

function InfoCard({ icon, label, value, colors, highlight }: InfoCardProps) {
  return (
    <View style={[
      styles.card, 
      { backgroundColor: colors.background, borderColor: highlight ? '#22C55E' : colors.border },
      highlight && styles.cardHighlight
    ]}>
      <Ionicons name={icon} size={20} color={highlight ? '#22C55E' : colors.primary} />
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.value, { color: highlight ? '#22C55E' : colors.text }]}>{value}</Text>
      </View>
      {highlight && (
        <View style={styles.liveDot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  cardHighlight: {
    borderWidth: 1.5,
    backgroundColor: '#22C55E08',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
});
