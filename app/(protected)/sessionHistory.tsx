import { SessionHistoryCatalog } from '@/components/session/history';
import { useColors } from '@/hooks/ui/useColors';
import { Stack, useRouter } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Session History Screen
 *
 * Route: /(protected)/sessionHistory
 *
 * Full session history catalog with filtering, sorting, and search.
 * Accessible from the Insights tab.
 */
export default function SessionHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerTransparent: Platform.OS === 'ios',
          headerBlurEffect: 'regular',
          headerStyle: {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.background,
          },
        }}
      />
      <View style={[styles.content, { paddingTop: Platform.OS === 'ios' ? insets.top + 44 : 0 }]}>
        <SessionHistoryCatalog />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? 8 : 0,
  },
});
