// src/components/BottomSheet.tsx
import { useColors } from '@/hooks/ui/useColors';
import { BlurView } from 'expo-blur';
import { Animated, StyleSheet, Text, View } from 'react-native';

export function BottomSheet({ visible, onClose, title, children }: any) {
  const colors = useColors();
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <BlurView
        intensity={20}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background + '4D' }]}
      />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.background + 'F2'   },
        ]}
      >
        <View style={styles.handle} />
        {title && <Text style={styles.title}>{title}</Text>}
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    marginBottom: 100,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
});