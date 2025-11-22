import { useColors } from '@/hooks/ui/useColors';
import { memo, ReactElement, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface GroupedListProps<T> {
  data: T[];
  renderItem: (item: T, isFirst: boolean, isLast: boolean) => ReactElement;
  keyExtractor: (item: T, index: number) => string;
  style?: ViewStyle;
  scrollEnabled?: boolean;
}

function GroupedListComponent<T>({
  data,
  renderItem,
  keyExtractor,
  style,
}: GroupedListProps<T>) {
  const colors = useColors();

  // Memoize container style
  const containerStyle = useMemo(() => [
    styles.container,
    { 
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    style,
  ], [colors.card, colors.border, style]);

  return (
    <View style={containerStyle}>
      {data.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === data.length - 1;
        
        return (
          <View key={keyExtractor(item, index)}>
            {renderItem(item, isFirst, isLast)}
            {!isLast && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          </View>
        );
      })}
    </View>
  );
}

// Export memoized version
export const GroupedList = memo(GroupedListComponent) as typeof GroupedListComponent;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});

export default GroupedList;

