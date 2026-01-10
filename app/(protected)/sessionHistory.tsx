import { SessionHistoryCatalog } from '@/components/session/history';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
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
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
          ),
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

