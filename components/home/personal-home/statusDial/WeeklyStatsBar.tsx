import { Crosshair, Target } from 'lucide-react-native';
import { Text, View } from 'react-native';
import type { ThemeColors, WeeklyStats } from '../types';
import { styles } from './styles';

export function WeeklyStatsBar({ colors, weeklyStats }: { colors: ThemeColors; weeklyStats: WeeklyStats }) {
  return (
    <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.statItem}>
        <Target size={14} color={colors.textMuted} />
        <Text style={[styles.statValue, { color: colors.text }]}>{weeklyStats.paperTargets + weeklyStats.tacticalTargets}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>targets</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statItem}>
        <Crosshair size={14} color={colors.textMuted} />
        <Text style={[styles.statValue, { color: colors.text }]}>{weeklyStats.totalShots}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
      </View>
      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: colors.text }]}>{weeklyStats.sessions}</Text>
        <Text style={[styles.statLabel, { color: colors.textMuted }]}>sessions</Text>
      </View>
    </View>
  );
}









