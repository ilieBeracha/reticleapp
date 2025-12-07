import Tabs from '@/components/withLayoutContext';
import { useColors } from '@/hooks/ui/useColors';
import { useTeamStore } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Team Mode Tabs Layout
 * 
 * Route: /(protected)/team/
 * 
 * SINGLE SOURCE OF TRUTH: The store's activeTeamId
 * No URL param needed - the store decides which team is active.
 * 
 * Guards:
 * - Redirects to personal if no team selected
 * - Redirects to personal if selected team doesn't exist
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

function TeamTabs() {
  const colors = useColors();
  const { activeTeamId } = useTeamStore();

  return (
    <Tabs
      key={`team-${activeTeamId}`}
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
          title: 'Trainings',
          tabBarIcon: ({ focused }) => getTabIcon('calendar', focused ? 'calendar' : 'calendar-outline'),
        }}
      />

      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarIcon: ({ focused }) => getTabIcon('person.2', focused ? 'people' : 'people-outline'),
        }}
      />
    </Tabs>
  );
}

export default function TeamLayout() {
  const { teams, activeTeamId, loading } = useTeamStore();

  // Wait for teams to load
  if (loading) {
    return null;
  }

  // Must have an active team selected to be in team mode
  if (!activeTeamId) {
    return <Redirect href="/(protected)/personal" />;
  }

  // Validate the active team exists
  const team = teams.find(t => t.id === activeTeamId);
  if (!team) {
    return <Redirect href="/(protected)/personal" />;
  }

  return <TeamTabs />;
}

