import { useColors } from '@/hooks/ui/useColors';
import { StyleSheet, Text, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  showSeeMore?: boolean;
  onSeeMorePress?: () => void;
}

export function SectionHeader({ title, showSeeMore = false }: SectionHeaderProps) {
  const { text } = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      {showSeeMore && <Text style={styles.seeMore}>See more</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeMore: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

