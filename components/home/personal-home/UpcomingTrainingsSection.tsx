import { differenceInMinutes, format, isToday, isTomorrow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Clock, Target, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ThemeColors } from './types';

interface UpcomingTraining {
  id: string;
  title: string;
  status: string;
  team?: { name: string } | null;
  drill_count?: number;
  scheduled_at?: string | null;
  manual_start?: boolean;
}

interface UpcomingTrainingsSectionProps {
  colors: ThemeColors;
  trainings: UpcomingTraining[];
}

export function UpcomingTrainingsSection({ colors, trainings }: UpcomingTrainingsSectionProps) {
  const plannedTrainings = trainings.filter((t) => t.status === 'planned');

  if (plannedTrainings.length === 0) {
    return null;
  }

  const sortedTrainings = [...plannedTrainings].sort((a, b) => {
    if (!a.scheduled_at && !b.scheduled_at) return 0;
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Calendar size={14} color={colors.textMuted} />
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>UPCOMING</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(protected)/personal/trainings' as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.sectionLink, { color: colors.textMuted }]}>See all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {sortedTrainings.slice(0, 3).map((training, index) => (
          <TrainingItem key={training.id} training={training} colors={colors} isFirst={index === 0} />
        ))}
      </View>
    </View>
  );
}

function TrainingItem({ training, colors, isFirst }: { training: UpcomingTraining; colors: ThemeColors; isFirst: boolean }) {
  const timeInfo = getTimeLabel(training.scheduled_at);
  const isUrgent = timeInfo.isUrgent;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.item, 
        { backgroundColor: colors.card, borderColor: isFirst ? colors.text + '20' : colors.border },
        isFirst && styles.itemFirst,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
      }}
    >
      {/* Left accent */}
      <View style={[styles.accent, { backgroundColor: isUrgent ? '#EF4444' : colors.text + '30' }]} />
      
      <View style={styles.itemContent}>
        {/* Title row */}
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={12} color={isUrgent ? '#EF4444' : colors.textMuted} />
            <Text style={[styles.metaText, { color: isUrgent ? '#EF4444' : colors.textMuted }]}>
              {timeInfo.label}
            </Text>
          </View>
          
          {training.team?.name && (
            <View style={styles.metaItem}>
              <Users size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                {training.team.name}
              </Text>
            </View>
          )}
          
          {training.drill_count ? (
            <View style={styles.metaItem}>
              <Target size={12} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {training.drill_count}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <ChevronRight size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function getTimeLabel(scheduledAt: string | null | undefined): { label: string; isUrgent: boolean } {
  if (!scheduledAt) {
    return { label: 'Manual', isUrgent: false };
  }

  const date = new Date(scheduledAt);
  const now = new Date();
  const minutesAway = differenceInMinutes(date, now);

  if (minutesAway <= 0) {
    return { label: 'Now', isUrgent: true };
  }

  if (minutesAway <= 60) {
    return { label: `${minutesAway}m`, isUrgent: true };
  }

  if (isToday(date)) {
    return { label: format(date, 'h:mm a'), isUrgent: false };
  }

  if (isTomorrow(date)) {
    return { label: `Tomorrow ${format(date, 'h:mm a')}`, isUrgent: false };
  }

  return { label: format(date, 'EEE, MMM d'), isUrgent: false };
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 0,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemFirst: {
    borderWidth: 1,
  },
  accent: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
    marginLeft: 12,
  },
  itemContent: {
    flex: 1,
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
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
});
