import { useColors } from '@/hooks/ui/useColors';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  showSeeMore?: boolean;
  onSeeMorePress?: () => void;
}

export function SectionHeader({ 
  title, 
  showSeeMore = false, 
  onSeeMorePress 
}: SectionHeaderProps) {
  const { text, accent } = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: text }]}>{title}</Text>
      {showSeeMore && (
        <Pressable onPress={onSeeMorePress} hitSlop={8}>
          <Text style={[styles.seeMore, { color: accent }]}>
            See more →
          </Text>
        </Pressable>
      )}
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
    fontWeight: '600',
  },
});

