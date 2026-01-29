/**
 * WhyButton - Inline button for requesting AI explanations
 *
 * Used in card headers to trigger AI explanations.
 */

import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WhyButtonProps {
  onPress: () => void;
  loading?: boolean;
  hasExplanation?: boolean;
}

export function WhyButton({ onPress, loading, hasExplanation }: WhyButtonProps) {
  const colors = useColors();

  if (loading) {
    return (
      <View style={[styles.whyButtonInline, { backgroundColor: `${colors.primary}10` }]}>
        <ActivityIndicator size={10} color={colors.primary} />
      </View>
    );
  }

  if (hasExplanation) {
    return (
      <View style={[styles.whyButtonInline, { backgroundColor: `${colors.green}15` }]}>
        <Ionicons name="checkmark" size={12} color={colors.green} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.whyButtonInline, { backgroundColor: `${colors.primary}10` }]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.whyButtonInlineText, { color: colors.primary }]}>?</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  whyButtonInline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyButtonInlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
