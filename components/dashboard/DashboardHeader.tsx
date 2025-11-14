import { useColors } from '@/hooks/ui/useColors';
import { StyleSheet, Text, View } from 'react-native';

interface DashboardHeaderProps {
  title: string;
  count: number;
}

export function DashboardHeader({ title, count }: DashboardHeaderProps) {
  const { text } = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: text }]}>
        {title}{'\n'}for Today <Text style={styles.badge}>({count})</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  badge: {
    fontSize: 28,
    fontWeight: '400',
    opacity: 0.6,
  },
});

