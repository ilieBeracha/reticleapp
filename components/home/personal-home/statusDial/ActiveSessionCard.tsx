import { ArrowRight } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { SessionStats, SessionWithDetails, ThemeColors } from '../types';
import { styles } from './styles';

export function ActiveSessionCard({
  colors,
  activeSession,
  sessionTitle,
  sessionStats,
  onPress,
}: {
  colors: ThemeColors;
  activeSession: SessionWithDetails;
  sessionTitle: string;
  sessionStats: SessionStats | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.activeCard, { borderColor: '#10B981' }]}
      onPress={onPress}
    >
      <View style={styles.activeHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE SESSION</Text>
        </View>
        <Text style={[styles.activeTitle, { color: colors.text }]}>{sessionTitle}</Text>
      </View>

      <View style={styles.activeStats}>
        <View style={styles.activeStat}>
          <Text style={[styles.activeStatValue, { color: colors.text }]}>{sessionStats?.targetCount ?? 0}</Text>
          <Text style={[styles.activeStatLabel, { color: colors.textMuted }]}>targets</Text>
        </View>
        <View style={styles.activeStat}>
          <Text style={[styles.activeStatValue, { color: colors.text }]}>{sessionStats?.totalShotsFired ?? 0}</Text>
          <Text style={[styles.activeStatLabel, { color: colors.textMuted }]}>shots</Text>
        </View>
        <View style={styles.activeStat}>
          <Text style={[styles.activeStatValue, { color: colors.text }]}>{sessionStats?.totalHits ?? 0}</Text>
          <Text style={[styles.activeStatLabel, { color: colors.textMuted }]}>hits</Text>
        </View>
      </View>

      <View style={styles.resumeRow}>
        <Text style={styles.resumeText}>Continue Session</Text>
        <ArrowRight size={18} color="#10B981" />
      </View>
    </TouchableOpacity>
  );
}









