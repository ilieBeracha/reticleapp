import Tabs from '@/components/withLayoutContext';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

/**
 * Personal Mode Tabs Layout
 * 
 * Clean, simple tabs for personal mode:
 * - Home (PersonalHomePage)
 * - Insights (InsightsDashboard)
 * - Settings
 * 
 * NO workspace context needed here.
 */

// Cross-platform icon helper
const getTabIcon = (
  sfSymbol: string,
  ionicon: keyof typeof Ionicons.glyphMap,
): any => {
  if (Platform.OS === 'ios') {
    return { sfSymbol };
  }
  return { ionicon };
};

export default function PersonalLayout() {
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
          title: 'Insights',
          tabBarIcon: ({ focused }) => getTabIcon('chart.bar', focused ? 'bar-chart' : 'bar-chart-outline'),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => getTabIcon('gear', focused ? 'settings' : 'settings-outline'),
        }}
      />
    </Tabs>
  );
}
