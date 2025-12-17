import { format } from 'date-fns';
import { Clock } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { SessionWithDetails, ThemeColors } from '../types';
import { styles } from './styles';

/** Shows the user's last completed session */
export function LastSessionCard({
  session,
  weeklyCount,
  colors,
}: {
  session: SessionWithDetails;
  weeklyCount: number;
  colors: ThemeColors;
}) {
  const sessionName = session.training_title || session.drill_name || 'Freestyle';
  const sessionDate = format(new Date(session.created_at), 'EEE, MMM d · h:mm a');

  return (
    <Animated.View entering={FadeInDown.delay(150)}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.lastSessionContent}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Clock size={16} color={colors.textMuted} />
          </View>

          {/* Info */}
          <View style={styles.lastSessionInfo}>
            <Text style={[styles.lastSessionLabel, { color: colors.textMuted }]}>Last Session</Text>
            <Text style={[styles.lastSessionTitle, { color: colors.text }]} numberOfLines={1}>
              {sessionName}
            </Text>
            <Text style={[styles.lastSessionDate, { color: colors.textMuted }]}>{sessionDate}</Text>
          </View>

          {/* Weekly count */}
          <View style={styles.weeklyStats}>
            <Text style={[styles.weeklyValue, { color: colors.text }]}>{weeklyCount}</Text>
            <Text style={[styles.weeklyLabel, { color: colors.textMuted }]}>this week</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}






