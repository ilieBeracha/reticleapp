import { Target } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ThemeColors } from '../types';
import { styles } from './styles';

/** Empty state when no sessions exist */
export function EmptyState({ colors }: { colors: ThemeColors }) {
  return (
    <Animated.View entering={FadeInDown.delay(150)}>
      <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Target size={24} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to train?</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Start your first session above</Text>
      </View>
    </Animated.View>
  );
}


