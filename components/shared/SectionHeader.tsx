import { useColors } from '@/hooks/ui/useColors';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface SectionHeaderProps {
  title: string;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Reusable section header component with optional right element.
 * Use for consistent section titles across screens.
 */
export const SectionHeader = React.memo(function SectionHeader({
  title,
  rightElement,
  style,
}: SectionHeaderProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, rightElement ? styles.withRightElement : null, style]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {rightElement}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  withRightElement: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
});

export default SectionHeader;
