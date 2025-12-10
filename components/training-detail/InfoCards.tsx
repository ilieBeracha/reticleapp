import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ThemeColors, TrainingWithDetails } from './types';
import { formatDate, formatTime } from './utils';

interface InfoCardsProps {
  training: TrainingWithDetails;
  colors: ThemeColors;
}

export function InfoCards({ training, colors }: InfoCardsProps) {
  return (
    <View style={styles.container}>
      <InfoCard
        icon="calendar-outline"
        label="Date"
        value={formatDate(training.scheduled_at)}
        colors={colors}
      />
      <InfoCard
        icon={training.manual_start ? 'hand-left-outline' : 'time-outline'}
        label="Start Time"
        value={training.manual_start ? 'Manual Start' : formatTime(training.scheduled_at)}
        colors={colors}
      />
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
}

function InfoCard({ icon, label, value, colors }: InfoCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      </View>
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
});
