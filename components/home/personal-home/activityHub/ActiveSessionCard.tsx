import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Crosshair, Play, Target } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { SessionStats, SessionWithDetails, ThemeColors } from '../types';
import { styles } from './styles';

/** Shows the user's currently active personal session */
export function ActiveSessionCard({
  session,
  title,
  stats,
  colors,
  onPress,
}: {
  session: SessionWithDetails;
  title: string;
  stats: SessionStats | null;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.activeCard} onPress={onPress}>
      {/* Header: Active badge + Duration */}
      <View style={styles.cardHeader}>
        <View style={styles.activeBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>ACTIVE SESSION</Text>
        </View>
        {session.started_at && (
          <Text style={styles.durationText}>{formatDistanceToNow(new Date(session.started_at), { addSuffix: false })}</Text>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.activeTitle, { color: colors.text }]}>{title}</Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Target size={16} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.targetCount ?? 0}</Text>
        </View>
        <View style={styles.stat}>
          <Crosshair size={16} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalShotsFired ?? 0}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalHits ?? 0}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>hits</Text>
        </View>
      </View>

      {/* Continue button */}
      <View style={styles.continueRow}>
        <Play size={14} color="#10B981" fill="#10B981" />
        <Text style={styles.continueText}>Continue</Text>
        <ArrowRight size={14} color="#10B981" />
      </View>
    </TouchableOpacity>
  );
}




