import { useColors } from '@/hooks/ui/useColors';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Zap } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { styles } from '../styles';

export function QuickStartCard({
  colors,
  onStartSolo,
  starting,
}: {
  colors: ReturnType<typeof useColors>;
  onStartSolo: () => void;
  starting: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.delay(200).duration(400)}>
      <TouchableOpacity
        style={[styles.quickStartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onStartSolo}
        activeOpacity={0.8}
        disabled={starting}
      >
        <View style={[styles.quickStartIcon, { backgroundColor: `${colors.indigo}18` }]}>
          {starting ? <ActivityIndicator size="small" color={colors.indigo} /> : <Zap size={20} color={colors.indigo} />}
        </View>
        <View style={styles.quickStartContent}>
          <Text style={[styles.quickStartTitle, { color: colors.text }]}>Quick Start</Text>
          <Text style={[styles.quickStartDesc, { color: colors.textMuted }]}>Begin a solo practice session</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}


