import { format, isToday, isTomorrow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowRight, Clock, Target, Users } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { ThemeColors } from '../types';
import { styles } from './styles';
import type { UpcomingTraining } from './types';

export function TrainingCard({
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







