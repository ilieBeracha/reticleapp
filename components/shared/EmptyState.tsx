import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  size?: 'small' | 'large';
}

export default function EmptyState({ icon, title, subtitle, size = 'large' }: EmptyStateProps) {
  const colors = useColors();
  const isLarge = size === 'large';

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, isLarge ? styles.large : styles.small]}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 16,
  },
  large: {
    paddingVertical: 56,
    paddingHorizontal: 40,
  },
  small: {
    paddingVertical: 40,
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.1,
  },
});

