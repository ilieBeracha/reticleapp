import Tabs from '@/components/withLayoutContext';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

/**
 * Main Tab Layout
 *
 * 4 tabs:
 * - Team: Teams, calendar, trainings (with internal tabs)
 * - Insight: Shooting stats and analytics
 * - Home: Dashboard (center)
 * - Profile: Personal settings
 */

const getTabIcon = (sfSymbol: string, ionicon: keyof typeof Ionicons.glyphMap): any => {
  if (Platform.OS === 'ios') {
    return { sfSymbol };
  }
  return { ionicon };
};

export default function TabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      rippleColor={colors.primary}
      sidebarAdaptable
      tabBarStyle={{ backgroundColor: colors.background }}
      activeIndicatorColor={colors.primary + '20'}
      tabBarActiveTintColor={colors.primary}
      tabBarInactiveTintColor={colors.textMuted}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => getTabIcon('house', focused ? 'home' : 'home-outline'),
        }}
      />

      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insight',
          tabBarIcon: ({ focused }) => getTabIcon('chart.bar', focused ? 'bar-chart' : 'bar-chart-outline'),
        }}
      />

      <Tabs.Screen
        name="trainings"
        options={{
          role: 'search',
          title: 'Team',
          tabBarIcon: ({ focused }) => getTabIcon('person.2', focused ? 'people' : 'people-outline'),
        }}
      />
    </Tabs>
  );
}
