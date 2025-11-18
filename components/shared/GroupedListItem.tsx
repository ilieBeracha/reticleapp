import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';

interface GroupedListItemProps {
  children: ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
  style?: ViewStyle;
}

/**
 * Wrapper component for items in a GroupedList
 * Automatically handles border radius for first/last items
 */
export default function GroupedListItem({ 
  children, 
  isFirst, 
  isLast, 
  style 
}: GroupedListItemProps) {
  const itemStyle: ViewStyle = {
    borderTopLeftRadius: isFirst ? 16 : 0,
    borderTopRightRadius: isFirst ? 16 : 0,
    borderBottomLeftRadius: isLast ? 16 : 0,
    borderBottomRightRadius: isLast ? 16 : 0,
    ...style,
  };

  return <View style={itemStyle}>{children}</View>;
}

