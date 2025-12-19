import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Play } from 'lucide-react-native';
import type { ThemeColors } from '../types';
import { styles } from './styles';

export function StartSessionButton({
  colors,
  starting,
  onPress,
}: {
  colors: ThemeColors;
  starting: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={starting}
      style={[styles.startButton, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.startButtonIcon}>
        {starting ? <ActivityIndicator size="small" color="#fff" /> : <Play size={24} color="#fff" fill="#fff" />}
      </View>
      <View style={styles.startButtonText}>
        <Text style={[styles.startTitle, { color: colors.text }]}>{starting ? 'Starting...' : 'Start Session'}</Text>
        <Text style={[styles.startDesc, { color: colors.textMuted }]}>Scan targets or log results</Text>
      </View>
      <ArrowRight size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}









