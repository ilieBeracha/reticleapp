import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type SectionHeaderProps = {
  left?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
};

/**
 * Shared layout wrapper for home section headers.
 * Keeps layout consistent while allowing each section to style its own text/icons.
 */
export function SectionHeader({ left, title, right }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {left}
        {title}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
});
