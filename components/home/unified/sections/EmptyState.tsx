import { useColors } from '@/hooks/ui/useColors';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Target, Zap } from 'lucide-react-native';
import { styles } from '../styles';

export function EmptyState({
  colors,
  onStartPractice,
  starting,
}: {
  colors: ReturnType<typeof useColors>;
  onStartPractice: () => void;
  starting: boolean;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.indigo}15` }]}>
        <Target size={48} color={colors.indigo} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Start Your Journey</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
        Track your shooting practice, join teams, and improve your skills over time.
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.indigo }]}
        onPress={onStartPractice}
        disabled={starting}
        activeOpacity={0.8}
      >
        {starting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Zap size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Start Practice</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}












