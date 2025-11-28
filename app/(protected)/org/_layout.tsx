import Tabs from '@/components/withLayoutContext';
import { OrgRoleProvider } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

/**
 * Organization Mode Layout
 * 
 * Route: /(protected)/org/
 * 
 * SINGLE SOURCE OF TRUTH: The store's activeWorkspaceId
 * No URL param needed - the store decides which org is active.
 * 
 * Guards:
 * - Redirects to personal if no workspace selected
 * - Redirects to personal if selected workspace doesn't exist
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

export default function OrgLayout() {
  const colors = useColors();
  const { workspaces, activeWorkspaceId, loading } = useWorkspaceStore();

  // Wait for workspaces to load
  if (loading) {
    return null;
  }

  // Must have an active workspace selected to be in org mode
  if (!activeWorkspaceId) {
    return <Redirect href="/(protected)/personal" />;
  }

  // Validate the active workspace exists
  const workspace = workspaces.find(w => w.id === activeWorkspaceId);
  if (!workspace) {
    return <Redirect href="/(protected)/personal" />;
  }

  return (
    <OrgRoleProvider>
      <Tabs
        key={`org-${activeWorkspaceId}`}
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
            tabBarIcon: ({ focused }) => getTabIcon('target', focused ? 'fitness' : 'fitness-outline'),
          }}
        />

        <Tabs.Screen
          name="manage"
          options={{
            title: 'Manage',
            tabBarIcon: ({ focused }) => getTabIcon('person.2.fill', focused ? 'people' : 'people-outline'),
          }}
        />
      </Tabs>
    </OrgRoleProvider>
  );
}
