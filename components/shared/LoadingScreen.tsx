import { useColors } from '@/hooks/ui/useColors';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

interface LoadingScreenProps {
  overlay?: boolean;
}

export function LoadingScreen({ overlay = false }: LoadingScreenProps = {}) {
  const colors = useColors();

  return (
    <View style={[
      styles.container, 
      { backgroundColor: '#221f20' },
      overlay && styles.overlay
    ]}>
      {/* Logo */}
      <Image 
        source={require('@/assets/images/icon.jpg')} 
        style={styles.logo}
        resizeMode="contain"
      />
      
      {/* Loading indicator */}
      <ActivityIndicator 
        size="large" 
        color={colors.primary} 
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
});

