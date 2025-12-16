import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { ThemeColors } from '../types';
import type { UpcomingTraining } from './types';
import { styles } from './styles';

export function TrainingCard({
  colors,
  training,
}: {
  colors: ThemeColors;
  training: UpcomingTraining;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.trainingCard,
        {
          backgroundColor: colors.card,
          borderColor: training.status === 'ongoing' ? '#EF4444' : colors.border,
        },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
      }}
    >
      <View style={styles.trainingLeft}>
        {training.status === 'ongoing' ? (
          <View style={styles.trainingLive}>
            <View style={styles.liveDotRed} />
            <Text style={styles.liveTextRed}>LIVE</Text>
          </View>
        ) : (
          <View style={styles.trainingScheduled}>
            <Calendar size={14} color={colors.textMuted} />
            <Text style={[styles.scheduledText, { color: colors.textMuted }]}>TRAINING</Text>
          </View>
        )}
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
      </View>
      <View style={[styles.joinButton, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.joinText, { color: colors.text }]}>Join</Text>
      </View>
    </TouchableOpacity>
  );
}




