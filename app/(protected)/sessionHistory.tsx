import { SessionHistoryCatalog } from '@/components/session/history';
import type { SessionFilters } from '@/components/session/history/SessionHistory.types';
import { useColors } from '@/hooks/ui/useColors';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Session History Screen
 * 
 * Route: /(protected)/sessionHistory
 * 
 * Full session history catalog with filtering, sorting, and search.
 * Accessible from the Insights tab or weekly stats.
 * 
 * Query Params:
 * - filter: 'thisWeek' | 'thisMonth' | 'all' - Date range preset
 * - targetType: 'paper' | 'tactical' - Filter by target type (drill goal)
 * - view: 'timeline' | 'duration' - Hint for display focus (not implemented as filter)
 */
export default function SessionHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    filter?: string;
    targetType?: string;
    view?: string;
  }>();

  // Build initial filters from URL params
  const initialFilters = useMemo((): Partial<SessionFilters> | undefined => {
    const filters: Partial<SessionFilters> = {};
    let hasFilters = false;

    // Date range filter
    if (params.filter === 'thisWeek') {
      filters.dateRange = 'week';
      hasFilters = true;
    } else if (params.filter === 'thisMonth') {
      filters.dateRange = 'month';
      hasFilters = true;
    }

    // Target type filter (maps to drillGoal)
    if (params.targetType === 'paper') {
      filters.drillGoal = ['grouping'];
      hasFilters = true;
    } else if (params.targetType === 'tactical') {
      filters.drillGoal = ['engagement'];
      hasFilters = true;
    }

    return hasFilters ? filters : undefined;
  }, [params.filter, params.targetType]);

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
          // headerLeft: () => (
          //   <TouchableOpacity
          //     onPress={() => router.back()}
          //     style={styles.backButton}
          //     hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          //   >
          //     <Ionicons name="chevron-back" size={28} color={colors.text} />
          //   </TouchableOpacity>
          // ),
        }}
      />
      <View style={[styles.content, { paddingTop: Platform.OS === 'ios' ? insets.top + 44 : 0 }]}>
        <SessionHistoryCatalog initialFilters={initialFilters} />
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
