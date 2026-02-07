/**
 * UpcomingTrainingsCard Component
 *
 * Compact list of scheduled trainings.
 */

import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
import type { TrainingWithDetails } from '@/types/workspace';
import { format, isToday, isTomorrow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface UpcomingTrainingsCardProps {
  trainings: TrainingWithDetails[];
  teamColor: string;
  onTrainingPress: (training: TrainingWithDetails) => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
  };
}

export function UpcomingTrainingsCard({ trainings, teamColor, onTrainingPress, colors }: UpcomingTrainingsCardProps) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeIn.delay(150)} style={s.container}>
      {/* Header */}
      <Text style={[s.headerText, { color: colors.textMuted }]}>{t('teamHome.scheduled')}</Text>

      {/* Training List */}
      <View style={[s.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {trainings.map((training, i) => (
          <TrainingRow
            key={training.id}
            training={training}
            onPress={() => onTrainingPress(training)}
            colors={colors}
            isLast={i === trainings.length - 1}
          />
        ))}
      </View>
    </Animated.View>
  );
}

interface TrainingRowProps {
  training: TrainingWithDetails;
  onPress: () => void;
  colors: {
    text: string;
    textMuted: string;
    border: string;
  };
  isLast: boolean;
}

function TrainingRow({ training, onPress, colors, isLast }: TrainingRowProps) {
  const { t } = useTranslation();
  const dateLabel = getDateLabel(training.scheduled_at, t);

  return (
    <TouchableOpacity
      style={[s.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {/* Date */}
      <View style={s.dateSection}>
        <Text style={[s.dateMain, { color: colors.text }]}>{dateLabel.day}</Text>
        {dateLabel.month && <Text style={[s.dateMonth, { color: colors.textMuted }]}>{dateLabel.month}</Text>}
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
        <Text style={[s.time, { color: colors.textMuted }]}>{dateLabel.time}</Text>
      </View>

      <DirectionalChevron size={12} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function getDateLabel(dateStr: string | null, t: (key: string) => string): { day: string; month: string; time: string } {
  if (!dateStr) return { day: '—', month: '', time: t('teamHome.tbd') };

  const date = new Date(dateStr);

  if (isToday(date)) {
    return { day: t('teamHome.today'), month: '', time: format(date, 'HH:mm') };
  }
  if (isTomorrow(date)) {
    return { day: t('teamHome.tomorrow'), month: '', time: format(date, 'HH:mm') };
  }

  return {
    day: format(date, 'd'),
    month: format(date, 'MMM'),
    time: format(date, 'HH:mm'),
  };
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  list: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  dateSection: {
    width: 36,
    alignItems: 'center',
  },
  dateMain: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: -1,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
  },
  time: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
});
