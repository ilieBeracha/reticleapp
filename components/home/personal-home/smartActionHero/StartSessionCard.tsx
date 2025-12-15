import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Play } from 'lucide-react-native';
import type { ElapsedTime, SessionStats, ThemeColors } from '../types';
import { styles } from './styles';

export function StartSessionCard({
  colors,
  starting,
  onStart,
  hasActiveSession,
  elapsed,
  sessionStats,
  onResume,
}: {
  colors: ThemeColors;
  starting: boolean;
  onStart: () => void;
  hasActiveSession: boolean;
  elapsed: ElapsedTime;
  sessionStats: SessionStats | null;
  onResume: () => void;
}) {
  // Active session mode
  if (hasActiveSession) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.mainCard, { backgroundColor: colors.card, borderColor: '#10B981' + '40' }]}
        onPress={onResume}
      >
        <View style={styles.mainContent}>
          <View style={[styles.iconBox, { backgroundColor: '#10B981' + '20' }]}>
            <View style={styles.activeDot} />
          </View>

          <View style={styles.mainText}>
            <Text style={[styles.mainTitle, { color: colors.text }]}>
              {elapsed.minutes}:{elapsed.seconds.toString().padStart(2, '0')}
            </Text>
            <Text style={[styles.mainMeta, { color: colors.textMuted }]}>
              Active · {sessionStats?.targetCount || 0} targets
            </Text>
          </View>

          <View style={[styles.actionButton, { backgroundColor: '#10B981' }]}>
            <Text style={styles.actionText}>Resume</Text>
            <ArrowRight size={14} color="#000" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Start new session
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={starting}
      style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onStart}
    >
      <View style={styles.mainContent}>
        <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
          {starting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Play size={18} color={colors.text} fill={colors.text} />
          )}
        </View>

        <View style={styles.mainText}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>Start Session</Text>
          <Text style={[styles.mainMeta, { color: colors.textMuted }]}>Freestyle practice</Text>
        </View>

        <ArrowRight size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}


