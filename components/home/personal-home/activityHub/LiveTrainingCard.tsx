import { ArrowRight, Users } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { ThemeColors } from '../types';
import type { UpcomingTraining } from './types';
import { styles } from './styles';

/** Shows when a team training is currently live */
export function LiveTrainingCard({
  training,
  colors,
  onPress,
}: {
  training: UpcomingTraining;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      {/* Header: Live badge + Team name */}
      <View style={styles.cardHeader}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        {training.team_name && (
          <View style={[styles.teamBadge, { backgroundColor: colors.border }]}>
            <Users size={10} color={colors.textMuted} />
            <Text style={[styles.teamBadgeText, { color: colors.textMuted }]}>{training.team_name}</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: colors.text }]}>{training.title}</Text>

      {/* Footer: Drill count + Join button */}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{training.drill_count || 0} drills</Text>
        <View style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join</Text>
          <ArrowRight size={14} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}











