import Tabs from '@/components/withLayoutContext';
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

/**
 * Unified Tabs Layout
 * 
 * Single tab bar for the entire app - no more "personal mode" vs "team mode".
 * 
 * Tabs:
 * - Home: Unified dashboard (active session, upcoming trainings, quick actions)
 * - Schedule: Trainings across all teams
 * - Insights: Your shooting stats
 * - Profile: Account + team management
 */

const getTabIcon = (
  sfSymbol: string,
  ionicon: keyof typeof Ionicons.glyphMap,
): any => {
  if (Platform.OS === 'ios') {
    return { sfSymbol };
  }
  return { ionicon };
};

export default function TabsLayout() {
  const colors = useColors();
  const { teamCount } = useTeamStore();

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
        name="trainings"
        options={{
          tabBarItemHidden: teamCount > 0 ? false : true,
          title: 'Schedule',
          tabBarIcon: ({ focused }) => getTabIcon('calendar', focused ? 'calendar' : 'calendar-outline'),
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
        name="profile"
        options={{
          role: 'search',
          title: 'Profile',
          tabBarIcon: ({ focused }) => getTabIcon('person.circle', focused ? 'person-circle' : 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}
