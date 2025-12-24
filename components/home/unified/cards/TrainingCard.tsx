import { useColors } from '@/hooks/ui/useColors';
import type { TrainingWithDetails } from '@/types/workspace';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Clock, Target } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { styles } from '../styles';

export function TrainingCard({
  training,
  colors,
  index,
}: {
  training: TrainingWithDetails;
  colors: ReturnType<typeof useColors>;
  index: number;
}) {
  const isLive = training.status === 'ongoing';
  const scheduledDate = new Date(training.scheduled_at);
  const timeStr = format(scheduledDate, 'HH:mm');
  const dateStr = format(scheduledDate, 'MMM d');

  const getPriorityColor = () => {
    if (isLive) return colors.green;
    const hoursUntil = (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 2) return colors.red;
    if (hoursUntil < 24) return colors.orange;
    return colors.indigo;
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <TouchableOpacity
        style={[styles.trainingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/(protected)/trainingDetail?id=${training.id}`)}
        activeOpacity={0.8}
      >
        {/* Priority Badge */}
        <View style={styles.trainingCardTop}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
            <Text style={styles.priorityText}>{isLive ? 'Live' : 'Upcoming'}</Text>
          </View>
          {training.team?.name && (
            <View style={styles.teamTag}>
              <View style={[styles.teamDot, { backgroundColor: colors.indigo }]} />
              <Text style={[styles.teamTagText, { color: colors.textMuted }]} numberOfLines={1}>
                {training.team.name}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={2}>
          {training.title}
        </Text>

        {/* Meta */}
        <View style={styles.trainingMeta}>
          <View style={styles.metaItem}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {timeStr} - {dateStr}
            </Text>
          </View>
        </View>

        {/* Drills count */}
        {training.drill_count && training.drill_count > 0 && (
          <View style={styles.drillsInfo}>
            <Target size={12} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {training.drill_count} drill{training.drill_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}












